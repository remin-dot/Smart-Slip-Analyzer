import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, parseJson, requireUserId } from "@/lib/api";
import { financialGoalSchema } from "@/lib/validators";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, response } = await requireUserId(request);
    if (response) return response;

    const { id } = await params;

    const existing = await prisma.financialGoal.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Goal not found." }, { status: 404 });
    }

    const data = await parseJson(request, financialGoalSchema.partial());
    const goal = await prisma.financialGoal.update({
      where: { id },
      data: {
        ...data,
        aiStrategy: data.aiStrategy
          ? (data.aiStrategy as Prisma.InputJsonValue)
          : data.aiStrategy === null
            ? Prisma.JsonNull
            : undefined,
      },
    });

    return NextResponse.json({ goal });
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

    const existing = await prisma.financialGoal.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Goal not found." }, { status: 404 });
    }

    await prisma.financialGoal.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
