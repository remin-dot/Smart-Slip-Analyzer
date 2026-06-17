import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, requireUserId, parseJson } from "@/lib/api";
import { wealthItemSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const { userId, response } = await requireUserId(request);
    if (response) return response;

    const [user, items, snapshots] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { currency: true },
      }),
      prisma.wealthItem.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.netWorthSnapshot.findMany({
        where: { userId },
        orderBy: { snapshotAt: "asc" },
        take: 24,
      }),
    ]);

    const currency = user?.currency ?? "USD";
    const toNum = (v: unknown): number => {
      if (typeof v === "number") return v;
      if (v && typeof v === "object" && "toNumber" in v) return (v as { toNumber: () => number }).toNumber();
      return Number(v);
    };

    const assetTypes = ["CASH", "INVESTMENT", "PROPERTY"] as const;
    const liabilityTypes = ["DEBT", "LOAN"] as const;

    let totalAssets = 0;
    let totalLiabilities = 0;
    const breakdown: Record<string, number> = {};

    const enrichedItems = items.map((item) => {
      const val = toNum(item.value);
      const isAsset = (assetTypes as readonly string[]).includes(item.type);
      if (isAsset) totalAssets += val;
      else totalLiabilities += val;
      breakdown[item.type] = (breakdown[item.type] ?? 0) + val;
      return { ...item, value: val };
    });

    const netWorth = totalAssets - totalLiabilities;

    const history = snapshots.map((s) => ({
      id: s.id,
      assets: toNum(s.assets),
      liabilities: toNum(s.liabilities),
      netWorth: toNum(s.netWorth),
      snapshotAt: s.snapshotAt.toISOString(),
    }));

    // growth calc from snapshots
    let growthAmount = 0;
    let growthPct = 0;
    if (history.length >= 2) {
      const oldest = history[0].netWorth;
      growthAmount = netWorth - oldest;
      growthPct = oldest !== 0 ? Math.round((growthAmount / Math.abs(oldest)) * 100) : 0;
    }

    return NextResponse.json({
      items: enrichedItems,
      summary: {
        totalAssets: Math.round(totalAssets * 100) / 100,
        totalLiabilities: Math.round(totalLiabilities * 100) / 100,
        netWorth: Math.round(netWorth * 100) / 100,
        breakdown,
        growthAmount: Math.round(growthAmount),
        growthPct,
      },
      history,
      currency,
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, response } = await requireUserId(request);
    if (response) return response;

    const data = await parseJson(request, wealthItemSchema);
    const item = await prisma.wealthItem.create({
      data: { ...data, userId },
    });

    // take a snapshot after every change
    await takeSnapshot(userId);

    return NextResponse.json({ item }, { status: 201 });
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
