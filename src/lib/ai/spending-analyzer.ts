export type Insight = {
  type: "spike" | "pattern" | "saving" | "alert" | "praise";
  icon: "TrendingUp" | "TrendingDown" | "Coffee" | "Lightbulb" | "AlertTriangle" | "ThumbsUp" | "Repeat" | "Scissors";
  title: string;
  description: string;
  amount?: number;
  percentChange?: number;
  category?: string;
};

export type SpendingAnalysis = {
  insights: Insight[];
  recommendations: string[];
  summary: string;
  modelName: string;
  confidence: number;
};

type MonthCategorySpending = {
  category: string;
  color: string;
  currentMonth: number;
  previousMonth: number;
};

type MerchantFrequency = {
  merchant: string;
  count: number;
  totalAmount: number;
  category: string | null;
};

type AnalysisInput = {
  currency: string;
  monthIncome: number;
  monthExpense: number;
  prevMonthExpense: number;
  savingGoal: number;
  categoryComparison: MonthCategorySpending[];
  merchantFrequency: MerchantFrequency[];
  totalBalance: number;
  savingRate: number;
};

const SYSTEM_PROMPT = `You are a personal finance advisor AI. Analyze the user's spending data and generate actionable insights.

Return ONLY a JSON object with this structure:
{
  "insights": [
    {
      "type": "spike" | "pattern" | "saving" | "alert" | "praise",
      "icon": "TrendingUp" | "TrendingDown" | "Coffee" | "Lightbulb" | "AlertTriangle" | "ThumbsUp" | "Repeat" | "Scissors",
      "title": "Short headline (under 60 chars)",
      "description": "Natural language insight with specific numbers. Be conversational and helpful.",
      "amount": number or null,
      "percentChange": number or null,
      "category": "category name or null"
    }
  ],
  "recommendations": [
    "Specific, actionable recommendation with numbers"
  ],
  "summary": "2-3 sentence overall spending health summary"
}

Rules:
- Generate 4-8 insights based on the data
- Use real numbers from the data — never make up figures
- Write in a friendly, direct tone like a financial advisor talking to a friend
- Focus on patterns, changes, and opportunities to save
- Include at least one positive insight if the data supports it
- Recommendations should be specific and actionable with concrete numbers
- Currency values should use the user's currency`;

export async function analyzeSpending(input: AnalysisInput): Promise<SpendingAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      return await analyzeWithAI(input, apiKey);
    } catch (error) {
      console.error("AI analysis failed, falling back to rules:", error);
    }
  }

  return analyzeWithRules(input);
}

async function analyzeWithAI(input: AnalysisInput, apiKey: string): Promise<SpendingAnalysis> {
  const dataPrompt = buildDataPrompt(input);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: dataPrompt },
      ],
      temperature: 0.4,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  const parsed = JSON.parse(content);

  return {
    insights: (parsed.insights ?? []).map(sanitizeInsight),
    recommendations: parsed.recommendations ?? [],
    summary: parsed.summary ?? "",
    modelName: "gpt-4o-mini",
    confidence: 0.88,
  };
}

function buildDataPrompt(input: AnalysisInput): string {
  const lines = [
    `Currency: ${input.currency}`,
    `This month income: ${input.monthIncome}`,
    `This month expenses: ${input.monthExpense}`,
    `Last month expenses: ${input.prevMonthExpense}`,
    `Saving goal: ${input.savingGoal}/month`,
    `Current saving rate: ${input.savingRate}%`,
    `Total balance: ${input.totalBalance}`,
    "",
    "Category spending (this month vs last month):",
  ];

  for (const c of input.categoryComparison) {
    const change = c.previousMonth > 0
      ? ((c.currentMonth - c.previousMonth) / c.previousMonth * 100).toFixed(0)
      : "new";
    lines.push(`  ${c.category}: ${c.currentMonth} (prev: ${c.previousMonth}, change: ${change}%)`);
  }

  lines.push("", "Top merchants by frequency:");
  for (const m of input.merchantFrequency.slice(0, 10)) {
    lines.push(`  ${m.merchant}: ${m.count} transactions, total ${m.totalAmount} (${m.category ?? "uncategorized"})`);
  }

  return lines.join("\n");
}

