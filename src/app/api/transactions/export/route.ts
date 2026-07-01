import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/api";

// Exports the user's (non-deleted) transactions as CSV or JSON.
// Excel opens the CSV natively — no spreadsheet library needed.
export async function GET(request: NextRequest) {
  const { userId, response } = await requireUserId(request);
  if (response) return response;

  const format = new URL(request.url).searchParams.get("format") === "json" ? "json" : "csv";

  const rows = await prisma.transaction.findMany({
    where: { userId, deletedAt: null },
    include: { category: { select: { name: true } } },
    orderBy: { occurredAt: "desc" },
  });

  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    const data = rows.map((r) => ({
      date: r.occurredAt.toISOString(),
      merchant: r.merchant,
      description: r.description,
      category: r.category?.name ?? null,
      type: r.type,
      amount: Number(r.amount),
      currency: r.currency,
      source: r.source,
      tags: r.tags,
    }));
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="transactions-${stamp}.json"`,
      },
    });
  }

  const headers = ["Date", "Merchant", "Description", "Category", "Type", "Amount", "Currency", "Source", "Tags"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.occurredAt.toISOString().slice(0, 10),
        r.merchant,
        r.description ?? "",
        r.category?.name ?? "",
        r.type,
        Number(r.amount),
        r.currency,
        r.source,
        r.tags.join(" "),
      ]
        .map(esc)
        .join(",")
    ),
  ];
  // BOM so Excel reads UTF-8 (Thai/Chinese/Japanese) correctly.
  const csv = "﻿" + lines.join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="transactions-${stamp}.csv"`,
    },
  });
}
