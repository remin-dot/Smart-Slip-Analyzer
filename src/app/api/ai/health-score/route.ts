import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId, apiError } from "@/lib/api";
import { calculateHealthScore } from "@/lib/ai/health-score";

export async function GET(request: NextRequest) {
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
    const sixMonthsAgo = new Date(currentYear, currentMonth - 5, 1);

    const [user, currentMonthTx, prevMonthTx, sixMonthTx, budgets] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { monthlyIncome: true, savingGoal: true, currency: true },
      }),

      prisma.transaction.findMany({
        where: { userId, occurredAt: { gte: monthStart, lte: monthEnd } },
        include: { category: true },
      }),

      prisma.transaction.findMany({
        where: { userId, occurredAt: { gte: prevMonthStart, lte: prevMonthEnd } },
        select: { type: true, amount: true },
      }),

      prisma.transaction.findMany({
        where: { userId, occurredAt: { gte: sixMonthsAgo } },
        select: { type: true, amount: true, occurredAt: true },
      }),

      prisma.budget.findMany({
        where: { userId, isActive: true, period: "MONTHLY" },
        include: { category: true },
      }),
    ]);

    const currency = user?.currency ?? "USD";
    const savingGoal = Number(user?.savingGoal ?? 0);

    const toNum = (amt: { toNumber?: () => number } | number): number =>
      typeof amt === "object" && amt && "toNumber" in amt
        ? (amt as { toNumber: () => number }).toNumber()
        : Number(amt);

    // Current month totals
    let monthIncome = 0;
    let monthExpense = 0;
    for (const tx of currentMonthTx) {
      const amt = toNum(tx.amount);
      if (tx.type === "INCOME") monthIncome += amt;
      else monthExpense += amt;
    }

    // Previous month expense
    let prevMonthExpense = 0;
    for (const tx of prevMonthTx) {
      if (tx.type !== "INCOME") prevMonthExpense += toNum(tx.amount);
    }

    const savingRate = monthIncome > 0
      ? Math.round(((monthIncome - monthExpense) / monthIncome) * 100)
      : 0;

    const totalIncome = sixMonthTx.filter((t) => t.type === "INCOME").reduce((s, t) => s + toNum(t.amount), 0);
    const totalExpenseAll = sixMonthTx.filter((t) => t.type !== "INCOME").reduce((s, t) => s + toNum(t.amount), 0);
    const totalBalance = totalIncome - totalExpenseAll;

    // Monthly expenses for consistency calculation
    const monthlyExpenses: { month: string; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const m = new Date(currentYear, currentMonth - i, 1);
      const label = m.toLocaleDateString("en-US", { month: "short" });
      const mStart = new Date(m.getFullYear(), m.getMonth(), 1);
      const mEnd = new Date(m.getFullYear(), m.getMonth() + 1, 0, 23, 59, 59, 999);

      let expense = 0;
      for (const tx of sixMonthTx) {
        const d = new Date(tx.occurredAt);
        if (d >= mStart && d <= mEnd && tx.type !== "INCOME") {
          expense += toNum(tx.amount);
        }
      }
      monthlyExpenses.push({ month: label, expense: Math.round(expense * 100) / 100 });
    }

    // Category comparison
    const categoryMap = new Map<string, { currentMonth: number; previousMonth: number }>();
    for (const tx of currentMonthTx) {
      if (tx.type === "INCOME" || !tx.category) continue;
      const key = tx.category.name;
      const entry = categoryMap.get(key) ?? { currentMonth: 0, previousMonth: 0 };
      entry.currentMonth += toNum(tx.amount);
      categoryMap.set(key, entry);
    }

    const categorySpending = Array.from(categoryMap.entries()).map(([name, data]) => ({
      name,
      currentMonth: Math.round(data.currentMonth * 100) / 100,
      previousMonth: Math.round(data.previousMonth * 100) / 100,
    }));

    // Budget control data
    const budgetData = await Promise.all(
      budgets.map(async (b) => {
        const spent = b.categoryId
          ? currentMonthTx
              .filter((tx) => tx.categoryId === b.categoryId && tx.type !== "INCOME")
              .reduce((sum, tx) => sum + toNum(tx.amount), 0)
          : monthExpense;

        return {
          categoryName: b.category?.name ?? b.name,
          limit: toNum(b.amount),
          spent: Math.round(spent * 100) / 100,
        };
      })
    );

    const healthScore = calculateHealthScore({
      currency,
      monthIncome,
      monthExpense,
      prevMonthExpense,
      savingRate,
      savingGoal,
      totalBalance,
      budgets: budgetData,
      monthlyExpenses,
      categorySpending,
    });

    return NextResponse.json({ healthScore });
  } catch (error) {
    return apiError(error);
  }
}
