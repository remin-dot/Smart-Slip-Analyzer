import { $Enums } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateFinancialReport } from "@/lib/ai/report-engine";
import { apiError, parseJson, requireUserId } from "@/lib/api";
import { aiReportRequestSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { userId, response } = await requireUserId(request);
  if (response) return response;

  const reports = await prisma.aiReport.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return NextResponse.json({ reports });
}

export async function POST(request: NextRequest) {
  try {
    const { userId, response } = await requireUserId(request);
    if (response) return response;

    const data = await parseJson(request, aiReportRequestSchema);
    const [transactions, categoryTotals] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId },
        take: 100,
        orderBy: { occurredAt: "desc" }
      }),
      prisma.transaction.groupBy({
        by: ["categoryId"],
        where: { userId, type: $Enums.TransactionType.EXPENSE },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 1
      })
    ]);

    const incomeTotal = transactions
      .filter((transaction) => transaction.type === $Enums.TransactionType.INCOME)
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const expenseTotal = transactions
      .filter((transaction) => transaction.type === $Enums.TransactionType.EXPENSE)
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const topCategoryId = categoryTotals[0]?.categoryId;
    const topCategory = topCategoryId
      ? await prisma.category.findFirst({ where: { id: topCategoryId, userId } })
      : null;

    const generated = await generateFinancialReport({
      type: data.type as $Enums.AiReportType,
      prompt: data.prompt,
      context: {
        transactionCount: transactions.length,
        monthlyExpenseTotal: `$${expenseTotal.toFixed(2)}`,
        monthlyIncomeTotal: `$${incomeTotal.toFixed(2)}`,
        topCategory: topCategory?.name
      }
    });

    const report = await prisma.aiReport.create({
      data: {
        userId,
        transactionId: data.transactionId,
        type: data.type as $Enums.AiReportType,
        ...generated
      }
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
