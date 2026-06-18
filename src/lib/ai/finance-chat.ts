export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type FinancialContext = {
  currency: string;
  monthIncome: number;
  monthExpense: number;
  prevMonthExpense: number;
  totalBalance: number;
  savingRate: number;
  savingGoal: number;
  monthlyIncome: number;
  categoryBreakdown: { name: string; amount: number; pct: number }[];
  topMerchants: { merchant: string; count: number; total: number; category: string | null }[];
  activeBudgets: { category: string; limit: number; spent: number; remaining: number }[];
  activeGoals: { name: string; target: number; current: number; remaining: number; monthsLeft: number; monthlySaving: number }[];
  recentTransactions: { merchant: string; amount: number; type: string; category: string | null; date: string }[];
};

const SYSTEM_PROMPT = `You are a friendly, knowledgeable personal finance AI assistant embedded in the Smart Slip Analyzer app. You have access to the user's real financial data provided below.

Rules:
- Answer questions using ONLY the user's actual financial data — never make up numbers
- Be conversational, warm, and encouraging — like a helpful financial advisor friend
- Give specific, actionable advice with real numbers from their data
- When they ask "where did my money go" → break down by category and top merchants
- When they ask about saving → reference their saving rate, goals, and budget status
- When they ask "should I buy X" → consider their balance, saving rate, budgets, and goals
- When they ask about reducing expenses → identify top spending categories and merchant patterns
- Keep responses concise but thorough — 2-4 paragraphs max
- Use the user's currency for all amounts
- If data is insufficient to answer, say so honestly and suggest what data would help
- Never give investment advice or guarantee financial outcomes
- Format numbers with commas for readability`;

// Locale code → language the model should answer in.
const LANG_NAMES: Record<string, string> = {
  en: "English",
  th: "Thai (ภาษาไทย)",
  zh: "Simplified Chinese (简体中文)",
  ja: "Japanese (日本語)",
};

export async function chatWithFinanceAI(
  message: string,
  history: ChatMessage[],
  context: FinancialContext,
  locale = "en"
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      return await chatWithOpenAI(message, history, context, apiKey, locale);
    } catch (error) {
      console.error("AI chat failed, falling back to rules:", error);
    }
  }

  return chatWithRules(message, context);
}

async function chatWithOpenAI(
  message: string,
  history: ChatMessage[],
  context: FinancialContext,
  apiKey: string,
  locale: string
): Promise<string> {
  const dataContext = buildContextPrompt(context);
  const lang = LANG_NAMES[locale] ?? "English";
  const langRule = `\n\nIMPORTANT: The user's interface language is ${lang}. Always write your entire reply in ${lang}, regardless of the language the question is written in. Keep currency codes and numbers as-is.`;

  const messages = [
    { role: "system" as const, content: `${SYSTEM_PROMPT}${langRule}\n\n--- USER FINANCIAL DATA ---\n${dataContext}` },
    ...history.slice(-8).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.6,
      max_tokens: 800,
    }),
  });

  if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "I couldn't generate a response. Please try again.";
}

function buildContextPrompt(ctx: FinancialContext): string {
  const lines: string[] = [];
  const cur = ctx.currency;
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  lines.push(`Currency: ${cur}`);
  lines.push(`Monthly income (profile): ${fmt(ctx.monthlyIncome)} ${cur}`);
  lines.push(`This month income: ${fmt(ctx.monthIncome)} ${cur}`);
  lines.push(`This month expenses: ${fmt(ctx.monthExpense)} ${cur}`);
  lines.push(`Last month expenses: ${fmt(ctx.prevMonthExpense)} ${cur}`);
  lines.push(`Total balance: ${fmt(ctx.totalBalance)} ${cur}`);
  lines.push(`Saving rate: ${ctx.savingRate}%`);
  lines.push(`Saving goal: ${fmt(ctx.savingGoal)} ${cur}/month`);

  if (ctx.categoryBreakdown.length > 0) {
    lines.push("", "Spending by category (this month):");
    for (const c of ctx.categoryBreakdown) {
      lines.push(`  ${c.name}: ${fmt(c.amount)} ${cur} (${c.pct}%)`);
    }
  }

  if (ctx.topMerchants.length > 0) {
    lines.push("", "Top merchants (this month):");
    for (const m of ctx.topMerchants.slice(0, 8)) {
      lines.push(`  ${m.merchant}: ${m.count} transactions, ${fmt(m.total)} ${cur} (${m.category ?? "uncategorized"})`);
    }
  }

  if (ctx.activeBudgets.length > 0) {
    lines.push("", "Active budgets:");
    for (const b of ctx.activeBudgets) {
      const pct = b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : 0;
      lines.push(`  ${b.category}: ${fmt(b.spent)}/${fmt(b.limit)} ${cur} (${pct}% used, ${fmt(b.remaining)} remaining)`);
    }
  }

  if (ctx.activeGoals.length > 0) {
    lines.push("", "Active saving goals:");
    for (const g of ctx.activeGoals) {
      const pct = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0;
      lines.push(`  ${g.name}: ${fmt(g.current)}/${fmt(g.target)} ${cur} (${pct}%, need ${fmt(g.monthlySaving)} ${cur}/month, ${g.monthsLeft} months left)`);
    }
  }

  if (ctx.recentTransactions.length > 0) {
    lines.push("", "Recent transactions:");
    for (const tx of ctx.recentTransactions.slice(0, 10)) {
      const sign = tx.type === "INCOME" ? "+" : "-";
      lines.push(`  ${tx.date}: ${sign}${fmt(tx.amount)} ${cur} at ${tx.merchant} (${tx.category ?? "uncategorized"})`);
    }
  }

  return lines.join("\n");
}

