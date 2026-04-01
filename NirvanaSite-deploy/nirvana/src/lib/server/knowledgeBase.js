import { createHash } from "crypto";
import {
  embedText,
  embedTexts,
  extractDocumentTextWithGemini,
  generateJson,
  generateText,
} from "./geminiApi";

const KNOWLEDGE_SYNC_MODEL_LABEL = "gemini-3.1-flash-lite-preview + gemini-embedding-001";
const CHUNK_SIZE = 1100;
const CHUNK_OVERLAP = 180;
const TEXT_EMBED_DIMENSION = 768;
const MAX_GENERATED_SECTIONS = 20;
const TARGET_MIN_SECTIONS = 5;
const MAX_RECOMMENDED_QUESTIONS_PER_SECTION = 3;
const SOURCE_APPENDIX_SLUG = "canonical-source-details";
const BACKGROUND_SYNC_QUEUE =
  globalThis.__knowledgeBackgroundSyncQueue ||
  (globalThis.__knowledgeBackgroundSyncQueue = new Map());

function slugify(value) {
  return `${value || ""}`
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function checksum(value) {
  return createHash("sha256").update(`${value || ""}`).digest("hex");
}

function normalizeWhitespace(value) {
  return `${value || ""}`
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
      .trim();
}

function parseObjectLike(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function normalizeIdList(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [values])
        .flat()
        .filter(Boolean)
        .map((value) => `${value}`.trim())
        .filter(Boolean)
    )
  );
}

function normalizeStringList(values, maxItems = 8) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [values])
        .flat()
        .map((value) => normalizeWhitespace(value))
        .filter(Boolean)
    )
  ).slice(0, maxItems);
}

function cleanGeneratedAnswer(value) {
  return normalizeWhitespace(
    `${value || ""}`
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      .replace(/^[ \t]*#{1,6}[ \t]*/gm, "")
      .replace(/^[ \t]*[-*][ \t]+/gm, "- ")
      .replace(/[ \t]{2,}/g, " ")
  );
}

function stripHtmlTags(value) {
  return normalizeWhitespace(
    `${value || ""}`
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
  );
}

function estimateTokens(text) {
  return Math.max(1, Math.ceil(`${text || ""}`.length / 4));
}

function summarizeSpaces(spaces) {
  if (!Array.isArray(spaces) || !spaces.length) {
    return "No spaces configured.";
  }

  return spaces
    .map((space, index) => {
      const heading = space?.name || `Space ${index + 1}`;
      const description = space?.description || "";
      return `- ${heading}${description ? `: ${description}` : ""}`;
    })
    .join("\n");
}

function formatFaqs(faqs) {
  if (!faqs.length) return "No FAQs recorded.";
  return faqs
    .map(
      (faq) =>
        `Q: ${faq.question || "Untitled question"}\nA: ${faq.answer || "No answer supplied."}`
    )
    .join("\n\n");
}

function formatAmenities(amenities) {
  if (!amenities.length) return "No amenities recorded.";
  return amenities
    .map((amenity) =>
      `- ${amenity.title || "Untitled amenity"}${amenity.description ? `: ${amenity.description}` : ""}`
    )
    .join("\n");
}

function formatActivities(activities) {
  if (!activities.length) return "No nearby activities recorded.";
  return activities
    .map((activity) => {
      const parts = [activity.title || "Untitled activity"];
      if (activity.description) {
        parts.push(activity.description);
      }
      if (activity.link_url) {
        parts.push(`Link: ${activity.link_url}`);
      }
      return `- ${parts.join(" | ")}`;
    })
    .join("\n");
}

function formatReviews(reviews) {
  if (!reviews.length) return "No guest reviews recorded.";
  return reviews
    .map((review) => {
      const author = review.author_name || "Guest";
      const rating = review.rating ? `${review.rating}/5` : "No rating";
      const date = review.date || review.created_at || "";
      return `- ${author} (${rating}${date ? ` on ${date}` : ""}): ${review.content || ""}`.trim();
    })
    .join("\n");
}

function makeSectionChunk(section) {
  return normalizeWhitespace(
    [`Section: ${section.title}`, section.summary, section.content_markdown]
      .filter(Boolean)
      .join("\n\n")
  );
}

function makeQuestionChunk(question) {
  return normalizeWhitespace(`Question: ${question.question}\nAnswer: ${question.answer}`);
}

function splitTextIntoChunks(text, maxChars = CHUNK_SIZE, overlapChars = CHUNK_OVERLAP) {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return [];
  if (normalized.length <= maxChars) return [normalized];

  const chunks = [];
  let currentIndex = 0;

  while (currentIndex < normalized.length) {
    let sliceEnd = currentIndex + maxChars;
    
    if (sliceEnd >= normalized.length) {
      const finalChunk = normalized.slice(currentIndex).trim();
      if (finalChunk) chunks.push(finalChunk);
      break;
    }

    const slice = normalized.slice(currentIndex, sliceEnd);
    const breakIndexInSlice = Math.max(
      slice.lastIndexOf("\n\n"),
      slice.lastIndexOf(". "),
      slice.lastIndexOf("; "),
      slice.lastIndexOf(", ")
    );

    let cutLength = maxChars;
    if (breakIndexInSlice > Math.floor(maxChars * 0.5)) {
      cutLength = breakIndexInSlice + 1;
    }
    
    const chunkText = normalized.slice(currentIndex, currentIndex + cutLength).trim();
    if (chunkText) chunks.push(chunkText);
    
    // Step forward, pulling back slightly for overlap
    currentIndex += cutLength - overlapChars;
    
    // Prevent infinite loop if overlap >= cutLength (edge case)
    if (cutLength - overlapChars <= 0) {
      currentIndex += 50; // force progression
    }
  }

  return chunks;
}

function mapSourceIds(sourceRefs, sourceRefToId) {
  if (!Array.isArray(sourceRefs)) return [];
  return Array.from(
    new Set(
      sourceRefs
        .map((ref) => sourceRefToId.get(String(ref || "").trim()))
        .filter(Boolean)
    )
  );
}

function mergeUniqueUuidArrays(...arrays) {
  const values = arrays.flat().filter(Boolean).map(String);
  return Array.from(new Set(values));
}

function truncateForPrompt(value, maxChars) {
  const normalized = normalizeWhitespace(value);
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars)}\n\n[truncated]`;
}

function buildSourceReferenceCatalog(sources) {
  return sources.map((source, index) => ({
    ref: `S${index + 1}`,
    id: source.id,
    title: source.title,
    source_type: source.source_type,
    content: truncateForPrompt(source.content_text, 18000),
  }));
}

function isReadOnlySystemSection(section) {
  return (
    section?.section_origin === "system" ||
    section?.metadata?.system_section === "source_appendix"
  );
}

function isAiManagedSection(section) {
  return section?.section_origin === "ai";
}

function isAiManagedQuestion(question) {
  return question?.question_origin === "ai";
}

function normalizeQuestionKey(value) {
  return normalizeWhitespace(value || "").toLowerCase();
}

function getSectionTopicKey(section) {
  return `${section?.metadata?.ai_topic_key || slugify(section?.title || "")}`.trim();
}

function getQuestionTopicKey(question) {
  return `${question?.metadata?.ai_question_key || normalizeQuestionKey(question?.question || "")}`.trim();
}

function buildSectionTopicText(section = {}) {
  return normalizeWhitespace(
    [
      section?.title || "",
      section?.summary || "",
      section?.content_markdown || section?.contentMarkdown || "",
    ].join("\n")
  );
}

function buildTokenSet(value) {
  return new Set(tokenizeSearchText(value));
}

function computeTokenDiceScore(left, right) {
  const leftValues = left instanceof Set ? Array.from(left) : Array.from(new Set(left || []));
  const rightValues =
    right instanceof Set ? Array.from(right) : Array.from(new Set(right || []));
  if (!leftValues.length || !rightValues.length) return 0;

  const rightSet = new Set(rightValues);
  let overlap = 0;
  for (const token of leftValues) {
    if (rightSet.has(token)) {
      overlap += 1;
    }
  }

  return (2 * overlap) / (leftValues.length + rightValues.length);
}

function hasSectionTextChanges(existingSection, nextSection) {
  return (
    normalizeWhitespace(existingSection?.title || "") !==
      normalizeWhitespace(nextSection?.title || "") ||
    normalizeWhitespace(existingSection?.summary || "") !==
      normalizeWhitespace(nextSection?.summary || "") ||
    normalizeWhitespace(existingSection?.content_markdown || "") !==
      normalizeWhitespace(nextSection?.content_markdown || "")
  );
}

function clearSuggestedSectionEditMetadata(metadata = {}) {
  const nextMetadata = { ...(metadata || {}) };
  delete nextMetadata.ai_suggested_edit;
  delete nextMetadata.ai_suggested_edit_updated_at;
  return nextMetadata;
}

function buildSuggestedSectionEdit(section, rawSection, sourceIds, syncTimestamp) {
  return {
    title: normalizeWhitespace(rawSection?.title || section?.title || ""),
    summary: normalizeWhitespace(rawSection?.summary || ""),
    content_markdown: normalizeWhitespace(rawSection?.content_markdown || ""),
    source_ids: sourceIds,
    generated_at: syncTimestamp,
  };
}

function findMatchingKnowledgeSection(rawSection, existingSectionsByTopicKey, existingSections) {
  const title = `${rawSection?.title || ""}`.trim();
  const slug = slugify(title);
  if (slug) {
    const exactMatch = existingSectionsByTopicKey.get(slug);
    if (exactMatch && !isReadOnlySystemSection(exactMatch)) {
      return exactMatch;
    }
  }

  const rawTitleText = normalizeWhitespace(title);
  const rawBodyText = buildSectionTopicText(rawSection);
  const rawTitleTokens = buildTokenSet(rawTitleText);
  const rawBodyTokens = buildTokenSet(rawBodyText);
  const normalizedRawTitle = rawTitleText.toLowerCase();

  let bestMatch = null;
  let bestScore = 0;

  for (const candidate of existingSections) {
    if (!candidate || isReadOnlySystemSection(candidate)) continue;

    const candidateTitleText = normalizeWhitespace(candidate.title || "");
    const candidateBodyText = buildSectionTopicText(candidate);
    const titleScore = computeTokenDiceScore(rawTitleTokens, buildTokenSet(candidateTitleText));
    const bodyScore = computeTokenDiceScore(rawBodyTokens, buildTokenSet(candidateBodyText));
    const normalizedCandidateTitle = candidateTitleText.toLowerCase();
    const titleContainsMatch =
      normalizedRawTitle &&
      normalizedCandidateTitle &&
      (normalizedRawTitle.includes(normalizedCandidateTitle) ||
        normalizedCandidateTitle.includes(normalizedRawTitle));

    const score = Math.max(titleScore, titleContainsMatch ? 1 : 0) * 0.35 + bodyScore * 0.65;
    const isStrongTopicMatch =
      bodyScore >= 0.7 ||
      score >= 0.58 ||
      (titleContainsMatch && bodyScore >= 0.22) ||
      (titleScore >= 0.34 && bodyScore >= 0.34);

    if (isStrongTopicMatch && score > bestScore) {
      bestMatch = candidate;
      bestScore = score;
    }
  }

  return bestMatch;
}

function buildKnowledgePrompt({ hub, sourceCatalog, existingSections, existingQuestions }) {
  const sourceBlocks = sourceCatalog
    .map(
      (source) =>
        `${source.ref} | ${source.title} | ${source.source_type}\n${source.content || "No extracted text."}`
    )
    .join("\n\n---\n\n");

  const existingSectionText = existingSections.length
    ? existingSections
        .map(
          (section) =>
            `- ${section.title} [${section.section_origin || "unknown"}]\nSummary: ${section.summary || "None"}\nContent:\n${section.content_markdown || "None"}`
        )
        .join("\n\n")
    : "None";

  const existingQuestionText = existingQuestions.length
    ? existingQuestions
        .map(
          (item) =>
            `- ${item.question} [${item.question_origin || "unknown"}]\nAnswer: ${item.answer}`
        )
        .join("\n\n")
    : "None";

  return `
You are curating an admin-only hospitality knowledge base.

Hub title: ${hub.title}
Hub scope: ${hub.scope_type}
${hub.property?.name ? `Property: ${hub.property.name}` : ""}

Goals:
1. Consolidate operational knowledge from the provided sources.
2. Create sections that help admins answer difficult guest and operations questions.
3. Add new sections only when the sources justify genuinely new information.
4. Use the latest source facts as the authority. Preserve existing knowledge unless current sources clearly add to it or directly contradict it.
5. Keep answers concise, factual, and useful for hospitality operations.

Existing sections for continuity only:
${existingSectionText}

Existing questions for continuity only:
${existingQuestionText}

Return JSON with this exact shape:
{
  "sections": [
    {
      "title": "string",
      "summary": "string",
      "content_markdown": "markdown bullet list or short operational notes",
      "display_order": 0,
      "source_refs": ["S1", "S2"],
      "recommended_questions": [
        {
          "question": "string",
          "answer": "string",
          "display_order": 0,
          "source_refs": ["S1"]
        }
      ]
    }
  ]
}

