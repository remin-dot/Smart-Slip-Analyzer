import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/api";

export async function GET(request: NextRequest) {
  const { userId, response } = await requireUserId(request);
  if (response) return response;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

  const sixMonthsAgo = new Date(currentYear, currentMonth - 5, 1);

  const [allTimeTx, monthlyTx, sixMonthTx, categoryTx, recentTx, user, scanStats] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["type"],
      where: { userId },
      _sum: { amount: true },
      _count: true,
    }),

    prisma.transaction.groupBy({
      by: ["type"],
      where: { userId, occurredAt: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
      _count: true,
    }),

    prisma.transaction.findMany({
      where: { userId, occurredAt: { gte: sixMonthsAgo } },
      select: { type: true, amount: true, occurredAt: true },
      orderBy: { occurredAt: "asc" },
    }),

    prisma.transaction.findMany({
      where: { userId, type: { not: "INCOME" }, categoryId: { not: null } },
      select: { amount: true, category: { select: { name: true, color: true } } },
    }),

    prisma.transaction.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { occurredAt: "desc" },
      take: 5,
    }),

    prisma.user.findUnique({
      where: { id: userId },
      select: { monthlyIncome: true, savingGoal: true, currency: true },
    }),

    // Receipts scanned + average OCR confidence.
    prisma.transaction.aggregate({
      where: { userId, source: "SLIP_SCAN" },
      _count: true,
      _avg: { aiConfidence: true },
    }),
  ]);

  const receiptsCount = scanStats._count;
  const ocrAccuracy = scanStats._avg.aiConfidence != null ? Math.round(Number(scanStats._avg.aiConfidence) * 100) : null;

  // All-time totals
  const totalIncome = sumByType(allTimeTx, "INCOME");
  const totalExpense = sumByType(allTimeTx, "EXPENSE") + sumByType(allTimeTx, "TRANSFER");
  const balance = totalIncome - totalExpense;

  // This month
  const monthIncome = sumByType(monthlyTx, "INCOME");
  const monthExpense = sumByType(monthlyTx, "EXPENSE") + sumByType(monthlyTx, "TRANSFER");
  const monthBalance = monthIncome - monthExpense;
  const savingRate = monthIncome > 0 ? Math.round(((monthIncome - monthExpense) / monthIncome) * 100) : 0;

  // Monthly expense chart (last 6 months)
  const monthlyExpenses: { month: string; income: number; expense: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const m = new Date(currentYear, currentMonth - i, 1);
    const label = m.toLocaleDateString("en-US", { month: "short" });
    const mStart = new Date(m.getFullYear(), m.getMonth(), 1);
    const mEnd = new Date(m.getFullYear(), m.getMonth() + 1, 0, 23, 59, 59, 999);

    let income = 0;
    let expense = 0;
    for (const tx of sixMonthTx) {
      const d = new Date(tx.occurredAt);
      if (d >= mStart && d <= mEnd) {
        const amt = Number(tx.amount);
        if (tx.type === "INCOME") income += amt;
        else expense += amt;
      }
    }

    monthlyExpenses.push({ month: label, income: round2(income), expense: round2(expense) });
  }

  // Category spending breakdown
  const categoryMap = new Map<string, { amount: number; color: string }>();
  for (const tx of categoryTx) {
    if (!tx.category) continue;
    const key = tx.category.name;
    const existing = categoryMap.get(key);
    const amt = Number(tx.amount);
    if (existing) {
      existing.amount += amt;
    } else {
      categoryMap.set(key, { amount: amt, color: tx.category.color });
    }
  }

  const categorySpending = Array.from(categoryMap.entries())
    .map(([name, data]) => ({ name, amount: round2(data.amount), color: data.color }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  // Spending trend (daily totals last 30 days)
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const dailyMap = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    dailyMap.set(d.toISOString().slice(0, 10), 0);
  }

  for (const tx of sixMonthTx) {
    if (tx.type === "INCOME") continue;
    const key = new Date(tx.occurredAt).toISOString().slice(0, 10);
    if (dailyMap.has(key)) {
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + Number(tx.amount));
    }
  }

  const spendingTrend = Array.from(dailyMap.entries()).map(([date, amount]) => ({
    date,
    amount: round2(amount),
  }));

  const txCount = allTimeTx.reduce((sum, g) => sum + g._count, 0);
  const monthTxCount = monthlyTx.reduce((sum, g) => sum + g._count, 0);

  return NextResponse.json({
    summary: {
      totalIncome: round2(totalIncome),
      totalExpense: round2(totalExpense),
      balance: round2(balance),
      monthIncome: round2(monthIncome),
      monthExpense: round2(monthExpense),
      monthBalance: round2(monthBalance),
      savingRate,
      txCount,
      monthTxCount,
      receiptsCount,
      ocrAccuracy,
      profileIncome: Number(user?.monthlyIncome ?? 0),
      profileSavingGoal: Number(user?.savingGoal ?? 0),
      currency: user?.currency ?? "USD",
    },
    monthlyExpenses,
    categorySpending,
    spendingTrend,
    recentTransactions: recentTx.map((tx) => ({
      id: tx.id,
      merchant: tx.merchant,
      amount: Number(tx.amount),
      type: tx.type,
      occurredAt: tx.occurredAt,
      category: tx.category ? { name: tx.category.name, color: tx.category.color } : null,
    })),
  });
}

function sumByType(
  groups: { type: string; _sum: { amount: { toNumber?: () => number } | null } }[],
  type: string
): number {
  const g = groups.find((g) => g.type === type);
  if (!g || !g._sum.amount) return 0;
  return typeof g._sum.amount.toNumber === "function"
    ? g._sum.amount.toNumber()
    : Number(g._sum.amount);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
