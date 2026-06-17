import { NextRequest, NextResponse } from "next/server";
import { ZodError, ZodSchema } from "zod";
import { getCurrentUserIdFromRequest, unauthorized } from "@/lib/auth";

export async function requireUserId(request: NextRequest) {
  const userId = await getCurrentUserIdFromRequest(request);

  if (!userId) {
    return { userId: null, response: unauthorized() };
  }

  return { userId, response: null };
}

export async function parseJson<T>(request: NextRequest, schema: ZodSchema<T>) {
  const body = await request.json();
  return schema.parse(body);
}

export function apiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed.", issues: error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  console.error(error);
  return NextResponse.json({ error: "Internal server error." }, { status: 500 });
}
