"use client";

/**
 * TF-IDF based search engine for finding relevant passages in seller PDF text.
 * Used to match each Newfi template row topic to the corresponding section
 * in the seller's guideline document.
 *
 * No external dependencies — pure TypeScript.
 */

export type PageText = {
  pageNum: number;
  text: string;
};

export type SearchResult = {
  text: string;      // verbatim passage from seller PDF
  pageNum: number;
  score: number;     // normalized 0-1 (for display/ranking)
  rawScore: number;  // absolute TF-IDF score (for thresholding)
};

type TfIdfIndex = {
  documents: Array<{ pageNum: number; text: string; tokens: string[] }>;
  idf: Map<string, number>;
};

// ── Tokenization ────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will", "would",
  "shall", "should", "may", "might", "can", "could", "not", "no", "nor",
  "if", "then", "than", "so", "as", "it", "its", "this", "that", "these",
  "those", "all", "any", "each", "every", "both", "either", "neither",
  "one", "two", "three", "per", "also", "only", "more", "must", "following",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s%$\.\/\-]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t));
}

// ── Chunking helpers ─────────────────────────────────────────────────

/**
 * Detect section boundaries using numbered heading patterns common in mortgage guides:
 * e.g. "2.1.16 -", "5.1.12 -", "4.1.3 -", "SECTION 2 -"
 * Returns the text split at each detected section start, preserving the heading.
 */
function splitBySectionBoundaries(text: string): string[] {
  // Match patterns like "2.1.16 -" or "SECTION 2 -" that indicate a new section
  const sectionPattern = /(?=\b\d+\.\d+(?:\.\d+)*\s*[-–]|\bSECTION\s+\d+\s*[-–])/g;
  const parts = text.split(sectionPattern).map(s => s.trim()).filter(s => s.length > 60);
  return parts.length > 1 ? parts : [];
}

/**
 * Sliding window chunker — fallback when no section boundaries are detected.
 * Creates overlapping chunks of ~WINDOW_SIZE words so focused sections get
 * their own TF-IDF documents rather than being buried in a full-page blob.
 */
const WINDOW_WORDS = 120;
const OVERLAP_WORDS = 30;

function slidingWindowChunks(text: string): string[] {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 30) return [];          // too short to chunk
  if (words.length <= WINDOW_WORDS) return [text]; // fits in one window

  const chunks: string[] = [];
  const step = WINDOW_WORDS - OVERLAP_WORDS;
  for (let i = 0; i < words.length; i += step) {
    const chunk = words.slice(i, i + WINDOW_WORDS).join(" ");
    if (chunk.split(/\s+/).length >= 30) chunks.push(chunk);
  }
  return chunks;
}

// ── Index builder ────────────────────────────────────────────────────

/**
 * Build a TF-IDF index from extracted PDF page texts.
 *
 * Strategy (in order of preference):
 * 1. Split each page on numbered section headings (e.g. "2.1.16 -") — gives
 *    focused per-section chunks that match topic queries precisely.
 * 2. If no section boundaries detected, use 120-word sliding windows with
 *    30-word overlap so content is granular rather than one blob per page.
 *
 * This prevents dense pages (e.g. a general requirements page) from dominating
 * every query simply because they contain many terms.
 */
export function buildSearchIndex(pages: PageText[]): TfIdfIndex {
  const documents: Array<{ pageNum: number; text: string; tokens: string[] }> = [];

  for (const page of pages) {
    // Skip pages that are essentially empty (image-based or whitespace)
    const stripped = page.text.replace(/[\s\d]/g, "");
    if (stripped.length < 20) continue;

    // Strategy 1: section boundary detection
    const sections = splitBySectionBoundaries(page.text);
    const chunks = sections.length > 0 ? sections : slidingWindowChunks(page.text);

    for (const chunk of chunks) {
      const tokens = tokenize(chunk);
      if (tokens.length >= 8) {
        documents.push({ pageNum: page.pageNum, text: chunk, tokens });
      }
    }
  }

  // Compute IDF for each token
  const df = new Map<string, number>();
  for (const doc of documents) {
    const seen = new Set(doc.tokens);
    for (const token of seen) {
      df.set(token, (df.get(token) || 0) + 1);
    }
  }

  const idf = new Map<string, number>();
  const N = documents.length;
  for (const [token, count] of df.entries()) {
    idf.set(token, Math.log((N + 1) / (count + 1)) + 1);
  }

  return { documents, idf };
}