function chatWithRules(message: string, ctx: FinancialContext): string {
  const cur = ctx.currency;
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const msg = message.toLowerCase();

  if (msg.includes("where") && (msg.includes("money") || msg.includes("spend") || msg.includes("go"))) {
    return buildWhereMoneyWent(ctx, cur, fmt);
  }

  if (msg.includes("save") || msg.includes("saving")) {
    return buildSavingAdvice(ctx, cur, fmt);
  }

  if (msg.includes("buy") || msg.includes("purchase") || msg.includes("afford")) {
    return buildBuyAdvice(ctx, cur, fmt);
  }

  if (msg.includes("reduce") || msg.includes("cut") || msg.includes("less") || msg.includes("lower")) {
    return buildReduceAdvice(ctx, cur, fmt);
  }

  if (msg.includes("budget")) {
    return buildBudgetSummary(ctx, cur, fmt);
  }

  if (msg.includes("goal")) {
    return buildGoalSummary(ctx, cur, fmt);
  }

  if (msg.includes("summary") || msg.includes("overview") || msg.includes("how am i")) {
    return buildOverview(ctx, cur, fmt);
  }

  return buildOverview(ctx, cur, fmt);
}

function buildWhereMoneyWent(ctx: FinancialContext, cur: string, fmt: (n: number) => string): string {
  const parts: string[] = [];

  if (ctx.monthExpense <= 0) {
    return "You haven't recorded any expenses this month yet. Start scanning slips or adding transactions to see where your money goes!";
  }

  parts.push(`This month you've spent **${fmt(ctx.monthExpense)} ${cur}** total. Here's the breakdown:`);
  parts.push("");

  if (ctx.categoryBreakdown.length > 0) {
    for (const c of ctx.categoryBreakdown.slice(0, 6)) {
      parts.push(`• **${c.name}**: ${fmt(c.amount)} ${cur} (${c.pct}%)`);
    }
  }

  if (ctx.topMerchants.length > 0) {
    parts.push("");
    parts.push("Your most frequent spending spots:");
    for (const m of ctx.topMerchants.slice(0, 3)) {
      parts.push(`• **${m.merchant}**: ${fmt(m.total)} ${cur} across ${m.count} visit${m.count > 1 ? "s" : ""}`);
    }
  }

  const topCat = ctx.categoryBreakdown[0];
  if (topCat && topCat.pct > 30) {
    parts.push("");
    parts.push(`💡 **${topCat.name}** takes up ${topCat.pct}% of your spending. That might be worth reviewing if you're looking to save.`);
  }

  return parts.join("\n");
}

