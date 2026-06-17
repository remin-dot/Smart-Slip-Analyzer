export type PurchaseAnalysis = {
  needVsWant: {
    verdict: "need" | "want" | "mixed";
    confidence: number;
    explanation: string;
  };
  financialImpact: {
    severity: "low" | "medium" | "high" | "critical";
    balanceAfter: number;
    incomeRatio: number;
    explanation: string;
  };
  budgetEffect: {
    affectedBudgets: { category: string; currentUsage: number; afterUsage: number; willExceed: boolean }[];
    explanation: string;
  };
  goalImpact: {
    affectedGoals: { name: string; delayMonths: number; newMonthlyRequired: number }[];
    explanation: string;
  };
  recommendation: {
    verdict: "go_ahead" | "consider" | "wait" | "avoid";
    title: string;
    explanation: string;
    alternatives: string[];
  };
  summary: string;
  modelName: string;
};

export type PurchaseContext = {
  currency: string;
  monthIncome: number;
  monthExpense: number;
  totalBalance: number;
  savingRate: number;
  monthlySaving: number;
  savingGoal: number;
  activeBudgets: { category: string; limit: number; spent: number; remaining: number }[];
  activeGoals: { name: string; target: number; current: number; remaining: number; monthsLeft: number; monthlySaving: number }[];
};

const SYSTEM_PROMPT = `You are a personal finance AI advisor. The user wants to buy something. Analyze whether they should, using their real financial data.

Return ONLY a JSON object with this structure:
{
  "needVsWant": {
    "verdict": "need" | "want" | "mixed",
    "confidence": 0.0-1.0,
    "explanation": "Why this is a need/want based on the product type"
  },
  "financialImpact": {
    "severity": "low" | "medium" | "high" | "critical",
    "balanceAfter": number,
    "incomeRatio": number (price / monthly income),
    "explanation": "Impact on their finances with specific numbers"
  },
  "budgetEffect": {
    "affectedBudgets": [{"category": "name", "currentUsage": percent, "afterUsage": percent, "willExceed": boolean}],
    "explanation": "How this affects their budgets"
  },
  "goalImpact": {
    "affectedGoals": [{"name": "goal name", "delayMonths": number, "newMonthlyRequired": number}],
    "explanation": "How this delays their saving goals"
  },
  "recommendation": {
    "verdict": "go_ahead" | "consider" | "wait" | "avoid",
    "title": "Short recommendation headline",
    "explanation": "Detailed personalized recommendation with numbers",
    "alternatives": ["Alternative suggestion 1", "Alternative suggestion 2"]
  },
  "summary": "One paragraph summary of the full analysis"
}

Rules:
- Use REAL numbers from the user's data
- Be honest but supportive — don't be preachy
- Consider the full picture: balance, income ratio, budgets, and goals
- "need" = essential (food, medical, utilities, education, work equipment)
- "want" = non-essential (entertainment, luxury, fashion, gadgets)
- Severity: low (<5% income), medium (5-15%), high (15-30%), critical (>30%)
- Give practical alternatives when recommending to wait`;

export async function analyzePurchase(
  productName: string,
  price: number,
  context: PurchaseContext
): Promise<PurchaseAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      return await analyzeWithAI(productName, price, context, apiKey);
    } catch (error) {
      console.error("AI purchase analysis failed, falling back to rules:", error);
    }
  }

  return analyzeWithRules(productName, price, context);
}

