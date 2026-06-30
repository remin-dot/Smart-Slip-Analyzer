import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, parseJson } from "@/lib/api";
import { generateResetToken, RESET_TOKEN_TTL_MS } from "@/lib/auth";
import { forgotPasswordSchema } from "@/lib/validators";

// Always returns the same generic message so an attacker can't probe which
// emails are registered.
const GENERIC = { message: "If that email is registered, a reset link has been sent." };

export async function POST(request: NextRequest) {
  try {
    const { email } = await parseJson(request, forgotPasswordSchema);
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });

    // Only credential accounts (with a password) can reset one.
    if (!user || !user.passwordHash) {
      return NextResponse.json(GENERIC);
    }

    const { token, tokenHash } = generateResetToken();
    await prisma.user.update({
      where: { id: user.id },
      data: { resetTokenHash: tokenHash, resetTokenExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) }
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/reset-password?token=${token}`;

    // ponytail: no email provider wired up. The link is logged server-side and
    // (dev only) returned in the response so the flow is testable. Swap this for
    // a real send (Resend/SES) when one exists — the token never leaves here in prod.
    console.log(`[password-reset] ${email} -> ${resetUrl}`);

    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({ ...GENERIC, resetUrl });
    }

    return NextResponse.json(GENERIC);
  } catch (error) {
    return apiError(error);
  }
}
