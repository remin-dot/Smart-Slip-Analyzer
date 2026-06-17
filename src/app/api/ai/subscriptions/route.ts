import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, requireUserId } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const { userId, response } = await requireUserId(request);
    if (response) return response;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [user, transactions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { currency: true, monthlyIncome: true },
      }),
      prisma.transaction.findMany({
        where: { userId, type: "EXPENSE", occurredAt: { gte: sixMonthsAgo } },
        select: { merchant: true, amount: true, occurredAt: true, description: true },
        orderBy: { occurredAt: "desc" },
      }),
    ]);

    const currency = user?.currency ?? "USD";
    const monthlyIncome = Number(user?.monthlyIncome ?? 0);

    // ponytail: group by merchant+amount, detect ≥2 occurrences ~30 days apart
    const merchantGroups = new Map<string, { amount: number; dates: Date[]; description: string | null }[]>();

    for (const tx of transactions) {
      const key = tx.merchant.toLowerCase().trim();
      const amt = Number(tx.amount);
      if (!merchantGroups.has(key)) merchantGroups.set(key, []);
      const group = merchantGroups.get(key)!;

      const match = group.find((g) => Math.abs(g.amount - amt) / Math.max(g.amount, 1) < 0.1);
      if (match) {
        match.dates.push(tx.occurredAt);
        if (!match.description && tx.description) match.description = tx.description;
      } else {
        group.push({ amount: amt, dates: [tx.occurredAt], description: tx.description });
      }
    }

    type Subscription = {
      merchant: string;
      amount: number;
      frequency: "monthly" | "quarterly" | "yearly";
      monthlyEquivalent: number;
      yearlyEquivalent: number;
      occurrences: number;
      lastPaid: string;
      avgDaysBetween: number;
      confidence: number;
      description: string | null;
      status: "active" | "possibly_unused";
    };

    const subscriptions: Subscription[] = [];

    for (const [merchant, groups] of merchantGroups) {
      for (const g of groups) {
        if (g.dates.length < 2) continue;

        const sorted = g.dates.sort((a, b) => a.getTime() - b.getTime());
        const gaps: number[] = [];
        for (let i = 1; i < sorted.length; i++) {
          gaps.push((sorted[i].getTime() - sorted[i - 1].getTime()) / (1000 * 60 * 60 * 24));
        }
        const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

        let frequency: "monthly" | "quarterly" | "yearly";
        let confidence = 0;

        if (avgGap >= 20 && avgGap <= 40) {
          frequency = "monthly";
          confidence = Math.min(0.5 + g.dates.length * 0.12, 1);
        } else if (avgGap >= 75 && avgGap <= 105) {
          frequency = "quarterly";
          confidence = Math.min(0.4 + g.dates.length * 0.15, 1);
        } else if (avgGap >= 330 && avgGap <= 400) {
          frequency = "yearly";
          confidence = Math.min(0.35 + g.dates.length * 0.2, 1);
        } else {
          continue;
        }

        // consistency bonus
        const gapVariance = gaps.reduce((s, gap) => s + Math.pow(gap - avgGap, 2), 0) / gaps.length;
        const gapStdDev = Math.sqrt(gapVariance);
        if (gapStdDev < 5) confidence = Math.min(confidence + 0.15, 1);

        if (confidence < 0.4) continue;

        const monthlyEquivalent = frequency === "monthly" ? g.amount
          : frequency === "quarterly" ? Math.round(g.amount / 3)
          : Math.round(g.amount / 12);

        const lastPaid = sorted[sorted.length - 1];
        const daysSinceLastPayment = (Date.now() - lastPaid.getTime()) / (1000 * 60 * 60 * 24);

        const expectedGap = frequency === "monthly" ? 35 : frequency === "quarterly" ? 110 : 400;
        const status = daysSinceLastPayment > expectedGap * 1.5 ? "possibly_unused" : "active";

        const displayMerchant = transactions.find(
          (t) => t.merchant.toLowerCase().trim() === merchant
        )?.merchant ?? merchant;

        subscriptions.push({
          merchant: displayMerchant,
          amount: Math.round(g.amount * 100) / 100,
          frequency,
          monthlyEquivalent,
          yearlyEquivalent: monthlyEquivalent * 12,
          occurrences: g.dates.length,
          lastPaid: lastPaid.toISOString(),
          avgDaysBetween: Math.round(avgGap),
          confidence: Math.round(confidence * 100) / 100,
          description: g.description,
          status,
        });
      }
    }

    subscriptions.sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent);

    const totalMonthly = subscriptions.reduce((s, sub) => s + sub.monthlyEquivalent, 0);
    const totalYearly = totalMonthly * 12;
    const activeCount = subscriptions.filter((s) => s.status === "active").length;
    const unusedCount = subscriptions.filter((s) => s.status === "possibly_unused").length;
    const unusedMonthly = subscriptions
      .filter((s) => s.status === "possibly_unused")
      .reduce((s, sub) => s + sub.monthlyEquivalent, 0);
    const incomePercent = monthlyIncome > 0 ? Math.round((totalMonthly / monthlyIncome) * 100) : 0;

    // recommendations
    const recommendations: string[] = [];
    const unused = subscriptions.filter((s) => s.status === "possibly_unused");
    if (unused.length > 0) {
      recommendations.push(
        `You have ${unused.length} subscription${unused.length > 1 ? "s" : ""} that may no longer be in use. Cancelling ${unused.length > 1 ? "them" : "it"} could save ~${unusedMonthly.toLocaleString()} ${currency}/month.`
      );
    }
    if (incomePercent > 15) {
      recommendations.push(
        `Subscriptions take ${incomePercent}% of your income — consider auditing which ones you actually use weekly.`
      );
    }
    const expensive = subscriptions.filter((s) => s.monthlyEquivalent > totalMonthly * 0.3 && subscriptions.length > 1);
    if (expensive.length > 0) {
      recommendations.push(
        `${expensive[0].merchant} alone is ${Math.round((expensive[0].monthlyEquivalent / totalMonthly) * 100)}% of your subscription costs. Look for cheaper alternatives.`
      );
    }
    if (subscriptions.length > 5) {
      recommendations.push(
        `You have ${subscriptions.length} recurring subscriptions. Review each one quarterly to avoid subscription creep.`
      );
    }
    if (recommendations.length === 0 && subscriptions.length > 0) {
      recommendations.push("Your subscription spending looks reasonable. Keep monitoring for any services you stop using.");
    }

    return NextResponse.json({
      subscriptions,
      summary: { totalMonthly, totalYearly, activeCount, unusedCount, unusedMonthly, incomePercent },
      recommendations,
      currency,
    });
  } catch (error) {
    return apiError(error);
  }
}
