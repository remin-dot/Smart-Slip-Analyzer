export type ScoreLevel = "Poor" | "Average" | "Good" | "Excellent";

// i18n params: numbers are pre-formatted to strings before they reach the client.
type Params = Record<string, string | number>;

export type ScoreFactor = {
  name: string; // stable English id (used for icon lookup)
  nameKey: string;
  score: number;
  maxScore: number;
  weight: number;
  level: ScoreLevel;
  descKey: string;
  descParams?: Params;
  descExtraKey?: string; // optional appended clause
  descExtraParams?: Params;
  tipKey: string;
  tipParams?: Params;
};

export type HealthScore = {
  totalScore: number;
  level: ScoreLevel;
  factors: ScoreFactor[];
  modelName: string;
};

type HealthScoreInput = {
  currency: string;
  monthIncome: number;
  monthExpense: number;
  prevMonthExpense: number;
  savingRate: number;
  savingGoal: number;
  totalBalance: number;
  budgets: { categoryName: string; limit: number; spent: number }[];
  monthlyExpenses: { month: string; expense: number }[];
  categorySpending: { name: string; currentMonth: number; previousMonth: number }[];
};

function scoreLevel(pct: number): ScoreLevel {
  if (pct >= 80) return "Excellent";
  if (pct >= 60) return "Good";
  if (pct >= 40) return "Average";
  return "Poor";
}

function overallLevel(score: number): ScoreLevel {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Average";
  return "Poor";
}

