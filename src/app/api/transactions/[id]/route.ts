import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, requireUserId } from "@/lib/api";
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
    const raw = await request.json();

    // `{ restore: true }` brings a soft-deleted row back; otherwise it's a
    // normal field update validated against the schema.
    let transactionData: Prisma.TransactionUncheckedUpdateInput;
    if (raw?.restore === true) {
      transactionData = { deletedAt: null };
    } else {
      const data = transactionSchema.partial().parse(raw);
      transactionData = {
        ...data,
        aiMetadata: data.aiMetadata ? (data.aiMetadata as Prisma.InputJsonValue) : undefined
      };
    }

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
    const hard = new URL(request.url).searchParams.get("hard") === "true";

    if (hard) {
      await prisma.transaction.delete({ where: { id, userId } });
    } else {
      // Soft delete: keep the row so it can be restored from Trash.
      await prisma.transaction.update({ where: { id, userId }, data: { deletedAt: new Date() } });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