// ── Search ────────────────────────────────────────────────────────────

/**
 * Search the index for passages most relevant to the given query.
 * Returns top-k results sorted by TF-IDF score descending.
 *
 * @param index   Built by buildSearchIndex()
 * @param query   Topic name + key terms (e.g. "CREDIT SCORE minimum FICO borrower")
 * @param topK    Number of results to return
 */
export function searchIndex(
  index: TfIdfIndex,
  query: string,
  topK = 3
): SearchResult[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0 || index.documents.length === 0) return [];

  const scores: Array<{ doc: typeof index.documents[0]; score: number }> = [];

  for (const doc of index.documents) {
    // Compute TF for query tokens in this document
    const tfMap = new Map<string, number>();
    for (const token of doc.tokens) {
      tfMap.set(token, (tfMap.get(token) || 0) + 1);
    }

    let score = 0;
    for (const qToken of queryTokens) {
      const tf = (tfMap.get(qToken) || 0) / Math.max(doc.tokens.length, 1);
      const idfVal = index.idf.get(qToken) || 0;
      score += tf * idfVal;
    }

    if (score > 0) {
      scores.push({ doc, score });
    }
  }

  // Sort by score descending, take topK
  scores.sort((a, b) => b.score - a.score);
  const top = scores.slice(0, topK);

  // Normalize scores to 0–1. Guard against NaN when maxScore is 0.
  const maxScore = top[0]?.score ?? 0;
  if (maxScore === 0) return [];
  return top.map(({ doc, score }) => ({
    text: doc.text,
    pageNum: doc.pageNum,
    score: score / maxScore,
    rawScore: score,
  }));
}

const TOPIC_SYNONYMS: Record<string, string[]> = {
  "geographic": ["state", "states", "eligible states", "ineligible states", "restricted", "jurisdiction"],
  "restrictions": ["ineligible", "prohibited", "not allowed", "restricted", "limitations", "exclusions"],
  "credit score": ["fico", "credit score", "minimum score", "qualifying score"],
  "buydown": ["buydown", "buy down", "temporary buydown", "2/1 buydown"],
  "prepayment": ["prepayment", "prepay", "penalty", "ppp"],
  "escrow": ["escrow", "impound", "holdback"],
  "dti": ["debt to income", "dti", "debt-to-income", "qualifying ratio"],
  "ltv": ["loan to value", "ltv", "cltv", "hcltv"],
  "dscr": ["debt service coverage", "dscr", "rental income", "net operating income"],
};

/**
 * Build a search query string from a Newfi row topic and guideline text.
 * Extracts key terms: topic words, numeric thresholds, mortgage-specific terms.
 */
export function buildQuery(topic: string, newfiText: string): string {
  // Always include the topic
  const topicTerms = topic.replace(/[^a-zA-Z0-9\s]/g, " ").trim();

  // Extract key numeric/mortgage terms from newfiText (first 300 chars)
  const keyTermPattern = /(\d+(?:\.\d+)?%|\$[\d,]+|\d+\s*(?:month|year|day|unit|acre|loan|FICO|LTV|DTI|DSCR)|(?:minimum|maximum|required|eligible|ineligible|prohibited|allowed|not allowed|must|shall))/gi;
  const keyTermMatches = (newfiText.slice(0, 300).match(keyTermPattern) || []).slice(0, 5);

  // Expand with synonyms for common mortgage topics
  const topicLower = topic.toLowerCase();
  const extraTerms: string[] = [];
  for (const [key, synonyms] of Object.entries(TOPIC_SYNONYMS)) {
    if (topicLower.includes(key)) {
      extraTerms.push(...synonyms);
    }
  }

  return `${topicTerms} ${extraTerms.join(" ")} ${keyTermMatches.join(" ")}`.trim();
}
