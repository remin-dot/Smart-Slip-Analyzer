import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, parseJson, requireUserId } from "@/lib/api";
import { budgetSchema } from "@/lib/validators";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, response } = await requireUserId(request);
    if (response) return response;

    const { id } = await params;

    const existing = await prisma.budget.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Budget not found." }, { status: 404 });
    }

    const data = await parseJson(request, budgetSchema.partial());
    const budget = await prisma.budget.update({
      where: { id },
      data,
      include: { category: true },
    });

    return NextResponse.json({ budget });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, response } = await requireUserId(request);
    if (response) return response;

    const { id } = await params;

    const existing = await prisma.budget.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Budget not found." }, { status: 404 });
    }

    await prisma.budget.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
