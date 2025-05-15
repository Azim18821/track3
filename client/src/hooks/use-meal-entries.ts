import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';

// Types for meal entries
export interface MealItem {
  id?: number;
  foodName: string;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sourceFoodId?: number;
}

export interface MealEntry {
  id?: number;
  name: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  date: Date | string;
  notes?: string;
  isPlanned: boolean;
  items: MealItem[];
}

// Payload to create a meal entry
export interface CreateMealEntryPayload {
  name: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  date: Date | string;
  notes?: string;
  isPlanned: boolean;
  items: Omit<MealItem, 'id'>[];
}

/**
 * Get meal entries for a specific date
 */
export function useMealEntriesForDate(date: Date) {
  const formattedDate = format(date, 'yyyy-MM-dd');
  
  return useQuery<MealEntry[]>({
    queryKey: [`/api/meal-entries?date=${formattedDate}`],
    enabled: true,
  });
}

/**
 * Get meal entry history with pagination
 */
export function useMealEntryHistory(page: number = 1, limit: number = 10) {
  return useQuery<{
    entries: MealEntry[],
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }
  }>({
    queryKey: [`/api/meal-entries/history?page=${page}&limit=${limit}`],
    enabled: true,
  });
}

/**
 * Create a new meal entry
 */
export function useCreateMealEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (mealEntry: CreateMealEntryPayload) => {
      return apiRequest('POST', '/api/meal-entries', mealEntry);
    },
    onSuccess: (_, variables) => {
      // Get the formatted date to invalidate the correct query
      let dateToInvalidate: string;
      
      if (typeof variables.date === 'string') {
        dateToInvalidate = variables.date.split('T')[0]; // Extract YYYY-MM-DD
      } else {
        dateToInvalidate = format(variables.date, 'yyyy-MM-dd');
      }
      
      // Invalidate related queries to refresh the data
      queryClient.invalidateQueries({ queryKey: [`/api/meal-entries?date=${dateToInvalidate}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/meal-entries/history`] });
      
      // Also invalidate nutrition-related queries
      queryClient.invalidateQueries({ queryKey: [`/api/nutrition/meals`] });
      queryClient.invalidateQueries({ queryKey: [`/api/nutrition/meals?date=${dateToInvalidate}`] });
    },
  });
}

/**
 * Update an existing meal entry
 */
export function useUpdateMealEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number, data: CreateMealEntryPayload }) => {
      return apiRequest('PUT', `/api/meal-entries/${id}`, data);
    },
    onSuccess: (_, variables) => {
      // Get the formatted date to invalidate the correct query
      let dateToInvalidate: string;
      
      if (typeof variables.data.date === 'string') {
        dateToInvalidate = variables.data.date.split('T')[0]; // Extract YYYY-MM-DD
      } else {
        dateToInvalidate = format(variables.data.date, 'yyyy-MM-dd');
      }
      
      // Invalidate related queries to refresh the data
      queryClient.invalidateQueries({ queryKey: [`/api/meal-entries?date=${dateToInvalidate}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/meal-entries/history`] });
      
      // Also invalidate nutrition-related queries
      queryClient.invalidateQueries({ queryKey: [`/api/nutrition/meals`] });
      queryClient.invalidateQueries({ queryKey: [`/api/nutrition/meals?date=${dateToInvalidate}`] });
    },
  });
}

/**
 * Delete a meal entry
 */
export function useDeleteMealEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, date }: { id: number, date: Date | string }) => {
      return apiRequest('DELETE', `/api/meal-entries/${id}`);
    },
    onSuccess: (_, variables) => {
      // Get the formatted date to invalidate the correct query
      let dateToInvalidate: string;
      
      if (typeof variables.date === 'string') {
        dateToInvalidate = variables.date.split('T')[0]; // Extract YYYY-MM-DD
      } else {
        dateToInvalidate = format(variables.date, 'yyyy-MM-dd');
      }
      
      // Invalidate related queries to refresh the data
      queryClient.invalidateQueries({ queryKey: [`/api/meal-entries?date=${dateToInvalidate}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/meal-entries/history`] });
      
      // Also invalidate nutrition-related queries
      queryClient.invalidateQueries({ queryKey: [`/api/nutrition/meals`] });
      queryClient.invalidateQueries({ queryKey: [`/api/nutrition/meals?date=${dateToInvalidate}`] });
    },
  });
}

/**
 * Calculate totals for a meal entry
 */
export function calculateMealEntryTotals(entry: MealEntry) {
  return {
    calories: entry.items.reduce((sum, item) => sum + item.calories, 0),
    protein: entry.items.reduce((sum, item) => sum + item.protein, 0),
    carbs: entry.items.reduce((sum, item) => sum + item.carbs, 0),
    fat: entry.items.reduce((sum, item) => sum + item.fat, 0),
  };
}