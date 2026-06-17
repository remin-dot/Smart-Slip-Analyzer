const EXPENSE_CATEGORIES = [
  "Food",
  "Shopping",
  "Luxury",
  "Transport",
  "Entertainment",
  "Education",
  "Investment",
  "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export type ClassificationResult = {
  category: ExpenseCategory;
  confidence: number;
  explanation: string;
  modelName: string;
};

const SYSTEM_PROMPT = `You are an expense classification engine. Given a transaction's merchant name, description, and amount, classify it into exactly ONE category.

Categories:
- Food: restaurants, cafes, food delivery, groceries, bakeries, street food
- Shopping: retail stores, online shopping, clothing, electronics, home goods
- Luxury: jewelry, designer brands, premium services, spa, fine dining (above typical price)
- Transport: fuel, taxi, ride-sharing, public transit, parking, tolls, car maintenance
- Entertainment: movies, games, streaming, concerts, sports, hobbies, bars, nightlife
- Education: courses, books, tuition, workshops, certifications, school supplies
- Investment: stocks, funds, savings deposits, insurance premiums, property payments
- Other: anything that doesn't fit the above categories

Return ONLY a JSON object:
{
  "category": "one of the 8 categories above",
  "confidence": 0.0 to 1.0,
  "explanation": "one sentence explaining why this category was chosen"
}`;

export async function classifyExpense(
  merchant: string,
  description: string | null,
  amount: number
): Promise<ClassificationResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return classifyWithRules(merchant, description, amount);
  }

  try {
    const prompt = [
      `Merchant: ${merchant}`,
      description ? `Description: ${description}` : null,
      `Amount: ${amount}`,
    ]
      .filter(Boolean)
      .join("\n");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.error("OpenAI classify error:", response.status);
      return classifyWithRules(merchant, description, amount);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    const parsed = JSON.parse(content);

    return {
      category: validCategory(parsed.category),
      confidence: clampConfidence(parsed.confidence),
      explanation: parsed.explanation ?? "Classified by AI.",
      modelName: "gpt-4o-mini",
    };
  } catch (error) {
    console.error("AI classification failed, falling back to rules:", error);
    return classifyWithRules(merchant, description, amount);
  }
}

function validCategory(cat: string | undefined): ExpenseCategory {
  if (cat && EXPENSE_CATEGORIES.includes(cat as ExpenseCategory)) {
    return cat as ExpenseCategory;
  }
  return "Other";
}

function clampConfidence(val: unknown): number {
  const n = Number(val);
  if (isNaN(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

type Rule = {
  category: ExpenseCategory;
  keywords: string[];
};

const RULES: Rule[] = [
  {
    category: "Food",
    keywords: [
      "cafe", "coffee", "restaurant", "food", "eat", "dining", "pizza",
      "burger", "sushi", "noodle", "bakery", "grocery", "supermarket",
      "7-eleven", "starbucks", "mcdonald", "kfc", "grab food", "foodpanda",
      "lineman", "ร้านอาหาร", "กาแฟ", "อาหาร",
    ],
  },
  {
    category: "Shopping",
    keywords: [
      "shop", "store", "mall", "retail", "amazon", "lazada", "shopee",
      "central", "big c", "tesco", "lotus", "clothing", "fashion",
      "electronics", "hardware", "ikea", "uniqlo", "h&m",
    ],
  },
  {
    category: "Luxury",
    keywords: [
      "luxury", "gucci", "louis vuitton", "prada", "rolex", "spa",
      "resort", "premium", "diamond", "jewelry", "designer", "chanel",
      "hermès", "hermes", "cartier", "tiffany",
    ],
  },
  {
    category: "Transport",
    keywords: [
      "grab", "bolt", "taxi", "uber", "fuel", "gas", "petrol", "shell",
      "ptt", "bts", "mrt", "transit", "parking", "toll", "airport",
      "airline", "train", "bus", "metro", "ขนส่ง", "น้ำมัน",
    ],
  },
  {
    category: "Entertainment",
    keywords: [
      "movie", "cinema", "netflix", "spotify", "game", "steam", "playstation",
      "concert", "ticket", "bar", "club", "pub", "karaoke", "bowling",
      "gym", "fitness", "sport", "youtube", "disney", "hbo",
    ],
  },
  {
    category: "Education",
    keywords: [
      "school", "university", "course", "udemy", "coursera", "book",
      "library", "tuition", "class", "workshop", "training", "academy",
      "certification", "exam", "education", "learn", "tutorial",
    ],
  },
  {
    category: "Investment",
    keywords: [
      "invest", "stock", "fund", "mutual", "bond", "insurance", "savings",
      "deposit", "property", "real estate", "crypto", "bitcoin", "etf",
      "dividend", "portfolio", "brokerage",
    ],
  },
];

function classifyWithRules(
  merchant: string,
  description: string | null,
  amount: number
): ClassificationResult {
  const text = `${merchant} ${description ?? ""}`.toLowerCase();

  for (const rule of RULES) {
    const matched = rule.keywords.filter((kw) => text.includes(kw.toLowerCase()));
    if (matched.length > 0) {
      const confidence = Math.min(0.45 + matched.length * 0.12, 0.78);
      return {
        category: rule.category,
        confidence,
        explanation: `Matched keywords: ${matched.slice(0, 3).join(", ")}.`,
        modelName: "local-rule-engine",
      };
    }
  }

  return {
    category: "Other",
    confidence: 0.3,
    explanation: "No strong keyword match found. Classified as Other.",
    modelName: "local-rule-engine",
  };
}
