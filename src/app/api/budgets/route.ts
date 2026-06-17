import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, parseJson, requireUserId } from "@/lib/api";
import { budgetSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { userId, response } = await requireUserId(request);
  if (response) return response;

  const budgets = await prisma.budget.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ budgets });
}

export async function POST(request: NextRequest) {
  try {
    const { userId, response } = await requireUserId(request);
    if (response) return response;

    const data = await parseJson(request, budgetSchema);
    const budget = await prisma.budget.create({
      data: { ...data, userId },
      include: { category: true }
    });

    return NextResponse.json({ budget }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
