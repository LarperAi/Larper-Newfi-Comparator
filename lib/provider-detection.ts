export type AIProvider = "ollama" | "gemini" | "none";

export type ProviderStatus = {
  provider: AIProvider;
  ollamaAvailable: boolean;
  geminiAvailable: boolean;
  ollamaModel: string | null;
};

const OLLAMA_URL = "http://localhost:11434";
const OLLAMA_PROBE_TIMEOUT = 2000;

let cachedStatus: ProviderStatus | null = null;

/** Get the Gemini API key — localStorage override takes priority over build-time env var */
export function getGeminiApiKey(): string | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("gemini_api_key");
  if (stored) return stored;
  return process.env.NEXT_PUBLIC_GEMINI_API_KEY || null;
}

/** Set or clear the runtime Gemini API key (persists in localStorage) */
export function setGeminiApiKey(key: string | null): void {
  if (key) {
    localStorage.setItem("gemini_api_key", key);
  } else {
    localStorage.removeItem("gemini_api_key");
  }
  // Invalidate cache so next detectProviders() re-checks
  cachedStatus = null;
}

/** Probe which AI providers are available right now */
export async function detectProviders(force = false): Promise<ProviderStatus> {
  if (cachedStatus && !force) return cachedStatus;

  const [ollamaAvailable, ollamaModel] = await probeOllama();
  const geminiAvailable = !!getGeminiApiKey();

  let provider: AIProvider = "none";
  if (ollamaAvailable) provider = "ollama";
  else if (geminiAvailable) provider = "gemini";

  cachedStatus = { provider, ollamaAvailable, geminiAvailable, ollamaModel };
  return cachedStatus;
}

async function probeOllama(): Promise<[boolean, string | null]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OLLAMA_PROBE_TIMEOUT);
    const resp = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) return [false, null];
    const data = await resp.json();
    const model = data.models?.[0]?.name || null;
    return [true, model];
  } catch {
    return [false, null];
  }
}