function sanitizeInsight(raw: Record<string, unknown>): Insight {
  const validTypes = ["spike", "pattern", "saving", "alert", "praise"] as const;
  const validIcons = ["TrendingUp", "TrendingDown", "Coffee", "Lightbulb", "AlertTriangle", "ThumbsUp", "Repeat", "Scissors"] as const;

  return {
    type: validTypes.includes(raw.type as typeof validTypes[number]) ? raw.type as Insight["type"] : "pattern",
    icon: validIcons.includes(raw.icon as typeof validIcons[number]) ? raw.icon as Insight["icon"] : "Lightbulb",
    title: String(raw.title ?? "Insight"),
    description: String(raw.description ?? ""),
    amount: typeof raw.amount === "number" ? raw.amount : undefined,
    percentChange: typeof raw.percentChange === "number" ? raw.percentChange : undefined,
    category: typeof raw.category === "string" ? raw.category : undefined,
  };
}

function analyzeWithRules(input: AnalysisInput): SpendingAnalysis {
  const insights: Insight[] = [];
  const recommendations: string[] = [];
  const cur = input.currency;

  // 1. Month-over-month total expense change
  if (input.prevMonthExpense > 0) {
    const change = ((input.monthExpense - input.prevMonthExpense) / input.prevMonthExpense) * 100;
    if (change > 15) {
      insights.push({
        type: "spike",
        icon: "TrendingUp",
        title: "Spending increased this month",
        description: `Your expenses rose ${Math.round(change)}% compared to last month — from ${fmtNum(input.prevMonthExpense)} to ${fmtNum(input.monthExpense)} ${cur}.`,
        percentChange: Math.round(change),
      });
    } else if (change < -10) {
      insights.push({
        type: "praise",
        icon: "ThumbsUp",
        title: "Great job cutting expenses",
        description: `You spent ${Math.round(Math.abs(change))}% less than last month — down from ${fmtNum(input.prevMonthExpense)} to ${fmtNum(input.monthExpense)} ${cur}.`,
        percentChange: Math.round(change),
      });
    }
  }

  // 2. Category spikes
  for (const c of input.categoryComparison) {
    if (c.previousMonth > 0 && c.currentMonth > 0) {
      const change = ((c.currentMonth - c.previousMonth) / c.previousMonth) * 100;
      if (change > 30 && c.currentMonth > input.monthExpense * 0.1) {
        insights.push({
          type: "spike",
          icon: "TrendingUp",
          title: `${c.category} expense surged`,
          description: `${c.category} spending increased ${Math.round(change)}% compared to last month — from ${fmtNum(c.previousMonth)} to ${fmtNum(c.currentMonth)} ${cur}.`,
          percentChange: Math.round(change),
          amount: c.currentMonth,
          category: c.category,
        });
        recommendations.push(
          `Review your ${c.category} expenses. Setting a ${fmtNum(c.previousMonth)} ${cur} monthly cap could save you ${fmtNum(c.currentMonth - c.previousMonth)} ${cur}.`
        );
      } else if (change < -25 && c.previousMonth > input.monthExpense * 0.1) {
        insights.push({
          type: "praise",
          icon: "ThumbsUp",
          title: `${c.category} spending dropped`,
          description: `Nice work — ${c.category} expenses decreased ${Math.round(Math.abs(change))}% from ${fmtNum(c.previousMonth)} to ${fmtNum(c.currentMonth)} ${cur}.`,
          percentChange: Math.round(change),
          category: c.category,
        });
      }
    }
  }

  // 3. Recurring merchant patterns
  const frequentMerchants = input.merchantFrequency.filter((m) => m.count >= 3);
  for (const m of frequentMerchants.slice(0, 3)) {
    const avgPerVisit = m.totalAmount / m.count;
    insights.push({
      type: "pattern",
      icon: m.category?.toLowerCase().includes("food") || m.merchant.toLowerCase().includes("cafe") || m.merchant.toLowerCase().includes("coffee")
        ? "Coffee"
        : "Repeat",
      title: `Regular spending at ${m.merchant}`,
      description: `You visit ${m.merchant} about ${m.count} times/month, spending ${fmtNum(m.totalAmount)} ${cur} total (~${fmtNum(avgPerVisit)} ${cur} per visit).`,
      amount: m.totalAmount,
      category: m.category ?? undefined,
    });

    if (m.totalAmount > input.monthExpense * 0.08) {
      const halfSaving = Math.round(m.totalAmount * 0.5);
      recommendations.push(
        `Cutting ${m.merchant} visits in half could save around ${fmtNum(halfSaving)} ${cur}/month.`
      );
    }
  }

  // 4. Saving rate analysis
  if (input.monthIncome > 0) {
    if (input.savingRate < 0) {
      insights.push({
        type: "alert",
        icon: "AlertTriangle",
        title: "Spending exceeds income",
        description: `You're spending more than you earn this month. Expenses are ${fmtNum(input.monthExpense)} ${cur} against ${fmtNum(input.monthIncome)} ${cur} income.`,
      });
      recommendations.push(
        `Reduce spending by ${fmtNum(input.monthExpense - input.monthIncome)} ${cur} to break even, or find ways to increase income.`
      );
    } else if (input.savingRate < 10) {
      insights.push({
        type: "alert",
        icon: "AlertTriangle",
        title: "Low saving rate",
        description: `Your saving rate is only ${input.savingRate}%. Financial advisors recommend at least 20% for long-term health.`,
      });
    } else if (input.savingRate >= 30) {
      insights.push({
        type: "praise",
        icon: "ThumbsUp",
        title: "Excellent saving rate",
        description: `You're saving ${input.savingRate}% of your income — well above the recommended 20%. Keep it up!`,
      });
    }
  }

  // 5. Saving goal progress
  if (input.savingGoal > 0 && input.monthIncome > 0) {
    const actualSaving = input.monthIncome - input.monthExpense;
    if (actualSaving < input.savingGoal) {
      const gap = input.savingGoal - actualSaving;
      insights.push({
        type: "saving",
        icon: "Scissors",
        title: "Below saving goal",
        description: `You need to reduce spending by ${fmtNum(gap)} ${cur}/month to hit your ${fmtNum(input.savingGoal)} ${cur} saving goal.`,
        amount: gap,
      });
      recommendations.push(
        `Reducing unnecessary expenses by ${fmtNum(gap)} ${cur}/month gets you to your saving target.`
      );
    } else {
      insights.push({
        type: "praise",
        icon: "ThumbsUp",
        title: "Saving goal on track",
        description: `You're saving ${fmtNum(actualSaving)} ${cur}/month, exceeding your ${fmtNum(input.savingGoal)} ${cur} goal by ${fmtNum(actualSaving - input.savingGoal)} ${cur}.`,
      });
    }
  }

  // 6. Top spending category
  const topCategory = input.categoryComparison.sort((a, b) => b.currentMonth - a.currentMonth)[0];
  if (topCategory && topCategory.currentMonth > 0) {
    const pct = Math.round((topCategory.currentMonth / input.monthExpense) * 100);
    if (pct > 35) {
      insights.push({
        type: "pattern",
        icon: "Lightbulb",
        title: `${topCategory.category} dominates spending`,
        description: `${topCategory.category} accounts for ${pct}% of all expenses at ${fmtNum(topCategory.currentMonth)} ${cur}. Diversifying spending could reduce risk.`,
        amount: topCategory.currentMonth,
        category: topCategory.category,
      });
    }
  }

  // Fallback if no insights generated
  if (insights.length === 0) {
    insights.push({
      type: "pattern",
      icon: "Lightbulb",
      title: "Building your spending profile",
      description: `We're tracking ${input.monthExpense > 0 ? fmtNum(input.monthExpense) + " " + cur + " in expenses" : "your transactions"}. More data will unlock detailed insights and recommendations.`,
    });
  }

  if (recommendations.length === 0) {
    recommendations.push("Continue tracking expenses to receive personalized saving recommendations.");
  }

  const summaryParts: string[] = [];
  if (input.monthExpense > 0) {
    summaryParts.push(`This month you spent ${fmtNum(input.monthExpense)} ${cur}`);
  }
  if (input.monthIncome > 0) {
    summaryParts.push(`earned ${fmtNum(input.monthIncome)} ${cur}`);
  }
  if (input.savingRate !== 0) {
    summaryParts.push(`with a ${input.savingRate}% saving rate`);
  }

  return {
    insights,
    recommendations,
    summary: summaryParts.length > 0
      ? summaryParts.join(", ") + "."
      : "Start adding transactions to see your spending analysis.",
    modelName: "local-rule-engine",
    confidence: 0.75,
  };
}

function fmtNum(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}
