import { $Enums } from "@prisma/client";

export type SlipExtraction = {
  date: string | null;
  time: string | null;
  amount: number | null;
  bank: string | null;
  receiver: string | null;
  referenceNumber: string | null;
  transactionType: $Enums.TransactionType;
  rawText: string;
  confidence: number;
  modelName: string;
};

type OpenAIMessage = {
  role: "system" | "user";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
};

const SYSTEM_PROMPT = `You are a financial document OCR extraction engine. Given the raw text extracted from a bank transfer slip or receipt, extract the following fields as JSON:

{
  "date": "YYYY-MM-DD or null",
  "time": "HH:MM:SS or null",
  "amount": number or null (the transferred/paid amount, no currency symbol),
  "bank": "bank name or null",
  "receiver": "recipient name or account or null",
  "referenceNumber": "reference/transaction number or null",
  "transactionType": "EXPENSE" | "INCOME" | "TRANSFER"
}

Rules:
- Return ONLY the JSON object, no markdown or explanation.
- For Thai bank slips, amounts in Thai Baht should be extracted as numbers.
- If a field cannot be determined, use null.
- transactionType should be "TRANSFER" for bank transfers, "EXPENSE" for payments/purchases, "INCOME" for deposits.
- Dates should be converted to YYYY-MM-DD format regardless of input format.
- Times should be in 24-hour HH:MM:SS format.`;

export async function extractSlipData(ocrText: string, imageBase64?: string): Promise<SlipExtraction> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return extractWithRules(ocrText);
  }

  try {
    const messages: OpenAIMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    if (imageBase64) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: `Extract transaction data from this bank slip image. Here is the OCR text for reference:\n\n${ocrText}` },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: `Extract transaction data from this bank slip text:\n\n${ocrText}`,
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: imageBase64 ? "gpt-4o" : "gpt-4o-mini",
        messages,
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error("OpenAI API error:", response.status);
      return extractWithRules(ocrText);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    const parsed = JSON.parse(content);

    return {
      date: parsed.date ?? null,
      time: parsed.time ?? null,
      amount: typeof parsed.amount === "number" ? parsed.amount : null,
      bank: parsed.bank ?? null,
      receiver: parsed.receiver ?? null,
      referenceNumber: parsed.referenceNumber ?? null,
      transactionType: validTransactionType(parsed.transactionType),
      rawText: ocrText,
      confidence: 0.92,
      modelName: imageBase64 ? "gpt-4o" : "gpt-4o-mini",
    };
  } catch (error) {
    console.error("AI extraction failed, falling back to rules:", error);
    return extractWithRules(ocrText);
  }
}

function validTransactionType(type: string | undefined): $Enums.TransactionType {
  if (type === "INCOME" || type === "EXPENSE" || type === "TRANSFER") return type;
  return "EXPENSE";
}

function extractWithRules(text: string): SlipExtraction {
  const amountMatch = text.match(/(?:amount|total|จำนวน|ยอด)[:\s]*(?:THB|฿|USD|\$)?\s*([\d,]+\.?\d*)/i)
    ?? text.match(/([\d,]+\.\d{2})\s*(?:THB|฿|USD|baht|บาท)/i)
    ?? text.match(/(?:THB|฿|\$)\s*([\d,]+\.?\d*)/i);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, "")) : null;

  const dateMatch = text.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/)
    ?? text.match(/(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
  let date: string | null = null;
  if (dateMatch) {
    const parts = dateMatch.slice(1).map(Number);
    if (parts[0] > 31) {
      date = `${parts[0]}-${String(parts[1]).padStart(2, "0")}-${String(parts[2]).padStart(2, "0")}`;
    } else if (parts[2] > 31) {
      const year = parts[2] > 2500 ? parts[2] - 543 : parts[2] < 100 ? parts[2] + 2000 : parts[2];
      date = `${year}-${String(parts[1]).padStart(2, "0")}-${String(parts[0]).padStart(2, "0")}`;
    }
  }

  const timeMatch = text.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  const time = timeMatch
    ? `${String(timeMatch[1]).padStart(2, "0")}:${timeMatch[2]}:${timeMatch[3] ?? "00"}`
    : null;

  const refMatch = text.match(/(?:ref|reference|อ้างอิง|เลขที่)[.:\s#]*([A-Za-z0-9\-]+)/i)
    ?? text.match(/\b(\d{10,20})\b/);
  const referenceNumber = refMatch ? refMatch[1] : null;

  const bankPatterns = [
    "SCB", "Siam Commercial", "KBank", "Kasikorn", "Bangkok Bank", "BBL",
    "Krungthai", "KTB", "TMB", "TTB", "Krungsri", "BAY", "GSB",
    "PromptPay", "TrueMoney", "Chase", "BOA", "Citi", "Wells Fargo"
  ];
  const bank = bankPatterns.find((b) => text.toLowerCase().includes(b.toLowerCase())) ?? null;

  const receiverMatch = text.match(/(?:to|receiver|ผู้รับ|โอนให้)[:\s]*(.+)/im);
  const receiver = receiverMatch ? receiverMatch[1].trim().slice(0, 140) : null;

  const isTransfer = /transfer|โอน/i.test(text);
  const isIncome = /deposit|income|เงินเข้า|รับ/i.test(text);

  return {
    date,
    time,
    amount,
    bank,
    receiver,
    referenceNumber,
    transactionType: isIncome ? "INCOME" : isTransfer ? "TRANSFER" : "EXPENSE",
    rawText: text,
    confidence: 0.55,
    modelName: "local-rule-engine",
  };
}
