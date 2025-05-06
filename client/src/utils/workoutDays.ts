/**
 * Utility functions for generating and working with preferred workout days
 */

// Array of all possible weekdays
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * Generates an appropriate set of preferred workout days based on the number of
 * days per week requested, taking into account good workout distribution
 * 
 * @param daysPerWeek Number of days to work out each week (1-7)
 * @returns Array of day names (e.g., ["Monday", "Wednesday", "Friday"])
 */
export function generatePreferredWorkoutDays(daysPerWeek: number): string[] {
  // Validate input
  const validDaysPerWeek = Math.max(1, Math.min(7, daysPerWeek));
  
  // Special case handling for common workout patterns
  switch (validDaysPerWeek) {
    case 1:
      return ['Monday']; // Just one day, Monday is a good start
      
    case 2:
      return ['Monday', 'Thursday']; // 2 days: good spacing
      
    case 3:
      return ['Monday', 'Wednesday', 'Friday']; // Classic 3-day split
      
    case 4:
      return ['Monday', 'Tuesday', 'Thursday', 'Friday']; // Upper/lower split
      
    case 5:
      return ['Monday', 'Tuesday', 'Wednesday', 'Friday', 'Saturday']; // 5-day split with one rest day
      
    case 6:
      return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']; // 6 days with Sunday rest
      
    case 7:
      return DAYS_OF_WEEK; // All days
      
    default:
      return ['Monday', 'Wednesday', 'Friday']; // Fallback to a balanced 3-day split
  }
}

/**
 * Gets the index of a day in the week (0 = Monday, 6 = Sunday)
 * 
 * @param dayName Name of the day (e.g., "Monday")
 * @returns Index of the day, or -1 if not found
 */
export function getDayIndex(dayName: string): number {
  return DAYS_OF_WEEK.findIndex(day => day.toLowerCase() === dayName.toLowerCase());
}

/**
 * Sorts an array of day names to be in correct weekday order
 * 
 * @param days Array of day names to sort
 * @returns Sorted array of days
 */
export function sortDaysByWeekOrder(days: string[]): string[] {
  return [...days].sort((a, b) => {
    const indexA = getDayIndex(a);
    const indexB = getDayIndex(b);
    return indexA - indexB;
  });
}

/**
 * Generates a mapping of workout names based on the days of the week
 * 
 * @param days Array of workout days
 * @returns Record with day names as keys and default workout names as values
 */
export function generateDefaultWorkoutNames(days: string[]): Record<string, string> {
  const workoutNames: Record<string, string> = {};
  
  // For common workout patterns, assign typical split names
  if (days.length <= 3) {
    // For 1-3 days, use full body workouts
    days.forEach((day, index) => {
      workoutNames[day] = `Full Body ${index + 1}`;
    });
  } else if (days.length === 4) {
    // For 4 days, use upper/lower split
    const sortedDays = sortDaysByWeekOrder(days);
    sortedDays.forEach((day, index) => {
      workoutNames[day] = index % 2 === 0 ? `Upper Body ${Math.floor(index/2) + 1}` : `Lower Body ${Math.floor(index/2) + 1}`;
    });
  } else {
    // For 5+ days, use a body part split
    const parts = ['Push', 'Pull', 'Legs', 'Shoulders & Arms', 'Chest & Back', 'Full Body', 'Core & Cardio'];
    days.forEach((day, index) => {
      workoutNames[day] = parts[index % parts.length];
    });
  }
  
  return workoutNames;
}