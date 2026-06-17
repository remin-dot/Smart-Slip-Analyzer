export type ScoreLevel = "Poor" | "Average" | "Good" | "Excellent";

export type ScoreFactor = {
  name: string;
  score: number;
  maxScore: number;
  weight: number;
  level: ScoreLevel;
  description: string;
  tip: string;
};

export type HealthScore = {
  totalScore: number;
  level: ScoreLevel;
  factors: ScoreFactor[];
  summary: string;
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
  let savingRateTip: string;
  let savingRateDesc: string;

  if (input.monthIncome <= 0) {
    savingRateScore = 0;
    savingRateDesc = "No income recorded this month.";
    savingRateTip = "Add your income transactions to get an accurate saving rate.";
  } else {
    const rate = input.savingRate;
    if (rate >= 30) savingRateScore = 100;
    else if (rate >= 20) savingRateScore = 80;
    else if (rate >= 10) savingRateScore = 55;
    else if (rate >= 0) savingRateScore = 30;
    else savingRateScore = 5;

    savingRateDesc = rate >= 0
      ? `You save ${rate}% of your income (${fmtNum(input.monthIncome - input.monthExpense)} ${cur}/month).`
      : `You're spending ${fmtNum(input.monthExpense - input.monthIncome)} ${cur} more than you earn.`;

    if (rate >= 20) savingRateTip = "Your saving rate is healthy. Consider increasing it further for faster wealth building.";
    else if (rate >= 0) savingRateTip = `Aim for 20% saving rate — you need to cut ${fmtNum(input.monthIncome * 0.2 - (input.monthIncome - input.monthExpense))} ${cur}/month in expenses.`;
    else savingRateTip = "Reduce spending to at least match your income before focusing on savings.";
  }

  factors.push({
    name: "Saving Rate",
    score: savingRateScore,
    maxScore: 100,
    weight: 30,
    level: scoreLevel(savingRateScore),
    description: savingRateDesc,
    tip: savingRateTip,
  });

  // --- Factor 2: Spending Habits (weight 25%) ---
  let spendingScore: number;
  let spendingDesc: string;
  let spendingTip: string;

  if (input.prevMonthExpense <= 0 && input.monthExpense <= 0) {
    spendingScore = 50;
    spendingDesc = "Not enough expense data to evaluate spending habits.";
    spendingTip = "Continue tracking expenses to get a more accurate assessment.";
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

    const changeDir = momChange > 0 ? "increased" : "decreased";
    spendingDesc = input.prevMonthExpense > 0
      ? `Monthly spending ${changeDir} ${Math.abs(Math.round(momChange))}% vs last month.`
      : `This month's expenses total ${fmtNum(input.monthExpense)} ${cur}.`;

    if (topCategory && topCategoryPct > 40) {
      spendingDesc += ` ${topCategory.name} dominates at ${Math.round(topCategoryPct)}%.`;
    }

    if (momChange > 15) spendingTip = "Your spending is climbing fast. Review recent expenses for non-essential purchases.";
    else if (topCategoryPct > 50) spendingTip = `${topCategory!.name} takes over half your budget. Look for ways to reduce it.`;
    else spendingTip = "Your spending habits are reasonable. Keep monitoring for any unusual spikes.";
  }

  factors.push({
    name: "Spending Habits",
    score: spendingScore,
    maxScore: 100,
    weight: 25,
    level: scoreLevel(spendingScore),
    description: spendingDesc,
    tip: spendingTip,
  });

  // --- Factor 3: Budget Control (weight 25%) ---
  let budgetScore: number;
  let budgetDesc: string;
  let budgetTip: string;

  if (input.budgets.length === 0) {
    budgetScore = 40;
    budgetDesc = "No budgets set. Setting category budgets improves financial control.";
    budgetTip = "Create budgets for your top spending categories to track limits.";
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

    budgetDesc = `${underBudget} of ${budgetResults.length} budgets on track${overBudget > 0 ? `, ${overBudget} over limit` : ""}.`;

    if (overBudget > 0) {
      const worstOver = budgetResults.filter((b) => b.ratio > 1).sort((a, b) => b.ratio - a.ratio)[0];
      budgetTip = `${worstOver.categoryName} is ${Math.round((worstOver.ratio - 1) * 100)}% over budget. Adjust spending or increase the limit.`;
    } else if (avgRatio <= 0.7) {
      budgetTip = "All budgets well under control. You could tighten limits to save even more.";
    } else {
      budgetTip = "Budgets are close to limits. Stay mindful of spending in the remaining days.";
    }
  }

  factors.push({
    name: "Budget Control",
    score: budgetScore,
    maxScore: 100,
    weight: 25,
    level: scoreLevel(budgetScore),
    description: budgetDesc,
    tip: budgetTip,
  });

  // --- Factor 4: Expense Consistency (weight 20%) ---
  let consistencyScore: number;
  let consistencyDesc: string;
  let consistencyTip: string;

  const expenseValues = input.monthlyExpenses.map((m) => m.expense).filter((e) => e > 0);

  if (expenseValues.length < 2) {
    consistencyScore = 50;
    consistencyDesc = "Need at least 2 months of data to measure expense consistency.";
    consistencyTip = "Keep tracking your expenses over time to build a consistency profile.";
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

    consistencyDesc = cv <= 20
      ? `Your monthly expenses are very stable (${Math.round(cv)}% variation).`
      : cv <= 40
        ? `Your monthly expenses fluctuate moderately (${Math.round(cv)}% variation).`
        : `Your monthly expenses vary significantly (${Math.round(cv)}% variation).`;

    if (cv <= 15) consistencyTip = "Excellent consistency — predictable expenses make budgeting much easier.";
    else if (cv <= 30) consistencyTip = "Mild fluctuations are normal. Watch for months that spike above your average.";
    else consistencyTip = "High variability makes budgeting hard. Try to smooth out large one-time expenses across months.";
  }

  factors.push({
    name: "Expense Consistency",
    score: consistencyScore,
    maxScore: 100,
    weight: 20,
    level: scoreLevel(consistencyScore),
    description: consistencyDesc,
    tip: consistencyTip,
  });

  // --- Compute weighted total ---
  const totalScore = Math.round(
    factors.reduce((sum, f) => sum + (f.score * f.weight) / 100, 0)
  );

  const level = overallLevel(totalScore);

  const summaryParts: string[] = [];
  const bestFactor = factors.reduce((a, b) => a.score > b.score ? a : b);
  const worstFactor = factors.reduce((a, b) => a.score < b.score ? a : b);

  summaryParts.push(`Your financial health score is ${totalScore}/100 (${level}).`);

  if (bestFactor.score > worstFactor.score) {
    summaryParts.push(`Strongest area: ${bestFactor.name}. Needs attention: ${worstFactor.name}.`);
  }

  return {
    totalScore,
    level,
    factors,
    summary: summaryParts.join(" "),
    modelName: "local-rule-engine",
  };
}
