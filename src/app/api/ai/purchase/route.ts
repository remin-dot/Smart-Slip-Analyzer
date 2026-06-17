import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiError, requireUserId } from "@/lib/api";
import { analyzePurchase, type PurchaseContext } from "@/lib/ai/purchase-analyzer";

const purchaseSchema = z.object({
  productName: z.string().min(1).max(200),
  price: z.coerce.number().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const { userId, response } = await requireUserId(request);
    if (response) return response;

    const body = await request.json();
    const { productName, price } = purchaseSchema.parse(body);

    const context = await buildPurchaseContext(userId);
    const analysis = await analyzePurchase(productName, price, context);

    return NextResponse.json({ analysis });
  } catch (error) {
    return apiError(error);
  }
}

async function buildPurchaseContext(userId: string): Promise<PurchaseContext> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

  const [user, monthTx, allTimeTotals, budgets, goals] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { monthlyIncome: true, savingGoal: true, currency: true },
    }),
    prisma.transaction.findMany({
      where: { userId, occurredAt: { gte: monthStart, lte: monthEnd } },
      select: { type: true, amount: true, categoryId: true },
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
  ]);

  const toNum = (amt: { toNumber?: () => number } | number): number =>
    typeof amt === "object" && amt && "toNumber" in amt
      ? (amt as { toNumber: () => number }).toNumber()
      : Number(amt);

  const currency = user?.currency ?? "USD";
  const savingGoal = Number(user?.savingGoal ?? 0);

  let monthIncome = 0;
  let monthExpense = 0;
  for (const tx of monthTx) {
    const amt = toNum(tx.amount);
    if (tx.type === "INCOME") monthIncome += amt;
    else monthExpense += amt;
  }

  const totalIncomeAll = allTimeTotals
    .filter((g) => g.type === "INCOME")
    .reduce((s, g) => s + (g._sum.amount ? toNum(g._sum.amount) : 0), 0);
  const totalExpenseAll = allTimeTotals
    .filter((g) => g.type !== "INCOME")
    .reduce((s, g) => s + (g._sum.amount ? toNum(g._sum.amount) : 0), 0);
  const totalBalance = totalIncomeAll - totalExpenseAll;

  const monthlySaving = monthIncome - monthExpense;
  const savingRate = monthIncome > 0
    ? Math.round(((monthIncome - monthExpense) / monthIncome) * 100)
    : 0;

  const activeBudgets = budgets.map((b) => {
    const limit = toNum(b.amount);
    const spent = b.categoryId
      ? monthTx
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

  const activeGoals = goals.map((g) => {
    const target = Number(g.targetAmount);
    const current = Number(g.currentAmount);
    const remaining = Math.max(target - current, 0);
    let monthsLeft = 0;
    let goalMonthlySaving = 0;
    if (g.targetDate) {
      const diffMs = new Date(g.targetDate).getTime() - now.getTime();
      const days = Math.max(Math.ceil(diffMs / (1000 * 60 * 60 * 24)), 0);
      monthsLeft = Math.max(Math.ceil(days / 30.44), 1);
      goalMonthlySaving = remaining > 0 ? Math.ceil(remaining / monthsLeft) : 0;
    }
    return { name: g.name, target, current, remaining, monthsLeft, monthlySaving: goalMonthlySaving };
  });

  return {
    currency,
    monthIncome: Math.round(monthIncome),
    monthExpense: Math.round(monthExpense),
    totalBalance: Math.round(totalBalance),
    savingRate,
    monthlySaving: Math.round(monthlySaving),
    savingGoal,
    activeBudgets,
    activeGoals,
  };
}
