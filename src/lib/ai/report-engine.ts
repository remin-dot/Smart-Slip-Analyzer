import { $Enums } from "@prisma/client";

type ReportInput = {
  type: $Enums.AiReportType;
  prompt?: string;
  context: {
    transactionCount: number;
    monthlyExpenseTotal: string;
    monthlyIncomeTotal: string;
    topCategory?: string;
  };
};

export async function generateFinancialReport(input: ReportInput) {
  // Adapter boundary for future model calls. Keep route handlers stable while providers evolve.
  const topCategory = input.context.topCategory ?? "general spending";

  return {
    title: reportTitle(input.type),
    summary: `Based on ${input.context.transactionCount} tracked transactions, ${topCategory} is the main behavior signal to review.`,
    insights: [
      {
        label: "Income tracked",
        value: input.context.monthlyIncomeTotal
      },
      {
        label: "Expenses tracked",
        value: input.context.monthlyExpenseTotal
      },
      {
        label: "Main category",
        value: topCategory
      }
    ],
    actions: [
      "Review the top spending category this week.",
      "Set or adjust a budget for the highest variance category.",
      "Move surplus cash toward the highest-priority financial goal."
    ],
    modelName: process.env.OPENAI_API_KEY ? "openai-adapter-ready" : "local-rule-engine",
    promptVersion: "v1",
    confidence: 0.82
  };
}

function reportTitle(type: $Enums.AiReportType) {
  const titles: Record<$Enums.AiReportType, string> = {
    SLIP_EXTRACTION: "Slip extraction summary",
    SPENDING_ANALYSIS: "Spending behavior analysis",
    BUDGET_RECOMMENDATION: "Budget recommendation",
    GOAL_COACHING: "Financial goal coaching",
    RISK_ALERT: "Financial risk alert"
  };

  return titles[type];
}
