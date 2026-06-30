import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, parseJson, requireUserId } from "@/lib/api";
import { subscriptionSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { userId, response } = await requireUserId(request);
    if (response) return response;

    const { id } = await params;
    const existing = await prisma.subscription.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
    }

    const data = await parseJson(request, subscriptionSchema.partial());
    const subscription = await prisma.subscription.update({ where: { id }, data });

    return NextResponse.json({ subscription });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { userId, response } = await requireUserId(request);
    if (response) return response;

    const { id } = await params;
    const existing = await prisma.subscription.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
    }

    await prisma.subscription.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
