/**
 * Format macronutrient values for display
 * Rounds to 1 decimal place
 * 
 * @param value - The numeric value to format
 * @returns - The formatted value as a string
 */
export function formatMacros(value: number): string {
  return value.toFixed(1);
}