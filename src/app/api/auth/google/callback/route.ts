import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { GOOGLE_OAUTH_STATE_COOKIE, setSessionCookie } from "@/lib/auth";
import { ensureDefaultCategories } from "@/lib/default-categories";

type GoogleTokenResponse = {
  access_token: string;
  id_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
};

type GoogleProfile = {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
};

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const storedState = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(new URL("/login?error=oauth_state", request.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(new URL("/login?error=oauth_config", request.url));
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    })
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL("/login?error=oauth_token", request.url));
  }

  const token = (await tokenResponse.json()) as GoogleTokenResponse;
  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${token.access_token}` }
  });

  if (!profileResponse.ok) {
    return NextResponse.redirect(new URL("/login?error=oauth_profile", request.url));
  }

  const profile = (await profileResponse.json()) as GoogleProfile;

  if (!profile.email || !profile.email_verified) {
    return NextResponse.redirect(new URL("/login?error=oauth_email", request.url));
  }

  const user = await prisma.user.upsert({
    where: { email: profile.email },
    update: {
      googleId: profile.sub,
      authProvider: "google",
      name: profile.name,
      imageUrl: profile.picture
    },
    create: {
      googleId: profile.sub,
      authProvider: "google",
      name: profile.name,
      email: profile.email,
      imageUrl: profile.picture,
      monthlyIncome: 0,
      savingGoal: 0,
      financialPreference: "BALANCED",
      currency: "USD"
    },
    select: { id: true }
  });

  await ensureDefaultCategories(prisma, user.id);

  const response = await setSessionCookie(NextResponse.redirect(new URL("/dashboard", request.url)), user.id);
  response.cookies.set({
    name: GOOGLE_OAUTH_STATE_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  return response;
}
