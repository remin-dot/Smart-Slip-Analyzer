import { PrismaClient } from "@prisma/client";

const defaultCategories = [
  { name: "Income", color: "#20875a", icon: "CircleDollarSign", isSystem: true },
  { name: "Food & Dining", color: "#d85c46", icon: "Utensils", isSystem: true },
  { name: "Transport", color: "#2855a3", icon: "Train", isSystem: true },
  { name: "Groceries", color: "#087f7a", icon: "ShoppingBasket", isSystem: true },
  { name: "Subscriptions", color: "#cf8b21", icon: "RefreshCw", isSystem: true }
];

export async function ensureDefaultCategories(prisma: PrismaClient, userId: string) {
  await Promise.all(
    defaultCategories.map((category) =>
      prisma.category.upsert({
        where: {
          userId_name: {
            userId,
            name: category.name
          }
        },
        update: {},
        create: {
          ...category,
          userId
        }
      })
    )
  );
}
