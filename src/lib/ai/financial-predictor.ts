export type MonthlyData = {
  month: string;
  income: number;
  expense: number;
  saving: number;
};

export type PredictionScenario = {
  name: string;
  type: "optimistic" | "realistic" | "pessimistic";
  monthlyData: { month: string; balance: number; saving: number; expense: number }[];
  endBalance: number;
  totalSaving: number;
  description: string;
};

export type SpendingTrendPrediction = {
  direction: "increasing" | "decreasing" | "stable";
  avgMonthlyChange: number;
  avgMonthlyChangePct: number;
  explanation: string;
};

export type FinancialPrediction = {
  endOfMonthBalance: number;
  endOfMonthExpense: number;
  projectedSaving: number;
  savingRate: number;
  spendingTrend: SpendingTrendPrediction;
  scenarios: PredictionScenario[];
  monthlyHistory: MonthlyData[];
  predictedMonths: { month: string; income: number; expense: number; balance: number; saving: number; isPrediction: boolean }[];
  insights: string[];
  modelName: string;
};

export type PredictionInput = {
  currency: string;
  monthIncome: number;
  monthExpense: number;
  totalBalance: number;
  profileIncome: number;
  savingGoal: number;
  daysElapsed: number;
  daysInMonth: number;
  monthlyHistory: MonthlyData[];
};

export function generatePredictions(input: PredictionInput): FinancialPrediction {
  const cur = input.currency;
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  const { daysElapsed, daysInMonth } = input;
  const dayRatio = daysElapsed > 0 ? daysInMonth / daysElapsed : 1;

  // --- Project end of month ---
  const projectedExpense = Math.round(input.monthExpense * dayRatio);
  const projectedIncome = input.monthIncome > 0
    ? Math.round(input.monthIncome * dayRatio)
    : input.profileIncome;
  const projectedSaving = projectedIncome - projectedExpense;
  const endOfMonthBalance = input.totalBalance + (projectedIncome - input.monthIncome) - (projectedExpense - input.monthExpense);
  const savingRate = projectedIncome > 0 ? Math.round(((projectedIncome - projectedExpense) / projectedIncome) * 100) : 0;

  // --- Spending trend analysis ---
  const history = input.monthlyHistory.filter((m) => m.expense > 0);
  let spendingTrend: SpendingTrendPrediction;

  if (history.length >= 2) {
    const changes: number[] = [];
    for (let i = 1; i < history.length; i++) {
      if (history[i - 1].expense > 0) {
        changes.push(history[i].expense - history[i - 1].expense);
      }
    }
    const avgChange = changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : 0;
    const avgExpense = history.reduce((s, m) => s + m.expense, 0) / history.length;
    const avgChangePct = avgExpense > 0 ? (avgChange / avgExpense) * 100 : 0;

    let direction: "increasing" | "decreasing" | "stable";
    if (avgChangePct > 5) direction = "increasing";
    else if (avgChangePct < -5) direction = "decreasing";
    else direction = "stable";

    const dirLabel = direction === "increasing" ? "increasing" : direction === "decreasing" ? "decreasing" : "relatively stable";
    spendingTrend = {
      direction,
      avgMonthlyChange: Math.round(avgChange),
      avgMonthlyChangePct: Math.round(avgChangePct),
      explanation: `Your spending is ${dirLabel}, changing about ${fmt(Math.abs(Math.round(avgChange)))} ${cur} (${Math.abs(Math.round(avgChangePct))}%) per month on average.`,
    };
  } else {
    spendingTrend = {
      direction: "stable",
      avgMonthlyChange: 0,
      avgMonthlyChangePct: 0,
      explanation: "Not enough historical data to determine a spending trend. Keep tracking for more accurate predictions.",
    };
  }

  // --- Build predicted months (6 months into future) ---
  const avgIncome = history.length > 0
    ? history.reduce((s, m) => s + m.income, 0) / history.length
    : input.profileIncome;
  const avgExpense = history.length > 0
    ? history.reduce((s, m) => s + m.expense, 0) / history.length
    : projectedExpense;

  const now = new Date();
  const predictedMonths: FinancialPrediction["predictedMonths"] = [];

  // Add history months
  let runningBalance = input.totalBalance;
  for (const m of history.slice(-6)) {
    predictedMonths.push({
      month: m.month,
      income: m.income,
      expense: m.expense,
      balance: runningBalance,
      saving: m.saving,
      isPrediction: false,
    });
  }

  // Add future months
  let futureBalance = input.totalBalance;
  for (let i = 1; i <= 6; i++) {
    const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const label = futureDate.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

    const trendAdjust = spendingTrend.avgMonthlyChange * i;
    const predictedExpense = Math.max(Math.round(avgExpense + trendAdjust), 0);
    const predictedInc = Math.round(avgIncome);
    const saving = predictedInc - predictedExpense;
    futureBalance += saving;

    predictedMonths.push({
      month: label,
      income: predictedInc,
      expense: predictedExpense,
      balance: Math.round(futureBalance),
      saving,
      isPrediction: true,
    });
  }

  // --- Scenarios (6 months projection) ---
  const scenarios = buildScenarios(input, avgIncome, avgExpense, spendingTrend, cur, fmt);

  // --- Insights ---
  const insights: string[] = [];

  if (spendingTrend.direction === "increasing") {
    insights.push(`Your spending has been increasing by ~${fmt(Math.abs(spendingTrend.avgMonthlyChange))} ${cur}/month. If this continues, expenses will reach ${fmt(Math.round(avgExpense + spendingTrend.avgMonthlyChange * 6))} ${cur}/month in 6 months.`);
  } else if (spendingTrend.direction === "decreasing") {
    insights.push(`Great news — your spending has been decreasing by ~${fmt(Math.abs(spendingTrend.avgMonthlyChange))} ${cur}/month. Keep this trajectory!`);
  }

  if (projectedSaving > 0) {
    insights.push(`At current pace, you'll save ~${fmt(projectedSaving)} ${cur} this month (${savingRate}% saving rate).`);
  } else if (projectedSaving < 0) {
    insights.push(`Warning: You're projected to overspend by ${fmt(Math.abs(projectedSaving))} ${cur} this month.`);
  }

  if (input.savingGoal > 0) {
    if (projectedSaving >= input.savingGoal) {
      insights.push(`You're on track to exceed your ${fmt(input.savingGoal)} ${cur}/month saving goal!`);
    } else {
      const gap = input.savingGoal - Math.max(projectedSaving, 0);
      insights.push(`You need to cut ${fmt(gap)} ${cur} more in spending to reach your ${fmt(input.savingGoal)} ${cur}/month saving goal.`);
    }
  }

  const bestScenario = scenarios.find((s) => s.type === "optimistic");
  const worstScenario = scenarios.find((s) => s.type === "pessimistic");
  if (bestScenario && worstScenario) {
    insights.push(`In 6 months, your balance could range from ${fmt(worstScenario.endBalance)} ${cur} (pessimistic) to ${fmt(bestScenario.endBalance)} ${cur} (optimistic).`);
  }

  return {
    endOfMonthBalance: Math.round(endOfMonthBalance),
    endOfMonthExpense: projectedExpense,
    projectedSaving,
    savingRate,
    spendingTrend,
    scenarios,
    monthlyHistory: history,
    predictedMonths,
    insights,
    modelName: "local-prediction-engine",
  };
}

