const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_GENERATION_MODEL = "gemini-3.1-flash-lite-preview";
const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001";

// Fallback chain used when the primary model is overloaded or rate-limited.
// Each model is tried in order; the first successful response wins.
const GENERATION_FALLBACK_CHAIN = [
  "gemini-3.1-flash-lite-preview", // Primary: Gemini 3.1 Flash-Lite
  "gemini-3-flash-preview",        // Fallback 1: Gemini 3 Flash (Preview)
  "gemini-2.5-flash",              // Fallback 2: Gemini 2.5 Flash (Stable)
];

function isOverloadError(status, payload) {
  if (status === 429 || status === 503) return true;
  const message = `${payload?.error?.message || ""}`.toLowerCase();
  return message.includes("overloaded") || message.includes("quota") || message.includes("rate limit");
}

function getGeminiApiKey() {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.gemini_api_key ||
    process.env.GOOGLE_API_KEY ||
    ""
  ).trim();
}

function assertGeminiApiKey() {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      "Missing Gemini API key. Set GEMINI_API_KEY or gemini_api_key in the server environment."
    );
  }

  return apiKey;
}

async function geminiRequest(pathname, body) {
  const apiKey = assertGeminiApiKey();
  const url = `${GEMINI_API_BASE_URL}${pathname}?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage =
      payload?.error?.message ||
      payload?.message ||
      `Gemini request failed with status ${response.status}.`;
    const err = new Error(errorMessage);
    err.status = response.status;
    err.payload = payload;
    throw err;
  }

  return payload;
}

// Tries each model in the fallback chain in order.
// Falls back to the next model only on overload / rate-limit errors.
async function geminiRequestWithFallback(buildPathname, body, chain = GENERATION_FALLBACK_CHAIN) {
  let lastError;
  for (const model of chain) {
    try {
      return await geminiRequest(buildPathname(model), body);
    } catch (err) {
      const isTransient = isOverloadError(err.status, err.payload);
      if (!isTransient) throw err; // Hard error — don't retry with another model
      console.warn(`[gemini] Model "${model}" overloaded or rate-limited, trying next fallback...`);
      lastError = err;
    }
  }
  throw lastError;
}

function extractTextFromResponse(payload) {
  const parts =
    payload?.candidates?.[0]?.content?.parts ||
    payload?.response?.candidates?.[0]?.content?.parts ||
    [];

  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

export async function generateText({
  prompt,
  model = DEFAULT_GENERATION_MODEL,
  temperature = 0.2,
  maxOutputTokens = 8192,
  responseMimeType,
  mediaParts = [],
}) {
  // Build the fallback chain: start from the requested model, then continue
  // with the remaining entries in the default chain.
  const modelIndex = GENERATION_FALLBACK_CHAIN.indexOf(model);
  const chain =
    modelIndex >= 0
      ? GENERATION_FALLBACK_CHAIN.slice(modelIndex)
      : [model, ...GENERATION_FALLBACK_CHAIN];

  const body = {
    contents: [
      {
        parts: [...mediaParts, { text: prompt }],
      },
    ],
    generationConfig: {
      temperature,
      maxOutputTokens,
      ...(responseMimeType ? { responseMimeType } : {}),
    },
  };

  const payload = await geminiRequestWithFallback(
    (m) => `/models/${m}:generateContent`,
    body,
    chain
  );

  const text = extractTextFromResponse(payload);
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}

export async function generateJson(args) {
  const text = await generateText({
    ...args,
    responseMimeType: "application/json",
  });

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Gemini returned invalid JSON.");
  }
}

export async function extractDocumentTextWithGemini({
  buffer,
  mimeType = "application/pdf",
  fileName = "document",
}) {
  const prompt = [
    `You are a strict data extraction assistant. Convert the entire attached file "${fileName}" precisely into clean markdown.`,
    "Preserve EVERY heading, paragraph, table, list, and instruction exactly as it appears. Do not summarize or paraphrase.",
    "Do not invent facts and do not omit any details whatsoever.",
    "If the file contains tables, convert them into readable markdown format or key-value lines.",
    "If the document is very long, ensure you extract it start to finish without skipping anything.",
    "Return markdown only without any intro or outro text.",
  ].join("\n");

  return generateText({
    prompt,
    mediaParts: [
      {
        inline_data: {
          mime_type: mimeType,
          data: Buffer.from(buffer).toString("base64"),
        },
      },
    ],
    temperature: 0.1,
    maxOutputTokens: 12288,
  });
}

export async function embedText(
  text,
  {
    model = DEFAULT_EMBEDDING_MODEL,
    taskType = "RETRIEVAL_DOCUMENT",
    outputDimensionality = 768,
  } = {}
) {
  const payload = await geminiRequest(`/models/${model}:embedContent`, {
    content: {
      parts: [{ text }],
    },
    taskType,
    outputDimensionality,
  });

  const values = payload?.embedding?.values;
  if (!Array.isArray(values) || !values.length) {
    throw new Error("Gemini embedding response was empty.");
  }

  return values;
}

export async function embedTexts(
  texts,
  options = {}
) {
  const items = Array.isArray(texts) ? texts : [];
  const results = [];

  for (const text of items) {
    results.push(await embedText(text, options));
  }

  return results;
}