async function analyzeWithAI(
  productName: string,
  price: number,
  ctx: PurchaseContext,
  apiKey: string
): Promise<PurchaseAnalysis> {
  const cur = ctx.currency;
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  const dataPrompt = [
    `Product: ${productName}`,
    `Price: ${fmt(price)} ${cur}`,
    "",
    `Monthly income: ${fmt(ctx.monthIncome)} ${cur}`,
    `Monthly expenses: ${fmt(ctx.monthExpense)} ${cur}`,
    `Monthly saving: ${fmt(ctx.monthlySaving)} ${cur}`,
    `Saving rate: ${ctx.savingRate}%`,
    `Total balance: ${fmt(ctx.totalBalance)} ${cur}`,
    `Saving goal: ${fmt(ctx.savingGoal)} ${cur}/month`,
    "",
    "Active budgets:",
    ...ctx.activeBudgets.map((b) => {
      const pct = b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : 0;
      return `  ${b.category}: ${fmt(b.spent)}/${fmt(b.limit)} ${cur} (${pct}% used)`;
    }),
    "",
    "Active saving goals:",
    ...ctx.activeGoals.map((g) => {
      const pct = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0;
      return `  ${g.name}: ${fmt(g.current)}/${fmt(g.target)} ${cur} (${pct}%, ${g.monthsLeft} months left, need ${fmt(g.monthlySaving)} ${cur}/month)`;
    }),
  ].join("\n");

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
      max_tokens: 1200,
    }),
  });

  if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  const parsed = JSON.parse(content);

  return {
    needVsWant: parsed.needVsWant ?? { verdict: "want", confidence: 0.5, explanation: "" },
    financialImpact: parsed.financialImpact ?? { severity: "medium", balanceAfter: ctx.totalBalance - price, incomeRatio: 0, explanation: "" },
    budgetEffect: parsed.budgetEffect ?? { affectedBudgets: [], explanation: "" },
    goalImpact: parsed.goalImpact ?? { affectedGoals: [], explanation: "" },
    recommendation: parsed.recommendation ?? { verdict: "consider", title: "Consider carefully", explanation: "", alternatives: [] },
    summary: parsed.summary ?? "",
    modelName: "gpt-4o-mini",
  };
}

