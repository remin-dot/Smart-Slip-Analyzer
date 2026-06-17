import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, parseJson, requireUserId } from "@/lib/api";
import { categorySchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { userId, response } = await requireUserId(request);
  if (response) return response;

  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }]
  });

  return NextResponse.json({ categories });
}

export async function POST(request: NextRequest) {
  try {
    const { userId, response } = await requireUserId(request);
    if (response) return response;

    const data = await parseJson(request, categorySchema);
    const category = await prisma.category.create({
      data: {
        ...data,
        userId
      }
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
