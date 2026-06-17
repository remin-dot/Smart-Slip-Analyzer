import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiError, parseJson, requireUserId } from "@/lib/api";
import { classifyExpense } from "@/lib/ai/expense-classifier";

const classifySchema = z.object({
  transactionId: z.string().cuid(),
});

const classifyBatchSchema = z.object({
  transactionIds: z.array(z.string().cuid()).min(1).max(50),
});

export async function POST(request: NextRequest) {
  try {
    const { userId, response } = await requireUserId(request);
    if (response) return response;

    const body = await request.json();

    if ("transactionIds" in body) {
      const { transactionIds } = classifyBatchSchema.parse(body);
      return handleBatch(userId, transactionIds);
    }

    const { transactionId } = classifySchema.parse(body);
    return handleSingle(userId, transactionId);
  } catch (error) {
    return apiError(error);
  }
}

async function handleSingle(userId: string, transactionId: string) {
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, userId },
    include: { category: true },
  });

  if (!transaction) {
    return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  }

  const classification = await classifyExpense(
    transaction.merchant,
    transaction.description,
    Number(transaction.amount)
  );

  const category = await ensureCategory(userId, classification.category);

  const updated = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      categoryId: category.id,
      aiConfidence: classification.confidence,
      aiMetadata: {
        ...(typeof transaction.aiMetadata === "object" && transaction.aiMetadata !== null
          ? transaction.aiMetadata as Record<string, unknown>
          : {}),
        classifiedCategory: classification.category,
        classificationConfidence: classification.confidence,
        classificationExplanation: classification.explanation,
        classificationModel: classification.modelName,
      },
    },
    include: { category: true },
  });

  const aiReport = await prisma.aiReport.create({
    data: {
      userId,
      transactionId,
      type: "SLIP_EXTRACTION",
      title: "Expense classification",
      summary: classification.explanation,
      insights: {
        category: classification.category,
        confidence: classification.confidence,
        explanation: classification.explanation,
        merchant: transaction.merchant,
        amount: Number(transaction.amount),
      },
      actions: classification.confidence < 0.7
        ? ["Low confidence — review and correct the category if needed."]
        : ["Category assigned. Edit manually if incorrect."],
      modelName: classification.modelName,
      promptVersion: "v1",
      confidence: classification.confidence,
    },
  });

  return NextResponse.json({
    transaction: updated,
    classification,
    aiReport,
  });
}

async function handleBatch(userId: string, transactionIds: string[]) {
  const transactions = await prisma.transaction.findMany({
    where: { id: { in: transactionIds }, userId },
  });

  const results = await Promise.all(
    transactions.map(async (tx) => {
      const classification = await classifyExpense(
        tx.merchant,
        tx.description,
        Number(tx.amount)
      );

      const category = await ensureCategory(userId, classification.category);

      const updated = await prisma.transaction.update({
        where: { id: tx.id },
        data: {
          categoryId: category.id,
          aiConfidence: classification.confidence,
          aiMetadata: {
            ...(typeof tx.aiMetadata === "object" && tx.aiMetadata !== null
              ? tx.aiMetadata as Record<string, unknown>
              : {}),
            classifiedCategory: classification.category,
            classificationConfidence: classification.confidence,
            classificationExplanation: classification.explanation,
            classificationModel: classification.modelName,
          },
        },
        include: { category: true },
      });

      return { transaction: updated, classification };
    })
  );

  return NextResponse.json({ results, count: results.length });
}

async function ensureCategory(userId: string, name: string) {
  const colorMap: Record<string, { color: string; icon: string }> = {
    Food: { color: "#d85c46", icon: "Utensils" },
    Shopping: { color: "#2855a3", icon: "ShoppingBag" },
    Luxury: { color: "#cf8b21", icon: "Gem" },
    Transport: { color: "#087f7a", icon: "Train" },
    Entertainment: { color: "#7c3aed", icon: "Gamepad2" },
    Education: { color: "#0891b2", icon: "GraduationCap" },
    Investment: { color: "#20875a", icon: "TrendingUp" },
    Other: { color: "#687188", icon: "Wallet" },
  };

  const meta = colorMap[name] ?? { color: "#687188", icon: "Wallet" };

  return prisma.category.upsert({
    where: { userId_name: { userId, name } },
    update: {},
    create: {
      userId,
      name,
      color: meta.color,
      icon: meta.icon,
      isSystem: true,
    },
  });
}
