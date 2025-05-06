/**
 * Common formatting utility functions for the application
 */

/**
 * Formats a date into a readable format
 * @param date - Date object or string to format
 * @returns Formatted date string
 */
export const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Sorts days of the week in proper order (starting with Monday)
 * @param days - Array of day strings to sort
 * @returns Sorted array of days
 */
export const sortDaysOfWeek = (days: string[]): string[] => {
  type DayOrder = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  
  const order: Record<DayOrder, number> = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 7
  };
  
  return [...days].sort((a, b) => {
    // Use type assertion to handle any case input
    const aLower = a.toLowerCase() as DayOrder;
    const bLower = b.toLowerCase() as DayOrder;
    
    const aValue = aLower in order ? order[aLower] : 99;
    const bValue = bLower in order ? order[bLower] : 99;
    
    return aValue - bValue;
  });
};

/**
 * Capitalizes the first letter of a string
 * @param str - String to capitalize
 * @returns Capitalized string
 */
export const capitalize = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Formats a meal type for display with enhanced support for common meal types
 * @param mealType - Meal type string to format
 * @returns Formatted meal type
 */
export const formatMealType = (mealType: string): string => {
  if (!mealType) return '';
  
  const type = mealType.toLowerCase();
  
  // Standard meal types
  if (type.includes('breakfast') || type === 'morning') return 'Breakfast';
  if (type.includes('lunch') || type === 'midday') return 'Lunch';
  if (type.includes('dinner') || type === 'evening' || type === 'supper') return 'Dinner';
  if (type.includes('snack')) return 'Snack';
  
  // Enhanced support for common custom meal types
  if (type.includes('pre-workout') || type === 'pre_workout' || type === 'preworkout') return 'Pre-workout';
  if (type.includes('post-workout') || type === 'post_workout' || type === 'postworkout') return 'Post-workout';
  if (type.includes('mid-morning') || type === 'mid_morning' || type === 'midmorning') return 'Mid-morning';
  if (type.includes('afternoon')) return 'Afternoon';
  if (type.includes('evening') || type === 'night') return 'Evening';
  
  // Replace underscores with spaces for any other custom types
  return capitalize(mealType.replace(/_/g, ' '));
};