Rules:
- Use only the supplied sources.
- Keep the final knowledge hub compact, but do not over-club unrelated topics. Aim for focused sections and allow up to 20 when the sources justify it.
- Focus on categories like check-in, access, rules, safety, troubleshooting, amenities, local guidance, policies, and operations when supported by the sources.
- Sections and answers must be detailed enough for admins but not verbose.
- Prefer 1 to 3 recommended questions per section.
- Do not use markdown headings inside content_markdown; simple bullets or short paragraphs are enough.
- Every section and question must include at least one source_ref.
- Prefer updating or enriching an existing topic over creating a duplicate topic with slightly different wording.
- Create a brand-new section only when the new information is genuinely irrelevant to every existing section.
- Do not remove existing knowledge unless current sources clearly contradict it.
- If existing knowledge is still valid but current sources add new detail, merge the new detail into that topic instead of replacing it wholesale.
- Treat any existing manual or hybrid content as curated editorial knowledge. Do not regenerate the same topic or question in a way that would overwrite that curated content.
- If a topic is missing from the sources, omit it rather than guessing.

Sources:
${sourceBlocks}
  `.trim();
}

function buildChatPrompt({ hub, question, intent, matches }) {
  const context = matches
    .map(
      (match, index) =>
        `[${index + 1}] ${match.title || match.chunk_type}\n${truncateForPrompt(match.content, 2500)}`
    )
    .join("\n\n---\n\n");

  return `
You are answering an internal admin question for a hospitality operations knowledge hub.
Hub: ${hub.title}

Use only the supplied context. If the context is insufficient, say that clearly and mention what is missing.
Answer like a capable hospitality chatbot speaking to an admin: natural, direct, and tailored to the user intent.
Lead with the direct answer, then add the most relevant supporting details.
When the user asks broadly about a property, synthesize the key details into a concise overview instead of echoing raw source text.
Prefer short paragraphs over lists unless a list is clearly the best format.
Do not use markdown, asterisks, headings, or bullet formatting in the final answer.
Do not invent policies or instructions.

Question:
${question}

Detected intent:
${intent || "General property question"}

Context:
${context}
  `.trim();
}

function tokenizeSearchText(value) {
  return Array.from(
    new Set(
      `${value || ""}`
        .toLowerCase()
        .split(/[^a-z0-9]+/g)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3)
    )
  );
}

const SEARCH_STOPWORDS = new Set([
  "about",
  "admin",
  "all",
  "and",
  "answer",
  "answers",
  "ask",
  "asked",
  "booking",
  "can",
  "details",
  "for",
  "from",
  "give",
  "guests",
  "help",
  "how",
  "information",
  "into",
  "need",
  "please",
  "question",
  "show",
  "tell",
  "that",
  "the",
  "their",
  "there",
  "this",
  "what",
  "when",
  "where",
  "which",
  "with",
]);

function extractSearchTerms(searchTexts = []) {
  return tokenizeSearchText(searchTexts.join(" ")).filter(
    (token) => !SEARCH_STOPWORDS.has(token)
  );
}

function computeLexicalScore(match, tokens = []) {
  if (!tokens.length) return 0;

  const title = `${match.title || ""}`.toLowerCase();
  const content = `${match.content || ""}`.toLowerCase();

  let titleHits = 0;
  let contentHits = 0;
  let exactPhraseHits = 0;

  for (const token of tokens) {
    if (title.includes(token)) titleHits += 1;
    if (content.includes(token)) contentHits += 1;
    if (content.includes(`${token}:`) || content.includes(`${token} is`) || content.includes(`${token} code`)) {
      exactPhraseHits += 1;
    }
  }

  return (
    (titleHits / tokens.length) * 0.35 +
    (contentHits / tokens.length) * 0.45 +
    (exactPhraseHits / tokens.length) * 0.4
  );
}

async function fetchLexicalMatches(adminClient, {
  requestedHubIds,
  searchTexts = [],
  topics = [],
  requiredPhrases = [],
  preferredChunkTypes = [],
  allowHiddenSections = true,
}) {
  const tokens = extractSearchTerms(searchTexts).slice(0, 8);
  if (!tokens.length || !requestedHubIds.length) return [];

  const orFilters = tokens.flatMap((token) => [
    `title.ilike.%${token}%`,
    `content.ilike.%${token}%`,
  ]);

  let query = adminClient
    .from("knowledge_chunks")
    .select("id,hub_id,source_id,section_id,question_id,chunk_type,title,content,metadata,created_at")
    .in("hub_id", requestedHubIds)
    .or(orFilters.join(","));

  if (preferredChunkTypes.length) {
    query = query.in("chunk_type", preferredChunkTypes);
  }

  const { data, error } = await query.limit(160);

  if (error) throw error;

  return filterMatchesByPlan(
    (data || [])
    .map((match) => ({
      ...match,
      similarity: match.similarity || 0,
      lexicalScore: computeLexicalScore(match, tokens),
    }))
    .filter((match) => (match.lexicalScore || 0) > 0)
    .sort((left, right) => (right.lexicalScore || 0) - (left.lexicalScore || 0))
    .slice(0, 24),
    {
      topics,
      requiredPhrases,
      preferredChunkTypes,
      allowHiddenSections,
    }
  );
}

function rerankRetrievedMatches(matches, { searchTexts = [], primaryHubId = null } = {}) {
  const tokens = extractSearchTerms(searchTexts);
  if (!tokens.length) {
    return [...matches].sort((left, right) => (right.similarity || 0) - (left.similarity || 0));
  }

  const seeksAccessCode = tokens.some((token) =>
    ["access", "code", "door", "entry", "keypad", "pool"].includes(token)
  );

  return [...matches]
    .map((match) => {
      const haystack = `${match.title || ""}\n${match.content || ""}`.toLowerCase();
      const overlapCount = tokens.reduce(
        (count, token) => (haystack.includes(token) ? count + 1 : count),
        0
      );
      const overlapRatio = overlapCount / tokens.length;
      const lexicalScore =
        typeof match.lexicalScore === "number" ? match.lexicalScore : computeLexicalScore(match, tokens);
      const typeBoost =
        match.chunk_type === "question" ? 0.08 : match.chunk_type === "section" ? 0.06 : 0;
      const verificationStatus = `${match.metadata?.verification_status || ""}`.toLowerCase();
      const verificationBoost =
        verificationStatus === "system"
          ? 0.16
          : verificationStatus === "source_backed"
            ? 0.12
            : verificationStatus === "manual_override"
              ? 0.03
              : verificationStatus === "conflict"
                ? -0.3
                : verificationStatus === "unverified"
                  ? -0.04
                  : 0;
      const sourceTypeBoost =
        match.metadata?.source_type === "manual_note"
          ? 0.12
          : match.metadata?.source_type === "upload"
            ? 0.08
            : match.metadata?.source_type === "system_snapshot"
              ? 0.03
              : 0;
      const hubBoost = primaryHubId && match.hub_id === primaryHubId ? 0.24 : 0;
      const accessCodeBoost = seeksAccessCode
        ? haystack.includes("code") && (haystack.includes("access") || haystack.includes("door"))
          ? 0.28
          : haystack.includes("code")
            ? 0.18
            : haystack.includes("keypad") || haystack.includes("entry")
              ? 0.1
              : 0
        : 0;

      return {
        ...match,
        retrievalScore:
          (match.similarity || 0) +
          overlapRatio * 0.18 +
          lexicalScore * 0.55 +
          typeBoost +
          verificationBoost +
          sourceTypeBoost +
          hubBoost +
          accessCodeBoost,
      };
    })
    .sort((left, right) => (right.retrievalScore || 0) - (left.retrievalScore || 0));
}

async function buildRetrievalPlan({ hub, question }) {
  const result = await generateJson({
    prompt: `
You are preparing semantic search queries for a hospitality knowledge base.

Hub title: ${hub.title}
Hub scope: ${hub.scope_type}
${hub.property?.name ? `Property name: ${hub.property.name}` : ""}

User question:
${question}

Return JSON with this exact shape:
{
  "queries": ["string"],
  "intent": "string",
  "property_entities": ["string"],
  "topics": ["string"],
  "required_phrases": ["string"],
  "preferred_chunk_types": ["section", "question"],
  "allow_hidden_sections": true
}

Rules:
- Produce 2 to 4 short semantic search queries.
- Keep each query focused on meaning, not exact wording.
- Expand obvious hospitality intent such as property overview, amenities, occupancy, rules, check-in, location, access, safety, and policies when relevant.
- Include the property name when it helps retrieval.
- Extract explicit property names only into property_entities.
- Extract 1 to 5 meaningful topical entities into topics, such as indoor pool, parking, cancellation, thermostat, access code, hot tub, check-in, Wi-Fi, or pet policy.
- Extract 0 to 4 discriminating required_phrases that should appear in a strong candidate if the answer exists, such as "access code", "check-out time", "pet fee", or "Wi-Fi password". Prefer specific multi-word phrases over single generic words whenever possible.
- preferred_chunk_types must contain only "section" and/or "question".
- Use allow_hidden_sections = true only when the question likely depends on exact operational detail, exhaustive source-backed facts, or troubleshooting specifics that may live in the canonical source appendix.
- Do not answer the question.
- Do not use markdown.
    `.trim(),
    temperature: 0.1,
    maxOutputTokens: 512,
  }).catch(() => null);

  const queries = Array.from(
    new Set(
      [
        question,
        ...(Array.isArray(result?.queries) ? result.queries : []),
      ]
        .map((value) => normalizeWhitespace(value))
        .filter(Boolean)
    )
  ).slice(0, 4);

  return {
    intent: normalizeWhitespace(result?.intent || ""),
    queries: queries.length ? queries : [normalizeWhitespace(question)],
    propertyEntities: normalizeStringList(result?.property_entities || [], 4),
    topics: normalizeStringList(result?.topics || [], 5),
    requiredPhrases: normalizeStringList(result?.required_phrases || [], 4),
    preferredChunkTypes: normalizeStringList(result?.preferred_chunk_types || [], 2)
      .map((value) => value.toLowerCase())
      .filter((value) => ["section", "question"].includes(value)),
    allowHiddenSections: Boolean(result?.allow_hidden_sections),
  };
}

async function filterRequestedHubIdsByPlan(adminClient, requestedHubIds, retrievalPlan) {
  const normalizedHubIds = normalizeIdList(requestedHubIds);
  if (normalizedHubIds.length <= 1 || !retrievalPlan.propertyEntities.length) {
    return normalizedHubIds;
  }

  const hubs = await listKnowledgeHubs(adminClient);
  const propertyNeedles = retrievalPlan.propertyEntities.map((value) => value.toLowerCase());
  const matchingHubIds = hubs
    .filter((hub) => normalizedHubIds.includes(hub.id))
    .filter((hub) => {
      const haystack = [
        hub.title,
        hub.property?.name,
        hub.property?.slug,
      ]
        .filter(Boolean)
        .join(" \n ")
        .toLowerCase();

      return propertyNeedles.some((needle) => haystack.includes(needle));
    })
    .map((hub) => hub.id);

  return matchingHubIds.length ? matchingHubIds : normalizedHubIds;
}

function applyOptionalMatchFilter(matches, predicate) {
  const filtered = matches.filter(predicate);
  return filtered.length ? filtered : matches;
}

function buildMatchHaystack(match) {
  return [
    match.title,
    match.content,
    match.metadata?.section_title,
    match.metadata?.question,
    match.metadata?.hub_title,
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

function getLogicalMatchKey(match) {
  if (match.section_id) return `section:${match.section_id}`;
  if (match.question_id) return `question:${match.question_id}`;
  if (match.source_id) return `source:${match.source_id}`;
  return `${match.chunk_type}:${match.id}`;
}

function selectPreferredLogicalMatch(existing, incoming, retrievalPlan = null) {
  if (!existing) return incoming;
  if (!incoming) return existing;

  const requiredPhrases = retrievalPlan?.requiredPhrases || [];
  const existingPhraseHits = countRequiredPhraseMatches(existing, requiredPhrases);
  const incomingPhraseHits = countRequiredPhraseMatches(incoming, requiredPhrases);

  if (incomingPhraseHits !== existingPhraseHits) {
    return incomingPhraseHits > existingPhraseHits ? incoming : existing;
  }

  const existingLexical = existing.lexicalScore || 0;
  const incomingLexical = incoming.lexicalScore || 0;
  if (incomingLexical !== existingLexical) {
    return incomingLexical > existingLexical ? incoming : existing;
  }

  const existingSimilarity = existing.similarity || 0;
  const incomingSimilarity = incoming.similarity || 0;
  if (incomingSimilarity !== existingSimilarity) {
    return incomingSimilarity > existingSimilarity ? incoming : existing;
  }

  const existingVisible = existing.metadata?.hidden_from_ui ? 0 : 1;
  const incomingVisible = incoming.metadata?.hidden_from_ui ? 0 : 1;
  if (incomingVisible !== existingVisible) {
    return incomingVisible > existingVisible ? incoming : existing;
  }

  return existing;
}

function mergeLogicalMatch(existing, incoming, retrievalPlan = null) {
  const preferred = selectPreferredLogicalMatch(existing, incoming, retrievalPlan);
  const fallback = preferred === existing ? incoming : existing;

  return {
    ...preferred,
    similarity: Math.max(existing?.similarity || 0, incoming?.similarity || 0),
    lexicalScore: Math.max(existing?.lexicalScore || 0, incoming?.lexicalScore || 0),
    retrievalScore: Math.max(existing?.retrievalScore || 0, incoming?.retrievalScore || 0),
    metadata: {
      ...(fallback?.metadata || {}),
      ...(preferred?.metadata || {}),
    },
  };
}

function phraseMatchesHaystack(haystack, phrase) {
  const normalizedPhrase = normalizeWhitespace(phrase).toLowerCase();
  if (!normalizedPhrase) return false;

  const phraseTokens = extractSearchTerms([normalizedPhrase]);
  if (!phraseTokens.length) {
    return haystack.includes(normalizedPhrase);
  }

  return phraseTokens.every((token) => haystack.includes(token));
}

function countRequiredPhraseMatches(match, requiredPhrases = []) {
  if (!requiredPhrases.length) return 0;
  const haystack = buildMatchHaystack(match);
  return requiredPhrases.reduce(
    (count, phrase) => (phraseMatchesHaystack(haystack, phrase) ? count + 1 : count),
    0
  );
}

function filterMatchesByPlan(matches, retrievalPlan) {
  const plan = {
    topics: Array.isArray(retrievalPlan?.topics) ? retrievalPlan.topics : [],
    requiredPhrases: Array.isArray(retrievalPlan?.requiredPhrases)
      ? retrievalPlan.requiredPhrases
      : [],
    preferredChunkTypes: Array.isArray(retrievalPlan?.preferredChunkTypes)
      ? retrievalPlan.preferredChunkTypes
      : [],
    allowHiddenSections:
      typeof retrievalPlan?.allowHiddenSections === "boolean"
        ? retrievalPlan.allowHiddenSections
        : true,
  };
  let filtered = Array.isArray(matches) ? [...matches] : [];
  if (!filtered.length) return [];

  if (!plan.allowHiddenSections) {
    filtered = applyOptionalMatchFilter(
      filtered,
      (match) => !(match.chunk_type === "section" && match.metadata?.hidden_from_ui)
    );
  }

  if (plan.preferredChunkTypes.length) {
    filtered = applyOptionalMatchFilter(filtered, (match) =>
      plan.preferredChunkTypes.includes(match.chunk_type)
    );
  }

  if (plan.requiredPhrases.length) {
    filtered = applyOptionalMatchFilter(
      filtered,
      (match) => countRequiredPhraseMatches(match, plan.requiredPhrases) > 0
    );
  }

  if (plan.topics.length) {
    filtered = applyOptionalMatchFilter(filtered, (match) => {
      const haystack = buildMatchHaystack(match);
      return plan.topics.some((topic) => phraseMatchesHaystack(haystack, topic));
    });
  }

  return filtered;
}

function sortMatchesForRerank(matches, retrievalPlan = null) {
  const requiredPhrases = retrievalPlan?.requiredPhrases || [];
  return [...matches].sort((left, right) => {
    const phraseDelta =
      countRequiredPhraseMatches(right, requiredPhrases) -
      countRequiredPhraseMatches(left, requiredPhrases);
    if (phraseDelta !== 0) return phraseDelta;
    const similarityDelta = (right.similarity || 0) - (left.similarity || 0);
    if (similarityDelta !== 0) return similarityDelta;
    const lexicalDelta = (right.lexicalScore || 0) - (left.lexicalScore || 0);
    if (lexicalDelta !== 0) return lexicalDelta;
    return String(left.id || "").localeCompare(String(right.id || ""));
  });
}

async function rerankMatchesWithLLM({ hub, question, retrievalPlan, matches }) {
  const candidatePool = sortMatchesForRerank(matches, retrievalPlan).slice(0, 14);
  if (candidatePool.length <= 1) {
    return candidatePool;
  }

  const candidateMap = new Map();
  const candidateText = candidatePool
    .map((match, index) => {
      const candidateId = `C${index + 1}`;
      candidateMap.set(candidateId, match);
      return [
        `${candidateId}`,
        `Type: ${match.chunk_type}`,
        `Title: ${match.title || "Untitled"}`,
        `Verification: ${match.metadata?.verification_status || "unknown"}`,
        `Hidden appendix: ${match.metadata?.hidden_from_ui ? "yes" : "no"}`,
        `Content:\n${truncateForPrompt(match.content, 1200)}`,
      ].join("\n");
    })
    .join("\n\n---\n\n");

  const reranked = await generateJson({
    prompt: `
