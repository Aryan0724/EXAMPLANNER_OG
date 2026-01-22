
'use server';
/**
 * @fileOverview A flow to verify a generated exam allotment plan using an AI model.
 *
 * - verifyAllotmentPlan - A function that sends the plan to an AI for verification.
 * - VerifyAllotmentInput - The input type for the verification function.
 * - VerifyAllotmentOutput - The return type for the verification function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SEATING_RULES = `
1. CLASSROOM EFFICIENCY: Classrooms must be filled as much as possible. Do not leave large numbers of empty seats in one room while another room with the same exam session is also being used.
2. BENCH SEATING PATTERN: The fundamental rule is to prevent cheating by separating students from the same course. Each bench MUST follow an 'A | B' pattern, where the student on the left (Course A) and the student on the right (Course B) are from DIFFERENT courses.
3. PROHIBITED PATTERN: Under no circumstances should students from the same course be seated on the same bench (e.g., 'A | A' is strictly forbidden).
4. COLUMN-WISE ROLL NUMBERS: For a given course, students must be seated in roll-number order down a column. For example, the left-side seats of a column are all from Course A, sorted by roll number.
5. DEPARTMENT SEPARATION: The two courses (Course A and Course B) chosen to be seated together in a room should ideally be from different departments to maximize separation.
`;

const VerifyAllotmentInputSchema = z.object({
  allotmentPlan: z.string().describe('A JSON string representing a simplified allotment plan for a single exam session. This JSON contains an array of rooms, each with a layout and a list of assigned seats (seat number, roll number, and subject code).'),
});
export type VerifyAllotmentInput = z.infer<typeof VerifyAllotmentInputSchema>;

const VerifyAllotmentOutputSchema = z.object({
  isVerified: z.boolean().describe('Whether the plan is verified and adheres to all rules.'),
  reasoning: z.string().describe('A detailed explanation of why the plan was or was not verified. If not verified, it should include specific examples of what is wrong and suggestions for improvement.'),
});
export type VerifyAllotmentOutput = z.infer<typeof VerifyAllotmentOutputSchema>;

export async function verifyAllotmentPlan(input: VerifyAllotmentInput): Promise<VerifyAllotmentOutput> {
  return verifyAllotmentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'verifyAllotmentPrompt',
  input: {schema: VerifyAllotmentInputSchema},
  output: {schema: VerifyAllotmentOutputSchema},
  prompt: `You are an expert university exam coordinator responsible for verifying seating arrangements. Your primary goal is to ensure the plan is efficient, fair, and cheat-proof.

You will be given a generated allotment plan in a simplified JSON format and a set of strict rules.

Your task is to analyze the provided JSON plan against the rules. Determine if the plan is valid. You MUST provide a clear "isVerified" status (true or false) and a detailed "reasoning".

RULES:
${SEATING_RULES}

ALLOTMENT PLAN (Simplified JSON for one session):
\`\`\`json
{{{allotmentPlan}}}
\`\`\`

Analyze the plan and respond with your verification result.
If the plan fails verification, you MUST point out specific examples from the JSON data. For example, if two students from the same course are on the same bench, mention their roll numbers, subjects, and the classroom. If a room is inefficiently filled, mention the room and how many seats are wasted.
`,
});

const verifyAllotmentFlow = ai.defineFlow(
  {
    name: 'verifyAllotmentFlow',
    inputSchema: VerifyAllotmentInputSchema,
    outputSchema: VerifyAllotmentOutputSchema,
    retries: 3,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
