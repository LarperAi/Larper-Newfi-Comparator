"use client";

import { useState, useEffect } from "react";
import { detectProviders, setGeminiApiKey, type ProviderStatus } from "@/lib/provider-detection";

export function ProviderSettings({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      detectProviders(true).then(setStatus);
      const existing = localStorage.getItem("gemini_api_key") || "";
      setKeyInput(existing);
      setSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    setGeminiApiKey(keyInput.trim() || null);
    setSaved(true);
    detectProviders(true).then(setStatus);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md liquid-glass-strong p-6 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-semibold text-[17px] text-white">AI Provider Settings</h3>
          <button onClick={onClose} className="p-1.5 rounded-[8px] hover:bg-[rgba(255,255,255,0.08)] transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Provider Status */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between p-3 rounded-[10px] liquid-glass-card">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${status?.ollamaAvailable ? "bg-[#30D158]" : "bg-[#FF453A]"}`} />
              <span className="text-[14px] text-white font-medium">Ollama</span>
            </div>
            <span className="text-[12px] text-slate-500 dark:text-[rgba(255,255,255,0.5)]">
              {status?.ollamaAvailable
                ? `Connected (${status.ollamaModel || "model available"})`
                : "Not running"}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-[10px] liquid-glass-card">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${status?.geminiAvailable ? "bg-[#0A84FF]" : "bg-[#FF453A]"}`} />
              <span className="text-[14px] text-white font-medium">Gemini</span>
            </div>
            <span className="text-[12px] text-slate-500 dark:text-[rgba(255,255,255,0.5)]">
              {status?.geminiAvailable ? "Key set" : "No API key"}
            </span>
          </div>
        </div>

        {/* Gemini API Key Input */}
        <div className="mb-5">
          <label className="block text-[13px] font-medium text-slate-300 dark:text-[rgba(255,255,255,0.7)] mb-2">
            Gemini API Key
          </label>
          <input
            type="password"
            value={keyInput}
            onChange={(e) => { setKeyInput(e.target.value); setSaved(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            placeholder="AIzaSy..."
            className="w-full px-3.5 py-2.5 rounded-[10px] glass text-white text-[14px] placeholder-[rgba(255,255,255,0.3)] focus:outline-none focus:ring-2 focus:ring-[#0A84FF]/40"
          />
          <p className="mt-2 text-[11px] text-slate-500 dark:text-[rgba(255,255,255,0.4)]">
            Get a free key at{" "}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-[#0A84FF] hover:underline">
              aistudio.google.com/apikey
            </a>
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-[9px] bg-[#0A84FF] text-white text-[13px] font-medium hover:bg-[#0070E0] transition-colors"
            >
              Save Key
            </button>
            {saved && (
              <span className="text-[12px] text-[#30D158]">Saved</span>
            )}
          </div>
        </div>

        {/* Ollama Instructions */}
        <div className="p-3 rounded-[10px] bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.06)]">
          <p className="text-[12px] text-slate-500 dark:text-[rgba(255,255,255,0.5)] leading-relaxed">
            <span className="text-white font-medium">Ollama setup:</span> Install from{" "}
            <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="text-[#0A84FF] hover:underline">ollama.ai</a>
            , then run <code className="px-1 py-0.5 rounded bg-[rgba(255,255,255,0.08)] text-[#64D2FF] text-[11px] font-mono">ollama serve</code> and{" "}
            <code className="px-1 py-0.5 rounded bg-[rgba(255,255,255,0.08)] text-[#64D2FF] text-[11px] font-mono">ollama pull llama3.1</code>
          </p>
        </div>
      </div>
    </div>
  );
}