You are reranking retrieved knowledge candidates for an internal hospitality admin assistant.

Hub: ${hub.title}
Question: ${question}
Intent: ${retrievalPlan.intent || "General admin hospitality question"}
Property entities: ${retrievalPlan.propertyEntities.join(", ") || "None"}
Topics: ${retrievalPlan.topics.join(", ") || "None"}
Required phrases: ${retrievalPlan.requiredPhrases.join(", ") || "None"}

Rank the candidates by how well they help answer the question.

Rules:
- Prefer candidates that directly answer the question over loosely related mentions.
- Prefer specific operational facts or procedures over broad summaries when the user needs an exact answer.
- Keep complementary candidates near the top when they materially help.
- Demote tangential candidates even if they mention similar words.
- Use only the candidate ids provided.

Return JSON with this exact shape:
{
  "ordered_ids": ["C1", "C2"],
  "reasoning": "string"
}

Candidates:
${candidateText}
    `.trim(),
    temperature: 0.1,
    maxOutputTokens: 1024,
  }).catch(() => null);

  const orderedIds = normalizeStringList(reranked?.ordered_ids || [], candidatePool.length);
  if (!orderedIds.length) {
    return candidatePool;
  }

  const orderedMatches = orderedIds
    .map((candidateId) => candidateMap.get(candidateId))
    .filter(Boolean);
  const usedIds = new Set(orderedMatches.map((match) => match.id));
  const remainingMatches = candidatePool.filter((match) => !usedIds.has(match.id));

  return [...orderedMatches, ...remainingMatches];
}

async function fetchSourceMap(adminClient, matches) {
  const sourceIds = Array.from(new Set(matches.map((match) => match.source_id).filter(Boolean)));
  const sourceMap = new Map();
  if (!sourceIds.length) return sourceMap;

  const { data: sources, error: sourceError } = await adminClient
    .from("knowledge_sources")
    .select("id,title,source_type,file_name,updated_at")
    .in("id", sourceIds);
  if (sourceError) throw sourceError;

  (sources || []).forEach((source) => sourceMap.set(source.id, source));
  return sourceMap;
}

async function answerQuestionAcrossHubs(adminClient, {
  hub,
  question,
  requestedHubIds,
  primaryHubId = null,
}) {
  const retrievalPlan = await buildRetrievalPlan({
    hub,
    question,
  });
  const filteredHubIds = await filterRequestedHubIdsByPlan(
    adminClient,
    requestedHubIds,
    retrievalPlan
  );

  const semanticMatches = new Map();
  for (const query of retrievalPlan.queries) {
    const queryEmbedding = await embedText(query, {
      taskType: "RETRIEVAL_QUERY",
      outputDimensionality: TEXT_EMBED_DIMENSION,
    });

    let queryMatches = [];
    for (const threshold of [0.5, 0.35, 0.2]) {
      const { data, error } = await adminClient.rpc("match_knowledge_chunks", {
        query_embedding: queryEmbedding,
        requested_hub_ids: filteredHubIds,
        match_threshold: threshold,
        match_count: 32,
      });

      if (error) throw error;
      if ((data || []).length) {
        queryMatches = data;
        break;
      }
    }

    const filteredQueryMatches = filterMatchesByPlan(queryMatches || [], retrievalPlan);
    for (const match of filteredQueryMatches) {
      const key = getLogicalMatchKey(match);
      const existing = semanticMatches.get(key);
      semanticMatches.set(key, mergeLogicalMatch(existing, match, retrievalPlan));
    }
  }

  let candidateMatches = sortMatchesForRerank(Array.from(semanticMatches.values()), retrievalPlan);
  const bestSemanticSimilarity = candidateMatches[0]?.similarity || 0;
  const hasRequiredPhraseCoverage = retrievalPlan.requiredPhrases.length
    ? candidateMatches.some(
        (match) => countRequiredPhraseMatches(match, retrievalPlan.requiredPhrases) > 0
      )
    : true;
  const needsLexicalFallback =
    candidateMatches.length < 8 || bestSemanticSimilarity < 0.58 || !hasRequiredPhraseCoverage;

  if (needsLexicalFallback) {
    const lexicalMatches = await fetchLexicalMatches(adminClient, {
      requestedHubIds: filteredHubIds,
      searchTexts: [
        question,
        retrievalPlan.intent,
        ...retrievalPlan.queries,
        ...retrievalPlan.topics,
        ...retrievalPlan.requiredPhrases,
        ...retrievalPlan.propertyEntities,
      ],
      topics: retrievalPlan.topics,
      requiredPhrases: retrievalPlan.requiredPhrases,
      preferredChunkTypes: retrievalPlan.preferredChunkTypes,
      allowHiddenSections: retrievalPlan.allowHiddenSections,
    });

    for (const match of lexicalMatches) {
      const key = getLogicalMatchKey(match);
      const existing = semanticMatches.get(key);
      semanticMatches.set(key, mergeLogicalMatch(existing, match, retrievalPlan));
    }

    candidateMatches = sortMatchesForRerank(Array.from(semanticMatches.values()), retrievalPlan);
  }

  const nonConflictMatches = candidateMatches.filter(
    (match) => `${match.metadata?.verification_status || ""}`.toLowerCase() !== "conflict"
  );
  let normalizedMatches = nonConflictMatches.length ? nonConflictMatches : candidateMatches;
  normalizedMatches = await rerankMatchesWithLLM({
    hub,
    question,
    retrievalPlan,
    matches: normalizedMatches,
  });
  normalizedMatches = normalizedMatches.slice(0, 12);

  if (!normalizedMatches.length) {
    const { data: fallbackMatches, error: fallbackError } = await adminClient
      .from("knowledge_chunks")
      .select(
        "id,hub_id,source_id,section_id,question_id,chunk_type,title,content,metadata,created_at"
      )
      .in("hub_id", filteredHubIds)
      .in(
        "chunk_type",
        retrievalPlan.preferredChunkTypes.length
          ? retrievalPlan.preferredChunkTypes
          : ["section", "question"]
      )
      .order("created_at", { ascending: false })
      .limit(6);

    if (fallbackError) throw fallbackError;
    normalizedMatches = filterMatchesByPlan(
      (fallbackMatches || []).map((match) => ({
        ...match,
        similarity: 0,
        retrievalScore: 0,
      })),
      retrievalPlan
    );
  }

  if (!normalizedMatches.length) {
    return {
      answer: "I could not find relevant knowledge for that question in the current sources.",
      citations: [],
      matches: [],
    };
  }

  const sourceMap = await fetchSourceMap(adminClient, normalizedMatches);
  const answer = cleanGeneratedAnswer(
    await generateText({
      prompt: buildChatPrompt({
        hub,
        question,
        intent: retrievalPlan.intent,
        matches: normalizedMatches,
      }),
      temperature: 0.2,
      maxOutputTokens: 2048,
    })
  );

  const citations = Array.from(
    normalizedMatches.reduce((map, match) => {
      const source = match.source_id ? sourceMap.get(match.source_id) || null : null;
      const key = source?.id
        ? `source:${source.id}`
        : match.section_id
          ? `section:${match.section_id}`
          : match.question_id
            ? `question:${match.question_id}`
            : `${match.chunk_type}:${match.id}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          similarity: match.similarity,
          chunkType: match.chunk_type,
          title: source?.title || match.title,
          detailTitle: match.title,
          excerpt: truncateForPrompt(match.content, 320),
          source,
        });
      }

      return map;
    }, new Map()).values()
  );

  return {
    answer,
    citations,
    matches: normalizedMatches,
  };
}

function buildDefaultFaqSnapshot(defaultFaqs) {
  return [
    "# Shared default guest guidance",
    formatFaqs(defaultFaqs),
  ].join("\n\n");
}

function buildSourceCoverageSectionContent(sources) {
  const normalizedSources = (sources || []).filter((source) => normalizeWhitespace(source.content_text));
  if (!normalizedSources.length) {
    return "No source content is currently available.";
  }

  return normalizedSources
    .map((source) =>
      [
        `Source: ${source.title}`,
        source.description ? `Description: ${source.description}` : "",
        source.source_type ? `Type: ${source.source_type}` : "",
        normalizeWhitespace(source.content_text),
      ]
        .filter(Boolean)
        .join("\n\n")
    )
    .join("\n\n---\n\n");
}

