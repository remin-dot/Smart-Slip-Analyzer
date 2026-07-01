import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, parseJson, requireUserId } from "@/lib/api";
import { transactionSchema } from "@/lib/validators";

const VALID_SORT_FIELDS = ["occurredAt", "amount", "merchant", "createdAt"] as const;
type SortField = (typeof VALID_SORT_FIELDS)[number];

export async function GET(request: NextRequest) {
  const { userId, response } = await requireUserId(request);
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const take = Math.min(Number(searchParams.get("take") ?? 25), 100);
  const skip = Math.max(Number(searchParams.get("skip") ?? 0), 0);
  const search = searchParams.get("search")?.trim() ?? "";
  const categoryId = searchParams.get("categoryId") || undefined;
  const type = searchParams.get("type") || undefined;
  const source = searchParams.get("source") || undefined;
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const sortBy = searchParams.get("sortBy") as SortField | null;
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";
  const deleted = searchParams.get("deleted") === "true";
  const favorite = searchParams.get("favorite") === "true";

  // Trash view shows only soft-deleted rows; every other view hides them.
  const where: Prisma.TransactionWhereInput = { userId, deletedAt: deleted ? { not: null } : null };

  if (favorite) where.isFavorite = true;
  if (categoryId) where.categoryId = categoryId;
  if (type) where.type = type as Prisma.EnumTransactionTypeFilter;
  if (source) where.source = source as Prisma.EnumTransactionSourceFilter;

  if (from || to) {
    where.occurredAt = {};
    if (from) where.occurredAt.gte = new Date(from);
    if (to) where.occurredAt.lte = new Date(to + "T23:59:59.999Z");
  }

  if (search) {
    where.OR = [
      { merchant: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const orderField = sortBy && VALID_SORT_FIELDS.includes(sortBy) ? sortBy : "occurredAt";

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { [orderField]: sortDir },
      take,
      skip,
    }),
    prisma.transaction.count({ where }),
  ]);

  return NextResponse.json({ transactions, total, take, skip });
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
