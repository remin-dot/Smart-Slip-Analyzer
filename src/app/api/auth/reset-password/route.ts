import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, parseJson } from "@/lib/api";
import { hashPassword, hashResetToken } from "@/lib/auth";
import { resetPasswordSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await parseJson(request, resetPasswordSchema);
    const user = await prisma.user.findUnique({
      where: { resetTokenHash: hashResetToken(token) },
      select: { id: true, resetTokenExpiresAt: true }
    });

    if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
      return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
    }

    // Set new password and burn the token in one write so it can't be reused.
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password), resetTokenHash: null, resetTokenExpiresAt: null }
    });

    return NextResponse.json({ message: "Password updated. You can now log in." });
  } catch (error) {
    return apiError(error);
  }
}
