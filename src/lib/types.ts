export interface StressAnalysisResult {
  stressLevel: number; // 0-100
  analysisDetails: string;
  timestamp: Date;
}

export interface CallReport {
  id: string;
  contactName?: string;
  contactNumber: string;
  callDuration: string; // e.g., "5m 32s"
  stressAnalysis?: StressAnalysisResult;
  timestamp: Date;
}
