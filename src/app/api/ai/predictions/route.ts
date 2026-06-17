import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, requireUserId } from "@/lib/api";
import { generatePredictions, type MonthlyData } from "@/lib/ai/financial-predictor";

export async function GET(request: NextRequest) {
  try {
    const { userId, response } = await requireUserId(request);
    if (response) return response;

    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [user, historicalTx, monthTx, allTimeTotals, goals] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { monthlyIncome: true, savingGoal: true, currency: true },
      }),
      prisma.transaction.findMany({
        where: { userId, occurredAt: { gte: twelveMonthsAgo, lt: monthStart } },
        select: { type: true, amount: true, occurredAt: true },
        orderBy: { occurredAt: "asc" },
      }),
      prisma.transaction.findMany({
        where: { userId, occurredAt: { gte: monthStart, lte: monthEnd } },
        select: { type: true, amount: true },
      }),
      prisma.transaction.groupBy({
        by: ["type"],
        where: { userId },
        _sum: { amount: true },
      }),
      prisma.financialGoal.findMany({
        where: { userId, status: "ACTIVE" },
        select: { targetAmount: true, currentAmount: true, targetDate: true },
      }),
    ]);

    const toNum = (v: unknown): number => {
      if (typeof v === "number") return v;
      if (v && typeof v === "object" && "toNumber" in v) return (v as { toNumber: () => number }).toNumber();
      return Number(v);
    };

    const currency = user?.currency ?? "USD";
    const profileIncome = Number(user?.monthlyIncome ?? 0);
    const savingGoal = Number(user?.savingGoal ?? 0);

    // aggregate monthly saving goal from active goals
    let goalMonthlySaving = 0;
    for (const g of goals) {
      const rem = Math.max(toNum(g.targetAmount) - toNum(g.currentAmount), 0);
      if (g.targetDate && rem > 0) {
        const days = Math.max((new Date(g.targetDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24), 30);
        goalMonthlySaving += rem / (days / 30.44);
      }
    }
    const effectiveSavingGoal = Math.max(savingGoal, Math.round(goalMonthlySaving));

    // current month
    let monthIncome = 0, monthExpense = 0;
    for (const tx of monthTx) {
      const amt = toNum(tx.amount);
      if (tx.type === "INCOME") monthIncome += amt;
      else monthExpense += amt;
    }

    // total balance
    const totalIncomeAll = allTimeTotals.filter((g) => g.type === "INCOME").reduce((s, g) => s + (g._sum.amount ? toNum(g._sum.amount) : 0), 0);
    const totalExpenseAll = allTimeTotals.filter((g) => g.type !== "INCOME").reduce((s, g) => s + (g._sum.amount ? toNum(g._sum.amount) : 0), 0);
    const totalBalance = totalIncomeAll - totalExpenseAll;

    // build monthly history
    const monthMap = new Map<string, { income: number; expense: number }>();
    for (const tx of historicalTx) {
      const d = tx.occurredAt;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const entry = monthMap.get(key) ?? { income: 0, expense: 0 };
      const amt = toNum(tx.amount);
      if (tx.type === "INCOME") entry.income += amt;
      else entry.expense += amt;
      monthMap.set(key, entry);
    }

    const monthlyHistory: MonthlyData[] = [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => {
        const [y, m] = key.split("-");
        const d = new Date(Number(y), Number(m) - 1, 1);
        return {
          month: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
          income: Math.round(val.income),
          expense: Math.round(val.expense),
          saving: Math.round(val.income - val.expense),
        };
      });

    const daysElapsed = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    const prediction = generatePredictions({
      currency,
      monthIncome: Math.round(monthIncome),
      monthExpense: Math.round(monthExpense),
      totalBalance: Math.round(totalBalance),
      profileIncome,
      savingGoal: effectiveSavingGoal,
      daysElapsed,
      daysInMonth,
      monthlyHistory,
    });

    return NextResponse.json({ prediction, currency });
  } catch (error) {
    return apiError(error);
  }
}
