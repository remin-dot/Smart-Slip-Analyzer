import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, parseJson } from "@/lib/api";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const data = await parseJson(request, loginSchema);
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user || !user.passwordHash || !(await verifyPassword(data.password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        monthlyIncome: user.monthlyIncome,
        savingGoal: user.savingGoal,
        financialPreference: user.financialPreference,
        currency: user.currency
      }
    });

    return setSessionCookie(response, user.id);
  } catch (error) {
    return apiError(error);
  }
}
