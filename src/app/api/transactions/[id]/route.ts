import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, parseJson, requireUserId } from "@/lib/api";
import { transactionSchema } from "@/lib/validators";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  const { userId, response } = await requireUserId(request);
  if (response) return response;

  const { id } = await params;
  const transaction = await prisma.transaction.findFirst({
    where: { id, userId },
    include: { category: true, aiReports: true }
  });

  if (!transaction) {
    return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  }

  return NextResponse.json({ transaction });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { userId, response } = await requireUserId(request);
    if (response) return response;

    const { id } = await params;
    const data = await parseJson(request, transactionSchema.partial());
    const transactionData: Prisma.TransactionUncheckedUpdateInput = {
      ...data,
      aiMetadata: data.aiMetadata ? (data.aiMetadata as Prisma.InputJsonValue) : undefined
    };
    const transaction = await prisma.transaction.update({
      where: { id, userId },
      data: transactionData,
      include: { category: true }
    });

    return NextResponse.json({ transaction });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { userId, response } = await requireUserId(request);
    if (response) return response;

    const { id } = await params;
    await prisma.transaction.delete({ where: { id, userId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
