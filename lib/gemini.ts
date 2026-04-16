import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  ExtractedGuideline,
  ExtractionResult,
} from "./types";

// Initialize Gemini client
function getGeminiClient() {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_GEMINI_API_KEY is not set in environment variables");
  }
  return new GoogleGenerativeAI(apiKey);
}

// Retry with exponential backoff for rate limits
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 2000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error as Error;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check if it's a rate limit error (429)
      if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('rate')) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`Rate limited. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // If it's not a rate limit error, throw immediately
      throw error;
    }
  }

  throw lastError;
}

// Convert File to base64
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix to get pure base64
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Extract guidelines from PDF using Gemini
export async function extractGuidelinesFromPDF(
  file: File,
  documentType: "A" | "B"
): Promise<ExtractionResult> {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const base64Data = await fileToBase64(file);

    const extractionPrompt = `You are a mortgage guideline extraction expert. Extract ALL guidelines, rules, requirements, restrictions, and policies from this document. Organize them by category (e.g. Credit Requirements, LTV, Income, Property, Loan Limits, Seasoning Requirements, etc.). Return as a structured JSON array where each item has: { id, category, guideline, page_reference (if visible), severity (critical/standard/informational) }

IMPORTANT: Return ONLY valid JSON, no markdown code blocks, no explanation. The response must be a valid JSON array.`;

    const result = await retryWithBackoff(async () => {
      return await model.generateContent([
        {
          inlineData: {
            mimeType: "application/pdf",
            data: base64Data,
          },
        },
        { text: extractionPrompt },
      ]);
    });

    const response = result.response;
    const text = response.text();

    // Parse the JSON response
    let guidelines: ExtractedGuideline[] = [];
    try {
      // Handle potential markdown code blocks
      let jsonStr = text.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      const parsed = JSON.parse(jsonStr);

      if (Array.isArray(parsed)) {
        guidelines = parsed.map((item, index) => ({
          id: item.id || `guideline-${documentType}-${index + 1}`,
          category: item.category || "Uncategorized",
          guideline: item.guideline || item.text || "",
          page_reference: item.page_reference || item.pageReference || undefined,
          severity: ["critical", "standard", "informational"].includes(item.severity)
            ? item.severity
            : "standard",
          sourceDocument: documentType,
        }));
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", parseError);
      console.error("Raw response:", text);

      // Return a fallback with the raw text as a single guideline
      guidelines = [{
        id: `guideline-${documentType}-1`,
        category: "Raw Extraction",
        guideline: text.slice(0, 500) + (text.length > 500 ? "..." : ""),
        severity: "standard",
        sourceDocument: documentType,
      }];
    }

    return {
      success: true,
      guidelines,
      fileName: file.name,
      pageCount: Math.ceil(file.size / 50000), // Rough estimate
      fileSize: file.size,
      extractedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("PDF extraction failed:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    // Check for quota errors
    if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
      return {
        success: false,
        guidelines: [],
        fileName: file.name,
        pageCount: 0,
        fileSize: file.size,
        extractedAt: new Date().toISOString(),
        error: "API quota exceeded. Please wait a minute and try again, or use a different Gemini API key. Get a free key at: https://aistudio.google.com/apikey",
      };
    }

    return {
      success: false,
      guidelines: [],
      fileName: file.name,
      pageCount: 0,
      fileSize: file.size,
      extractedAt: new Date().toISOString(),
      error: errorMessage,
    };
  }
}

