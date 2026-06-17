import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, parseJson, requireUserId } from "@/lib/api";
import { budgetSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { userId, response } = await requireUserId(request);
  if (response) return response;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [budgets, monthTransactions] = await Promise.all([
    prisma.budget.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        type: { not: "INCOME" },
        occurredAt: { gte: monthStart, lte: monthEnd },
      },
      select: { categoryId: true, amount: true },
    }),
  ]);

  const toNum = (amt: { toNumber?: () => number } | number): number =>
    typeof amt === "object" && amt && "toNumber" in amt
      ? (amt as { toNumber: () => number }).toNumber()
      : Number(amt);

  const categorySpent = new Map<string, number>();
  let totalMonthExpense = 0;

  for (const tx of monthTransactions) {
    const amt = toNum(tx.amount);
    totalMonthExpense += amt;
    if (tx.categoryId) {
      categorySpent.set(tx.categoryId, (categorySpent.get(tx.categoryId) ?? 0) + amt);
    }
  }

  const enriched = budgets.map((b) => {
    const limit = toNum(b.amount);
    const spent = b.categoryId
      ? Math.round((categorySpent.get(b.categoryId) ?? 0) * 100) / 100
      : Math.round(totalMonthExpense * 100) / 100;
    const remaining = Math.round((limit - spent) * 100) / 100;
    const usedPct = limit > 0 ? Math.round((spent / limit) * 100) : 0;

    let status: "safe" | "warning" | "exceeded";
    if (usedPct > 100) status = "exceeded";
    else if (usedPct >= b.alertAtPct) status = "warning";
    else status = "safe";

    return {
      id: b.id,
      name: b.name,
      amount: limit,
      currency: b.currency,
      period: b.period,
      alertAtPct: b.alertAtPct,
      isActive: b.isActive,
      startsAt: b.startsAt,
      endsAt: b.endsAt,
      categoryId: b.categoryId,
      category: b.category
        ? { id: b.category.id, name: b.category.name, color: b.category.color, icon: b.category.icon }
        : null,
      spent,
      remaining,
      usedPct,
      status,
      createdAt: b.createdAt,
    };
  });

  return NextResponse.json({ budgets: enriched });
}

export async function POST(request: NextRequest) {
  try {
    const { userId, response } = await requireUserId(request);
    if (response) return response;

    const data = await parseJson(request, budgetSchema);
    const budget = await prisma.budget.create({
      data: { ...data, userId },
      include: { category: true },
    });

    return NextResponse.json({ budget }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
