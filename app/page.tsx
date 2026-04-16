"use client";

import { useState } from "react";
import { DocumentUploadCard } from "@/components/DocumentUploadCard";
import { useApp } from "@/lib/app-context";
import type { ComparisonRow, TemplateVerdict, TemplateComparisonResult } from "@/lib/types";

export default function Home() {
  const {
    sellerFile, sellerName, sellerReady, sellerLoading, sellerProgress,
    loadSellerPDF, clearSeller,
    newfiTemplate, templateLoading,
    loadNewfiTemplate, clearTemplate,
    nonQmResult, dscrResult,
    isComparing, comparisonProgress, comparisonError,
    runComparison, exportFilledTemplate,
  } = useApp();

  const [activeTab, setActiveTab] = useState<"upload" | "results">("upload");
  const [resultTab, setResultTab] = useState<"NON-QM" | "DSCR">("NON-QM");

  const canCompare = sellerReady && !!newfiTemplate && !isComparing;
  const hasResults = !!nonQmResult || !!dscrResult;

  return (
    <div className="min-h-screen bg-[#eef2f6] dark:bg-[#0a0a0c] transition-colors duration-300">
      <div className="ambient-gradient" />
      <div className="grid-pattern" />
      <div className="ambient-orb ambient-orb-1" />
      <div className="ambient-orb ambient-orb-2" />

      {/* ===== NAVBAR ===== */}
      <nav className="sticky top-0 z-50">
        <div className="mx-auto px-6">
          <div className="liquid-glass-strong mt-4 mx-4 px-6 card-lift">
            <div className="flex items-center justify-between h-14">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[11px] bg-gradient-to-br from-[#0A84FF] via-[#5E5CE6] to-[#BF5AF2] flex items-center justify-center animate-pulse-glow">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.25A2.25 2.25 0 003 5.25v13.5A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V5.25a2.25 2.25 0 00-2.25-2.25H10.5z" />
                  </svg>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display font-semibold text-[15px] tracking-tight gradient-text">Newfi</span>
                  <span className="text-[rgba(255,255,255,0.65)] font-medium text-[13px] tracking-tight">Guideline Comparator</span>
                </div>
              </div>

              {/* Nav */}
              <div className="liquid-glass flex items-center gap-1 p-1">
                {(["upload", "results"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-2 px-4 py-[7px] rounded-[9px] text-[13px] font-medium transition-all duration-200 ${
                      activeTab === tab
                        ? "bg-[rgba(255,255,255,0.12)] text-white shadow-lg"
                        : "text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.06)]"
                    }`}
                  >
                    {tab === "upload" ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                      </svg>
                    )}
                    <span className="font-display capitalize">{tab === "upload" ? "Upload" : "Results"}</span>
                    {tab === "results" && hasResults && (
                      <span className="w-2 h-2 rounded-full bg-[#30D158] animate-pulse" />
                    )}
                  </button>
                ))}
              </div>

            </div>
          </div>
        </div>
      </nav>

      {/* ===== MAIN ===== */}
      <main className="relative max-w-5xl mx-auto px-4 py-8 z-10">

        {/* ── Upload Page ── */}
        {activeTab === "upload" && (
          <div className="space-y-8 animate-fade-in">
            {/* Hero */}
            {!sellerFile && !newfiTemplate && (
              <div className="text-center pt-8 pb-4">
                <h1 className="font-display text-[42px] font-bold tracking-tight mb-3 leading-tight">
                  <span className="gradient-text-animated">Guideline</span>{" "}
                  <span className="text-[rgba(255,255,255,0.9)]">Comparator</span>
                </h1>
                <p className="text-[16px] text-[rgba(255,255,255,0.5)] max-w-lg mx-auto leading-relaxed">
                  Upload a seller guide PDF and Newfi&apos;s Excel template. The app finds matching text in the seller guide for each row and assigns a verdict.
                </p>
              </div>
            )}

            {/* Upload cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <DocumentUploadCard
                mode="pdf"
                label="Seller Guide"
                sublabel="Upload seller guideline PDF"
                color="#0A84FF"
                secondaryColor="#5E5CE6"
                fileName={sellerFile?.name}
                fileSize={sellerFile?.size}
                isReady={sellerReady}
                isLoading={sellerLoading}
                progress={sellerProgress}
                loadingLabel="Extracting PDF text..."
                readyLabel={`PDF ready · ${sellerName.replace(/\.[^/.]+$/, "")}`}
                onFileSelect={loadSellerPDF}
                onClear={clearSeller}
              />
              <DocumentUploadCard
                mode="excel"
                label="Newfi Template"
                sublabel="Upload Newfi's comparison .xlsx"
                color="#30D158"
                secondaryColor="#34C759"
                fileName={newfiTemplate?.fileName}
                fileSize={undefined}
                isReady={!!newfiTemplate}
                isLoading={templateLoading}
                progress={templateLoading ? 50 : 0}
                loadingLabel="Reading template..."
                readyLabel={`${(newfiTemplate?.nonQmRows.length ?? 0) + (newfiTemplate?.dscrRows.length ?? 0)} rows loaded`}
                onFileSelect={loadNewfiTemplate}
                onClear={clearTemplate}
              />
            </div>

            {/* Run comparison */}
            <div className="flex flex-col items-center gap-4 pt-2">
              {comparisonError && (
              <div className="w-full max-w-xl mx-auto px-4 py-3 rounded-[12px] bg-[rgba(255,69,58,0.12)] border border-[rgba(255,69,58,0.3)] text-[#FF453A] text-[13px] text-center">
                {comparisonError}
              </div>
            )}

            <button
                onClick={async () => {
                  const ok = await runComparison();
                  if (ok) setActiveTab("results");
                }}
                disabled={!canCompare}
                className={`group px-12 py-4 rounded-[16px] text-white font-display font-semibold text-[16px] transition-all flex items-center gap-3 ${
                  canCompare
                    ? "bg-gradient-to-b from-[#0A84FF] to-[#0066CC] hover:scale-[1.02] hover:shadow-[0_8px_32px_rgba(10,132,255,0.4)] active:scale-[0.98]"
                    : "bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.3)] cursor-not-allowed"
                }`}
              >
                {isComparing ? (
                  <>
                    <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Comparing... {comparisonProgress}%
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 group-hover:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                    </svg>
                    Run Comparison
                  </>
                )}
              </button>

              {isComparing && (
                <div className="w-80 progress-container h-2 rounded-full">
                  <div className="progress-bar rounded-full" style={{ width: `${comparisonProgress}%` }} />
                </div>
              )}

              {!canCompare && !isComparing && (
                <p className="text-[13px] text-[rgba(255,255,255,0.35)]">
                  {!sellerReady && !newfiTemplate
                    ? "Upload both files to continue"
                    : !sellerReady
                    ? "Waiting for PDF to finish loading..."
                    : "Waiting for Newfi template..."}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Results Page ── */}
        {activeTab === "results" && (
          <div className="space-y-6 animate-fade-in">
            {!hasResults ? (
              <div className="text-center py-20">
                <div className="w-24 h-24 mx-auto mb-6 rounded-2xl liquid-glass flex items-center justify-center animate-float">
                  <svg className="w-12 h-12 text-[rgba(255,255,255,0.25)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                  </svg>
                </div>
                <h2 className="font-display text-[22px] font-semibold text-white mb-3">No Results Yet</h2>
                <p className="text-[15px] text-[rgba(255,255,255,0.45)] max-w-md mx-auto">Upload files and run the comparison on the Upload tab.</p>
                <button onClick={() => setActiveTab("upload")} className="mt-6 px-6 py-3 rounded-[12px] bg-[#0A84FF] text-white font-display font-medium text-[14px] hover:opacity-90 transition-all">
                  Go to Upload
                </button>
              </div>
            ) : (
              <>
                {/* Summary cards */}
                <SummaryBar nonQmResult={nonQmResult} dscrResult={dscrResult} />

                {/* Tab switcher */}
                <div className="flex items-center gap-2">
                  {(["NON-QM", "DSCR"] as const).map((t) => {
                    const result = t === "NON-QM" ? nonQmResult : dscrResult;
                    return (
                      <button
                        key={t}
                        onClick={() => setResultTab(t)}
                        className={`px-5 py-2 rounded-[10px] text-[13px] font-medium transition-all ${
                          resultTab === t
                            ? "bg-[rgba(255,255,255,0.12)] text-white"
                            : "text-[rgba(255,255,255,0.5)] liquid-glass-card hover:text-white"
                        }`}
                      >
                        {t} {result ? `(${result.totalRows})` : ""}
                      </button>
                    );
                  })}

                  <div className="ml-auto flex gap-2">
                    <button
                      onClick={() => exportFilledTemplate(resultTab)}
                      className="flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[#30D158] text-white text-[13px] font-medium hover:opacity-90 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Export {resultTab}
                    </button>
                    <button
                      onClick={() => exportFilledTemplate("BOTH")}
                      className="flex items-center gap-2 px-4 py-2 rounded-[10px] liquid-glass-card text-[rgba(255,255,255,0.7)] text-[13px] font-medium hover:text-white transition-all"
                    >
                      Export All
                    </button>
                  </div>
                </div>

                {/* Results table */}
                {resultTab === "NON-QM" && nonQmResult && (
                  <ResultsTable result={nonQmResult} />
                )}
                {resultTab === "DSCR" && dscrResult && (
                  <ResultsTable result={dscrResult} />
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/* ── Summary Bar ── */
function SummaryBar({
  nonQmResult,
  dscrResult,
}: {
  nonQmResult: TemplateComparisonResult | null;
  dscrResult: TemplateComparisonResult | null;
}) {
  const aligned = (nonQmResult?.alignedCount ?? 0) + (dscrResult?.alignedCount ?? 0);
  const permissive = (nonQmResult?.morePermissiveCount ?? 0) + (dscrResult?.morePermissiveCount ?? 0);
  const restrictive = (nonQmResult?.moreRestrictiveCount ?? 0) + (dscrResult?.moreRestrictiveCount ?? 0);
  const silent = (nonQmResult?.silentCount ?? 0) + (dscrResult?.silentCount ?? 0);
  const conflict = (nonQmResult?.conflictCount ?? 0) + (dscrResult?.conflictCount ?? 0);

  const cards = [
    { label: "Aligned", value: aligned, color: "#30D158" },
    { label: "More Permissive", value: permissive, color: "#FF9F0A" },
    { label: "More Restrictive", value: restrictive, color: "#64D2FF" },
    { label: "Silent / Gap", value: silent, color: "#FF453A" },
    { label: "Conflict", value: conflict, color: "#BF5AF2" },
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="liquid-glass-card p-4 rounded-[14px] text-center">
          <p className="text-[28px] font-display font-bold font-mono" style={{ color: c.color }}>{c.value}</p>
          <p className="text-[11px] text-[rgba(255,255,255,0.45)] font-display uppercase tracking-wider mt-1">{c.label}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Results Table ── */
const VERDICT_CONFIG: Record<TemplateVerdict, { bg: string; text: string; label: string }> = {
  "ALIGNED":                { bg: "rgba(48,209,88,0.12)",  text: "#30D158", label: "Aligned" },
  "MORE RESTRICTIVE":       { bg: "rgba(100,210,255,0.12)", text: "#64D2FF", label: "More Restrictive" },
  "MORE PERMISSIVE":        { bg: "rgba(255,159,10,0.12)", text: "#FF9F0A", label: "More Permissive" },
  "SILENT / NOT ADDRESSED": { bg: "rgba(255,69,58,0.12)",  text: "#FF453A", label: "Silent / Gap" },
  "CONFLICT":               { bg: "rgba(191,90,242,0.12)", text: "#BF5AF2", label: "Conflict" },
};

function ResultsTable({ result }: { result: TemplateComparisonResult }) {
  const [filter, setFilter] = useState<TemplateVerdict | "ALL">("ALL");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const filters: Array<TemplateVerdict | "ALL"> = [
    "ALL", "ALIGNED", "MORE PERMISSIVE", "MORE RESTRICTIVE", "SILENT / NOT ADDRESSED", "CONFLICT",
  ];

  const filtered = filter === "ALL" ? result.rows : result.rows.filter((r) => r.verdict === filter);

  return (
    <div className="liquid-glass-strong overflow-hidden rounded-[16px]">
      {/* Filter bar */}
      <div className="p-4 border-b border-[rgba(255,255,255,0.06)] flex flex-wrap gap-2">
        {filters.map((f) => {
          const count = f === "ALL" ? result.rows.length : result.rows.filter((r) => r.verdict === f).length;
          const cfg = f === "ALL" ? null : VERDICT_CONFIG[f];
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-all ${
                filter === f
                  ? "text-white shadow-md"
                  : "text-[rgba(255,255,255,0.5)] liquid-glass-card hover:text-white"
              }`}
              style={filter === f && cfg ? { background: cfg.text } : filter === f ? { background: "#0A84FF" } : {}}
            >
              {f === "ALL" ? "All" : cfg?.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Rows */}
      <div className="divide-y divide-[rgba(255,255,255,0.04)] max-h-[620px] overflow-y-auto">
        {filtered.map((row) => (
          <ResultRow
            key={row.rowNum}
            row={row}
            expanded={expandedRow === row.rowNum}
            onToggle={() => setExpandedRow(expandedRow === row.rowNum ? null : row.rowNum)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="py-10 text-center text-[rgba(255,255,255,0.35)] text-[14px]">No rows match this filter.</div>
        )}
      </div>
    </div>
  );
}

function ResultRow({
  row,
  expanded,
  onToggle,
}: {
  row: ComparisonRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const cfg = VERDICT_CONFIG[row.verdict];

  return (
    <div
      className="p-4 hover:bg-[rgba(255,255,255,0.02)] cursor-pointer transition-colors"
      onClick={onToggle}
    >
      <div className="flex gap-3 items-start">
        {/* Verdict badge */}
        <div
          className="shrink-0 mt-0.5 px-2.5 py-1 rounded-[7px] text-[11px] font-semibold text-center whitespace-nowrap"
          style={{ background: cfg.bg, color: cfg.text }}
        >
          {cfg.label}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] text-[rgba(255,255,255,0.35)] uppercase tracking-wider font-display">{row.category}</span>
            {row.creditConcern && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{
                  background: row.creditConcern === "HIGH" ? "rgba(255,59,48,0.2)" : row.creditConcern === "MEDIUM" ? "rgba(255,159,10,0.2)" : "rgba(48,209,88,0.2)",
                  color: row.creditConcern === "HIGH" ? "#FF453A" : row.creditConcern === "MEDIUM" ? "#FF9F0A" : "#30D158",
                }}
              >
                {row.creditConcern}
              </span>
            )}
          </div>
          <p className="text-[14px] text-white font-medium mb-1">{row.topic}</p>
          <p className="text-[13px] text-[rgba(255,255,255,0.55)] line-clamp-2">{row.analysis}</p>

          {expanded && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in">
              <div className="p-3 rounded-[10px] liquid-glass">
                <p className="text-[11px] text-[rgba(255,255,255,0.4)] mb-1.5 font-display uppercase tracking-wider">Newfi</p>
                <p className="text-[13px] text-[rgba(255,255,255,0.75)] leading-relaxed">{row.newfiText}</p>
              </div>
              <div className="p-3 rounded-[10px] liquid-glass">
                <p className="text-[11px] text-[rgba(255,255,255,0.4)] mb-1.5 font-display uppercase tracking-wider">
                  Seller {row.pageRef !== "N/A" ? `· ${row.pageRef}` : ""}
                </p>
                <p className="text-[13px] text-[rgba(255,255,255,0.75)] leading-relaxed">{row.sellerText}</p>
              </div>
            </div>
          )}
        </div>

        {/* Expand toggle */}
        <svg
          className={`w-5 h-5 text-[rgba(255,255,255,0.3)] transition-transform duration-300 shrink-0 mt-0.5 ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
