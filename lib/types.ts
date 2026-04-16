import type { NewfiTab } from "./newfiGuidelines";

export type UploadResponse = {
  success: boolean;
  message: string;
  fileName?: string;
  fileSize?: number;
  newfiRowCount?: number;
  tabsAvailable?: NewfiTab[];
  extractedText?: string;
  extractedCharacterCount?: number;
  sectionChunks?: SectionChunk[];
  sectionCount?: number;
};

export type SectionChunk = {
  id: string;
  heading: string;
  level: number;
  content: string;
  lineStart: number;
  lineEnd: number;
  parentHeading: string | null;
};

// ===== NEW TYPES FOR UPGRADED APP =====

export type ExtractedGuideline = {
  id: string;
  category: string;
  guideline: string;
  page_reference?: string;
  severity: "critical" | "standard" | "informational";
  sourceDocument?: "A" | "B";
  // Array of page numbers where this guideline appears
  pages?: number[];
};

export type ExtractionResult = {
  success: boolean;
  guidelines: ExtractedGuideline[];
  fileName: string;
  pageCount: number;
  fileSize: number;
  extractedAt: string;
  error?: string;
};

export type ComparisonVerdict = "GO" | "NO_GO" | "REVIEW";

export type GuidelineComparison = {
  id: string;
  sellerGuideline: ExtractedGuideline;
  verdict: ComparisonVerdict;
  confidence: number;
  reason: string;
  conflictingNewfiRule: string | null;
};

export type ComparisonResult = {
  totalGuidelines: number;
  goCount: number;
  noGoCount: number;
  reviewCount: number;
  complianceScore: number;
  overallVerdict: "FULLY_COMPLIANT" | "NON_COMPLIANT" | "REVIEW_REQUIRED";
  comparisons: GuidelineComparison[];
  comparedAt: string;
};

export type DocumentInfo = {
  file: File | null;
  name: string;
  size: number;
  uploaded: boolean;
  extracting: boolean;
  extracted: boolean;
  guidelines: ExtractedGuideline[];
  pageCount: number;
};

export type AppState = {
  documentA: DocumentInfo;
  documentB: DocumentInfo;
  isExtracting: boolean;
  extractionProgress: number;
  comparisonResult: ComparisonResult | null;
  isComparing: boolean;
  comparisonProgress: number;
  newfiBaselineText: string;
  activePage: "upload" | "compare" | "chat";
};

// ===== NEWFI TEMPLATE COMPARISON TYPES =====

export type NewfiTemplateRow = {
  rowNum: number;
  tab: "NON-QM" | "DSCR";
  category: string;
  topic: string;
  newfiText: string;
};

export type TemplateVerdict =
  | "ALIGNED"
  | "MORE RESTRICTIVE"
  | "MORE PERMISSIVE"
  | "SILENT / NOT ADDRESSED"
  | "CONFLICT";

export type CreditConcernLevel = "HIGH" | "MEDIUM" | "LOW" | null;

export type ComparisonRow = {
  rowNum: number;
  tab: "NON-QM" | "DSCR";
  category: string;
  topic: string;
  newfiText: string;
  sellerText: string;          // verbatim text found in seller PDF + page ref
  pageRef: string;             // e.g. "p.45" or "N/A"
  verdict: TemplateVerdict;
  creditConcern: CreditConcernLevel;
  analysis: string;            // one-sentence explanation of the verdict
};

export type TemplateComparisonResult = {
  tab: "NON-QM" | "DSCR";
  rows: ComparisonRow[];
  completedAt: string;
  sellerName: string;
  totalRows: number;
  alignedCount: number;
  morePermissiveCount: number;
  moreRestrictiveCount: number;
  silentCount: number;
  conflictCount: number;
};

export type NewfiTemplate = {
  nonQmRows: NewfiTemplateRow[];
  dscrRows: NewfiTemplateRow[];
  fileName: string;
  loadedAt: string;
};