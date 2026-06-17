import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiError, requireUserId } from "@/lib/api";
import { chatWithFinanceAI, type ChatMessage, type FinancialContext } from "@/lib/ai/finance-chat";

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).max(20).default([]),
});

export async function POST(request: NextRequest) {
  try {
    const { userId, response } = await requireUserId(request);
    if (response) return response;

    const body = await request.json();
    const { message, history } = chatSchema.parse(body);

    const context = await buildFinancialContext(userId);

    const reply = await chatWithFinanceAI(message, history as ChatMessage[], context);

    return NextResponse.json({ reply, model: process.env.OPENAI_API_KEY ? "gpt-4o-mini" : "local-rule-engine" });
  } catch (error) {
    return apiError(error);
  }
}

async function buildFinancialContext(userId: string): Promise<FinancialContext> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
  const prevMonthStart = new Date(currentYear, currentMonth - 1, 1);
  const prevMonthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

  const [user, currentMonthTx, prevMonthTx, allTimeTotals, budgets, goals, recentTx] = await Promise.all([
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
    prisma.transaction.groupBy({
      by: ["type"],
      where: { userId },
      _sum: { amount: true },
    }),
    prisma.budget.findMany({
      where: { userId, isActive: true },
      include: { category: true },
    }),
    prisma.financialGoal.findMany({
      where: { userId, status: "ACTIVE" },
    }),
    prisma.transaction.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { occurredAt: "desc" },
      take: 10,
    }),
  ]);

  const toNum = (amt: { toNumber?: () => number } | number): number =>
    typeof amt === "object" && amt && "toNumber" in amt
      ? (amt as { toNumber: () => number }).toNumber()
      : Number(amt);

  const currency = user?.currency ?? "USD";
  const monthlyIncome = Number(user?.monthlyIncome ?? 0);
  const savingGoal = Number(user?.savingGoal ?? 0);

  let monthIncome = 0;
  let monthExpense = 0;
  for (const tx of currentMonthTx) {
    const amt = toNum(tx.amount);
    if (tx.type === "INCOME") monthIncome += amt;
    else monthExpense += amt;
  }

  let prevMonthExpense = 0;
  for (const tx of prevMonthTx) {
    if (tx.type !== "INCOME") prevMonthExpense += toNum(tx.amount);
  }

  const totalIncomeAll = allTimeTotals
    .filter((g) => g.type === "INCOME")
    .reduce((s, g) => s + (g._sum.amount ? toNum(g._sum.amount) : 0), 0);
  const totalExpenseAll = allTimeTotals
    .filter((g) => g.type !== "INCOME")
    .reduce((s, g) => s + (g._sum.amount ? toNum(g._sum.amount) : 0), 0);
  const totalBalance = totalIncomeAll - totalExpenseAll;

  const savingRate = monthIncome > 0
    ? Math.round(((monthIncome - monthExpense) / monthIncome) * 100)
    : 0;

  // Category breakdown
  const catMap = new Map<string, number>();
  for (const tx of currentMonthTx) {
    if (tx.type === "INCOME" || !tx.category) continue;
    const key = tx.category.name;
    catMap.set(key, (catMap.get(key) ?? 0) + toNum(tx.amount));
  }
  const categoryBreakdown = Array.from(catMap.entries())
    .map(([name, amount]) => ({
      name,
      amount: Math.round(amount),
      pct: monthExpense > 0 ? Math.round((amount / monthExpense) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Top merchants
  const merchMap = new Map<string, { count: number; total: number; category: string | null }>();
  for (const tx of currentMonthTx) {
    if (tx.type === "INCOME") continue;
    const key = tx.merchant;
    const entry = merchMap.get(key) ?? { count: 0, total: 0, category: tx.category?.name ?? null };
    entry.count++;
    entry.total += toNum(tx.amount);
    merchMap.set(key, entry);
  }
  const topMerchants = Array.from(merchMap.entries())
    .map(([merchant, data]) => ({ merchant, ...data, total: Math.round(data.total) }))
    .sort((a, b) => b.total - a.total);

  // Budgets with spent
  const activeBudgets = budgets.map((b) => {
    const limit = toNum(b.amount);
    const spent = b.categoryId
      ? currentMonthTx
          .filter((tx) => tx.categoryId === b.categoryId && tx.type !== "INCOME")
          .reduce((sum, tx) => sum + toNum(tx.amount), 0)
      : monthExpense;
    return {
      category: b.category?.name ?? b.name,
      limit: Math.round(limit),
      spent: Math.round(spent),
      remaining: Math.round(limit - spent),
    };
  });

  // Goals
  const activeGoals = goals.map((g) => {
    const target = Number(g.targetAmount);
    const current = Number(g.currentAmount);
    const remaining = Math.max(target - current, 0);
    let monthsLeft = 0;
    let monthlySaving = 0;
    if (g.targetDate) {
      const diffMs = new Date(g.targetDate).getTime() - now.getTime();
      const days = Math.max(Math.ceil(diffMs / (1000 * 60 * 60 * 24)), 0);
      monthsLeft = Math.max(Math.ceil(days / 30.44), 1);
      monthlySaving = remaining > 0 ? Math.ceil(remaining / monthsLeft) : 0;
    }
    return { name: g.name, target, current, remaining, monthsLeft, monthlySaving };
  });

  // Recent transactions
  const recent = recentTx.map((tx) => ({
    merchant: tx.merchant,
    amount: toNum(tx.amount),
    type: tx.type,
    category: tx.category?.name ?? null,
    date: new Date(tx.occurredAt).toLocaleDateString("en-US", { day: "numeric", month: "short" }),
  }));

  return {
    currency,
    monthIncome: Math.round(monthIncome),
    monthExpense: Math.round(monthExpense),
    prevMonthExpense: Math.round(prevMonthExpense),
    totalBalance: Math.round(totalBalance),
    savingRate,
    savingGoal,
    monthlyIncome,
    categoryBreakdown,
    topMerchants,
    activeBudgets,
    activeGoals,
    recentTransactions: recent,
  };
}
