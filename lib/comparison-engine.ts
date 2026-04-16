"use client";

import { buildSearchIndex, searchIndex, buildQuery, type PageText } from "./text-search";
import type {
  NewfiTemplateRow,
  ComparisonRow,
  TemplateVerdict,
  CreditConcernLevel,
  TemplateComparisonResult,
} from "./types";

// ── Number extraction ────────────────────────────────────────────────

/**
 * Extract all numbers from text.
 * Handles: "640 FICO" → 640, "75% LTV" → 75, "3.5%" → 3.5, "12 months" → 12,
 *          "$500,000" → 500000, plain integers, and decimals.
 */
function extractNumbers(text: string): number[] {
  // Match numbers that may be followed by optional punctuation/unit context.
  // Strip currency symbols and percent signs before matching so they don't block the digit.
  const cleaned = text.replace(/\$|%/g, "");
  const pattern = /\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\b/g;
  const matches = cleaned.match(pattern) || [];
  return matches.map(m => parseFloat(m.replace(/,/g, ""))).filter(n => !isNaN(n));
}

/**
 * Check if a text contains a "more restrictive" keyword relative to another.
 */
function hasProhibitionKeyword(text: string): boolean {
  return /\b(not allowed|prohibited|ineligible|not eligible|not permitted|cannot|may not)\b/i.test(text);
}

function hasAllowanceKeyword(text: string): boolean {
  return /\b(allowed|eligible|permitted|acceptable|may be used|is allowed)\b/i.test(text);
}

// ── Verdict determination ────────────────────────────────────────────

/**
 * Determine verdict and credit concern by comparing Newfi text to seller text.
 * Returns a verdict label, credit concern level, and a one-sentence analysis.
 */
function determineVerdict(
  newfiText: string,
  sellerText: string,
  topic: string
): { verdict: TemplateVerdict; creditConcern: CreditConcernLevel; analysis: string } {
  const newfiLower = newfiText.toLowerCase();
  const sellerLower = sellerText.toLowerCase();

  // SILENT: no seller text found, or seller text is too short to be meaningful (likely noise)
  if (!sellerText || sellerText === "Not addressed" || sellerText.length < 30) {
    return {
      verdict: "SILENT / NOT ADDRESSED",
      creditConcern: "MEDIUM",
      analysis: `Topic "${topic}" not found in seller guide. Treat as a gap and confirm via purchase condition.`,
    };
  }

  // Extract numbers from both texts
  const newfiNums = extractNumbers(newfiText);
  const sellerNums = extractNumbers(sellerText);

  // Prohibition conflicts: Newfi prohibits, seller allows (or vice versa)
  const newfiProhibits = hasProhibitionKeyword(newfiText);
  const sellerProhibits = hasProhibitionKeyword(sellerText);
  const newfiAllows = hasAllowanceKeyword(newfiText);
  const sellerAllows = hasAllowanceKeyword(sellerText);

  if (newfiProhibits && sellerAllows) {
    return {
      verdict: "CONFLICT",
      creditConcern: "HIGH",
      analysis: `Newfi prohibits this but seller's guide appears to allow it — direct conflict requiring immediate review.`,
    };
  }

  if (newfiAllows && sellerProhibits) {
    return {
      verdict: "MORE RESTRICTIVE",
      creditConcern: null,
      analysis: `Seller is more restrictive than Newfi on this topic. No credit concern.`,
    };
  }

  // Numeric comparison: find if seller is more/less permissive
  if (newfiNums.length > 0 && sellerNums.length > 0) {
    const newfiPrimary = newfiNums[0];
    const sellerPrimary = sellerNums[0];

    // Determine if this is a minimum or maximum context.
    // Check all three texts so context words in the seller guide are also considered.
    const combinedContext = newfiText + " " + topic + " " + sellerText;
    const isMinimumContext = /minimum|min |at least|floor/i.test(combinedContext);
    const isMaximumContext = /maximum|max |not more than|up to|no more than/i.test(combinedContext);

    if (isMinimumContext && Math.abs(sellerPrimary - newfiPrimary) > 0.5) {
      if (sellerPrimary < newfiPrimary) {
        const diff = newfiPrimary - sellerPrimary;
        const level: CreditConcernLevel = diff > 20 ? "HIGH" : diff > 5 ? "MEDIUM" : "LOW";
        return {
          verdict: "MORE PERMISSIVE",
          creditConcern: level,
          analysis: `Seller minimum (${sellerPrimary}) is below Newfi minimum (${newfiPrimary}). Loans may not meet Newfi's purchase requirements.`,
        };
      } else if (sellerPrimary > newfiPrimary) {
        return {
          verdict: "MORE RESTRICTIVE",
          creditConcern: null,
          analysis: `Seller minimum (${sellerPrimary}) exceeds Newfi minimum (${newfiPrimary}). No credit concern.`,
        };
      }
    }

    if (isMaximumContext && Math.abs(sellerPrimary - newfiPrimary) > 0.5) {
      if (sellerPrimary > newfiPrimary) {
        const diff = sellerPrimary - newfiPrimary;
        const level: CreditConcernLevel = diff > 10 ? "HIGH" : diff > 2 ? "MEDIUM" : "LOW";
        return {
          verdict: "MORE PERMISSIVE",
          creditConcern: level,
          analysis: `Seller maximum (${sellerPrimary}) exceeds Newfi maximum (${newfiPrimary}). Possible overlimit exposure.`,
        };
      } else if (sellerPrimary < newfiPrimary) {
        return {
          verdict: "MORE RESTRICTIVE",
          creditConcern: null,
          analysis: `Seller maximum (${sellerPrimary}) is below Newfi maximum (${newfiPrimary}). No credit concern.`,
        };
      }
    }

    // Numbers present but same or no clear direction — check similarity
    if (Math.abs(sellerPrimary - newfiPrimary) < 0.5) {
      return {
        verdict: "ALIGNED",
        creditConcern: null,
        analysis: `Seller and Newfi requirements appear numerically aligned on ${topic.toLowerCase()}.`,
      };
    }
  }

  // Fallback: keyword/text similarity check.
  // Strip punctuation from each word after lowercasing so "640." and "640" both match.
  const cleanWord = (w: string) => w.replace(/[^a-z]/g, "");
  const newfiWords = new Set(
    newfiLower.split(/\s+/).map(cleanWord).filter(w => w.length > 4)
  );
  const sellerWords = sellerLower.split(/\s+/).map(cleanWord).filter(w => w.length > 4);
  const overlap = sellerWords.filter(w => newfiWords.has(w)).length;
  const similarity = overlap / Math.max(newfiWords.size, 1);

  if (similarity > 0.35) {
    return {
      verdict: "ALIGNED",
      creditConcern: null,
      analysis: `Seller's language appears substantially similar to Newfi's requirement for ${topic.toLowerCase()}.`,
    };
  }

  // Low similarity, no clear numeric signal — flag for review as MORE PERMISSIVE (conservative)
  return {
    verdict: "MORE PERMISSIVE",
    creditConcern: "MEDIUM",
    analysis: `Unable to confirm seller alignment on ${topic.toLowerCase()}. Seller text found but differs from Newfi — review recommended.`,
  };
}

