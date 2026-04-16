"use client";

import type { NewfiTemplateRow, NewfiTemplate } from "./types";

/**
 * Reads a Newfi Guideline Review Template Excel file (.xlsx) and returns
 * all rows from the Non-QM and DSCR tabs. Uses SheetJS (xlsx) loaded
 * dynamically to keep the initial bundle lean.
 *
 * Template structure (both tabs):
 *   Row 1: FINDINGS KEY header (skip)
 *   Row 2: Column headers (skip)
 *   Row 3+: Data rows
 *     Col A (0): Category — may be null on merged-cell rows (carry forward)
 *     Col B (1): Topic / Guideline Topic
 *     Col C (2): Newfi Guideline Text
 *     Col D (3): Seller text (blank — to be filled by app)
 *     Col E (4): Findings (blank — to be filled by app)
 */
export async function readNewfiTemplate(file: File): Promise<NewfiTemplate> {
  const XLSX = await import("xlsx");

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellText: true, cellDates: true });

  function parseTab(sheetName: string, tab: "NON-QM" | "DSCR"): NewfiTemplateRow[] {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];

    // Convert to array of arrays (raw values)
    const rows: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
      blankrows: true,
    }) as (string | number | null)[][];

    const result: NewfiTemplateRow[] = [];
    let lastCategory = "";

    // Start at index 2 (row 3, 0-based) — skip header rows
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      const colA = row[0] != null ? String(row[0]).trim() : null;
      const colB = row[1] != null ? String(row[1]).trim() : null;
      const colC = row[2] != null ? String(row[2]).trim() : null;

      // Category carries forward on merged-cell rows
      if (colA) lastCategory = colA;

      // Skip rows with no topic or no Newfi guideline text
      if (!colB || !colC) continue;

      result.push({
        rowNum: i + 1, // 1-based Excel row number
        tab,
        category: lastCategory,
        topic: colB,
        newfiText: colC,
      });
    }

    return result;
  }

  const nonQmRows = parseTab("Non-QM Guides", "NON-QM");
  const dscrRows = parseTab("DSCR Guides", "DSCR");

  return {
    nonQmRows,
    dscrRows,
    fileName: file.name,
    loadedAt: new Date().toISOString(),
  };
}
