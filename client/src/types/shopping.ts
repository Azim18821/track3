/**
 * Shared types for the shopping module
 */

import type { ShoppingItem, DailyShoppingGroup } from '@/utils/shopping/shoppingUtils';

export type { ShoppingItem, DailyShoppingGroup };

// Re-export the utility functions for consistency
export { processShoppingItems, groupShoppingItemsByDay } from '@/utils/shopping/shoppingUtils';