function buildScenarios(
  input: PredictionInput,
  avgIncome: number,
  avgExpense: number,
  trend: SpendingTrendPrediction,
  cur: string,
  fmt: (n: number) => string
): PredictionScenario[] {
  const now = new Date();
  const scenarios: PredictionScenario[] = [];

  const configs = [
    { name: "Optimistic", type: "optimistic" as const, expenseMultiplier: 0.85, incomeMultiplier: 1.05, trendFactor: -0.5, desc: "You reduce spending by 15% and income grows slightly" },
    { name: "Realistic", type: "realistic" as const, expenseMultiplier: 1.0, incomeMultiplier: 1.0, trendFactor: 1.0, desc: "Current trends continue as-is" },
    { name: "Pessimistic", type: "pessimistic" as const, expenseMultiplier: 1.15, incomeMultiplier: 0.95, trendFactor: 1.5, desc: "Spending increases 15% and income dips slightly" },
  ];

  for (const config of configs) {
    let balance = input.totalBalance;
    let totalSaving = 0;
    const monthlyData: PredictionScenario["monthlyData"] = [];

    for (let i = 1; i <= 6; i++) {
      const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = futureDate.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

      const trendAdjust = trend.avgMonthlyChange * i * config.trendFactor;
      const expense = Math.max(Math.round((avgExpense + trendAdjust) * config.expenseMultiplier), 0);
      const income = Math.round(avgIncome * config.incomeMultiplier);
      const saving = income - expense;
      balance += saving;
      totalSaving += saving;

      monthlyData.push({
        month: label,
        balance: Math.round(balance),
        saving,
        expense,
      });
    }

    scenarios.push({
      name: config.name,
      type: config.type,
      monthlyData,
      endBalance: Math.round(balance),
      totalSaving: Math.round(totalSaving),
      description: config.desc,
    });
  }

  return scenarios;
}
