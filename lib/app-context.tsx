"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type {
  NewfiTemplate,
  TemplateComparisonResult,
} from "./types";
import { readNewfiTemplate } from "./excel-reader";
import { runTabComparison } from "./comparison-engine";
import { extractTextFromPDFClient } from "./pdf-extract-client";
import type { PageText } from "./text-search";

type AppContextType = {
  // Seller PDF
  sellerFile: File | null;
  sellerName: string;
  sellerReady: boolean;
  sellerLoading: boolean;
  sellerProgress: number;
  sellerPages: PageText[];
  loadSellerPDF: (file: File) => Promise<void>;
  clearSeller: () => void;

  // Newfi template (xlsx)
  newfiTemplate: NewfiTemplate | null;
  templateLoading: boolean;
  loadNewfiTemplate: (file: File) => Promise<void>;
  clearTemplate: () => void;

  // Comparison
  nonQmResult: TemplateComparisonResult | null;
  dscrResult: TemplateComparisonResult | null;
  isComparing: boolean;
  comparisonProgress: number;
  runComparison: () => Promise<void>;

  // Export
  exportFilledTemplate: (tab: "NON-QM" | "DSCR" | "BOTH") => Promise<void>;
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  // Seller PDF state
  const [sellerFile, setSellerFile] = useState<File | null>(null);
  const [sellerName, setSellerName] = useState("");
  const [sellerReady, setSellerReady] = useState(false);
  const [sellerLoading, setSellerLoading] = useState(false);
  const [sellerProgress, setSellerProgress] = useState(0);
  const [sellerPages, setSellerPages] = useState<PageText[]>([]);

  // Newfi template state
  const [newfiTemplate, setNewfiTemplate] = useState<NewfiTemplate | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);

  // Comparison state
  const [nonQmResult, setNonQmResult] = useState<TemplateComparisonResult | null>(null);
  const [dscrResult, setDscrResult] = useState<TemplateComparisonResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonProgress, setComparisonProgress] = useState(0);

  const loadSellerPDF = useCallback(async (file: File) => {
    setSellerFile(file);
    setSellerName(file.name);
    setSellerReady(false);
    setSellerLoading(true);
    setSellerProgress(0);

    try {
      const result = await extractTextFromPDFClient(file);
      const pages: PageText[] = result.pages.map((text, i) => ({
        pageNum: i + 1,
        text,
      }));
      setSellerPages(pages);
      setSellerReady(true);
    } catch (err) {
      console.error("PDF extraction failed:", err);
    } finally {
      setSellerLoading(false);
      setSellerProgress(100);
    }
  }, []);

  const clearSeller = useCallback(() => {
    setSellerFile(null);
    setSellerName("");
    setSellerReady(false);
    setSellerLoading(false);
    setSellerProgress(0);
    setSellerPages([]);
    setNonQmResult(null);
    setDscrResult(null);
  }, []);

  const loadNewfiTemplate_ = useCallback(async (file: File) => {
    setTemplateLoading(true);
    try {
      const template = await readNewfiTemplate(file);
      setNewfiTemplate(template);
    } catch (err) {
      console.error("Template read failed:", err);
    } finally {
      setTemplateLoading(false);
    }
  }, []);

  const clearTemplate = useCallback(() => {
    setNewfiTemplate(null);
    setNonQmResult(null);
    setDscrResult(null);
  }, []);

  const runComparison = useCallback(async () => {
    if (!newfiTemplate || sellerPages.length === 0) return;

    setIsComparing(true);
    setComparisonProgress(0);
    setNonQmResult(null);
    setDscrResult(null);

    const seller = sellerName.replace(/\.[^/.]+$/, "");
    const nonQmTotal = newfiTemplate.nonQmRows.length;
    const dscrTotal = newfiTemplate.dscrRows.length;
    const total = nonQmTotal + dscrTotal;
    let completed = 0;

    try {
      // Run NON-QM tab
      const nqResult = await runTabComparison(
        newfiTemplate.nonQmRows,
        sellerPages,
        seller,
        (done) => {
          completed = done;
          setComparisonProgress(Math.round((completed / total) * 100));
        }
      );
      setNonQmResult(nqResult);

      // Run DSCR tab
      const dResult = await runTabComparison(
        newfiTemplate.dscrRows,
        sellerPages,
        seller,
        (done) => {
          completed = nonQmTotal + done;
          setComparisonProgress(Math.round((completed / total) * 100));
        }
      );
      setDscrResult(dResult);
    } catch (err) {
      console.error("Comparison error:", err);
    } finally {
      setIsComparing(false);
      setComparisonProgress(100);
    }
  }, [newfiTemplate, sellerPages, sellerName]);

  const exportFilledTemplate = useCallback(async (tab: "NON-QM" | "DSCR" | "BOTH") => {
    const rows =
      tab === "NON-QM" ? (nonQmResult?.rows ?? []) :
      tab === "DSCR"   ? (dscrResult?.rows ?? []) :
      [...(nonQmResult?.rows ?? []), ...(dscrResult?.rows ?? [])];

    if (rows.length === 0) return;

    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();

    const verdictColor: Record<string, string> = {
      "ALIGNED":              "C6EFCE",
      "MORE RESTRICTIVE":     "DDEBF7",
      "MORE PERMISSIVE":      "FFEB9C",
      "SILENT / NOT ADDRESSED": "FFC7CE",
      "CONFLICT":             "FF0000",
    };

    const verdictFontColor: Record<string, string> = {
      "ALIGNED":              "276221",
      "MORE RESTRICTIVE":     "1F4E79",
      "MORE PERMISSIVE":      "7D6608",
      "SILENT / NOT ADDRESSED": "9C0006",
      "CONFLICT":             "FFFFFF",
    };

    // Group by tab
    const tabs = tab === "BOTH"
      ? (["NON-QM", "DSCR"] as const)
      : [tab];

    for (const tabName of tabs) {
      const tabRows = rows.filter(r => r.tab === tabName);
      if (tabRows.length === 0) continue;

      const sheet = workbook.addWorksheet(
        tabName === "NON-QM" ? "Non-QM Guides" : "DSCR Guides"
      );

      // Column widths
      sheet.getColumn("A").width = 22;  // Category
      sheet.getColumn("B").width = 30;  // Topic
      sheet.getColumn("C").width = 55;  // Newfi Text
      sheet.getColumn("D").width = 55;  // Seller Text
      sheet.getColumn("E").width = 32;  // Verdict / Finding

      // Header rows (rows 1-2)
      const h1 = sheet.getRow(1);
      h1.values = ["", "", tabName === "NON-QM" ? "Newfi Non-QM Guidelines" : "Newfi DSCR Guidelines", "Seller Guide", "Finding"];
      const h2 = sheet.getRow(2);
      h2.values = ["Category", "Topic", "Newfi Guideline", "Seller Verbatim Text (w/ Page Ref)", "Verdict & Analysis"];

      // Style headers
      for (const row of [h1, h2]) {
        row.eachCell(cell => {
          cell.font = { bold: true, size: 11, color: { argb: "FFFFFF" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1F4E78" } };
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          cell.border = {
            top: { style: "thin" }, left: { style: "thin" },
            bottom: { style: "thin" }, right: { style: "thin" },
          };
        });
        row.height = 22;
      }

      // Data rows start at row 3
      for (const r of tabRows) {
        const dataRow = sheet.addRow([
          r.category,
          r.topic,
          r.newfiText,
          r.sellerText,
          `${r.verdict}${r.creditConcern ? ` [${r.creditConcern}]` : ""}\n${r.analysis}`,
        ]);
        dataRow.height = 60;
        dataRow.eachCell((cell, colNum) => {
          cell.alignment = { vertical: "top", wrapText: true };
          cell.border = {
            top: { style: "thin" }, left: { style: "thin" },
            bottom: { style: "thin" }, right: { style: "thin" },
          };
          // Color the verdict cell
          if (colNum === 5) {
            const bg = verdictColor[r.verdict] ?? "EFEFEF";
            const fg = verdictFontColor[r.verdict] ?? "000000";
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
            cell.font = { bold: true, color: { argb: fg }, size: 10 };
          }
        });
      }

      sheet.views = [{ state: "frozen", ySplit: 2 }];
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = globalThis.document.createElement("a");
    link.href = url;
    link.download = `${sellerName.replace(/\.[^/.]+$/, "")}_comparison_${tab}.xlsx`;
    globalThis.document.body.appendChild(link);
    link.click();
    globalThis.document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [nonQmResult, dscrResult, sellerName]);

  return (
    <AppContext.Provider
      value={{
        sellerFile,
        sellerName,
        sellerReady,
        sellerLoading,
        sellerProgress,
        sellerPages,
        loadSellerPDF,
        clearSeller,
        newfiTemplate,
        templateLoading,
        loadNewfiTemplate: loadNewfiTemplate_,
        clearTemplate,
        nonQmResult,
        dscrResult,
        isComparing,
        comparisonProgress,
        runComparison,
        exportFilledTemplate,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