function buildVerificationItemText(kind, item) {
  if (kind === "section") {
    return [
      `Section title: ${item.title || ""}`,
      item.summary ? `Summary: ${item.summary}` : "",
      item.content_markdown ? `Content:\n${item.content_markdown}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  return [
    `Question: ${item.question || ""}`,
    `Answer: ${item.answer || ""}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildSourceEvidenceCatalog(sources, queryText, maxChunks = 8, maxChars = 14000) {
  const queryTokens = extractSearchTerms([queryText]);
  const candidateChunks = [];

  for (const source of sources || []) {
    const chunks = splitTextIntoChunks(source.content_text || "", 900, 120);
    chunks.forEach((chunk, index) => {
      const lexicalScore = computeLexicalScore(
        {
          title: source.title,
          content: chunk,
        },
        queryTokens
      );
      candidateChunks.push({
        ref: `${source.id}:${index}`,
        sourceId: source.id,
        sourceTitle: source.title,
        sourceType: source.source_type,
        content: chunk,
        lexicalScore,
      });
    });
  }

  const rankedChunks = candidateChunks
    .sort((left, right) => (right.lexicalScore || 0) - (left.lexicalScore || 0))
    .slice(0, maxChunks);

  if (!rankedChunks.length) {
    return [];
  }

  let totalChars = 0;
  const selected = [];
  for (const chunk of rankedChunks) {
    const chunkLength = chunk.content.length;
    if (selected.length && totalChars + chunkLength > maxChars) {
      break;
    }
    selected.push(chunk);
    totalChars += chunkLength;
  }

  return selected.length ? selected : rankedChunks.slice(0, 1);
}

async function evaluateManualKnowledgeItem(sources, kind, item) {
  const itemText = buildVerificationItemText(kind, item);
  const evidenceCatalog = buildSourceEvidenceCatalog(sources, itemText);

  if (!evidenceCatalog.length) {
    return {
      status: "unverified",
      reason: "No relevant source evidence was available for automatic verification.",
      supportingRefs: [],
      contradictoryRefs: [],
    };
  }

  const evidenceText = evidenceCatalog
    .map(
      (entry, index) =>
        `E${index + 1} | ${entry.sourceTitle} | ${entry.sourceType}\n${truncateForPrompt(entry.content, 1600)}`
    )
    .join("\n\n---\n\n");

  const result = await generateJson({
    prompt: `
You are verifying whether a manually edited hospitality knowledge item is supported by the current source material.

Item type: ${kind}
Item:
${itemText}

Evidence excerpts:
${evidenceText}

Return JSON with this exact shape:
{
  "status": "source_backed" | "manual_override" | "conflict" | "unverified",
  "reason": "string",
  "supporting_refs": ["E1"],
  "contradictory_refs": ["E2"]
}

Rules:
- source_backed: the item is supported by the evidence.
- manual_override: the item adds guidance not present in the evidence, but does not contradict it.
- conflict: the item contradicts the evidence.
- unverified: there is not enough evidence to verify or contradict it.
- Be strict about factual contradictions.
- Do not guess.
    `.trim(),
    temperature: 0.1,
    maxOutputTokens: 512,
  }).catch(() => null);

  const refsToSourceIds = new Map(
    evidenceCatalog.map((entry, index) => [`E${index + 1}`, entry.sourceId])
  );

  return {
    status: normalizeWhitespace(result?.status || "unverified") || "unverified",
    reason: normalizeWhitespace(result?.reason || "Automatic verification was inconclusive."),
    supportingRefs: Array.isArray(result?.supporting_refs) ? result.supporting_refs : [],
    contradictoryRefs: Array.isArray(result?.contradictory_refs) ? result.contradictory_refs : [],
    supportingSourceIds: mapSourceIds(result?.supporting_refs, refsToSourceIds),
    contradictorySourceIds: mapSourceIds(result?.contradictory_refs, refsToSourceIds),
  };
}

function buildVerificationMetadata(existingMetadata = {}, verification = {}, fallbackStatus = "unverified") {
  const normalizedStatus = `${verification?.status || ""}`.trim().toLowerCase();
  const status = [
    "system",
    "source_backed",
    "manual_override",
    "conflict",
    "unverified",
  ].includes(normalizedStatus)
    ? normalizedStatus
    : fallbackStatus;

  return {
    ...existingMetadata,
    verification_status: status,
    verification_reason: verification?.reason || existingMetadata.verification_reason || "",
    verification_source_ids: verification?.supportingSourceIds || existingMetadata.verification_source_ids || [],
    contradictory_source_ids:
      verification?.contradictorySourceIds || existingMetadata.contradictory_source_ids || [],
    needs_review: status === "conflict" || status === "unverified",
    verification_updated_at: new Date().toISOString(),
  };
}

async function fetchPropertyKnowledgeData(adminClient, propertyId) {
  const [
    propertyResult,
    amenitiesResult,
    propertyFaqsResult,
    defaultFaqsResult,
    activitiesResult,
    reviewsByLinkResult,
    legacyReviewsResult,
  ] = await Promise.all([
    adminClient
      .from("properties")
      .select(
        "id,name,slug,location,description,booking_url,hospitable_property_id,video_url,is_published,guests_max,bedroom_count,bathroom_count,bed_details,bath_details,pet_friendly,pet_fee,hot_tub,spaces"
      )
      .eq("id", propertyId)
      .single(),
    adminClient
      .from("amenities")
      .select("title,description")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: true }),
    adminClient
      .from("property_faqs")
      .select("faqs(question,answer,is_default,display_order,created_at)")
      .eq("property_id", propertyId),
    adminClient
      .from("faqs")
      .select("question,answer,is_default,display_order,created_at")
      .eq("is_default", true)
      .order("display_order", { ascending: true }),
    adminClient
      .from("property_activities")
      .select("activities(title,description,link_url,created_at)")
      .eq("property_id", propertyId),
    adminClient
      .from("property_reviews")
      .select("reviews(author_name,rating,content,date,source,created_at)")
      .eq("property_id", propertyId),
    adminClient
      .from("reviews")
      .select("author_name,rating,content,date,source,created_at")
      .eq("property_id", propertyId),
  ]);

  if (propertyResult.error) {
    throw propertyResult.error;
  }

  const property = propertyResult.data;
  const amenities = amenitiesResult.data || [];
  const propertyFaqs = (propertyFaqsResult.data || [])
    .map((row) => row.faqs)
    .filter(Boolean);
  const defaultFaqs = defaultFaqsResult.data || [];
  const activities = (activitiesResult.data || [])
    .map((row) => row.activities)
    .filter(Boolean);
  const reviews = [
    ...(reviewsByLinkResult.data || []).map((row) => row.reviews).filter(Boolean),
    ...(legacyReviewsResult.data || []),
  ];

  return {
    property,
    amenities,
    propertyFaqs,
    defaultFaqs,
    activities,
    reviews,
  };
}

function buildPropertySnapshotText(data) {
  const { property, amenities, propertyFaqs, activities, reviews } = data;
  return normalizeWhitespace(
    [
      `# ${property.name} property snapshot`,
      `Slug: ${property.slug}`,
      `Published: ${property.is_published === false ? "No" : "Yes"}`,
      property.location ? `Location: ${property.location}` : "",
      property.booking_url ? `Booking URL: ${property.booking_url}` : "",
      property.hospitable_property_id
        ? `Hospitable property ID: ${property.hospitable_property_id}`
        : "",
      `Guests max: ${property.guests_max || "Unknown"}`,
      `Bedrooms: ${property.bedroom_count || "Unknown"}`,
      `Bathrooms: ${property.bathroom_count || "Unknown"}`,
      property.bed_details ? `Bed details: ${property.bed_details}` : "",
      property.bath_details ? `Bath details: ${property.bath_details}` : "",
      `Pet friendly: ${property.pet_friendly ? "Yes" : "No"}`,
      property.pet_friendly ? `Pet fee: ${property.pet_fee || 0}` : "",
      `Hot tub: ${property.hot_tub ? "Yes" : "No"}`,
      property.video_url ? `Video URL: ${property.video_url}` : "",
      property.description ? `Description:\n${property.description}` : "",
      "## Spaces",
      summarizeSpaces(property.spaces),
      "## Amenities",
      formatAmenities(amenities),
      "## Property-specific FAQs",
      formatFaqs(propertyFaqs),
      "## Activities and local recommendations",
      formatActivities(activities),
      "## Guest review notes",
      formatReviews(reviews),
    ]
      .filter(Boolean)
      .join("\n\n")
  );
}

async function upsertSystemSource(adminClient, payload) {
  const contentText = normalizeWhitespace(payload.contentText);
  const processedAt = new Date().toISOString();
  const sourcePayload = {
    hub_id: payload.hubId,
    source_type: "system_snapshot",
    source_key: payload.sourceKey,
    title: payload.title,
    description: payload.description || "",
    mime_type: "text/markdown",
    content_text: contentText,
    checksum: checksum(contentText),
    status: "active",
    metadata: {
      ...(payload.metadata || {}),
      system_updated_at: processedAt,
    },
    created_by: payload.userId || null,
    last_processed_at: processedAt,
    last_error: null,
  };

  const { data: existing, error: existingError } = await adminClient
    .from("knowledge_sources")
    .select("*")
    .eq("hub_id", payload.hubId)
    .eq("source_key", payload.sourceKey)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing?.id) {
    const isUnchanged =
      existing.title === sourcePayload.title &&
      existing.description === sourcePayload.description &&
      existing.mime_type === sourcePayload.mime_type &&
      existing.content_text === sourcePayload.content_text &&
      existing.checksum === sourcePayload.checksum &&
      existing.status === sourcePayload.status;

    if (isUnchanged) {
      const { data, error } = await adminClient
        .from("knowledge_sources")
        .update({
          last_processed_at: processedAt,
          last_error: null,
          metadata: {
            ...(existing.metadata || {}),
            ...(payload.metadata || {}),
            system_updated_at: processedAt,
          },
        })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    }

    const { data, error } = await adminClient
      .from("knowledge_sources")
      .update({
        ...sourcePayload,
        metadata: {
          ...(existing.metadata || {}),
          ...(payload.metadata || {}),
          system_updated_at: processedAt,
        },
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await adminClient
    .from("knowledge_sources")
    .insert(sourcePayload)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function loadHub(adminClient, hubId) {
  const { data: hub, error } = await adminClient
    .from("knowledge_hubs")
    .select("*")
    .eq("id", hubId)
    .single();

  if (error) throw error;

  let property = null;
  if (hub.property_id) {
    const { data: propertyRow } = await adminClient
      .from("properties")
      .select("id,name,slug")
      .eq("id", hub.property_id)
      .maybeSingle();
    property = propertyRow || null;
  }

  return {
    ...hub,
    property,
  };
}

async function fetchHubSources(adminClient, hubId) {
  const { data, error } = await adminClient
    .from("knowledge_sources")
    .select("*")
    .eq("hub_id", hubId)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function fetchHubSections(adminClient, hubId) {
  const { data, error } = await adminClient
    .from("knowledge_sections")
    .select("*")
    .eq("hub_id", hubId)
    .eq("is_archived", false)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function fetchHubQuestions(adminClient, hubId) {
  const { data, error } = await adminClient
    .from("knowledge_questions")
    .select("*")
    .eq("hub_id", hubId)
    .eq("is_archived", false)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

function computeSourceFingerprint(sources) {
  const seed = sources
    .map((source) =>
      [
        source.id,
        source.source_key || "",
        source.title,
        source.checksum || "",
        source.status || "",
      ].join(":")
    )
    .join("|");
  return checksum(seed);
}

async function updateSyncRun(adminClient, runId, updates) {
  if (!runId) return;
  await adminClient.from("knowledge_sync_runs").update(updates).eq("id", runId);
}

function buildSectionChunkPayloads(hub, section) {
  const sectionText = makeSectionChunk(section);
  if (!sectionText) return [];

  return splitTextIntoChunks(sectionText).map((chunk, index) => ({
    hub_id: hub.id,
    section_id: section.id,
    chunk_type: "section",
    chunk_index: index,
    title: `Section: ${section.title}`,
    content: chunk,
    token_estimate: estimateTokens(chunk),
    checksum: checksum(`${section.id}:${index}:${chunk}`),
    metadata: {
      hub_title: hub.title,
      section_title: section.title,
      section_origin: section.section_origin,
      verification_status: section.metadata?.verification_status || "unverified",
      verification_reason: section.metadata?.verification_reason || "",
      needs_review: Boolean(section.metadata?.needs_review),
      hidden_from_ui: Boolean(section.metadata?.hidden_from_ui),
    },
  }));
}

function buildQuestionChunkPayloads(hub, question) {
  const questionText = makeQuestionChunk(question);
  if (!questionText) return [];

  return [
    {
      hub_id: hub.id,
      question_id: question.id,
      section_id: question.section_id || null,
      chunk_type: "question",
      chunk_index: 0,
      title: `Q&A: ${question.question}`,
      content: questionText,
      token_estimate: estimateTokens(questionText),
      checksum: checksum(`${question.id}:${questionText}`),
      metadata: {
        hub_title: hub.title,
        question: question.question,
        question_origin: question.question_origin,
        verification_status: question.metadata?.verification_status || "unverified",
        verification_reason: question.metadata?.verification_reason || "",
        needs_review: Boolean(question.metadata?.needs_review),
      },
    },
  ];
}

function chunkRowsMatch(existing, payload) {
  return (
    existing.hub_id === payload.hub_id &&
    (existing.source_id || null) === (payload.source_id || null) &&
    (existing.section_id || null) === (payload.section_id || null) &&
    (existing.question_id || null) === (payload.question_id || null) &&
    existing.chunk_type === payload.chunk_type &&
    existing.chunk_index === payload.chunk_index &&
    existing.title === payload.title &&
    existing.content === payload.content &&
    existing.token_estimate === payload.token_estimate &&
    existing.checksum === payload.checksum &&
    JSON.stringify(existing.metadata || {}) === JSON.stringify(payload.metadata || {})
  );
}

async function fetchExistingChunkRows(adminClient, filter) {
  let query = adminClient
    .from("knowledge_chunks")
    .select(
      "id,hub_id,source_id,section_id,question_id,chunk_type,chunk_index,title,content,token_estimate,checksum,metadata,embedding"
    )
    .eq("hub_id", filter.hubId)
    .eq("chunk_type", filter.chunkType);

  if (Object.prototype.hasOwnProperty.call(filter, "sourceId")) {
    query = query.eq("source_id", filter.sourceId);
  }
  if (Object.prototype.hasOwnProperty.call(filter, "sectionId")) {
    query = query.eq("section_id", filter.sectionId);
  }
  if (Object.prototype.hasOwnProperty.call(filter, "questionId")) {
    query = query.eq("question_id", filter.questionId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function deleteChunkRows(adminClient, ids = []) {
  const chunkIds = Array.from(new Set((ids || []).filter(Boolean)));
  if (!chunkIds.length) return;

  for (let index = 0; index < chunkIds.length; index += 100) {
    const batch = chunkIds.slice(index, index + 100);
    const { error } = await adminClient.from("knowledge_chunks").delete().in("id", batch);
    if (error) throw error;
  }
}

async function syncChunkPayloads(adminClient, chunkPayloads, filter) {
  const existingRows = await fetchExistingChunkRows(adminClient, filter);
  const reusableRowsByChecksum = new Map();

  existingRows.forEach((row) => {
    const list = reusableRowsByChecksum.get(row.checksum) || [];
    list.push(row);
    reusableRowsByChecksum.set(row.checksum, list);
  });

  const retainedIds = new Set();
  const updateJobs = [];
  const insertPayloads = [];

  for (const payload of chunkPayloads) {
    const matchingRows = reusableRowsByChecksum.get(payload.checksum) || [];
    const existing = matchingRows.find((row) => !retainedIds.has(row.id));

    if (existing) {
      retainedIds.add(existing.id);

      if (!chunkRowsMatch(existing, payload)) {
        updateJobs.push(
          adminClient
            .from("knowledge_chunks")
            .update(payload)
            .eq("id", existing.id)
        );
      }
      continue;
    }

    insertPayloads.push(payload);
  }

  for (const job of updateJobs) {
    const { error } = await job;
    if (error) throw error;
  }

  if (insertPayloads.length) {
    const embeddings = await embedTexts(
      insertPayloads.map((item) => item.content),
      {
        taskType: "RETRIEVAL_DOCUMENT",
        outputDimensionality: TEXT_EMBED_DIMENSION,
      }
    );

    const inserts = insertPayloads.map((item, index) => ({
      ...item,
      embedding: embeddings[index],
    }));

    const { error } = await adminClient.from("knowledge_chunks").insert(inserts);
    if (error) throw error;
  }

  const obsoleteIds = existingRows
    .filter((row) => !retainedIds.has(row.id))
    .map((row) => row.id);
  await deleteChunkRows(adminClient, obsoleteIds);

  return chunkPayloads.length;
}

async function syncSectionChunks(adminClient, hub, section) {
  return syncChunkPayloads(adminClient, buildSectionChunkPayloads(hub, section), {
    hubId: hub.id,
    chunkType: "section",
    sectionId: section.id,
  });
}

async function syncQuestionChunks(adminClient, hub, question) {
  return syncChunkPayloads(adminClient, buildQuestionChunkPayloads(hub, question), {
    hubId: hub.id,
    chunkType: "question",
    questionId: question.id,
  });
}

async function deleteChunksForSource(adminClient, hubId, sourceId) {
  const rows = await fetchExistingChunkRows(adminClient, {
    hubId,
    chunkType: "source",
    sourceId,
  });
  await deleteChunkRows(
    adminClient,
    rows.map((row) => row.id)
  );
}

async function deleteChunksForSection(adminClient, hubId, sectionId) {
  const rows = await fetchExistingChunkRows(adminClient, {
    hubId,
    chunkType: "section",
    sectionId,
  });
  await deleteChunkRows(
    adminClient,
    rows.map((row) => row.id)
  );
}

async function deleteChunksForQuestion(adminClient, hubId, questionId) {
  const rows = await fetchExistingChunkRows(adminClient, {
    hubId,
    chunkType: "question",
    questionId,
  });
  await deleteChunkRows(
    adminClient,
    rows.map((row) => row.id)
  );
}

async function rebuildHubChunks(adminClient, hubId) {
  const [hub, sections, questions] = await Promise.all([
    loadHub(adminClient, hubId),
    fetchHubSections(adminClient, hubId),
    fetchHubQuestions(adminClient, hubId),
  ]);

  const { error: deleteSourceChunksError } = await adminClient
    .from("knowledge_chunks")
    .delete()
    .eq("hub_id", hubId)
    .eq("chunk_type", "source");
  if (deleteSourceChunksError) throw deleteSourceChunksError;

  let chunkCount = 0;

  for (const section of sections) {
    chunkCount += await syncSectionChunks(adminClient, hub, section);
  }

  for (const question of questions) {
    chunkCount += await syncQuestionChunks(adminClient, hub, question);
  }

  return chunkCount;
}

async function countHubChunks(adminClient, hubId) {
  const { count, error } = await adminClient
    .from("knowledge_chunks")
    .select("id", { head: true, count: "exact" })
    .eq("hub_id", hubId);

  if (error) throw error;
  return count || 0;
}

async function markHubSyncStatus(adminClient, hubId, syncStatus, extra = {}) {
  const { error } = await adminClient
    .from("knowledge_hubs")
    .update({
      sync_status: syncStatus,
      ...extra,
    })
    .eq("id", hubId);

  if (error) throw error;
}

async function upsertSourceCoverageSection(adminClient, hubId, sources, userId = null) {
  const contentMarkdown = buildSourceCoverageSectionContent(sources);
  const summary =
    "Complete source-backed operational details preserved inside the knowledge base for coverage and reindexing.";
  const sourceIds = Array.from(new Set((sources || []).map((source) => source.id).filter(Boolean)));

  const { data: existing, error: existingError } = await adminClient
    .from("knowledge_sections")
    .select("*")
    .eq("hub_id", hubId)
    .eq("slug", SOURCE_APPENDIX_SLUG)
    .maybeSingle();
  if (existingError) throw existingError;

  const payload = {
    hub_id: hubId,
    title: "Canonical Source Details",
    slug: SOURCE_APPENDIX_SLUG,
    summary,
    content_markdown: contentMarkdown,
    source_ids: sourceIds,
    section_origin: "system",
    display_order: 999,
    is_archived: false,
    created_by: existing?.created_by || userId || null,
    last_generated_at: new Date().toISOString(),
    metadata: {
      ...(existing?.metadata || {}),
      hidden_from_ui: false,
      system_section: "source_appendix",
      source_count: sourceIds.length,
      verification_status: "system",
      verification_reason: "Built directly from the full source corpus for this hub.",
      verification_source_ids: sourceIds,
      contradictory_source_ids: [],
      needs_review: false,
      system_updated_at: new Date().toISOString(),
    },
  };

  if (existing?.id) {
    const { data, error } = await adminClient
      .from("knowledge_sections")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await adminClient
    .from("knowledge_sections")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

function queueKnowledgeSync(adminClient, hubId, options = {}) {
  const previous = BACKGROUND_SYNC_QUEUE.get(hubId) || Promise.resolve();
  const nextJob = previous
    .catch(() => null)
    .then(async () => {
      if (options.prepareSourceId) {
        await processUploadedSource(adminClient, options.prepareSourceId);
      }
      return syncKnowledgeHub(adminClient, hubId, options);
    })
    .finally(() => {
      if (BACKGROUND_SYNC_QUEUE.get(hubId) === nextJob) {
        BACKGROUND_SYNC_QUEUE.delete(hubId);
      }
    });

  BACKGROUND_SYNC_QUEUE.set(hubId, nextJob);
  return nextJob;
}

export async function refreshSystemSourcesForHub(adminClient, hubId, userId = null) {
  const hub = await loadHub(adminClient, hubId);

  if (hub.scope_type === "general") {
    const { data: defaultFaqs, error: defaultFaqsError } = await adminClient
      .from("faqs")
      .select("question,answer,is_default,display_order,created_at")
      .eq("is_default", true)
      .order("display_order", { ascending: true });

    if (defaultFaqsError) throw defaultFaqsError;

    await adminClient
      .from("knowledge_sources")
      .delete()
      .eq("hub_id", hubId)
      .eq("source_key", "system_portfolio_snapshot");

    const defaultSnapshot = buildDefaultFaqSnapshot(defaultFaqs || []);
    await upsertSystemSource(adminClient, {
      hubId,
      sourceKey: "system_shared_defaults",
      title: "Shared default guidance",
      description: "Auto-generated snapshot of guidance that applies across properties.",
      contentText: defaultSnapshot,
      metadata: { scope: "general" },
      userId,
    });

    return;
  }

  const propertyData = await fetchPropertyKnowledgeData(adminClient, hub.property_id);
  const propertySnapshot = buildPropertySnapshotText(propertyData);
  const defaultSnapshot = buildDefaultFaqSnapshot(propertyData.defaultFaqs);

  await upsertSystemSource(adminClient, {
    hubId,
    sourceKey: "system_property_snapshot",
    title: `${propertyData.property.name} snapshot`,
    description:
      "Auto-generated snapshot of property details, spaces, amenities, activities, reviews, and property FAQs.",
    contentText: propertySnapshot,
    metadata: { scope: "property", property_id: hub.property_id },
    userId,
  });
  await upsertSystemSource(adminClient, {
    hubId,
    sourceKey: "system_shared_defaults",
    title: "Shared default guidance",
    description: "Auto-generated snapshot of default FAQs and shared guest guidance.",
    contentText: defaultSnapshot,
    metadata: { scope: "property", property_id: hub.property_id },
    userId,
  });
}

export async function syncKnowledgeHub(adminClient, hubId, options = {}) {
  const hub = await loadHub(adminClient, hubId);
  const startedAt = new Date().toISOString();

  const { data: runRow, error: runError } = await adminClient
    .from("knowledge_sync_runs")
    .insert({
      hub_id: hubId,
      status: "running",
      trigger_source_id: options.triggerSourceId || null,
      started_at: startedAt,
    })
    .select("id")
    .single();

  if (runError) throw runError;

  await adminClient
    .from("knowledge_hubs")
    .update({
      sync_status: "syncing",
      last_sync_error: null,
    })
    .eq("id", hubId);

  try {
    await refreshSystemSourcesForHub(adminClient, hubId, options.userId || null);

    const [sources, questions] = await Promise.all([
      fetchHubSources(adminClient, hubId),
      fetchHubQuestions(adminClient, hubId),
    ]);
    const sourceCoverageSection = await upsertSourceCoverageSection(
      adminClient,
      hubId,
      sources,
      options.userId || null
    );
    const sections = await fetchHubSections(adminClient, hubId);
    const visibleSections = sections.filter((section) => !section.metadata?.hidden_from_ui);
    const llmContinuitySections = visibleSections.filter(
      (section) => section.metadata?.system_section !== "source_appendix"
    );

    const sourceFingerprint = computeSourceFingerprint(sources);
    const sourceCatalog = buildSourceReferenceCatalog(sources);
    const sourceRefToId = new Map(sourceCatalog.map((source) => [source.ref, source.id]));
    const generatedSectionLimit = MAX_GENERATED_SECTIONS;
    const existingSectionsByTopicKey = new Map(
      llmContinuitySections.map((section) => [getSectionTopicKey(section), section])
    );
    const protectedQuestionsByTopicKey = new Map(
      questions
        .filter((question) => !isAiManagedQuestion(question))
        .map((question) => [getQuestionTopicKey(question), question])
    );
    const existingAiQuestionsByTopicKey = new Map(
      questions
        .filter((question) => isAiManagedQuestion(question))
        .map((question) => [getQuestionTopicKey(question), question])
    );

    const generated = await generateJson({
      prompt: buildKnowledgePrompt({
        hub,
        sourceCatalog,
        existingSections: llmContinuitySections,
        existingQuestions: questions,
      }),
      temperature: 0.15,
      maxOutputTokens: 8192,
    });

    const rawSections = Array.isArray(generated?.sections) ? generated.sections : [];
    const nextSections = rawSections.slice(0, generatedSectionLimit);
    let sectionCount = 0;
    let questionCount = 0;
    const generatedSectionIds = new Set();
    const generatedQuestionIds = new Set();
    const protectedSectionSuggestionIds = new Set();
    const syncTimestamp = new Date().toISOString();

    for (const [index, rawSection] of nextSections.entries()) {
      const title = `${rawSection?.title || ""}`.trim();
      if (!title) continue;

      const slug = slugify(title);
      const sectionTopicKey = slug;
      const existing =
        existingSectionsByTopicKey.get(sectionTopicKey) ||
        findMatchingKnowledgeSection(rawSection, existingSectionsByTopicKey, llmContinuitySections);
      const sourceIds = mapSourceIds(rawSection?.source_refs, sourceRefToId);
      let sectionId = existing?.id || null;

      if (existing && isAiManagedSection(existing)) {
        const updatePayload = {
          title,
          slug,
          summary: normalizeWhitespace(rawSection?.summary || ""),
          content_markdown: normalizeWhitespace(rawSection?.content_markdown || ""),
          source_ids: mergeUniqueUuidArrays(existing.source_ids || [], sourceIds),
          section_origin: "ai",
          display_order:
            Number.isFinite(rawSection?.display_order) && rawSection.display_order >= 0
              ? rawSection.display_order
              : index,
          is_archived: false,
          last_generated_at: syncTimestamp,
          metadata: {
            ...clearSuggestedSectionEditMetadata(existing.metadata || {}),
            ai_topic_key: sectionTopicKey,
            ai_updated_at: syncTimestamp,
            verification_status: "source_backed",
            verification_reason: "Generated from current source material during hub refresh.",
            verification_source_ids: sourceIds,
            contradictory_source_ids: [],
            needs_review: false,
          },
        };

        const { data, error } = await adminClient
          .from("knowledge_sections")
          .update(updatePayload)
          .eq("id", existing.id)
          .select("id")
          .single();
        if (error) throw error;
        sectionId = data.id;
        sectionCount += 1;
      } else if (existing && ["manual", "hybrid"].includes(existing.section_origin)) {
        sectionId = existing.id;
        const suggestedEdit = buildSuggestedSectionEdit(existing, rawSection, sourceIds, syncTimestamp);
        const nextMetadata = clearSuggestedSectionEditMetadata(existing.metadata || {});
        const hasChanges = hasSectionTextChanges(existing, suggestedEdit);

        if (hasChanges || existing.metadata?.ai_suggested_edit) {
          const { error } = await adminClient
            .from("knowledge_sections")
            .update({
              metadata: hasChanges
                ? {
                    ...nextMetadata,
                    ai_topic_key:
                      existing.metadata?.ai_topic_key || getSectionTopicKey(existing) || sectionTopicKey,
                    ai_suggested_edit: suggestedEdit,
                    ai_suggested_edit_updated_at: syncTimestamp,
                  }
                : {
                    ...nextMetadata,
                    ai_topic_key:
                      existing.metadata?.ai_topic_key || getSectionTopicKey(existing) || sectionTopicKey,
                  },
            })
            .eq("id", existing.id);
          if (error) throw error;
        }

        if (hasChanges) {
          protectedSectionSuggestionIds.add(existing.id);
        }
      } else if (!existing) {
        const { data, error } = await adminClient
          .from("knowledge_sections")
          .insert({
            hub_id: hubId,
            title,
            slug,
            summary: normalizeWhitespace(rawSection?.summary || ""),
            content_markdown: normalizeWhitespace(rawSection?.content_markdown || ""),
            source_ids: sourceIds,
            section_origin: "ai",
            display_order:
              Number.isFinite(rawSection?.display_order) && rawSection.display_order >= 0
                ? rawSection.display_order
                : index,
            created_by: options.userId || null,
            last_generated_at: syncTimestamp,
            metadata: {
              ai_topic_key: sectionTopicKey,
              ai_created_at: syncTimestamp,
              verification_status: "source_backed",
              verification_reason: "Generated from current source material during hub refresh.",
              verification_source_ids: sourceIds,
              contradictory_source_ids: [],
              needs_review: false,
            },
          })
          .select("id")
          .single();
        if (error) throw error;
        sectionId = data.id;
        sectionCount += 1;
        llmContinuitySections.push({
          id: data.id,
          title,
          slug,
          summary: normalizeWhitespace(rawSection?.summary || ""),
          content_markdown: normalizeWhitespace(rawSection?.content_markdown || ""),
          source_ids: sourceIds,
          section_origin: "ai",
          metadata: {
            ai_topic_key: sectionTopicKey,
          },
        });
        existingSectionsByTopicKey.set(sectionTopicKey, {
          id: data.id,
          title,
          slug,
          summary: normalizeWhitespace(rawSection?.summary || ""),
          content_markdown: normalizeWhitespace(rawSection?.content_markdown || ""),
          source_ids: sourceIds,
          section_origin: "ai",
          metadata: {
            ai_topic_key: sectionTopicKey,
          },
        });
      }

      if (!sectionId) continue;
      generatedSectionIds.add(sectionId);

      const recommendedQuestions = Array.isArray(rawSection?.recommended_questions)
        ? rawSection.recommended_questions.slice(0, MAX_RECOMMENDED_QUESTIONS_PER_SECTION)
        : [];

      for (const [questionIndex, rawQuestion] of recommendedQuestions.entries()) {
        const questionText = `${rawQuestion?.question || ""}`.trim();
        const answerText = normalizeWhitespace(rawQuestion?.answer || "");
        if (!questionText || !answerText) continue;

        const questionKey = normalizeQuestionKey(questionText);
        const protectedQuestion = protectedQuestionsByTopicKey.get(questionKey);
        const existingQuestion = existingAiQuestionsByTopicKey.get(questionKey);
        const questionSourceIds = mapSourceIds(rawQuestion?.source_refs, sourceRefToId);

        if (protectedQuestion?.id) {
          generatedQuestionIds.add(protectedQuestion.id);
          continue;
        }

        if (existingQuestion) {
          const { error } = await adminClient
            .from("knowledge_questions")
            .update({
              section_id: sectionId,
              answer: answerText,
              source_ids: mergeUniqueUuidArrays(
                existingQuestion.source_ids || [],
                questionSourceIds
              ),
              question_origin: "ai",
              display_order:
                Number.isFinite(rawQuestion?.display_order) &&
                rawQuestion.display_order >= 0
                  ? rawQuestion.display_order
                  : questionIndex,
              is_archived: false,
              last_generated_at: syncTimestamp,
              metadata: {
                ...(existingQuestion.metadata || {}),
                ai_question_key: questionKey,
                ai_updated_at: syncTimestamp,
                verification_status: "source_backed",
                verification_reason: "Generated from current source material during hub refresh.",
                verification_source_ids: questionSourceIds,
                contradictory_source_ids: [],
                needs_review: false,
              },
            })
            .eq("id", existingQuestion.id);
          if (error) throw error;
          generatedQuestionIds.add(existingQuestion.id);
          questionCount += 1;
          continue;
        }

        const { data, error } = await adminClient.from("knowledge_questions").insert({
          hub_id: hubId,
          section_id: sectionId,
          question: questionText,
          answer: answerText,
          source_ids: questionSourceIds,
          question_origin: "ai",
          display_order:
            Number.isFinite(rawQuestion?.display_order) && rawQuestion.display_order >= 0
              ? rawQuestion.display_order
              : questionIndex,
          created_by: options.userId || null,
          last_generated_at: syncTimestamp,
          metadata: {
            ai_question_key: questionKey,
            ai_created_at: syncTimestamp,
            verification_status: "source_backed",
            verification_reason: "Generated from current source material during hub refresh.",
            verification_source_ids: questionSourceIds,
            contradictory_source_ids: [],
            needs_review: false,
          },
        })
        .select("id")
        .single();
        if (error) throw error;
        generatedQuestionIds.add(data.id);
        questionCount += 1;
      }
    }

    const staleProtectedSuggestions = llmContinuitySections.filter(
      (section) =>
        ["manual", "hybrid"].includes(section.section_origin) &&
        section.metadata?.ai_suggested_edit &&
        !protectedSectionSuggestionIds.has(section.id)
    );

    for (const section of staleProtectedSuggestions) {
      const { error } = await adminClient
        .from("knowledge_sections")
        .update({
          metadata: clearSuggestedSectionEditMetadata(section.metadata || {}),
        })
        .eq("id", section.id);
      if (error) throw error;
    }

    const [auditedSections, auditedQuestions] = await Promise.all([
      fetchHubSections(adminClient, hubId),
      fetchHubQuestions(adminClient, hubId),
    ]);
    await auditManualKnowledgeItems(adminClient, sources, auditedSections, auditedQuestions);

    const chunkCount = await rebuildHubChunks(adminClient, hubId);
    const [finalSections, finalQuestions] = await Promise.all([
      fetchHubSections(adminClient, hubId),
      fetchHubQuestions(adminClient, hubId),
    ]);
    const finalVisibleSections = finalSections.filter((section) => !section.metadata?.hidden_from_ui);

    await adminClient
      .from("knowledge_hubs")
      .update({
        sync_status: "ready",
        source_fingerprint: sourceFingerprint,
        last_synced_source_fingerprint: sourceFingerprint,
        last_synced_at: new Date().toISOString(),
        last_sync_error: null,
        last_sync_model: KNOWLEDGE_SYNC_MODEL_LABEL,
      })
      .eq("id", hubId);

    await updateSyncRun(adminClient, runRow.id, {
      status: "completed",
      source_count: sources.length,
      section_count: finalVisibleSections.length,
      question_count: finalQuestions.length,
      chunk_count: chunkCount,
      completed_at: new Date().toISOString(),
      summary: {
        source_fingerprint: sourceFingerprint,
        model: KNOWLEDGE_SYNC_MODEL_LABEL,
        generated_sections: nextSections.length,
        preserved_sections: visibleSections.length,
        preserved_questions: questions.length,
        source_appendix_section_id: sourceCoverageSection.id,
      },
    });

    return {
      ok: true,
      sourceCount: sources.length,
      sectionCount,
      questionCount,
      chunkCount,
      sourceFingerprint,
    };
  } catch (error) {
    await adminClient
      .from("knowledge_hubs")
      .update({
        sync_status: "error",
        last_sync_error: error.message,
      })
      .eq("id", hubId);

    await updateSyncRun(adminClient, runRow.id, {
      status: "failed",
      error_message: error.message,
      completed_at: new Date().toISOString(),
    });

    throw error;
  }
}

export async function reindexKnowledgeHub(adminClient, hubId, options = {}) {
  const startedAt = new Date().toISOString();
  const { data: runRow, error: runError } = await adminClient
    .from("knowledge_sync_runs")
    .insert({
      hub_id: hubId,
      status: "running",
      started_at: startedAt,
      summary: {
        mode: "reindex",
      },
    })
    .select("id")
    .single();
  if (runError) throw runError;

  await markHubSyncStatus(adminClient, hubId, "syncing", {
    last_sync_error: null,
  });

  try {
    const [sources, sections, questions] = await Promise.all([
      fetchHubSources(adminClient, hubId),
      fetchHubSections(adminClient, hubId),
      fetchHubQuestions(adminClient, hubId),
    ]);

    await upsertSourceCoverageSection(adminClient, hubId, sources, options.userId || null);
    const chunkCount = await rebuildHubChunks(adminClient, hubId);
    const sourceFingerprint = computeSourceFingerprint(sources);
    const visibleSections = sections.filter((section) => !section.metadata?.hidden_from_ui);

    await markHubSyncStatus(adminClient, hubId, "ready", {
      source_fingerprint: sourceFingerprint,
      last_synced_at: new Date().toISOString(),
      last_sync_error: null,
      last_sync_model: `${KNOWLEDGE_SYNC_MODEL_LABEL} (reindex-only)`,
    });

    await updateSyncRun(adminClient, runRow.id, {
      status: "completed",
      source_count: sources.length,
      section_count: visibleSections.length,
      question_count: questions.length,
      chunk_count: chunkCount,
      completed_at: new Date().toISOString(),
      summary: {
        mode: "reindex",
        source_fingerprint: sourceFingerprint,
      },
    });

    return {
      ok: true,
      sourceCount: sources.length,
      sectionCount: visibleSections.length,
      questionCount: questions.length,
      chunkCount,
      sourceFingerprint,
      mode: "reindex",
    };
  } catch (error) {
    await markHubSyncStatus(adminClient, hubId, "error", {
      last_sync_error: error.message,
    });

    await updateSyncRun(adminClient, runRow.id, {
      status: "failed",
      error_message: error.message,
      completed_at: new Date().toISOString(),
      summary: {
        mode: "reindex",
      },
    });
    throw error;
  }
}

export async function scheduleKnowledgeHubSync(adminClient, hubId, options = {}) {
  await markHubSyncStatus(adminClient, hubId, "stale", {
    last_sync_error: null,
  });
  void queueKnowledgeSync(adminClient, hubId, options);
  return { queued: true };
}

function normalizeUploadText(mimeType, rawText) {
  const normalizedMime = `${mimeType || ""}`.toLowerCase();
  if (normalizedMime.includes("html") || normalizedMime.includes("xml")) {
    return stripHtmlTags(rawText);
  }

  if (normalizedMime.includes("json")) {
    try {
      return JSON.stringify(JSON.parse(rawText), null, 2);
    } catch {
      return normalizeWhitespace(rawText);
    }
  }

  return normalizeWhitespace(rawText);
}

function isTextLikeMimeType(mimeType) {
  const normalized = `${mimeType || ""}`.toLowerCase();
  return (
    normalized.startsWith("text/") ||
    normalized.includes("json") ||
    normalized.includes("csv") ||
    normalized.includes("xml") ||
    normalized.includes("html") ||
    normalized === "application/javascript" ||
    normalized === "application/x-yaml" ||
    normalized === "application/yaml"
  );
}

async function processUploadedSource(adminClient, sourceId) {
  const { data: source, error: sourceError } = await adminClient
    .from("knowledge_sources")
    .select("*")
    .eq("id", sourceId)
    .single();
  if (sourceError) throw sourceError;
  if (!source?.id || source.source_type !== "upload") return source;

  const mimeType = `${source.mime_type || "application/octet-stream"}`.trim();
  if (!isTextLikeMimeType(mimeType) && mimeType !== "application/pdf") {
    const errorMessage = `Unsupported file type "${mimeType}".`;
    await adminClient
      .from("knowledge_sources")
      .update({
        status: "error",
        last_error: errorMessage,
      })
      .eq("id", sourceId);
    throw new Error(errorMessage);
  }

  try {
    await adminClient
      .from("knowledge_sources")
      .update({
        status: "processing",
        last_error: null,
      })
      .eq("id", sourceId);

    const { data: fileData, error: downloadError } = await adminClient.storage
      .from(source.storage_bucket || "knowledge-sources")
      .download(source.storage_path);
    if (downloadError) throw downloadError;

    let contentText = "";
    if (mimeType === "application/pdf") {
      const buffer = Buffer.from(await fileData.arrayBuffer());
      contentText = await extractDocumentTextWithGemini({
        buffer,
        mimeType,
        fileName: source.file_name || source.title || "knowledge-source",
      });
    } else {
      contentText = normalizeUploadText(mimeType, await fileData.text());
    }

    const normalizedContent = normalizeWhitespace(contentText);
    const { data: updatedSource, error: updateError } = await adminClient
      .from("knowledge_sources")
      .update({
        content_text: normalizedContent,
        checksum: checksum(normalizedContent),
        status: "active",
        last_processed_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("id", sourceId)
      .select("*")
      .single();
    if (updateError) throw updateError;
    return updatedSource;
  } catch (error) {
    await adminClient
      .from("knowledge_sources")
      .update({
        status: "error",
        last_error: error.message,
      })
      .eq("id", sourceId);
    throw error;
  }
}

async function auditManualKnowledgeItems(adminClient, sources, sections, questions) {
  const candidateSections = (sections || []).filter(
    (section) =>
      !section.metadata?.hidden_from_ui &&
      ["manual", "hybrid"].includes(section.section_origin)
  );
  const candidateQuestions = (questions || []).filter((question) =>
    ["manual", "hybrid"].includes(question.question_origin)
  );

  for (const section of candidateSections) {
    const verification = await evaluateManualKnowledgeItem(sources, "section", section);
    const metadata = buildVerificationMetadata(section.metadata || {}, verification);
    const nextSourceIds = mergeUniqueUuidArrays(section.source_ids || [], verification.supportingSourceIds || []);

    const { error } = await adminClient
      .from("knowledge_sections")
      .update({
        source_ids: nextSourceIds,
        metadata,
      })
      .eq("id", section.id);
    if (error) throw error;
  }

  for (const question of candidateQuestions) {
    const verification = await evaluateManualKnowledgeItem(sources, "question", question);
    const metadata = buildVerificationMetadata(question.metadata || {}, verification);
    const nextSourceIds = mergeUniqueUuidArrays(question.source_ids || [], verification.supportingSourceIds || []);

    const { error } = await adminClient
      .from("knowledge_questions")
      .update({
        source_ids: nextSourceIds,
        metadata,
      })
      .eq("id", question.id);
    if (error) throw error;
  }
}

export async function createManualSource(adminClient, input) {
  const contentText = normalizeWhitespace(input.contentText);
  if (!contentText) {
    throw new Error("Manual source content is required.");
  }

  const { data: source, error } = await adminClient
    .from("knowledge_sources")
    .insert({
      hub_id: input.hubId,
      source_type: "manual_note",
      title: input.title?.trim() || "Manual note",
      description: input.description?.trim() || "",
      mime_type: "text/markdown",
      content_text: contentText,
      checksum: checksum(contentText),
      status: "active",
      metadata: {
        created_via: "admin_manual_note",
      },
      created_by: input.userId || null,
      last_processed_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;

  await markHubSyncStatus(adminClient, input.hubId, "stale", {
    last_sync_error: null,
  });
  await syncKnowledgeHub(adminClient, input.hubId, {
    triggerSourceId: source.id,
    userId: input.userId || null,
  });

  return source;
}

export async function updateManualSource(adminClient, input) {
  const contentText = normalizeWhitespace(input.contentText);
  if (!contentText) {
    throw new Error("Manual source content is required.");
  }

  const { data: existing, error: existingError } = await adminClient
    .from("knowledge_sources")
    .select("*")
    .eq("id", input.sourceId)
    .eq("hub_id", input.hubId)
    .single();
  if (existingError) throw existingError;

  if (existing.source_type !== "manual_note") {
    throw new Error("Only pasted text sources can be edited.");
  }

  const { data: source, error } = await adminClient
    .from("knowledge_sources")
    .update({
      title: input.title?.trim() || existing.title || "Manual note",
      description: input.description?.trim() || "",
      content_text: contentText,
      checksum: checksum(contentText),
      status: "active",
      last_processed_at: new Date().toISOString(),
      last_error: null,
      metadata: {
        ...(existing.metadata || {}),
        updated_via: "admin_manual_note_edit",
        manually_updated_at: new Date().toISOString(),
      },
    })
    .eq("id", input.sourceId)
    .eq("hub_id", input.hubId)
    .select("*")
    .single();
  if (error) throw error;

  await markHubSyncStatus(adminClient, input.hubId, "stale", {
    last_sync_error: null,
  });
  await syncKnowledgeHub(adminClient, input.hubId, {
    triggerSourceId: source.id,
    userId: input.userId || null,
  });

  return source;
}

export async function createUploadedSource(adminClient, input) {
  const file = input.file;
  if (!file) {
    throw new Error("A file is required.");
  }

  const mimeType = `${file.type || "application/octet-stream"}`.trim();
  const fileName = `${file.name || "knowledge-source"}`.trim();
  if (!isTextLikeMimeType(mimeType) && mimeType !== "application/pdf") {
    throw new Error(
      `Unsupported file type "${mimeType}". Upload PDF, TXT, Markdown, HTML, XML, JSON, or CSV.`
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const storagePath = `${input.hubId}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const { error: uploadError } = await adminClient.storage
    .from("knowledge-sources")
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: source, error } = await adminClient
    .from("knowledge_sources")
    .insert({
      hub_id: input.hubId,
      source_type: "upload",
      title: input.title?.trim() || fileName,
      description: input.description?.trim() || "",
      mime_type: mimeType,
      file_name: fileName,
      storage_bucket: "knowledge-sources",
      storage_path: storagePath,
      content_text: "",
      checksum: null,
      status: "processing",
      metadata: {
        bytes: buffer.byteLength,
        uploaded_via: "admin_upload",
      },
      created_by: input.userId || null,
      last_processed_at: null,
    })
    .select("*")
    .single();

  if (error) throw error;

  await markHubSyncStatus(adminClient, input.hubId, "stale", {
    last_sync_error: null,
  });
  const processedSource = await processUploadedSource(adminClient, source.id);
  await syncKnowledgeHub(adminClient, input.hubId, {
    triggerSourceId: processedSource.id,
    userId: input.userId || null,
  });

  return processedSource;
}

async function preserveSectionForManualQuestion(adminClient, sectionId) {
  return;
}

export async function saveSection(adminClient, input) {
  const title = `${input.title || ""}`.trim();
  if (!title) {
    throw new Error("Section title is required.");
  }

  const normalizedSummary = normalizeWhitespace(input.summary || "");
  const normalizedContentMarkdown = normalizeWhitespace(input.contentMarkdown || "");
  const sources = await fetchHubSources(adminClient, input.hubId);
  const verification = await evaluateManualKnowledgeItem(sources, "section", {
    title,
    summary: normalizedSummary,
    content_markdown: normalizedContentMarkdown,
  });
  const slug = slugify(title);
  const basePayload = {
    hub_id: input.hubId,
    title,
    slug,
    summary: normalizedSummary,
    content_markdown: normalizedContentMarkdown,
    section_origin: "manual",
    display_order:
      Number.isFinite(input.displayOrder) && input.displayOrder >= 0
        ? input.displayOrder
        : 0,
    created_by: input.userId || null,
  };

  if (input.sectionId) {
    const { data: existing, error: existingError } = await adminClient
      .from("knowledge_sections")
      .select("*")
      .eq("id", input.sectionId)
      .single();
    if (existingError) throw existingError;
    if (isReadOnlySystemSection(existing)) {
      throw new Error(
        "Source-preserved system sections are read-only. Update the sources to refresh them."
      );
    }
    const wasAiManaged = isAiManagedSection(existing) || Boolean(existing.metadata?.ai_topic_key);

    const { data, error } = await adminClient
      .from("knowledge_sections")
      .update({
        ...basePayload,
        source_ids: mergeUniqueUuidArrays(
          existing.source_ids || [],
          verification.supportingSourceIds || []
        ),
        metadata: buildVerificationMetadata(
          clearSuggestedSectionEditMetadata({
            ...(existing.metadata || {}),
            ai_topic_key: existing.metadata?.ai_topic_key || slugify(existing.title || title),
            manualized_from_ai_at:
              wasAiManaged && !existing.metadata?.manualized_from_ai_at
                ? new Date().toISOString()
                : existing.metadata?.manualized_from_ai_at,
            manually_edited_at: new Date().toISOString(),
          }),
          verification
        ),
      })
      .eq("id", input.sectionId)
      .select("*")
      .single();
    if (error) throw error;
    await markHubSyncStatus(adminClient, input.hubId, "stale", {
      last_sync_error: null,
    });
    return data;
  }

  const { data: conflicting } = await adminClient
    .from("knowledge_sections")
    .select("*")
    .eq("hub_id", input.hubId)
    .eq("slug", slug)
    .maybeSingle();

  if (conflicting?.id) {
    if (isReadOnlySystemSection(conflicting)) {
      throw new Error(
        "That title is reserved for a source-preserved system section. Update the sources instead."
      );
    }
    const wasAiManaged =
      isAiManagedSection(conflicting) || Boolean(conflicting.metadata?.ai_topic_key);

    const { data, error } = await adminClient
      .from("knowledge_sections")
      .update({
        ...basePayload,
        source_ids: mergeUniqueUuidArrays(
          conflicting.source_ids || [],
          verification.supportingSourceIds || []
        ),
        metadata: buildVerificationMetadata(
          clearSuggestedSectionEditMetadata({
            ...(conflicting.metadata || {}),
            ai_topic_key:
              conflicting.metadata?.ai_topic_key || slugify(conflicting.title || title),
            manualized_from_ai_at:
              wasAiManaged && !conflicting.metadata?.manualized_from_ai_at
                ? new Date().toISOString()
                : conflicting.metadata?.manualized_from_ai_at,
            manually_edited_at: new Date().toISOString(),
          }),
          verification
        ),
      })
      .eq("id", conflicting.id)
      .select("*")
      .single();
    if (error) throw error;
    await markHubSyncStatus(adminClient, input.hubId, "stale", {
      last_sync_error: null,
    });
    return data;
  }

  const { data, error } = await adminClient
    .from("knowledge_sections")
    .insert({
      ...basePayload,
      source_ids: verification.supportingSourceIds || [],
      metadata: buildVerificationMetadata(
        {
          manually_created_at: new Date().toISOString(),
        },
        verification
      ),
    })
    .select("*")
    .single();
  if (error) throw error;
  await markHubSyncStatus(adminClient, input.hubId, "stale", {
    last_sync_error: null,
  });
  return data;
}

export async function saveQuestion(adminClient, input) {
  const question = `${input.question || ""}`.trim();
  const answer = normalizeWhitespace(input.answer || "");
  if (!question || !answer) {
    throw new Error("Question and answer are required.");
  }

  if (input.sectionId) {
    const { data: targetSection, error: sectionError } = await adminClient
      .from("knowledge_sections")
      .select("*")
      .eq("id", input.sectionId)
      .single();
    if (sectionError) throw sectionError;
    if (isReadOnlySystemSection(targetSection)) {
      throw new Error("Q&A cannot be attached to the source-preserved system appendix.");
    }
  }

  const sources = await fetchHubSources(adminClient, input.hubId);
  const verification = await evaluateManualKnowledgeItem(sources, "question", {
    question,
    answer,
  });
  const basePayload = {
    hub_id: input.hubId,
    section_id: input.sectionId || null,
    question,
    answer,
    question_origin: "manual",
    display_order:
      Number.isFinite(input.displayOrder) && input.displayOrder >= 0
        ? input.displayOrder
        : 0,
    created_by: input.userId || null,
  };

  if (input.questionId) {
    const { data: existing, error: existingError } = await adminClient
      .from("knowledge_questions")
      .select("*")
      .eq("id", input.questionId)
      .single();
    if (existingError) throw existingError;
    const wasAiManaged =
      isAiManagedQuestion(existing) || Boolean(existing.metadata?.ai_question_key);

    const { data, error } = await adminClient
      .from("knowledge_questions")
      .update({
        ...basePayload,
        source_ids: mergeUniqueUuidArrays(
          existing.source_ids || [],
          verification.supportingSourceIds || []
        ),
        metadata: buildVerificationMetadata(
          {
            ...(existing.metadata || {}),
            ai_question_key:
              existing.metadata?.ai_question_key || normalizeQuestionKey(existing.question || question),
            manualized_from_ai_at:
              wasAiManaged && !existing.metadata?.manualized_from_ai_at
                ? new Date().toISOString()
                : existing.metadata?.manualized_from_ai_at,
            manually_edited_at: new Date().toISOString(),
          },
          verification
        ),
      })
      .eq("id", input.questionId)
      .select("*")
      .single();
    if (error) throw error;
    await preserveSectionForManualQuestion(adminClient, data.section_id || null);
    await markHubSyncStatus(adminClient, input.hubId, "stale", {
      last_sync_error: null,
    });
    return data;
  }

  const { data: existing } = await adminClient
    .from("knowledge_questions")
    .select("*")
    .eq("hub_id", input.hubId)
    .ilike("question", question)
    .maybeSingle();

  if (existing?.id) {
    const wasAiManaged =
      isAiManagedQuestion(existing) || Boolean(existing.metadata?.ai_question_key);
    const { data, error } = await adminClient
      .from("knowledge_questions")
      .update({
        ...basePayload,
        source_ids: mergeUniqueUuidArrays(
          existing.source_ids || [],
          verification.supportingSourceIds || []
        ),
        metadata: buildVerificationMetadata(
          {
            ...(existing.metadata || {}),
            ai_question_key:
              existing.metadata?.ai_question_key || normalizeQuestionKey(existing.question || question),
            manualized_from_ai_at:
              wasAiManaged && !existing.metadata?.manualized_from_ai_at
                ? new Date().toISOString()
                : existing.metadata?.manualized_from_ai_at,
            manually_edited_at: new Date().toISOString(),
          },
          verification
        ),
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    await preserveSectionForManualQuestion(adminClient, data.section_id || null);
    await markHubSyncStatus(adminClient, input.hubId, "stale", {
      last_sync_error: null,
    });
    return data;
  }

  const { data, error } = await adminClient
    .from("knowledge_questions")
    .insert({
      ...basePayload,
      source_ids: verification.supportingSourceIds || [],
      metadata: buildVerificationMetadata(
        {
          manually_created_at: new Date().toISOString(),
        },
        verification
      ),
    })
    .select("*")
    .single();
  if (error) throw error;
  await preserveSectionForManualQuestion(adminClient, data.section_id || null);
  await markHubSyncStatus(adminClient, input.hubId, "stale", {
    last_sync_error: null,
  });
  return data;
}

export async function deleteSection(adminClient, input) {
  const { data: section, error: sectionError } = await adminClient
    .from("knowledge_sections")
    .select("*")
    .eq("id", input.sectionId)
    .eq("hub_id", input.hubId)
    .single();
  if (sectionError) throw sectionError;

  if (isReadOnlySystemSection(section)) {
    throw new Error("Source-preserved system sections cannot be deleted.");
  }

  const { data: questions, error: questionsError } = await adminClient
    .from("knowledge_questions")
    .select("id,metadata")
    .eq("hub_id", input.hubId)
    .eq("section_id", input.sectionId)
    .eq("is_archived", false);
  if (questionsError) throw questionsError;

  const deletedAt = new Date().toISOString();
  const deletedQuestionIds = (questions || []).map((question) => question.id);

  const { error: archiveSectionError } = await adminClient
    .from("knowledge_sections")
    .update({
      is_archived: true,
      metadata: {
        ...(section.metadata || {}),
        deleted_at: deletedAt,
        deleted_by: input.userId || null,
        deleted_via: "admin_delete",
      },
    })
    .eq("id", input.sectionId)
    .eq("hub_id", input.hubId);
  if (archiveSectionError) throw archiveSectionError;

  if (deletedQuestionIds.length) {
    for (const question of questions || []) {
      const { error } = await adminClient
        .from("knowledge_questions")
        .update({
          is_archived: true,
          metadata: {
            ...(question.metadata || {}),
            deleted_at: deletedAt,
            deleted_by: input.userId || null,
            deleted_via: "section_delete",
            deleted_with_section_id: input.sectionId,
          },
        })
        .eq("id", question.id)
        .eq("hub_id", input.hubId);
      if (error) throw error;
    }
  }

  await deleteChunksForSection(adminClient, input.hubId, input.sectionId);
  for (const questionId of deletedQuestionIds) {
    await deleteChunksForQuestion(adminClient, input.hubId, questionId);
  }

  return {
    ok: true,
    deletedSectionId: input.sectionId,
    deletedQuestionIds,
  };
}

export async function deleteQuestion(adminClient, input) {
  const { data: question, error: questionError } = await adminClient
    .from("knowledge_questions")
    .select("*")
    .eq("id", input.questionId)
    .eq("hub_id", input.hubId)
    .single();
  if (questionError) throw questionError;

  const deletedAt = new Date().toISOString();
  const { error } = await adminClient
    .from("knowledge_questions")
    .update({
      is_archived: true,
      metadata: {
        ...(question.metadata || {}),
        deleted_at: deletedAt,
        deleted_by: input.userId || null,
        deleted_via: "admin_delete",
      },
    })
    .eq("id", input.questionId)
    .eq("hub_id", input.hubId);
  if (error) throw error;

  await deleteChunksForQuestion(adminClient, input.hubId, input.questionId);

  return {
    ok: true,
    deletedQuestionId: input.questionId,
  };
}

export async function ensureKnowledgeHubs(adminClient) {
  const generalHubDescription = "Shared guidance and context that applies across properties.";
  const [{ data: properties, error: propertiesError }, { data: hubs, error: hubsError }] =
    await Promise.all([
      adminClient
        .from("properties")
        .select("id,name,slug")
        .order("name", { ascending: true }),
      adminClient.from("knowledge_hubs").select("*"),
    ]);

  if (propertiesError) throw propertiesError;
  if (hubsError) throw hubsError;

  const existingGeneral = (hubs || []).find(
    (hub) => hub.scope_type === "general" && !hub.property_id
  );
  if (!existingGeneral) {
      const { error } = await adminClient.from("knowledge_hubs").insert({
        scope_type: "general",
        title: "General Knowledge Base",
        description: generalHubDescription,
      });
      if (error) throw error;
  }

  if (existingGeneral && existingGeneral.description !== generalHubDescription) {
    await adminClient
      .from("knowledge_hubs")
      .update({ description: generalHubDescription })
      .eq("id", existingGeneral.id);
  }

  for (const property of properties || []) {
    const propertyHub = (hubs || []).find(
      (hub) => hub.scope_type === "property" && hub.property_id === property.id
    );

    if (!propertyHub) {
      const { error } = await adminClient.from("knowledge_hubs").insert({
        scope_type: "property",
        property_id: property.id,
        title: `${property.name} Knowledge Base`,
        description: `Operational knowledge specific to ${property.name}.`,
      });
      if (error) throw error;
      continue;
    }

    const expectedTitle = `${property.name} Knowledge Base`;
    if (propertyHub.title !== expectedTitle) {
      await adminClient
        .from("knowledge_hubs")
        .update({ title: expectedTitle })
        .eq("id", propertyHub.id);
    }
  }
}

export async function listKnowledgeHubs(adminClient) {
  await ensureKnowledgeHubs(adminClient);

  const { data: hubs, error } = await adminClient
    .from("knowledge_hubs")
    .select("*")
    .order("scope_type", { ascending: true })
    .order("title", { ascending: true });

  if (error) throw error;

  const propertyIds = Array.from(
    new Set((hubs || []).map((hub) => hub.property_id).filter(Boolean))
  );
  const propertyMap = new Map();

  if (propertyIds.length) {
    const { data: properties } = await adminClient
      .from("properties")
      .select("id,name,slug")
      .in("id", propertyIds);
    (properties || []).forEach((property) => propertyMap.set(property.id, property));
  }

  const ordered = (hubs || []).sort((a, b) => {
    if (a.scope_type !== b.scope_type) {
      return a.scope_type === "general" ? -1 : 1;
    }
    return a.title.localeCompare(b.title);
  });

  return ordered.map((hub) => ({
    ...hub,
    property: hub.property_id ? propertyMap.get(hub.property_id) || null : null,
  }));
}

async function findPropertyIdForRefresh(adminClient, { slug, name }) {
  const normalizedSlug = `${slug || ""}`.trim();
  if (normalizedSlug) {
    const { data, error } = await adminClient
      .from("properties")
      .select("id")
      .eq("slug", normalizedSlug)
      .maybeSingle();
    if (error) throw error;
    if (data?.id) return data.id;
  }

  const normalizedName = `${name || ""}`.trim();
  if (!normalizedName) return null;

  const { data, error } = await adminClient
    .from("properties")
    .select("id")
    .eq("name", normalizedName)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0]?.id || null;
}

async function resolveKnowledgeRefreshTargets(adminClient, input = {}) {
  const propertyIds = new Set(normalizeIdList(input.propertyIds || []));
  const explicitHubIds = new Set(normalizeIdList(input.hubIds || []));
  let includeGeneral = Boolean(input.includeGeneral);
  let includeAllPropertyHubs = Boolean(input.includeAllPropertyHubs);

  if (input.request) {
    const request = input.request;
    const entityType = `${request?.entity_type || request?.entityType || ""}`.trim().toLowerCase();
    const action = `${request?.action || ""}`.trim().toLowerCase();
    const payload = parseObjectLike(request?.payload);
    const beforeSnapshot = parseObjectLike(request?.before_snapshot || request?.beforeSnapshot);
    const requestEntityId = `${request?.entity_id || request?.entityId || ""}`.trim();

    if (entityType === "property") {
      normalizeIdList([requestEntityId, payload.id, beforeSnapshot.id, payload.property_id]).forEach((id) =>
        propertyIds.add(id)
      );
      if (!propertyIds.size) {
        const resolvedPropertyId = await findPropertyIdForRefresh(adminClient, {
          slug: payload.slug || beforeSnapshot.slug,
          name: payload.name || beforeSnapshot.name,
        });
        if (resolvedPropertyId) {
          propertyIds.add(resolvedPropertyId);
        }
      }
    } else if (entityType === "amenity") {
      normalizeIdList([payload.property_id, beforeSnapshot.property_id]).forEach((id) =>
        propertyIds.add(id)
      );
    } else if (
      ["property_image", "property_curated_image", "property_highlight_image"].includes(entityType)
    ) {
      normalizeIdList([payload.property_id, beforeSnapshot.property_id]).forEach((id) =>
        propertyIds.add(id)
      );
    } else if (entityType === "faq") {
      const propertyIdsFromRequest = normalizeIdList([
        payload.property_ids || [],
        beforeSnapshot.property_ids || [],
        payload.property_id,
        beforeSnapshot.property_id,
      ]);
      propertyIdsFromRequest.forEach((id) => propertyIds.add(id));

      if (payload.is_default === true || beforeSnapshot.is_default === true) {
        includeGeneral = true;
        includeAllPropertyHubs = true;
      } else if (!propertyIdsFromRequest.length && action === "delete") {
        includeAllPropertyHubs = true;
      }
    } else if (["review", "activity"].includes(entityType)) {
      const propertyIdsFromRequest = normalizeIdList([
        payload.property_ids || [],
        beforeSnapshot.property_ids || [],
        payload.property_id,
        beforeSnapshot.property_id,
      ]);
      propertyIdsFromRequest.forEach((id) => propertyIds.add(id));

      if (!propertyIdsFromRequest.length && action === "delete") {
        includeAllPropertyHubs = true;
      }
    }
  }

  const hubs = await listKnowledgeHubs(adminClient);
  const hubIds = new Set(explicitHubIds);

  if (includeGeneral) {
    const generalHub = hubs.find((hub) => hub.scope_type === "general" && !hub.property_id);
    if (generalHub?.id) {
      hubIds.add(generalHub.id);
    }
  }

  if (includeAllPropertyHubs) {
    hubs
      .filter((hub) => hub.scope_type === "property" && hub.property_id)
      .forEach((hub) => hubIds.add(hub.id));
  }

  if (propertyIds.size) {
    hubs
      .filter((hub) => hub.scope_type === "property" && propertyIds.has(`${hub.property_id}`))
      .forEach((hub) => hubIds.add(hub.id));
  }

  return Array.from(hubIds);
}

export async function scheduleKnowledgeRefreshForAdminChange(adminClient, input = {}) {
  const hubIds = await resolveKnowledgeRefreshTargets(adminClient, input);
  for (const hubId of hubIds) {
    await scheduleKnowledgeHubSync(adminClient, hubId, {
      userId: input.userId || null,
    });
  }

  return {
    queued: true,
    hubIds,
  };
}

export async function getKnowledgeHubPayload(adminClient, hubId) {
  const hub = await loadHub(adminClient, hubId);
  const sources = await fetchHubSources(adminClient, hubId);

  const [sections, questions] = await Promise.all([
    fetchHubSections(adminClient, hubId),
    fetchHubQuestions(adminClient, hubId),
  ]);

  const sourceMap = new Map(sources.map((source) => [source.id, source]));
  const groupedQuestions = new Map();
  questions.forEach((question) => {
    const key = question.section_id || "unassigned";
    if (!groupedQuestions.has(key)) {
      groupedQuestions.set(key, []);
    }
    groupedQuestions.get(key).push(question);
  });

  const visibleSections = sections.filter((section) => !section.metadata?.hidden_from_ui);
  const sectionsWithQuestions = visibleSections.map((section) => {
    const suggestedEdit = parseObjectLike(section.metadata?.ai_suggested_edit);
    const suggestedSourceIds = normalizeIdList(suggestedEdit.source_ids || []);

    return {
      ...section,
      source_items: (section.source_ids || [])
        .map((id) => sourceMap.get(id))
        .filter(Boolean),
      questions: groupedQuestions.get(section.id) || [],
      suggested_edit:
        suggestedEdit.title || suggestedEdit.summary || suggestedEdit.content_markdown
          ? {
              ...suggestedEdit,
              source_items: suggestedSourceIds.map((id) => sourceMap.get(id)).filter(Boolean),
            }
          : null,
    };
  });

  return {
    hub,
    sources,
    sections: sectionsWithQuestions,
    orphanQuestions: groupedQuestions.get("unassigned") || [],
    suggestedQuestions: questions.slice(0, 10),
    stats: {
      sourceCount: sources.length,
      sectionCount: visibleSections.length,
      questionCount: questions.length,
      lastSyncedAt: hub.last_synced_at,
      syncStatus: hub.sync_status,
    },
  };
}

export async function answerKnowledgeQuestion(adminClient, input) {
  const hub = await loadHub(adminClient, input.hubId);
  return answerQuestionAcrossHubs(adminClient, {
    hub,
    question: input.question,
    requestedHubIds: [hub.id],
    primaryHubId: hub.id,
  });
}

export async function answerPortfolioQuestion(adminClient, input) {
  const hubs = await listKnowledgeHubs(adminClient);
  const requestedHubIds = hubs.map((hub) => hub.id).filter(Boolean);
  const preferredHubId =
    input.preferredHubId && requestedHubIds.includes(input.preferredHubId)
      ? input.preferredHubId
      : null;

  return answerQuestionAcrossHubs(adminClient, {
    hub: {
      id: "portfolio-master",
      title: "Portfolio Master Concierge",
      scope_type: "portfolio",
    },
    question: input.question,
    requestedHubIds,
    primaryHubId: preferredHubId,
  });
}
