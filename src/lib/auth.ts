import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const SESSION_COOKIE = "ssa_session";

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Caller emails the raw token; we only ever store its hash, so a DB leak can't
// be replayed as a reset link.
export function generateResetToken() {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashResetToken(token) };
}

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is required.");
  }

  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function createSessionToken(userId: string) {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function setSessionCookie(response: NextResponse, userId: string) {
  const token = await createSessionToken(userId);

  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return response;
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  return response;
}

export async function getCurrentUserIdFromRequest(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const verified = await jwtVerify(token, getJwtSecret());
    return typeof verified.payload.userId === "string" ? verified.payload.userId : null;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const verified = await jwtVerify(token, getJwtSecret());
    const userId = typeof verified.payload.userId === "string" ? verified.payload.userId : null;

    if (!userId) {
      return null;
    }

    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        imageUrl: true,
        monthlyIncome: true,
        savingGoal: true,
        financialPreference: true,
        currency: true,
        locale: true,
        timezone: true,
        createdAt: true
      }
    });
  } catch {
    return null;
  }
}

export function unauthorized() {
  return NextResponse.json({ error: "Authentication required." }, { status: 401 });
}
