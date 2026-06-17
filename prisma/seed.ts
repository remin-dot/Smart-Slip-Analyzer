import { PrismaClient, $Enums } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const user = await prisma.user.upsert({
    where: { email: "demo@smartslip.ai" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@smartslip.ai",
      passwordHash,
      authProvider: "credentials",
      monthlyIncome: 5700,
      savingGoal: 1200,
      financialPreference: "BALANCED",
      currency: "USD",
      timezone: "Asia/Bangkok"
    }
  });

  const food = await prisma.category.upsert({
    where: { userId_name: { userId: user.id, name: "Food & Dining" } },
    update: {},
    create: { userId: user.id, name: "Food & Dining", color: "#d85c46", icon: "Utensils", isSystem: true }
  });

  const income = await prisma.category.upsert({
    where: { userId_name: { userId: user.id, name: "Income" } },
    update: {},
    create: { userId: user.id, name: "Income", color: "#20875a", icon: "CircleDollarSign", isSystem: true }
  });

  await prisma.transaction.createMany({
    data: [
      {
        userId: user.id,
        categoryId: food.id,
        type: $Enums.TransactionType.EXPENSE,
        source: $Enums.TransactionSource.SLIP_SCAN,
        merchant: "Bean & Budget Cafe",
        amount: 18.6,
        occurredAt: new Date("2026-06-17T09:30:00.000Z"),
        aiConfidence: 0.92
      },
      {
        userId: user.id,
        categoryId: income.id,
        type: $Enums.TransactionType.INCOME,
        source: $Enums.TransactionSource.BANK_IMPORT,
        merchant: "Northline Payroll",
        amount: 2850,
        occurredAt: new Date("2026-06-15T02:00:00.000Z")
      }
    ],
    skipDuplicates: true
  });

  await prisma.budget.create({
    data: {
      userId: user.id,
      categoryId: food.id,
      name: "Dining discipline",
      amount: 650,
      period: $Enums.BudgetPeriod.MONTHLY,
      startsAt: new Date("2026-06-01T00:00:00.000Z")
    }
  });

  await prisma.financialGoal.create({
    data: {
      userId: user.id,
      name: "Emergency fund",
      targetAmount: 6000,
      currentAmount: 2350,
      status: $Enums.GoalStatus.ACTIVE,
      targetDate: new Date("2026-12-31T00:00:00.000Z")
    }
  });

  await prisma.aiReport.create({
    data: {
      userId: user.id,
      type: $Enums.AiReportType.SPENDING_ANALYSIS,
      title: "June spending pulse",
      summary: "Dining is above normal pace, while savings momentum is healthy.",
      confidence: 0.88,
      modelName: "future-ai-adapter",
      promptVersion: "v1",
      insights: [
        { label: "Dining trend", value: "18% above baseline" },
        { label: "Savings rate", value: "31%" }
      ],
      actions: [
        "Set a weekly dining cap of $145",
        "Move $420 to emergency savings automatically"
      ]
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
