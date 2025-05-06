/**
 * Utility for extracting ingredients from meal descriptions using our API
 */

/**
 * Extract ingredients from a meal description using the AI-powered API
 * @param mealName The name of the meal
 * @param mealDescription The description of the meal
 * @returns Promise<Array<{name: string, quantity: string}>>
 */
export async function extractIngredientsFromMeal(
  mealName: string,
  mealDescription: string
): Promise<Array<{name: string, quantity: string}>> {
  try {
    const response = await fetch('/api/ingredients/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mealName,
        mealDescription,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success || !data.ingredients) {
      throw new Error('Invalid response from ingredients API');
    }

    return data.ingredients;
  } catch (error) {
    console.error('Failed to extract ingredients:', error);
    return [];
  }
}