// ── Main comparison function ─────────────────────────────────────────

/**
 * Run the full row-by-row comparison for one tab (NON-QM or DSCR).
 *
 * @param rows       Newfi template rows for this tab
 * @param pages      Seller PDF pages extracted by pdfjs
 * @param sellerName Name of the seller (for the output header)
 * @param onProgress Optional callback with (completed, total)
 */
export async function runTabComparison(
  rows: NewfiTemplateRow[],
  pages: PageText[],
  sellerName: string,
  onProgress?: (completed: number, total: number) => void
): Promise<TemplateComparisonResult> {
  const tab = rows[0]?.tab ?? "NON-QM";
  const index = buildSearchIndex(pages);
  const comparisonRows: ComparisonRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const query = buildQuery(row.topic, row.newfiText);
    const results = searchIndex(index, query, 3);

    let sellerText = "Not addressed";
    let pageRef = "N/A";

    if (results.length > 0 && results[0].rawScore > 0.05) {
      const best = results[0];
      // Validate: at least one topic keyword must appear in the result text
      const topicTokens = row.topic.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(w => w.length > 3);
      const sellerLower = best.text.toLowerCase();
      const hasTopicRelevance = topicTokens.some(t => sellerLower.includes(t));
      if (hasTopicRelevance) {
        sellerText = best.text.length > 800
          ? best.text.slice(0, 800) + "..."
          : best.text;
        pageRef = `p.${best.pageNum}`;
      }
    }

    const { verdict, creditConcern, analysis } = determineVerdict(
      row.newfiText,
      sellerText,
      row.topic
    );

    comparisonRows.push({
      rowNum: row.rowNum,
      tab: row.tab,
      category: row.category,
      topic: row.topic,
      newfiText: row.newfiText,
      sellerText: sellerText !== "Not addressed"
        ? `${sellerText}\n\n(${pageRef})`
        : "Not addressed in seller guide.",
      pageRef,
      verdict,
      creditConcern,
      analysis,
    });

    if (onProgress) {
      onProgress(i + 1, rows.length);
    }

    // Yield to the event loop every 10 rows to keep UI responsive
    if (i % 10 === 9) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  // Compute summary counts
  const alignedCount = comparisonRows.filter(r => r.verdict === "ALIGNED").length;
  const morePermissiveCount = comparisonRows.filter(r => r.verdict === "MORE PERMISSIVE").length;
  const moreRestrictiveCount = comparisonRows.filter(r => r.verdict === "MORE RESTRICTIVE").length;
  const silentCount = comparisonRows.filter(r => r.verdict === "SILENT / NOT ADDRESSED").length;
  const conflictCount = comparisonRows.filter(r => r.verdict === "CONFLICT").length;

  return {
    tab,
    rows: comparisonRows,
    completedAt: new Date().toISOString(),
    sellerName,
    totalRows: rows.length,
    alignedCount,
    morePermissiveCount,
    moreRestrictiveCount,
    silentCount,
    conflictCount,
  };
}
