/**
 * Utility functions for generating gradients throughout the application
 * These functions provide consistent gradient styles for cards, buttons and backgrounds
 */

// Get a gradient for plan cards based on fitness goal or other attributes
export function getPlanCardGradient(goal: string): string {
  switch (goal.toLowerCase()) {
    case 'weight_loss':
    case 'fat_loss':
    case 'lose weight':
      return 'from-rose-50 to-orange-50 dark:from-rose-950/50 dark:to-orange-950/50';
    case 'muscle_gain':
    case 'build muscle':
    case 'hypertrophy':
      return 'from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50';
    case 'strength':
    case 'strength_gain':
    case 'power':
      return 'from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50';
    case 'endurance':
    case 'cardio':
      return 'from-amber-50 to-yellow-50 dark:from-amber-950/50 dark:to-yellow-950/50';
    case 'stamina':
    case 'energy':
      return 'from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50';
    case 'balanced':
    case 'general':
    case 'maintenance':
      return 'from-sky-50 to-cyan-50 dark:from-sky-950/50 dark:to-cyan-950/50';
    default:
      return 'from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50';
  }
}

// Get a button gradient style based on type/action
export function getButtonGradient(type: string): string {
  switch (type.toLowerCase()) {
    case 'primary':
    case 'main':
      return 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700';
    case 'success':
    case 'confirm':
      return 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700';
    case 'danger':
    case 'error':
      return 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700';
    case 'warning':
    case 'alert':
      return 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600';
    case 'info':
    case 'highlight':
      return 'bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600';
    case 'neutral':
    case 'subtle':
      return 'bg-gradient-to-r from-slate-500 to-gray-500 hover:from-slate-600 hover:to-gray-600';
    default:
      return 'bg-gradient-to-r from-gray-600 to-slate-600 hover:from-gray-700 hover:to-slate-700';
  }
}

// Get shopping budget status gradient based on budget usage
export function getBudgetStatusGradient(percentUsed: number): string {
  if (percentUsed < 70) {
    // Under budget - good
    return 'from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40';
  } else if (percentUsed < 90) {
    // Nearing budget limit - warning
    return 'from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/40';
  } else {
    // Over or at budget - caution
    return 'from-rose-50 to-red-50 dark:from-rose-950/40 dark:to-red-950/40';
  }
}

// Get a badge color for a fitness metric or achievement
export function getBadgeColor(category: string): string {
  switch (category.toLowerCase()) {
    case 'nutrition':
    case 'diet':
    case 'food':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'workout':
    case 'exercise':
    case 'training':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    case 'recovery':
    case 'rest':
    case 'sleep':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    case 'progress':
    case 'achievement':
    case 'goal':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    case 'weight':
    case 'measurement':
    case 'stats':
      return 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300';
    case 'plan':
    case 'schedule':
    case 'routine':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300';
  }
}

// Get a progress bar gradient for a percentage value
export function getProgressGradient(percent: number): string {
  if (percent < 25) {
    return 'bg-gradient-to-r from-rose-500 to-red-500';
  } else if (percent < 50) {
    return 'bg-gradient-to-r from-amber-500 to-orange-500';
  } else if (percent < 75) {
    return 'bg-gradient-to-r from-yellow-500 to-lime-500';
  } else {
    return 'bg-gradient-to-r from-emerald-500 to-teal-500';
  }
}

// Get a color class for a progress indicator based on percentage
export function getProgressColor(percent: number): string {
  if (percent < 25) {
    return 'text-rose-500 dark:text-rose-400';
  } else if (percent < 50) {
    return 'text-amber-500 dark:text-amber-400';
  } else if (percent < 75) {
    return 'text-yellow-500 dark:text-yellow-400';
  } else {
    return 'text-emerald-500 dark:text-emerald-400';
  }
}

// Get a background style for a section by purpose
export function getSectionBackground(purpose: string): string {
  switch (purpose.toLowerCase()) {
    case 'hero':
    case 'header':
    case 'banner':
      return 'bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950';
    case 'feature':
    case 'highlight':
      return 'bg-gradient-to-br from-white to-blue-50 dark:from-slate-900 dark:to-slate-950';
    case 'callout':
    case 'cta':
      return 'bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950';
    case 'testimonial':
    case 'quote':
      return 'bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950';
    case 'stats':
    case 'metrics':
      return 'bg-gradient-to-br from-white to-emerald-50 dark:from-slate-900 dark:to-emerald-950';
    case 'pricing':
    case 'plan':
      return 'bg-gradient-to-br from-white to-amber-50 dark:from-slate-900 dark:to-amber-950';
    case 'faq':
    case 'help':
      return 'bg-gradient-to-br from-white to-cyan-50 dark:from-slate-900 dark:to-slate-950';
    default:
      return 'bg-white dark:bg-slate-900';
  }
}