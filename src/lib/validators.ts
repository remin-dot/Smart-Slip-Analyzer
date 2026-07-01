import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  monthlyIncome: z.coerce.number().min(0).default(0),
  savingGoal: z.coerce.number().min(0).default(0),
  financialPreference: z.enum(["CONSERVATIVE", "BALANCED", "GROWTH"]).default("BALANCED"),
  currency: z.string().length(3).default("USD")
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const forgotPasswordSchema = z.object({
  email: z.string().email()
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128)
});

export const profileSchema = z.object({
  name: z.string().min(2).max(80),
  monthlyIncome: z.coerce.number().min(0),
  savingGoal: z.coerce.number().min(0),
  financialPreference: z.enum(["CONSERVATIVE", "BALANCED", "GROWTH"]),
  currency: z.string().length(3),
  // Small resized data URL (or remote URL); capped so the DB text column can't
  // be abused. null clears the picture back to the initials default.
  imageUrl: z.string().max(600_000).nullable().optional()
});

export const categorySchema = z.object({
  name: z.string().min(2).max(80),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#087f7a"),
  icon: z.string().min(2).max(40).default("Wallet")
});

export const transactionSchema = z.object({
  categoryId: z.string().cuid().optional().nullable(),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  source: z.enum(["MANUAL", "SLIP_SCAN", "BANK_IMPORT", "AI_INFERRED"]).default("MANUAL"),
  merchant: z.string().min(1).max(140),
  description: z.string().max(500).optional().nullable(),
  amount: z.coerce.number().positive(),
  currency: z.string().length(3).default("USD"),
  occurredAt: z.coerce.date(),
  slipImageUrl: z.string().url().optional().nullable(),
  slipRawText: z.string().optional().nullable(),
  aiConfidence: z.number().min(0).max(1).optional().nullable(),
  aiMetadata: z.record(z.unknown()).optional().nullable(),
  isFavorite: z.boolean().optional(),
  tags: z.array(z.string().min(1).max(30)).max(12).optional()
});

export const budgetSchema = z.object({
  categoryId: z.string().cuid().optional().nullable(),
  name: z.string().min(2).max(100),
  amount: z.coerce.number().positive(),
  currency: z.string().length(3).default("USD"),
  period: z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]).default("MONTHLY"),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional().nullable(),
  alertAtPct: z.coerce.number().int().min(1).max(100).default(80),
  isActive: z.boolean().default(true)
});

export const subscriptionSchema = z.object({
  name: z.string().min(1).max(140),
  amount: z.coerce.number().positive(),
  currency: z.string().length(3).default("USD"),
  frequency: z.enum(["monthly", "quarterly", "yearly"]).default("monthly"),
  status: z.enum(["active", "cancelled"]).default("active"),
  nextPaymentAt: z.coerce.date().optional().nullable(),
  note: z.string().max(500).optional().nullable()
});

export const financialGoalSchema = z.object({
  name: z.string().min(2).max(120),
  targetAmount: z.coerce.number().positive(),
  currentAmount: z.coerce.number().min(0).default(0),
  currency: z.string().length(3).default("USD"),
  targetDate: z.coerce.date().optional().nullable(),
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]).default("ACTIVE"),
  aiStrategy: z.record(z.unknown()).optional().nullable()
});

export const wealthItemSchema = z.object({
  type: z.enum(["CASH", "INVESTMENT", "PROPERTY", "DEBT", "LOAN"]),
  name: z.string().min(1).max(120),
  value: z.coerce.number().min(0),
  currency: z.string().length(3).default("USD"),
  note: z.string().max(500).optional().nullable(),
});

export const aiReportRequestSchema = z.object({
  transactionId: z.string().cuid().optional(),
  type: z.enum([
    "SLIP_EXTRACTION",
    "SPENDING_ANALYSIS",
    "BUDGET_RECOMMENDATION",
    "GOAL_COACHING",
    "RISK_ALERT"
  ]),
  prompt: z.string().min(5).max(2000).optional()
});
