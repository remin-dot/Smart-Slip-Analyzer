import { PrismaClient } from "@prisma/client";

const defaultCategories = [
  { name: "Income", color: "#20875a", icon: "CircleDollarSign", isSystem: true },
  { name: "Food", color: "#d85c46", icon: "Utensils", isSystem: true },
  { name: "Shopping", color: "#2855a3", icon: "ShoppingBag", isSystem: true },
  { name: "Luxury", color: "#cf8b21", icon: "Gem", isSystem: true },
  { name: "Transport", color: "#087f7a", icon: "Train", isSystem: true },
  { name: "Entertainment", color: "#7c3aed", icon: "Gamepad2", isSystem: true },
  { name: "Education", color: "#0891b2", icon: "GraduationCap", isSystem: true },
  { name: "Investment", color: "#20875a", icon: "TrendingUp", isSystem: true },
  { name: "Other", color: "#687188", icon: "Wallet", isSystem: true },
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
