"use client";

import { useState, useRef, type DragEvent, type ChangeEvent } from "react";

type DocumentUploadCardProps = {
  mode: "pdf" | "excel";
  label: string;
  sublabel: string;
  color: string;
  secondaryColor: string;
  fileName?: string;
  fileSize?: number;
  isReady: boolean;
  isLoading: boolean;
  progress: number;
  loadingLabel: string;
  readyLabel: string;
  onFileSelect: (file: File) => void;
  onClear: () => void;
};

export function DocumentUploadCard({
  mode,
  label,
  sublabel,
  color,
  secondaryColor,
  fileName,
  fileSize,
  isReady,
  isLoading,
  progress,
  loadingLabel,
  readyLabel,
  onFileSelect,
  onClear,
}: DocumentUploadCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = mode === "pdf"
    ? ".pdf,application/pdf"
    : ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  const fileHint = mode === "pdf" ? "PDF files only" : "Excel (.xlsx) only";

  function isValidFile(file: File) {
    if (mode === "pdf") return file.type === "application/pdf" || file.name.endsWith(".pdf");
    return file.name.endsWith(".xlsx") ||
      file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!isLoading) setIsDragOver(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    if (isLoading) return;
    const file = e.dataTransfer.files[0];
    if (file && isValidFile(file)) onFileSelect(file);
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && isValidFile(file)) onFileSelect(file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  }

  function handleClick() {
    if (!isLoading && !isReady) inputRef.current?.click();
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const uploaded = !!fileName;

  return (
    <div
      className={`relative overflow-hidden rounded-[16px] transition-all duration-300 ${
        isDragOver
          ? "scale-[1.02] ring-2 ring-[#0A84FF]/50 shadow-[0_0_40px_rgba(10,132,255,0.2)]"
          : "card-lift"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Gradient border on hover */}
      <div
        className="absolute inset-0 rounded-[16px] p-[1px] transition-opacity duration-300"
        style={{
          opacity: isHovered || isDragOver ? 1 : 0,
          background: `linear-gradient(135deg, ${color}80, ${secondaryColor}40, transparent)`,
        }}
      >
        <div className="w-full h-full rounded-[15px] bg-[#1c1c1e]" />
      </div>

      <div
        className="relative liquid-glass-card"
        style={{
          background: isDragOver
            ? `linear-gradient(135deg, rgba(10,132,255,0.08), rgba(30,30,32,0.8))`
            : undefined,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          disabled={isLoading}
          className="hidden"
        />

        <div className={`p-6 ${isLoading ? "opacity-80" : !isReady ? "cursor-pointer" : ""}`}>
          {/* Header */}
          <div className="flex items-center gap-4 mb-5">
            <div
              className="w-12 h-12 rounded-[14px] flex items-center justify-center text-[15px] font-bold text-white shadow-lg transition-transform duration-300"
              style={{
                background: `linear-gradient(135deg, ${color} 0%, ${secondaryColor} 100%)`,
                transform: isHovered ? "scale(1.05)" : "scale(1)",
              }}
            >
              {mode === "pdf" ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.25A2.25 2.25 0 003 5.25v13.5A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V5.25a2.25 2.25 0 00-2.25-2.25H10.5z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75.125V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75-.125V5.625m0 0v12.75M3.375 4.5c-.621 0-1.125.504-1.125 1.125v13.5c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H3.375z" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-display font-semibold text-[16px] text-slate-900 dark:text-white">{label}</h3>
              <p className="text-[13px] text-[rgba(255,255,255,0.45)]">{sublabel}</p>
            </div>
            {/* Status dot */}
            <div
              className="w-3 h-3 rounded-full transition-all duration-300"
              style={{
                background: isReady ? "#30D158" : uploaded ? "#FF9F0A" : "rgba(255,255,255,0.2)",
                boxShadow: isReady ? "0 0 12px #30D158" : "none",
              }}
            />
          </div>

          {!uploaded ? (
            <div className="text-center py-10">
              <div
                className="w-20 h-20 mx-auto mb-5 rounded-2xl liquid-glass flex items-center justify-center transition-all duration-300"
                style={{
                  transform: isHovered ? "scale(1.1) translateY(-4px)" : "scale(1)",
                  boxShadow: isHovered ? `0 20px 40px ${color}20` : "none",
                }}
              >
                <svg className="w-10 h-10 text-[rgba(255,255,255,0.4)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <p className="text-[17px] font-display text-white mb-2 font-medium">Drop file here</p>
              <p className="text-[14px] text-[rgba(255,255,255,0.4)]">or click to browse</p>
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(255,255,255,0.05)]">
                <svg className="w-4 h-4 text-[rgba(255,255,255,0.4)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.25A2.25 2.25 0 003 5.25v13.5A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V5.25a2.25 2.25 0 00-2.25-2.25H10.5z" />
                </svg>
                <span className="text-[12px] text-[rgba(255,255,255,0.4)]">{fileHint}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* File info */}
              <div className="flex items-center gap-4 p-4 rounded-[14px] liquid-glass">
                <div
                  className="w-14 h-14 rounded-[12px] liquid-glass flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${color}15 0%, ${secondaryColor}10 100%)` }}
                >
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.25A2.25 2.25 0 003 5.25v13.5A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V5.25a2.25 2.25 0 00-2.25-2.25H10.5z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-medium text-[15px] text-white truncate">{fileName}</p>
                  {fileSize && (
                    <p className="text-[13px] text-[rgba(255,255,255,0.45)] font-mono">{formatFileSize(fileSize)}</p>
                  )}
                </div>
                {!isLoading && !isReady && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onClear(); }}
                    className="p-2.5 rounded-[10px] hover:bg-[rgba(255,255,255,0.1)] transition-all hover:rotate-90"
                  >
                    <svg className="w-5 h-5 text-[rgba(255,255,255,0.45)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Progress */}
              {isLoading && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full border-2 border-[#0A84FF] border-t-transparent animate-spin" />
                      <span className="text-[14px] text-[rgba(255,255,255,0.7)] font-display">{loadingLabel}</span>
                    </div>
                    {progress > 0 && progress < 100 && (
                      <span className="text-[15px] text-white font-medium font-mono">{progress}%</span>
                    )}
                  </div>
                  <div className="progress-container h-2 rounded-full">
                    <div className="progress-bar rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {/* Ready */}
              {isReady && (
                <div
                  className="flex items-center gap-3 px-5 py-3.5 rounded-[14px] animate-fade-in"
                  style={{ background: "rgba(48,209,88,0.1)", border: "1px solid rgba(48,209,88,0.25)" }}
                >
                  <div className="w-8 h-8 rounded-full bg-[#30D158] flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[15px] text-[#30D158] font-display font-medium">{readyLabel}</span>
                    <p className="text-[12px] text-[rgba(48,209,88,0.7)]">Ready for comparison</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