function buildSavingAdvice(ctx: FinancialContext, cur: string, fmt: (n: number) => string): string {
  const parts: string[] = [];
  const monthlySaving = ctx.monthIncome - ctx.monthExpense;

  if (ctx.monthIncome <= 0) {
    return "I don't see any income recorded this month. Add your income transactions so I can calculate your saving potential!";
  }

  parts.push(`Your current saving rate is **${ctx.savingRate}%** — you're saving about **${fmt(Math.max(monthlySaving, 0))} ${cur}/month**.`);

  if (ctx.savingRate >= 30) {
    parts.push("\nThat's excellent! You're well above the recommended 20% saving rate. 🎉");
  } else if (ctx.savingRate >= 20) {
    parts.push("\nYou're at a healthy saving rate. Keep it up!");
  } else if (ctx.savingRate >= 0) {
    const needed = Math.round(ctx.monthIncome * 0.2 - monthlySaving);
    parts.push(`\nTo reach a healthy 20% saving rate, you'd need to save **${fmt(needed)} ${cur}** more per month.`);
  } else {
    parts.push(`\n⚠️ You're currently spending more than you earn by **${fmt(Math.abs(monthlySaving))} ${cur}**. Let's focus on reducing expenses first.`);
  }

  if (ctx.savingGoal > 0) {
    if (monthlySaving >= ctx.savingGoal) {
      parts.push(`\n✅ You're exceeding your saving goal of ${fmt(ctx.savingGoal)} ${cur}/month!`);
    } else {
      const gap = ctx.savingGoal - Math.max(monthlySaving, 0);
      parts.push(`\nYou need to save **${fmt(gap)} ${cur}** more to hit your ${fmt(ctx.savingGoal)} ${cur}/month goal.`);
    }
  }

  if (ctx.activeGoals.length > 0) {
    parts.push("\nYour active saving goals:");
    for (const g of ctx.activeGoals) {
      parts.push(`• **${g.name}**: ${fmt(g.current)}/${fmt(g.target)} ${cur} — need ${fmt(g.monthlySaving)} ${cur}/month`);
    }
  }

  return parts.join("\n");
}

function buildBuyAdvice(ctx: FinancialContext, cur: string, fmt: (n: number) => string): string {
  const parts: string[] = [];
  const monthlySaving = ctx.monthIncome - ctx.monthExpense;

  parts.push("Here's your financial snapshot to help you decide:");
  parts.push("");
  parts.push(`• **Balance**: ${fmt(ctx.totalBalance)} ${cur}`);
  parts.push(`• **Monthly saving**: ${fmt(Math.max(monthlySaving, 0))} ${cur}`);
  parts.push(`• **Saving rate**: ${ctx.savingRate}%`);

  if (ctx.activeBudgets.length > 0) {
    const overBudget = ctx.activeBudgets.filter((b) => b.remaining < 0);
    if (overBudget.length > 0) {
      parts.push(`\n⚠️ You're already over budget in: ${overBudget.map((b) => b.category).join(", ")}. I'd recommend waiting.`);
    }
  }

  if (ctx.activeGoals.length > 0) {
    const totalMonthlyGoals = ctx.activeGoals.reduce((s, g) => s + g.monthlySaving, 0);
    parts.push(`\n📌 You have active saving goals requiring **${fmt(totalMonthlyGoals)} ${cur}/month**. Consider whether this purchase delays your goals.`);
  }

  if (ctx.savingRate < 10) {
    parts.push("\n💡 Your saving rate is below 10%. I'd suggest building up savings before making non-essential purchases.");
  } else if (ctx.savingRate >= 20) {
    parts.push("\n✅ Your finances look healthy. If this purchase fits within your budget and won't delay your goals, it could be fine.");
  }

  parts.push("\n**Tip**: If it's a large purchase, try the \"48-hour rule\" — wait two days and see if you still want it.");

  return parts.join("\n");
}

function buildReduceAdvice(ctx: FinancialContext, cur: string, fmt: (n: number) => string): string {
  const parts: string[] = [];

  if (ctx.monthExpense <= 0) {
    return "I don't have enough expense data yet. Keep tracking your spending and I'll identify areas where you can cut back!";
  }

  parts.push(`You're spending **${fmt(ctx.monthExpense)} ${cur}/month**. Here's where I see potential savings:`);
  parts.push("");

  const sorted = [...ctx.categoryBreakdown].sort((a, b) => b.amount - a.amount);
  for (const c of sorted.slice(0, 3)) {
    const tenPctCut = Math.round(c.amount * 0.1);
    parts.push(`• **${c.name}** (${fmt(c.amount)} ${cur}): A 10% reduction saves **${fmt(tenPctCut)} ${cur}/month**`);
  }

  if (ctx.topMerchants.length > 0) {
    const freq = ctx.topMerchants.filter((m) => m.count >= 3);
    if (freq.length > 0) {
      parts.push("\nFrequent spending patterns:");
      for (const m of freq.slice(0, 3)) {
        const halfSave = Math.round(m.total * 0.5);
        parts.push(`• **${m.merchant}**: ${m.count} visits/month (${fmt(m.total)} ${cur}). Cutting visits in half saves **${fmt(halfSave)} ${cur}**`);
      }
    }
  }

  if (ctx.prevMonthExpense > 0) {
    const change = ctx.monthExpense - ctx.prevMonthExpense;
    if (change > 0) {
      parts.push(`\n📈 Your spending increased by **${fmt(change)} ${cur}** vs last month. Review what's new this month.`);
    }
  }

  const totalPotentialSaving = sorted.slice(0, 3).reduce((s, c) => s + Math.round(c.amount * 0.1), 0);
  parts.push(`\n💡 **Total potential saving**: ~**${fmt(totalPotentialSaving)} ${cur}/month** with modest 10% cuts to your top 3 categories.`);

  return parts.join("\n");
}

