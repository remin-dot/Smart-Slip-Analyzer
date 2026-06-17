import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { apiError, parseJson, requireUserId } from "@/lib/api";
import { prisma } from "@/lib/db";
import { profileSchema } from "@/lib/validators";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  return NextResponse.json({ user });
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId, response } = await requireUserId(request);
    if (response) return response;

    const data = await parseJson(request, profileSchema);
    const user = await prisma.user.update({
      where: { id: userId },
      data,
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

    return NextResponse.json({ user });
  } catch (error) {
    return apiError(error);
  }
}
