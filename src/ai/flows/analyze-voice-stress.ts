'use server';

/**
 * @fileOverview Analyzes stress level from voice data.
 *
 * - analyzeVoiceStress - Analyzes the stress level in a voice recording.
 * - AnalyzeVoiceStressInput - The input type for the analyzeVoiceStress function.
 * - AnalyzeVoiceStressOutput - The return type for the analyzeVoiceStress function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeVoiceStressInputSchema = z.object({
  voiceDataUri: z
    .string()
    .describe(
      'A voice recording as a data URI that must include a MIME type and use Base64 encoding. Expected format: data:<mimetype>;base64,<encoded_data>.'
    ),
});
export type AnalyzeVoiceStressInput = z.infer<typeof AnalyzeVoiceStressInputSchema>;

const AnalyzeVoiceStressOutputSchema = z.object({
  stressLevel: z
    .number()
    .describe(
      'The stress level detected in the voice recording, on a scale from 0 (no stress) to 100 (maximum stress).'
    ),
  stressDescription: z
    .string()
    .describe('A short description of the detected stress level.'),
});
export type AnalyzeVoiceStressOutput = z.infer<typeof AnalyzeVoiceStressOutputSchema>;

export async function analyzeVoiceStress(input: AnalyzeVoiceStressInput): Promise<AnalyzeVoiceStressOutput> {
  return analyzeVoiceStressFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeVoiceStressPrompt',
  input: {schema: AnalyzeVoiceStressInputSchema},
  output: {schema: AnalyzeVoiceStressOutputSchema},
  prompt: `You are a stress analysis expert. You will analyze the provided voice recording and determine the stress level of the speaker.

Analyze the following voice recording:
{{media url=voiceDataUri}}

Provide a stress level on a scale of 0 to 100, where 0 indicates no stress and 100 indicates maximum stress. Also, provide a short description of the detected stress level.

Ensure that the stressLevel is a number between 0 and 100, and stressDescription is a string.
`, config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
    ],
  },
});

const analyzeVoiceStressFlow = ai.defineFlow(
  {
    name: 'analyzeVoiceStressFlow',
    inputSchema: AnalyzeVoiceStressInputSchema,
    outputSchema: AnalyzeVoiceStressOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