function analyzeWithRules(
  productName: string,
  price: number,
  ctx: PurchaseContext
): PurchaseAnalysis {
  const cur = ctx.currency;
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  // --- Need vs Want ---
  const needKeywords = ["food", "grocery", "medicine", "medical", "doctor", "hospital", "rent", "utility", "electric", "water", "internet", "insurance", "school", "tuition", "book", "textbook", "fuel", "gas", "repair", "maintenance"];
  const wantKeywords = ["game", "gaming", "iphone", "airpods", "headphone", "speaker", "watch", "fashion", "brand", "gucci", "nike", "adidas", "sneaker", "jewelry", "perfume", "cosmetic", "makeup", "concert", "movie", "netflix", "subscription", "vacation", "hotel", "resort", "bag", "handbag", "luxury"];
  const mixedKeywords = ["laptop", "computer", "phone", "tablet", "ipad", "camera", "monitor", "keyboard", "desk", "chair", "bicycle", "motorcycle", "car"];

  const nameLower = productName.toLowerCase();
  const isNeed = needKeywords.some((k) => nameLower.includes(k));
  const isWant = wantKeywords.some((k) => nameLower.includes(k));
  const isMixed = mixedKeywords.some((k) => nameLower.includes(k));

  let needVerdict: "need" | "want" | "mixed" = "want";
  let needConfidence = 0.7;
  if (isNeed && !isWant) { needVerdict = "need"; needConfidence = 0.85; }
  else if (isMixed) { needVerdict = "mixed"; needConfidence = 0.6; }
  else if (isWant) { needVerdict = "want"; needConfidence = 0.8; }

  const needExplanation = needVerdict === "need"
    ? `"${productName}" appears to be an essential purchase for daily living or work.`
    : needVerdict === "mixed"
      ? `"${productName}" could be either a need or want depending on your situation — it may be work-related or a personal upgrade.`
      : `"${productName}" appears to be a non-essential purchase. Consider if this aligns with your financial priorities.`;

  // --- Financial Impact ---
  const balanceAfter = ctx.totalBalance - price;
  const incomeRatio = ctx.monthIncome > 0 ? price / ctx.monthIncome : 999;

  let severity: "low" | "medium" | "high" | "critical";
  if (incomeRatio < 0.05) severity = "low";
  else if (incomeRatio < 0.15) severity = "medium";
  else if (incomeRatio < 0.3) severity = "high";
  else severity = "critical";

  const impactParts: string[] = [];
  impactParts.push(`This ${fmt(price)} ${cur} purchase is ${Math.round(incomeRatio * 100)}% of your monthly income.`);
  if (balanceAfter >= 0) {
    impactParts.push(`Your balance would drop from ${fmt(ctx.totalBalance)} to ${fmt(balanceAfter)} ${cur}.`);
  } else {
    impactParts.push(`⚠️ This would put your balance at ${fmt(balanceAfter)} ${cur} — you can't afford this right now.`);
  }

  // --- Budget Effect ---
  const shoppingBudget = ctx.activeBudgets.find((b) =>
    b.category.toLowerCase().includes("shopping") || b.category.toLowerCase().includes("luxury")
  );
  const affectedBudgets: PurchaseAnalysis["budgetEffect"]["affectedBudgets"] = [];
  let budgetExplanation = "";

  if (shoppingBudget) {
    const currentPct = shoppingBudget.limit > 0 ? Math.round((shoppingBudget.spent / shoppingBudget.limit) * 100) : 0;
    const afterSpent = shoppingBudget.spent + price;
    const afterPct = shoppingBudget.limit > 0 ? Math.round((afterSpent / shoppingBudget.limit) * 100) : 0;
    const willExceed = afterSpent > shoppingBudget.limit;

    affectedBudgets.push({
      category: shoppingBudget.category,
      currentUsage: currentPct,
      afterUsage: afterPct,
      willExceed,
    });

    budgetExplanation = willExceed
      ? `This purchase would push your ${shoppingBudget.category} budget from ${currentPct}% to ${afterPct}% — exceeding the limit by ${fmt(afterSpent - shoppingBudget.limit)} ${cur}.`
      : `Your ${shoppingBudget.category} budget would go from ${currentPct}% to ${afterPct}% usage.`;
  } else if (ctx.activeBudgets.length > 0) {
    budgetExplanation = "This purchase doesn't directly match any of your category budgets, but it still reduces your available funds.";
  } else {
    budgetExplanation = "You don't have any budgets set up. Consider creating category budgets to track spending limits.";
  }

  // --- Goal Impact ---
  const affectedGoals: PurchaseAnalysis["goalImpact"]["affectedGoals"] = [];
  const goalParts: string[] = [];

  for (const g of ctx.activeGoals) {
    if (g.remaining <= 0 || g.monthsLeft <= 0) continue;

    const currentMonthlySaving = ctx.monthlySaving;
    const monthsWithPurchase = currentMonthlySaving > 0
      ? Math.ceil(g.remaining / Math.max(currentMonthlySaving - (price / Math.max(g.monthsLeft, 1)), 1))
      : g.monthsLeft;
    const delayMonths = Math.max(monthsWithPurchase - g.monthsLeft, 0);

    const newRemainingAfterPurchase = g.remaining;
    const reducedSaving = Math.max(currentMonthlySaving - (price / 1), 0);
    const newMonthlyRequired = reducedSaving > 0
      ? Math.ceil(newRemainingAfterPurchase / Math.max(g.monthsLeft, 1))
      : g.monthlySaving;

    if (price >= currentMonthlySaving * 0.5) {
      const delay = currentMonthlySaving > 0 ? Math.ceil(price / currentMonthlySaving) : 0;
      affectedGoals.push({
        name: g.name,
        delayMonths: delay,
        newMonthlyRequired: g.monthlySaving,
      });
      goalParts.push(`"${g.name}" could be delayed by ~${delay} month${delay !== 1 ? "s" : ""} if this purchase reduces your monthly saving.`);
    }
  }

  const goalExplanation = goalParts.length > 0
    ? goalParts.join(" ")
    : ctx.activeGoals.length > 0
      ? "This purchase has minimal impact on your saving goals at this price level."
      : "You don't have any active saving goals to be affected.";

  // --- Recommendation ---
  let verdict: "go_ahead" | "consider" | "wait" | "avoid";
  let recTitle: string;
  let recExplanation: string;
  const alternatives: string[] = [];

  if (balanceAfter < 0) {
    verdict = "avoid";
    recTitle = "Not affordable right now";
    recExplanation = `At ${fmt(price)} ${cur}, this purchase would put you in a negative balance. Wait until you have sufficient funds.`;
    alternatives.push(`Save ${fmt(Math.ceil(price / 3))} ${cur}/month and buy in 3 months`);
    alternatives.push("Look for a more affordable alternative");
  } else if (severity === "critical") {
    verdict = "avoid";
    recTitle = "Too expensive relative to income";
    recExplanation = `This is ${Math.round(incomeRatio * 100)}% of your monthly income — a significant financial strain. ${needVerdict === "need" ? "If essential, consider a payment plan." : "Consider waiting and saving up first."}`;
    alternatives.push(`Save ${fmt(Math.ceil(price / 6))} ${cur}/month and buy in 6 months`);
    alternatives.push("Search for a budget-friendly alternative");
  } else if (severity === "high" || (affectedBudgets.some((b) => b.willExceed) && needVerdict !== "need")) {
    verdict = "wait";
    recTitle = "Consider waiting";
    recExplanation = `While you can technically afford it, this ${fmt(price)} ${cur} purchase is significant at ${Math.round(incomeRatio * 100)}% of your income. ${affectedGoals.length > 0 ? `It could delay your saving goals.` : ""} Waiting a month to save up would be wiser.`;
    alternatives.push("Wait until next month when budgets reset");
    if (price > 1000) alternatives.push(`Split into 2-3 smaller purchases if possible`);
  } else if (severity === "medium" && needVerdict === "want") {
    verdict = "consider";
    recTitle = "Think it over";
    recExplanation = `At ${fmt(price)} ${cur}, this is a moderate purchase (${Math.round(incomeRatio * 100)}% of income). Your finances can handle it, but apply the 48-hour rule — if you still want it in 2 days, go for it.`;
    alternatives.push("Apply the 48-hour rule before buying");
  } else if (needVerdict === "need" || severity === "low") {
    verdict = "go_ahead";
    recTitle = needVerdict === "need" ? "Essential purchase — go ahead" : "Affordable — looks good";
    recExplanation = needVerdict === "need"
      ? `This appears to be an essential purchase and at ${fmt(price)} ${cur} (${Math.round(incomeRatio * 100)}% of income), it's within your means.`
      : `At ${fmt(price)} ${cur}, this is a small purchase relative to your income. Your finances can handle it comfortably.`;
  } else {
    verdict = "consider";
    recTitle = "Weigh your priorities";
    recExplanation = `This ${fmt(price)} ${cur} purchase is manageable but consider whether it aligns with your current financial goals.`;
    alternatives.push("Compare prices before purchasing");
  }

  // --- Summary ---
  const summaryParts: string[] = [];
  summaryParts.push(`"${productName}" at ${fmt(price)} ${cur} is classified as a ${needVerdict === "need" ? "necessary" : needVerdict === "mixed" ? "potentially necessary" : "non-essential"} purchase.`);
  summaryParts.push(`It represents ${Math.round(incomeRatio * 100)}% of your monthly income with ${severity} financial impact.`);
  if (affectedGoals.length > 0) {
    summaryParts.push(`Buying this could delay your saving goal${affectedGoals.length > 1 ? "s" : ""} by ${affectedGoals.map((g) => `${g.delayMonths} month${g.delayMonths !== 1 ? "s" : ""}`).join(", ")}.`);
  }
  summaryParts.push(`Recommendation: ${recTitle.toLowerCase()}.`);

  return {
    needVsWant: { verdict: needVerdict, confidence: needConfidence, explanation: needExplanation },
    financialImpact: { severity, balanceAfter, incomeRatio: Math.round(incomeRatio * 100) / 100, explanation: impactParts.join(" ") },
    budgetEffect: { affectedBudgets, explanation: budgetExplanation },
    goalImpact: { affectedGoals, explanation: goalExplanation },
    recommendation: { verdict, title: recTitle, explanation: recExplanation, alternatives },
    summary: summaryParts.join(" "),
    modelName: "local-rule-engine",
  };
}
