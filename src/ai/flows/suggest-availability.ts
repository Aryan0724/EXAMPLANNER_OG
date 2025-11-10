// src/ai/flows/suggest-availability.ts
'use server';
/**
 * @fileOverview A flow to suggest suitable classrooms or invigilators based on historical availability patterns.
 *
 * - suggestAvailability - A function that suggests classrooms or invigilators.
 * - SuggestAvailabilityInput - The input type for the suggestAvailability function.
 * - SuggestAvailabilityOutput - The return type for the suggestAvailability function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestAvailabilityInputSchema = z.object({
  resourceType: z.enum(['classroom', 'invigilator']).describe('The type of resource to suggest availability for.'),
  dateTime: z.string().describe('The date and time for which availability is needed (ISO 8601 format).'),
  durationMinutes: z.number().describe('The duration in minutes for which the resource is needed.'),
  historicalData: z.string().describe('Historical data about resource availability.').optional(),
});
export type SuggestAvailabilityInput = z.infer<typeof SuggestAvailabilityInputSchema>;

const SuggestAvailabilityOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('A list of suggested resource IDs (classroom or invigilator IDs).'),
  reasoning: z.string().describe('The AI reasoning behind the suggestions.'),
});
export type SuggestAvailabilityOutput = z.infer<typeof SuggestAvailabilityOutputSchema>;

export async function suggestAvailability(input: SuggestAvailabilityInput): Promise<SuggestAvailabilityOutput> {
  return suggestAvailabilityFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestAvailabilityPrompt',
  input: {schema: SuggestAvailabilityInputSchema},
  output: {schema: SuggestAvailabilityOutputSchema},
  prompt: `You are an AI assistant that suggests available resources (classrooms or invigilators) for exams based on historical data and provided constraints.

Given the following information, suggest a list of available resources and the reasoning behind your suggestions.

Resource Type: {{{resourceType}}}
Date and Time: {{{dateTime}}}
Duration (minutes): {{{durationMinutes}}}

{{#if historicalData}}
Historical Data:
{{historicalData}}
{{else}}
No historical data provided.
{{/if}}

Format your response as a JSON object with 'suggestions' (array of resource IDs) and 'reasoning' fields.
`,
});

const suggestAvailabilityFlow = ai.defineFlow(
  {
    name: 'suggestAvailabilityFlow',
    inputSchema: SuggestAvailabilityInputSchema,
    outputSchema: SuggestAvailabilityOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
