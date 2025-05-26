
'use server';
/**
 * @fileOverview AI flow to suggest expense categories.
 *
 * - suggestCategory - A function that suggests a category for an expense.
 * - SuggestCategoryInput - The input type for the suggestCategory function.
 * - SuggestCategoryOutput - The return type for the suggestCategory function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { Category } from '@/lib/types'; // Assuming Category type is defined here

// Define the schema for the list of categories passed to the flow
const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  parentId: z.string().optional(),
  // icon property is not needed for the LLM's decision process
});

const SuggestCategoryInputSchema = z.object({
  description: z.string().describe('The description of the expense.'),
  allCategories: z.array(CategorySchema).describe('A list of all available categories, including main and sub-categories. Sub-categories have a parentId linking to their main category ID.'),
});
export type SuggestCategoryInput = z.infer<typeof SuggestCategoryInputSchema>;

const SuggestCategoryOutputSchema = z.object({
  suggestedCategoryId: z.string().optional().describe('The ID of the most specific suggested category from the provided list. This could be a main category or a sub-category.'),
  reasoning: z.string().optional().describe('A brief explanation for the category suggestion.'),
});
export type SuggestCategoryOutput = z.infer<typeof SuggestCategoryOutputSchema>;

export async function suggestCategory(input: SuggestCategoryInput): Promise<SuggestCategoryOutput> {
  return suggestCategoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestCategoryPrompt',
  input: { schema: SuggestCategoryInputSchema },
  output: { schema: SuggestCategoryOutputSchema },
  prompt: `You are an expert expense categorization assistant.
Your task is to analyze an expense description and suggest the most appropriate category ID from a provided list.
The list includes main categories and sub-categories. Sub-categories are linked to their parent main category via the 'parentId' field.
You should prioritize suggesting the most specific category that accurately fits the expense. For example, if "Fruits" is a sub-category of "Groceries", and the expense is "Apples", suggest the ID for "Fruits". If the expense is just "Supermarket run", suggesting "Groceries" might be more appropriate if no specific sub-category stands out.

Expense Description:
{{{description}}}

Available Categories (JSON format):
{{#jsonstringify allCategories}}{{/jsonstringify}}

Based on the description and the available categories, please provide:
1. 'suggestedCategoryId': The ID of the single most fitting category from the list.
2. 'reasoning': A very brief explanation for your choice.

Only choose from the IDs present in the 'Available Categories' list.
If no category seems appropriate, you can omit 'suggestedCategoryId'.`,
});

const suggestCategoryFlow = ai.defineFlow(
  {
    name: 'suggestCategoryFlow',
    inputSchema: SuggestCategoryInputSchema,
    outputSchema: SuggestCategoryOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      // Handle cases where the LLM might not return a structured output as expected
      // or if the output is empty.
      return { reasoning: "Could not determine a category." };
    }
    // Ensure the suggestedCategoryId actually exists in the provided categories
    if (output.suggestedCategoryId && !input.allCategories.some(cat => cat.id === output.suggestedCategoryId)) {
      return { reasoning: `Model suggested an invalid category ID: ${output.suggestedCategoryId}. No suggestion applied.` };
    }
    return output;
  }
);
