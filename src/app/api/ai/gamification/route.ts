import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, requireUserId } from "@/lib/api";

type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number;
  target: number;
};

type Level = {
  rank: number;
  name: string;
  minXp: number;
  icon: string;
};

const LEVELS: Level[] = [
  { rank: 1, name: "Beginner Saver", minXp: 0, icon: "Sprout" },
  { rank: 2, name: "Money Manager", minXp: 500, icon: "Wallet" },
  { rank: 3, name: "Investor", minXp: 1500, icon: "TrendingUp" },
  { rank: 4, name: "Financial Freedom", minXp: 4000, icon: "Crown" },
];

export async function GET(request: NextRequest) {
  try {
    const { userId, response } = await requireUserId(request);
    if (response) return response;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [user, txAll, goals, budgets, wealthItems] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { currency: true, monthlyIncome: true, createdAt: true },
      }),
      prisma.transaction.findMany({
        where: { userId },
        select: { type: true, amount: true, occurredAt: true },
        orderBy: { occurredAt: "asc" },
      }),
      prisma.financialGoal.findMany({
        where: { userId },
        select: { status: true, currentAmount: true, createdAt: true },
      }),
      prisma.budget.findMany({
        where: { userId, isActive: true },
        select: { id: true, createdAt: true },
      }),
      prisma.wealthItem.findMany({
        where: { userId },
        select: { type: true, value: true, createdAt: true },
      }),
    ]);

    const currency = user?.currency ?? "USD";
    const toNum = (v: unknown): number => {
      if (typeof v === "number") return v;
      if (v && typeof v === "object" && "toNumber" in v) return (v as { toNumber: () => number }).toNumber();
      return Number(v);
    };

    // --- Compute stats ---
    let totalIncome = 0;
    let totalExpense = 0;
    let totalSaving = 0;
    const monthlyExpenses = new Map<string, number>();

    for (const tx of txAll) {
      const amt = toNum(tx.amount);
      if (tx.type === "INCOME") totalIncome += amt;
      else totalExpense += amt;

      if (tx.type !== "INCOME") {
        const key = `${tx.occurredAt.getFullYear()}-${tx.occurredAt.getMonth()}`;
        monthlyExpenses.set(key, (monthlyExpenses.get(key) ?? 0) + amt);
      }
    }
    totalSaving = totalIncome - totalExpense;

    // Check for no-spend streaks (7+ day gaps in expenses)
    const expenseDates = txAll
      .filter((t) => t.type !== "INCOME")
      .map((t) => t.occurredAt.getTime());
    let longestNoSpendDays = 0;
    if (expenseDates.length >= 2) {
      const sorted = [...new Set(expenseDates)].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) {
        const gap = (sorted[i] - sorted[i - 1]) / (1000 * 60 * 60 * 24);
        if (gap > longestNoSpendDays) longestNoSpendDays = gap;
      }
    }

    const completedGoals = goals.filter((g) => g.status === "COMPLETED").length;
    const totalGoalSaved = goals.reduce((s, g) => s + toNum(g.currentAmount), 0);
    const txCount = txAll.length;
    const monthsActive = user?.createdAt
      ? Math.max(1, Math.ceil((now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30.44)))
      : 1;
    const savingRate = totalIncome > 0 ? (totalSaving / totalIncome) * 100 : 0;
    const hasInvestment = wealthItems.some((w) => w.type === "INVESTMENT");
    const hasProperty = wealthItems.some((w) => w.type === "PROPERTY");

    // Current month spending
    const curMonthExpense = txAll
      .filter((t) => t.type !== "INCOME" && t.occurredAt >= monthStart)
      .reduce((s, t) => s + toNum(t.amount), 0);
    const monthlyIncome = Number(user?.monthlyIncome ?? 0);
    const curMonthUnderBudget = monthlyIncome > 0 && curMonthExpense < monthlyIncome * 0.7;

    // --- XP calculation ---
    // ponytail: simple additive XP from real actions, no inflation
    let xp = 0;
    xp += Math.min(txCount * 5, 500);          // up to 500 XP from tracking
    xp += Math.min(Math.floor(totalSaving / 1000) * 50, 1000); // up to 1000 XP from saving
    xp += completedGoals * 200;                 // 200 XP per completed goal
    xp += budgets.length * 50;                  // 50 XP per budget set
    xp += goals.length * 30;                    // 30 XP per goal created
    xp += wealthItems.length * 40;              // 40 XP per wealth item tracked
    if (hasInvestment) xp += 300;               // bonus for investing
    if (savingRate > 20) xp += 200;             // bonus for good saving rate
    if (monthsActive >= 3) xp += 150;           // loyalty bonus
    if (longestNoSpendDays >= 7) xp += 250;     // discipline bonus

    // --- Level ---
    let currentLevel = LEVELS[0];
    let nextLevel: Level | null = LEVELS[1];
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (xp >= LEVELS[i].minXp) {
        currentLevel = LEVELS[i];
        nextLevel = LEVELS[i + 1] ?? null;
        break;
      }
    }
    const levelProgress = nextLevel
      ? Math.min(Math.round(((xp - currentLevel.minXp) / (nextLevel.minXp - currentLevel.minXp)) * 100), 100)
      : 100;

    // --- Achievements ---
    const achievements: Achievement[] = [
      {
        id: "first_saving",
        name: "First Saving",
        description: "Save money for the first time",
        icon: "PiggyBank",
        unlocked: totalSaving > 0,
        unlockedAt: totalSaving > 0 ? (txAll.find((t) => t.type === "INCOME")?.occurredAt.toISOString() ?? null) : null,
        progress: Math.min(totalSaving > 0 ? 1 : 0, 1),
        target: 1,
      },
      {
        id: "save_100k",
        name: "Save 100K",
        description: `Accumulate 100,000 ${currency} in total savings`,
        icon: "Gem",
        unlocked: totalSaving >= 100000,
        unlockedAt: null,
        progress: Math.min(Math.round(totalSaving), 100000),
        target: 100000,
      },
      {
        id: "no_spend_week",
        name: "No Spend Week",
        description: "Go 7 consecutive days without spending",
        icon: "ShieldCheck",
        unlocked: longestNoSpendDays >= 7,
        unlockedAt: null,
        progress: Math.min(Math.round(longestNoSpendDays), 7),
        target: 7,
      },
      {
        id: "track_50",
        name: "Tracker Pro",
        description: "Record 50 transactions",
        icon: "ClipboardList",
        unlocked: txCount >= 50,
        unlockedAt: txCount >= 50 ? txAll[49]?.occurredAt.toISOString() ?? null : null,
        progress: Math.min(txCount, 50),
        target: 50,
      },
      {
        id: "goal_setter",
        name: "Goal Setter",
        description: "Create your first saving goal",
        icon: "Target",
        unlocked: goals.length > 0,
        unlockedAt: goals.length > 0 ? goals[0].createdAt.toISOString() : null,
        progress: Math.min(goals.length, 1),
        target: 1,
      },
      {
        id: "goal_crusher",
        name: "Goal Crusher",
        description: "Complete a saving goal",
        icon: "Trophy",
        unlocked: completedGoals > 0,
        unlockedAt: null,
        progress: Math.min(completedGoals, 1),
        target: 1,
      },
      {
        id: "budget_master",
        name: "Budget Master",
        description: "Set up 3 active budgets",
        icon: "BarChart3",
        unlocked: budgets.length >= 3,
        unlockedAt: budgets.length >= 3 ? budgets[2].createdAt.toISOString() : null,
        progress: Math.min(budgets.length, 3),
        target: 3,
      },
      {
        id: "investor",
        name: "First Investment",
        description: "Add an investment to your wealth portfolio",
        icon: "TrendingUp",
        unlocked: hasInvestment,
        unlockedAt: hasInvestment ? wealthItems.find((w) => w.type === "INVESTMENT")?.createdAt.toISOString() ?? null : null,
        progress: hasInvestment ? 1 : 0,
        target: 1,
      },
      {
        id: "property_owner",
        name: "Property Owner",
        description: "Add a property asset to your portfolio",
        icon: "Building2",
        unlocked: hasProperty,
        unlockedAt: null,
        progress: hasProperty ? 1 : 0,
        target: 1,
      },
      {
        id: "saver_20",
        name: "20% Saver",
        description: "Maintain a 20%+ saving rate",
        icon: "Percent",
        unlocked: savingRate >= 20,
        unlockedAt: null,
        progress: Math.min(Math.round(savingRate), 20),
        target: 20,
      },
      {
        id: "under_budget",
        name: "Under Budget",
        description: "Spend less than 70% of income this month",
        icon: "ArrowDownCircle",
        unlocked: curMonthUnderBudget,
        unlockedAt: null,
        progress: monthlyIncome > 0 ? Math.min(Math.round((1 - curMonthExpense / monthlyIncome) * 100), 30) : 0,
        target: 30,
      },
      {
        id: "three_months",
        name: "Consistent Tracker",
        description: "Use the app for 3+ months",
        icon: "Calendar",
        unlocked: monthsActive >= 3,
        unlockedAt: null,
        progress: Math.min(monthsActive, 3),
        target: 3,
      },
    ];

    const unlockedCount = achievements.filter((a) => a.unlocked).length;

    return NextResponse.json({
      xp,
      level: currentLevel,
      nextLevel,
      levelProgress,
      levels: LEVELS,
      achievements,
      stats: {
        unlockedCount,
        totalAchievements: achievements.length,
        totalSaving: Math.round(totalSaving),
        txCount,
        completedGoals,
        monthsActive,
        savingRate: Math.round(savingRate),
      },
      currency,
    });
  } catch (error) {
    return apiError(error);
  }
}
