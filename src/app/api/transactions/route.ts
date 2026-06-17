import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, parseJson, requireUserId } from "@/lib/api";
import { transactionSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { userId, response } = await requireUserId(request);
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const take = Math.min(Number(searchParams.get("take") ?? 25), 100);
  const categoryId = searchParams.get("categoryId") ?? undefined;

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      categoryId
    },
    include: { category: true },
    orderBy: { occurredAt: "desc" },
    take
  });

  return NextResponse.json({ transactions });
}

export async function POST(request: NextRequest) {
  try {
    const { userId, response } = await requireUserId(request);
    if (response) return response;

    const data = await parseJson(request, transactionSchema);
    const transactionData: Prisma.TransactionUncheckedCreateInput = {
      ...data,
      userId,
      aiMetadata: data.aiMetadata ? (data.aiMetadata as Prisma.InputJsonValue) : undefined
    };
    const transaction = await prisma.transaction.create({
      data: transactionData,
      include: { category: true }
    });

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
