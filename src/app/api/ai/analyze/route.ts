import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId, apiError } from "@/lib/api";
import { analyzeSpending } from "@/lib/ai/spending-analyzer";

export async function POST(request: NextRequest) {
  try {
    const { userId, response } = await requireUserId(request);
    if (response) return response;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
    const prevMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const prevMonthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    const [
      currentMonthTx,
      prevMonthTx,
      user,
      allTimeTotals,
    ] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId, occurredAt: { gte: monthStart, lte: monthEnd } },
        include: { category: true },
      }),
      prisma.transaction.findMany({
        where: { userId, occurredAt: { gte: prevMonthStart, lte: prevMonthEnd } },
        include: { category: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { monthlyIncome: true, savingGoal: true, currency: true },
      }),
      prisma.transaction.groupBy({
        by: ["type"],
        where: { userId },
        _sum: { amount: true },
      }),
    ]);

    const currency = user?.currency ?? "USD";
    const savingGoal = Number(user?.savingGoal ?? 0);

    // Income / expense totals
    const monthIncome = sumType(currentMonthTx, "INCOME");
    const monthExpense = sumType(currentMonthTx, "EXPENSE") + sumType(currentMonthTx, "TRANSFER");
    const prevMonthExpense = sumType(prevMonthTx, "EXPENSE") + sumType(prevMonthTx, "TRANSFER");

    const totalIncome = sumGroupType(allTimeTotals, "INCOME");
    const totalExpense = sumGroupType(allTimeTotals, "EXPENSE") + sumGroupType(allTimeTotals, "TRANSFER");
    const totalBalance = totalIncome - totalExpense;

    const savingRate = monthIncome > 0
      ? Math.round(((monthIncome - monthExpense) / monthIncome) * 100)
      : 0;

    // Category comparison
    const categoryMap = new Map<string, { color: string; currentMonth: number; previousMonth: number }>();

    for (const tx of currentMonthTx) {
      if (tx.type === "INCOME" || !tx.category) continue;
      const key = tx.category.name;
      const entry = categoryMap.get(key) ?? { color: tx.category.color, currentMonth: 0, previousMonth: 0 };
      entry.currentMonth += Number(tx.amount);
      categoryMap.set(key, entry);
    }

    for (const tx of prevMonthTx) {
      if (tx.type === "INCOME" || !tx.category) continue;
      const key = tx.category.name;
      const entry = categoryMap.get(key) ?? { color: tx.category.color, currentMonth: 0, previousMonth: 0 };
      entry.previousMonth += Number(tx.amount);
      categoryMap.set(key, entry);
    }

    const categoryComparison = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      color: data.color,
      currentMonth: Math.round(data.currentMonth * 100) / 100,
      previousMonth: Math.round(data.previousMonth * 100) / 100,
    }));

    // Merchant frequency (this month)
    const merchantMap = new Map<string, { count: number; totalAmount: number; category: string | null }>();
    for (const tx of currentMonthTx) {
      if (tx.type === "INCOME") continue;
      const key = tx.merchant;
      const entry = merchantMap.get(key) ?? { count: 0, totalAmount: 0, category: tx.category?.name ?? null };
      entry.count++;
      entry.totalAmount += Number(tx.amount);
      merchantMap.set(key, entry);
    }

    const merchantFrequency = Array.from(merchantMap.entries())
      .map(([merchant, data]) => ({ merchant, ...data }))
      .sort((a, b) => b.count - a.count);

    const analysis = await analyzeSpending({
      currency,
      monthIncome,
      monthExpense,
      prevMonthExpense,
      savingGoal,
      categoryComparison,
      merchantFrequency,
      totalBalance,
      savingRate,
    });

    // Persist as AiReport
    const report = await prisma.aiReport.create({
      data: {
        userId,
        type: "SPENDING_ANALYSIS",
        title: "AI Spending Analysis",
        summary: analysis.summary,
        insights: analysis.insights as unknown as Prisma.InputJsonValue,
        actions: analysis.recommendations,
        modelName: analysis.modelName,
        promptVersion: "v2",
        confidence: analysis.confidence,
      },
    });

    return NextResponse.json({ analysis, report });
  } catch (error) {
    return apiError(error);
  }
}

export async function GET(request: NextRequest) {
  const { userId, response } = await requireUserId(request);
  if (response) return response;

  const latestReport = await prisma.aiReport.findFirst({
    where: { userId, type: "SPENDING_ANALYSIS" },
    orderBy: { createdAt: "desc" },
  });

  if (!latestReport) {
    return NextResponse.json({ analysis: null });
  }

  return NextResponse.json({
    analysis: {
      insights: latestReport.insights,
      recommendations: latestReport.actions,
      summary: latestReport.summary,
      modelName: latestReport.modelName,
      confidence: latestReport.confidence,
      createdAt: latestReport.createdAt,
    },
  });
}

function sumType(txs: { type: string; amount: { toNumber?: () => number } | number }[], type: string): number {
  return txs
    .filter((tx) => tx.type === type)
    .reduce((sum, tx) => {
      const amt = typeof tx.amount === "object" && tx.amount && "toNumber" in tx.amount
        ? (tx.amount as { toNumber: () => number }).toNumber()
        : Number(tx.amount);
      return sum + amt;
    }, 0);
}

function sumGroupType(
  groups: { type: string; _sum: { amount: { toNumber?: () => number } | null } }[],
  type: string
): number {
  const g = groups.find((g) => g.type === type);
  if (!g || !g._sum.amount) return 0;
  return typeof g._sum.amount.toNumber === "function"
    ? g._sum.amount.toNumber()
    : Number(g._sum.amount);
}
