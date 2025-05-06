import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User as UserType, UserUpdateFields } from '@/types/user';

export interface User extends UserType {
  // Additional properties that might come from the API but aren't in the type definition
  role?: string;
  approved?: boolean;
  createdAt?: string;
}

/**
 * Custom hook to access the currently logged in user
 * @returns Object containing the user data and loading state
 */
export function useUser() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/user'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/user', { credentials: 'include' });
        if (!res.ok) {
          if (res.status === 401) return null; // Not authenticated
          throw new Error('Failed to fetch user data');
        }
        return await res.json();
      } catch (err) {
        console.error('Error fetching user:', err);
        return null;
      }
    },
    retry: false,
    refetchOnWindowFocus: false
  });

  // Function to refetch user data
  const refetchUser = async () => {
    return queryClient.invalidateQueries({ queryKey: ['/api/user'] });
  };

  // Function to update user data
  const updateUser = async (userData: Partial<User>) => {
    try {
      const res = await fetch('/api/user/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(userData),
      });

      if (!res.ok) {
        throw new Error('Failed to update user data');
      }

      const updatedUser = await res.json();
      
      // Update the cache with the new user data
      queryClient.setQueryData(['/api/user'], updatedUser);
      
      return updatedUser;
    } catch (err) {
      console.error('Error updating user:', err);
      throw err;
    }
  };

  return {
    user: data as User | null,
    isLoading,
    error,
    isAuthenticated: !!data,
    refetchUser,
    updateUser
  };
}