function fmtNum(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function calculateHealthScore(input: HealthScoreInput): HealthScore {
  const factors: ScoreFactor[] = [];
  const cur = input.currency;

  // --- Factor 1: Saving Rate (weight 30%) ---
  let savingRateScore: number;
  let srDescKey: string;
  let srDescParams: Params | undefined;
  let srTipKey: string;
  let srTipParams: Params | undefined;

  if (input.monthIncome <= 0) {
    savingRateScore = 0;
    srDescKey = "health.srDescNoIncome";
    srTipKey = "health.srTipNoIncome";
  } else {
    const rate = input.savingRate;
    if (rate >= 30) savingRateScore = 100;
    else if (rate >= 20) savingRateScore = 80;
    else if (rate >= 10) savingRateScore = 55;
    else if (rate >= 0) savingRateScore = 30;
    else savingRateScore = 5;

    if (rate >= 0) {
      srDescKey = "health.srDescSave";
      srDescParams = { rate, amount: fmtNum(input.monthIncome - input.monthExpense), cur };
    } else {
      srDescKey = "health.srDescOver";
      srDescParams = { amount: fmtNum(input.monthExpense - input.monthIncome), cur };
    }

    if (rate >= 20) {
      srTipKey = "health.srTipHealthy";
    } else if (rate >= 0) {
      srTipKey = "health.srTipAim";
      srTipParams = { amount: fmtNum(input.monthIncome * 0.2 - (input.monthIncome - input.monthExpense)), cur };
    } else {
      srTipKey = "health.srTipReduce";
    }
  }

  factors.push({
    name: "Saving Rate",
    nameKey: "health.nSavingRate",
    score: savingRateScore,
    maxScore: 100,
    weight: 30,
    level: scoreLevel(savingRateScore),
    descKey: srDescKey,
    descParams: srDescParams,
    tipKey: srTipKey,
    tipParams: srTipParams,
  });

  // --- Factor 2: Spending Habits (weight 25%) ---
  let spendingScore: number;
  let shDescKey: string;
  let shDescParams: Params | undefined;
  let shDescExtraKey: string | undefined;
  let shDescExtraParams: Params | undefined;
  let shTipKey: string;
  let shTipParams: Params | undefined;

  if (input.prevMonthExpense <= 0 && input.monthExpense <= 0) {
    spendingScore = 50;
    shDescKey = "health.shDescNoData";
    shTipKey = "health.shTipNoData";
  } else {
    const momChange = input.prevMonthExpense > 0
      ? ((input.monthExpense - input.prevMonthExpense) / input.prevMonthExpense) * 100
      : 0;

    const topCategory = input.categorySpending.length > 0
      ? input.categorySpending.reduce((a, b) => a.currentMonth > b.currentMonth ? a : b)
      : null;
    const topCategoryPct = topCategory && input.monthExpense > 0
      ? (topCategory.currentMonth / input.monthExpense) * 100
      : 0;

    let momScore: number;
    if (momChange <= -10) momScore = 100;
    else if (momChange <= 0) momScore = 85;
    else if (momChange <= 10) momScore = 70;
    else if (momChange <= 25) momScore = 45;
    else momScore = 20;

    const diversityScore = topCategoryPct > 60 ? 30 : topCategoryPct > 40 ? 60 : 85;
    spendingScore = Math.round(momScore * 0.6 + diversityScore * 0.4);

    if (input.prevMonthExpense > 0) {
      shDescKey = momChange > 0 ? "health.shDescIncreased" : "health.shDescDecreased";
      shDescParams = { pct: Math.abs(Math.round(momChange)) };
    } else {
      shDescKey = "health.shDescThisMonth";
      shDescParams = { amount: fmtNum(input.monthExpense), cur };
    }

    if (topCategory && topCategoryPct > 40) {
      shDescExtraKey = "health.shDescTopCat";
      shDescExtraParams = { cat: topCategory.name, pct: Math.round(topCategoryPct) };
    }

    if (momChange > 15) {
      shTipKey = "health.shTipClimbing";
    } else if (topCategoryPct > 50) {
      shTipKey = "health.shTipTopCat";
      shTipParams = { cat: topCategory!.name };
    } else {
      shTipKey = "health.shTipReasonable";
    }
  }

  factors.push({
    name: "Spending Habits",
    nameKey: "health.nSpendingHabits",
    score: spendingScore,
    maxScore: 100,
    weight: 25,
    level: scoreLevel(spendingScore),
    descKey: shDescKey,
    descParams: shDescParams,
    descExtraKey: shDescExtraKey,
    descExtraParams: shDescExtraParams,
    tipKey: shTipKey,
    tipParams: shTipParams,
  });

  // --- Factor 3: Budget Control (weight 25%) ---
  let budgetScore: number;
  let bcDescKey: string;
  let bcDescParams: Params | undefined;
  let bcTipKey: string;
  let bcTipParams: Params | undefined;

  if (input.budgets.length === 0) {
    budgetScore = 40;
    bcDescKey = "health.bcDescNoBudget";
    bcTipKey = "health.bcTipNoBudget";
  } else {
    const budgetResults = input.budgets.map((b) => {
      const ratio = b.limit > 0 ? b.spent / b.limit : 0;
      return { ...b, ratio };
    });

    const underBudget = budgetResults.filter((b) => b.ratio <= 1).length;
    const overBudget = budgetResults.filter((b) => b.ratio > 1).length;
    const avgRatio = budgetResults.reduce((sum, b) => sum + Math.min(b.ratio, 2), 0) / budgetResults.length;

    if (avgRatio <= 0.7) budgetScore = 95;
    else if (avgRatio <= 0.9) budgetScore = 80;
    else if (avgRatio <= 1.0) budgetScore = 65;
    else if (avgRatio <= 1.2) budgetScore = 40;
    else budgetScore = 20;

    if (overBudget > 0) {
      bcDescKey = "health.bcDescOnTrackOver";
      bcDescParams = { under: underBudget, total: budgetResults.length, over: overBudget };
    } else {
      bcDescKey = "health.bcDescOnTrack";
      bcDescParams = { under: underBudget, total: budgetResults.length };
    }

    if (overBudget > 0) {
      const worstOver = budgetResults.filter((b) => b.ratio > 1).sort((a, b) => b.ratio - a.ratio)[0];
      bcTipKey = "health.bcTipOver";
      bcTipParams = { cat: worstOver.categoryName, pct: Math.round((worstOver.ratio - 1) * 100) };
    } else if (avgRatio <= 0.7) {
      bcTipKey = "health.bcTipUnder";
    } else {
      bcTipKey = "health.bcTipClose";
    }
  }

  factors.push({
    name: "Budget Control",
    nameKey: "health.nBudgetControl",
    score: budgetScore,
    maxScore: 100,
    weight: 25,
    level: scoreLevel(budgetScore),
    descKey: bcDescKey,
    descParams: bcDescParams,
    tipKey: bcTipKey,
    tipParams: bcTipParams,
  });

  // --- Factor 4: Expense Consistency (weight 20%) ---
  let consistencyScore: number;
  let ecDescKey: string;
  let ecDescParams: Params | undefined;
  let ecTipKey: string;

  const expenseValues = input.monthlyExpenses.map((m) => m.expense).filter((e) => e > 0);

  if (expenseValues.length < 2) {
    consistencyScore = 50;
    ecDescKey = "health.ecDescNeedData";
    ecTipKey = "health.ecTipNeedData";
  } else {
    const mean = expenseValues.reduce((a, b) => a + b, 0) / expenseValues.length;
    const variance = expenseValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / expenseValues.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? (stdDev / mean) * 100 : 0;

    if (cv <= 10) consistencyScore = 95;
    else if (cv <= 20) consistencyScore = 80;
    else if (cv <= 35) consistencyScore = 60;
    else if (cv <= 50) consistencyScore = 40;
    else consistencyScore = 20;

    ecDescKey = cv <= 20 ? "health.ecDescStable" : cv <= 40 ? "health.ecDescModerate" : "health.ecDescVary";
    ecDescParams = { pct: Math.round(cv) };

    if (cv <= 15) ecTipKey = "health.ecTipExcellent";
    else if (cv <= 30) ecTipKey = "health.ecTipMild";
    else ecTipKey = "health.ecTipHigh";
  }

  factors.push({
    name: "Expense Consistency",
    nameKey: "health.nExpenseConsistency",
    score: consistencyScore,
    maxScore: 100,
    weight: 20,
    level: scoreLevel(consistencyScore),
    descKey: ecDescKey,
    descParams: ecDescParams,
    tipKey: ecTipKey,
  });

  // --- Compute weighted total ---
  const totalScore = Math.round(
    factors.reduce((sum, f) => sum + (f.score * f.weight) / 100, 0)
  );

  return {
    totalScore,
    level: overallLevel(totalScore),
    factors,
    modelName: "local-rule-engine",
  };
}
