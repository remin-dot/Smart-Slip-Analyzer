import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, parseJson, requireUserId } from "@/lib/api";
import { financialGoalSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { userId, response } = await requireUserId(request);
  if (response) return response;

  const goals = await prisma.financialGoal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ goals });
}

export async function POST(request: NextRequest) {
  try {
    const { userId, response } = await requireUserId(request);
    if (response) return response;

    const data = await parseJson(request, financialGoalSchema);
    const goalData: Prisma.FinancialGoalUncheckedCreateInput = {
      ...data,
      userId,
      aiStrategy: data.aiStrategy ? (data.aiStrategy as Prisma.InputJsonValue) : undefined
    };
    const goal = await prisma.financialGoal.create({
      data: goalData
    });

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
