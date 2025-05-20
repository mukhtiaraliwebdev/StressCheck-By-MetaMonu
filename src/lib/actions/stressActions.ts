
"use server";

import { analyzeRecordedVoice, type AnalyzeRecordedVoiceInput, type AnalyzeRecordedVoiceOutput } from "@/ai/flows/analyze-recorded-voice";
import type { StressAnalysisResult } from "@/lib/types";

export async function performStressAnalysis(
  base64Data: string,
  mimeType: string
): Promise<StressAnalysisResult | { error: string }> {
  if (!base64Data || !mimeType) {
    return { error: "Base64 audio data and MIME type are required." };
  }

  const reconstructedDataUri = `data:${mimeType};base64,${base64Data}`;

  try {
    const input: AnalyzeRecordedVoiceInput = {
      voiceRecordingDataUri: reconstructedDataUri,
    };
    const result: AnalyzeRecordedVoiceOutput = await analyzeRecordedVoice(input);
    
    return {
      stressLevel: result.stressLevel,
      analysisDetails: result.analysisDetails,
      timestamp: new Date(),
    };
  } catch (e) {
    console.error("Error analyzing voice stress:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during stress analysis.";
    return { error: `AI analysis failed: ${errorMessage}` };
  }
}
