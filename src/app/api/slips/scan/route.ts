import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId, apiError } from "@/lib/api";
import { extractSlipData } from "@/lib/ai/slip-extractor";
import { classifyExpense } from "@/lib/ai/expense-classifier";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);

export async function POST(request: NextRequest) {
  try {
    const { userId, response } = await requireUserId(request);
    if (response) return response;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Use JPG, PNG, or PDF." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10 MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const ocrText = await performOcr(buffer, file.type);
    const extraction = await extractSlipData(ocrText, file.type.startsWith("image/") ? base64 : undefined);

    const occurredAt = extraction.date
      ? new Date(`${extraction.date}T${extraction.time ?? "00:00:00"}`)
      : new Date();

    const merchant = extraction.receiver ?? extraction.bank ?? "Unknown merchant";

    let transaction = null;
    let aiReport = null;

    let classification = null;

    if (extraction.amount && extraction.amount > 0) {
      classification = await classifyExpense(merchant, extraction.referenceNumber, extraction.amount);

      const category = await prisma.category.upsert({
        where: { userId_name: { userId, name: classification.category } },
        update: {},
        create: {
          userId,
          name: classification.category,
          color: categoryColor(classification.category),
          icon: categoryIcon(classification.category),
          isSystem: true,
        },
      });

      transaction = await prisma.transaction.create({
        data: {
          userId,
          categoryId: category.id,
          type: extraction.transactionType,
          source: "SLIP_SCAN",
          merchant,
          description: extraction.referenceNumber
            ? `Ref: ${extraction.referenceNumber}`
            : null,
          amount: extraction.amount,
          occurredAt,
          slipRawText: extraction.rawText,
          aiConfidence: classification.confidence,
          aiMetadata: {
            bank: extraction.bank,
            receiver: extraction.receiver,
            referenceNumber: extraction.referenceNumber,
            modelName: extraction.modelName,
            extractedDate: extraction.date,
            extractedTime: extraction.time,
            classifiedCategory: classification.category,
            classificationConfidence: classification.confidence,
            classificationExplanation: classification.explanation,
            classificationModel: classification.modelName,
          },
        },
        include: { category: true },
      });

      aiReport = await prisma.aiReport.create({
        data: {
          userId,
          transactionId: transaction.id,
          type: "SLIP_EXTRACTION",
          title: "Slip extraction & classification",
          summary: `Extracted ${extraction.transactionType.toLowerCase()} of ${extraction.amount} from ${merchant}. Classified as ${classification.category}.`,
          insights: {
            date: extraction.date,
            time: extraction.time,
            amount: extraction.amount,
            bank: extraction.bank,
            receiver: extraction.receiver,
            referenceNumber: extraction.referenceNumber,
            category: classification.category,
            classificationConfidence: classification.confidence,
            classificationExplanation: classification.explanation,
          },
          actions: classification.confidence < 0.7
            ? [
                "Low confidence — review and correct the category if needed.",
                "Review and confirm the extracted transaction details.",
              ]
            : [
                "Category auto-assigned. Edit manually if incorrect.",
                "Review and confirm the extracted transaction details.",
              ],
          modelName: classification.modelName,
          promptVersion: "v1",
          confidence: classification.confidence,
        },
      });
    }

    return NextResponse.json({
      extraction,
      classification,
      transaction,
      aiReport,
    });
  } catch (error) {
    return apiError(error);
  }
}

async function performOcr(buffer: Buffer, mimeType: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey && mimeType.startsWith("image/")) {
    try {
      const base64 = buffer.toString("base64");
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract ALL text from this bank transfer slip or receipt image. Return ONLY the raw text, preserving the layout as much as possible. Include all numbers, dates, names, and reference numbers.",
                },
                {
                  type: "image_url",
                  image_url: { url: `data:${mimeType};base64,${base64}` },
                },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 1000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim() ?? "";
      }
    } catch (error) {
      console.error("Vision OCR failed:", error);
    }
  }

  // PDF: extract text from buffer directly (basic text layer)
  if (mimeType === "application/pdf") {
    return extractPdfText(buffer);
  }

  return "[OCR unavailable — set OPENAI_API_KEY for vision-based extraction]";
}

function categoryColor(name: string): string {
  const map: Record<string, string> = {
    Food: "#d85c46", Shopping: "#2855a3", Luxury: "#cf8b21", Transport: "#087f7a",
    Entertainment: "#7c3aed", Education: "#0891b2", Investment: "#20875a", Other: "#687188",
  };
  return map[name] ?? "#687188";
}

function categoryIcon(name: string): string {
  const map: Record<string, string> = {
    Food: "Utensils", Shopping: "ShoppingBag", Luxury: "Gem", Transport: "Train",
    Entertainment: "Gamepad2", Education: "GraduationCap", Investment: "TrendingUp", Other: "Wallet",
  };
  return map[name] ?? "Wallet";
}

function extractPdfText(buffer: Buffer): string {
  const text = buffer.toString("utf-8");
  const matches: string[] = [];
  const streamRegex = /\(([^)]+)\)/g;
  let match;
  while ((match = streamRegex.exec(text)) !== null) {
    const decoded = match[1].replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
    if (decoded.trim().length > 1) {
      matches.push(decoded.trim());
    }
  }
  return matches.length > 0
    ? matches.join(" ")
    : "[PDF text extraction limited — use image format for better results]";
}