function buildBudgetSummary(ctx: FinancialContext, cur: string, fmt: (n: number) => string): string {
  if (ctx.activeBudgets.length === 0) {
    return "You don't have any active budgets set up yet. Head over to the **Budgets** page to create category budgets and track your spending limits!";
  }

  const parts: string[] = ["Here's your budget status:"];
  parts.push("");

  for (const b of ctx.activeBudgets) {
    const pct = b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : 0;
    const emoji = pct > 100 ? "🔴" : pct >= 80 ? "🟡" : "🟢";
    parts.push(`${emoji} **${b.category}**: ${fmt(b.spent)}/${fmt(b.limit)} ${cur} (${pct}%) — ${b.remaining >= 0 ? `${fmt(b.remaining)} ${cur} left` : `${fmt(Math.abs(b.remaining))} ${cur} over`}`);
  }

  const overBudget = ctx.activeBudgets.filter((b) => b.remaining < 0);
  if (overBudget.length > 0) {
    parts.push(`\n⚠️ ${overBudget.length} budget${overBudget.length > 1 ? "s" : ""} exceeded. Consider adjusting spending or increasing limits.`);
  } else {
    parts.push("\n✅ All budgets are within limits. Keep it up!");
  }

  return parts.join("\n");
}

function buildGoalSummary(ctx: FinancialContext, cur: string, fmt: (n: number) => string): string {
  if (ctx.activeGoals.length === 0) {
    return "You don't have any active saving goals. Visit the **Saving Goals** page to set a target like \"Buy laptop — 60,000 THB in 6 months\"!";
  }

  const parts: string[] = ["Here's your saving goals progress:"];
  parts.push("");

  for (const g of ctx.activeGoals) {
    const pct = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0;
    parts.push(`• **${g.name}**: ${fmt(g.current)}/${fmt(g.target)} ${cur} (${pct}%) — ${g.remaining > 0 ? `${fmt(g.remaining)} ${cur} to go, save ${fmt(g.monthlySaving)} ${cur}/month` : "Goal reached! 🎉"}`);
  }

  const totalRequired = ctx.activeGoals.reduce((s, g) => s + g.monthlySaving, 0);
  parts.push(`\n💰 Total monthly saving needed for all goals: **${fmt(totalRequired)} ${cur}**`);

  const monthlySaving = ctx.monthIncome - ctx.monthExpense;
  if (monthlySaving >= totalRequired) {
    parts.push(`✅ Your current saving of ${fmt(monthlySaving)} ${cur}/month covers all goals!`);
  } else if (monthlySaving > 0) {
    parts.push(`⚠️ You're saving ${fmt(monthlySaving)} ${cur}/month but need ${fmt(totalRequired)} — consider cutting ${fmt(totalRequired - monthlySaving)} ${cur} in expenses.`);
  }

  return parts.join("\n");
}

function buildOverview(ctx: FinancialContext, cur: string, fmt: (n: number) => string): string {
  const parts: string[] = [];
  const monthlySaving = ctx.monthIncome - ctx.monthExpense;

  parts.push("Here's your financial overview:");
  parts.push("");
  parts.push(`💰 **Income**: ${fmt(ctx.monthIncome)} ${cur}/month`);
  parts.push(`💸 **Expenses**: ${fmt(ctx.monthExpense)} ${cur}/month`);
  parts.push(`📊 **Balance**: ${fmt(ctx.totalBalance)} ${cur}`);
  parts.push(`🏦 **Saving rate**: ${ctx.savingRate}% (${fmt(Math.max(monthlySaving, 0))} ${cur}/month)`);

  if (ctx.categoryBreakdown.length > 0) {
    const top = ctx.categoryBreakdown[0];
    parts.push(`\nTop spending: **${top.name}** at ${fmt(top.amount)} ${cur} (${top.pct}%)`);
  }

  if (ctx.activeBudgets.length > 0) {
    const over = ctx.activeBudgets.filter((b) => b.remaining < 0).length;
    parts.push(`\nBudgets: ${ctx.activeBudgets.length} active${over > 0 ? `, ⚠️ ${over} exceeded` : ", all on track ✅"}`);
  }

  if (ctx.activeGoals.length > 0) {
    parts.push(`Goals: ${ctx.activeGoals.length} active`);
  }

  parts.push("\n**Ask me anything** — like \"Where did my money go?\" or \"How can I reduce expenses?\"");

  return parts.join("\n");
}
