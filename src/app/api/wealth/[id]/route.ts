import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, requireUserId } from "@/lib/api";
import { wealthItemSchema } from "@/lib/validators";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, response } = await requireUserId(request);
    if (response) return response;

    const { id } = await params;
    const existing = await prisma.wealthItem.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const data = wealthItemSchema.partial().parse(body);
    const item = await prisma.wealthItem.update({ where: { id }, data });

    // re-snapshot
    await takeSnapshot(userId);

    return NextResponse.json({ item });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, response } = await requireUserId(request);
    if (response) return response;

    const { id } = await params;
    const existing = await prisma.wealthItem.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.wealthItem.delete({ where: { id } });
    await takeSnapshot(userId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

async function takeSnapshot(userId: string) {
  const items = await prisma.wealthItem.findMany({ where: { userId } });
  const toNum = (v: unknown): number => {
    if (typeof v === "number") return v;
    if (v && typeof v === "object" && "toNumber" in v) return (v as { toNumber: () => number }).toNumber();
    return Number(v);
  };

  let assets = 0;
  let liabilities = 0;
  for (const item of items) {
    const val = toNum(item.value);
    if (["CASH", "INVESTMENT", "PROPERTY"].includes(item.type)) assets += val;
    else liabilities += val;
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { currency: true } });

  await prisma.netWorthSnapshot.create({
    data: {
      userId,
      assets,
      liabilities,
      netWorth: assets - liabilities,
      currency: user?.currency ?? "USD",
    },
  });
}
