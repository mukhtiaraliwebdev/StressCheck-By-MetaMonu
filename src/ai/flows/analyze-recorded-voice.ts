// The analyze-recorded-voice.ts file implements a Genkit flow to analyze
// recorded voice data for stress levels.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeRecordedVoiceInputSchema = z.object({
  voiceRecordingDataUri: z
    .string()
    .describe(
      "A voice recording, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeRecordedVoiceInput = z.infer<typeof AnalyzeRecordedVoiceInputSchema>;

const AnalyzeRecordedVoiceOutputSchema = z.object({
  stressLevel: z
    .number()
    .describe('The detected stress level, on a scale of 0 to 100.'),
  analysisDetails: z
    .string()
    .describe('Detailed analysis of the voice recording related to stress.'),
});
export type AnalyzeRecordedVoiceOutput = z.infer<typeof AnalyzeRecordedVoiceOutputSchema>;

export async function analyzeRecordedVoice(
  input: AnalyzeRecordedVoiceInput
): Promise<AnalyzeRecordedVoiceOutput> {
  return analyzeRecordedVoiceFlow(input);
}

const analyzeRecordedVoicePrompt = ai.definePrompt({
  name: 'analyzeRecordedVoicePrompt',
  input: {schema: AnalyzeRecordedVoiceInputSchema},
  output: {schema: AnalyzeRecordedVoiceOutputSchema},
  prompt: `You are an expert in analyzing voice recordings to detect stress levels.\n\nAnalyze the provided voice recording and determine the stress level on a scale of 0 to 100, where 0 indicates no stress and 100 indicates maximum stress.\nAlso, provide a detailed analysis of the voice recording, explaining the factors that contribute to the detected stress level.\n\nVoice Recording: {{media url=voiceRecordingDataUri}}`,
});

const analyzeRecordedVoiceFlow = ai.defineFlow(
  {
    name: 'analyzeRecordedVoiceFlow',
    inputSchema: AnalyzeRecordedVoiceInputSchema,
    outputSchema: AnalyzeRecordedVoiceOutputSchema,
  },
  async input => {
    const {output} = await analyzeRecordedVoicePrompt(input);
    return output!;
  }
);
