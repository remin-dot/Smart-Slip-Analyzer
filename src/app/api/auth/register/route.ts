import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, parseJson } from "@/lib/api";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { registerSchema } from "@/lib/validators";
import { ensureDefaultCategories } from "@/lib/default-categories";

export async function POST(request: NextRequest) {
  try {
    const data = await parseJson(request, registerSchema);
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });

    if (existingUser) {
      return NextResponse.json({ error: "Email is already registered." }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: await hashPassword(data.password),
        authProvider: "credentials",
        monthlyIncome: data.monthlyIncome,
        savingGoal: data.savingGoal,
        financialPreference: data.financialPreference,
        currency: data.currency
      },
      select: {
        id: true,
        name: true,
        email: true,
        monthlyIncome: true,
        savingGoal: true,
        financialPreference: true,
        currency: true
      }
    });

    await ensureDefaultCategories(prisma, user.id);

    const response = NextResponse.json({ user }, { status: 201 });
    return setSessionCookie(response, user.id);
  } catch (error) {
    return apiError(error);
  }
}
