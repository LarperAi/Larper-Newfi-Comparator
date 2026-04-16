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
  score: number;     // TF-IDF relevance score (0–1)
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

// ── Index builder ────────────────────────────────────────────────────

/**
 * Build a TF-IDF index from extracted PDF page texts.
 * Split each page into paragraphs to get finer-grained results.
 */
export function buildSearchIndex(pages: PageText[]): TfIdfIndex {
  const documents: Array<{ pageNum: number; text: string; tokens: string[] }> = [];

  for (const page of pages) {
    // Split into paragraphs
    const paragraphs = page.text
      .split(/\n{2,}|\r\n{2,}/)
      .map(p => p.replace(/\n/g, " ").trim())
      .filter(p => p.length > 40); // Skip very short fragments

    if (paragraphs.length === 0) {
      // Fallback: use the whole page as one document
      const tokens = tokenize(page.text);
      if (tokens.length > 0) {
        documents.push({ pageNum: page.pageNum, text: page.text, tokens });
      }
    } else {
      for (const paragraph of paragraphs) {
        const tokens = tokenize(paragraph);
        if (tokens.length > 3) {
          documents.push({ pageNum: page.pageNum, text: paragraph, tokens });
        }
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

  // Normalize scores to 0–1
  const maxScore = top[0]?.score || 1;
  return top.map(({ doc, score }) => ({
    text: doc.text,
    pageNum: doc.pageNum,
    score: score / maxScore,
  }));
}

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

  return `${topicTerms} ${keyTermMatches.join(" ")}`.trim();
}
