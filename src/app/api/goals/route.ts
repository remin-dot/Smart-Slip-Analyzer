import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, parseJson, requireUserId } from "@/lib/api";
import { financialGoalSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { userId, response } = await requireUserId(request);
  if (response) return response;

  const [goals, user] = await Promise.all([
    prisma.financialGoal.findMany({
      where: { userId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { monthlyIncome: true, savingGoal: true, currency: true },
    }),
  ]);

  const now = new Date();
  const currency = user?.currency ?? "USD";

  const enriched = goals.map((g) => {
    const target = Number(g.targetAmount);
    const current = Number(g.currentAmount);
    const remaining = Math.max(target - current, 0);
    const progressPct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;

    let monthsLeft = 0;
    let monthlySavingRequired = 0;
    let daysLeft = 0;
    let isOverdue = false;

    if (g.targetDate) {
      const deadline = new Date(g.targetDate);
      const diffMs = deadline.getTime() - now.getTime();
      daysLeft = Math.max(Math.ceil(diffMs / (1000 * 60 * 60 * 24)), 0);
      monthsLeft = Math.max(Math.ceil(daysLeft / 30.44), 0);
      isOverdue = diffMs < 0 && g.status === "ACTIVE";

      if (monthsLeft > 0 && remaining > 0) {
        monthlySavingRequired = Math.ceil(remaining / monthsLeft);
      } else if (remaining > 0) {
        monthlySavingRequired = remaining;
      }
    }

    let feasibility: "on_track" | "tight" | "difficult" | "completed" | "overdue";
    if (g.status === "COMPLETED" || progressPct >= 100) {
      feasibility = "completed";
    } else if (isOverdue) {
      feasibility = "overdue";
    } else {
      const monthlyIncome = Number(user?.monthlyIncome ?? 0);
      const incomeRatio = monthlyIncome > 0 ? monthlySavingRequired / monthlyIncome : 1;
      if (incomeRatio <= 0.2) feasibility = "on_track";
      else if (incomeRatio <= 0.4) feasibility = "tight";
      else feasibility = "difficult";
    }

    return {
      id: g.id,
      name: g.name,
      targetAmount: target,
      currentAmount: current,
      remaining,
      currency: g.currency,
      targetDate: g.targetDate,
      status: g.status,
      progressPct,
      monthsLeft,
      daysLeft,
      monthlySavingRequired,
      isOverdue,
      feasibility,
      createdAt: g.createdAt,
    };
  });

  return NextResponse.json({ goals: enriched, currency });
}

export async function POST(request: NextRequest) {
  try {
    const { userId, response } = await requireUserId(request);
    if (response) return response;

    const data = await parseJson(request, financialGoalSchema);
    const goalData: Prisma.FinancialGoalUncheckedCreateInput = {
      ...data,
      userId,
      aiStrategy: data.aiStrategy ? (data.aiStrategy as Prisma.InputJsonValue) : undefined,
    };
    const goal = await prisma.financialGoal.create({
      data: goalData,
    });

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
