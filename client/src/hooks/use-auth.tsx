import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { initWebSocket, closeWebSocket, authenticateWebSocket } from "../lib/websocket";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Initialize WebSocket when user is authenticated
  useEffect(() => {
    if (user) {
      // Initialize WebSocket connection with user ID
      initWebSocket(user.id);
      
      // Clean up connection on unmount
      return () => {
        closeWebSocket();
      };
    } else {
      // Close WebSocket if user logs out
      closeWebSocket();
    }
  }, [user?.id]); // Only re-run if user ID changes

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      if (!res.ok) {
        const errorData = await res.json();
        // Check for pending approval response (403)
        if (res.status === 403 && errorData.message?.includes("pending approval")) {
          throw new Error("Your account is pending admin approval. Please check back later.");
        }
        throw new Error(errorData.message || "Login failed");
      }
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      
      // Check if this is a freshly registered user who needs to complete onboarding
      let isNewUser = false;
      try {
        isNewUser = localStorage.getItem('registeredUsername') === user.username;
      } catch (e) {
        console.error('Failed to check localStorage:', e);
      }
      
      // Display appropriate toast based on user status
      if (isNewUser) {
        toast({
          title: "Login successful",
          description: "Let's set up your fitness profile!",
        });
        
        // Clear the registered username flag
        try {
          localStorage.removeItem('registeredUsername');
        } catch (e) {
          console.error('Failed to clear localStorage:', e);
        }
        
        // Use the existing navigation approach for consistency
        queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      } else {
        toast({
          title: "Login successful",
          description: `Welcome back, ${user.username}!`,
        });
      }
    },
    onError: (error: Error) => {
      // Check for pending approval message
      if (error.message.includes("pending approval")) {
        toast({
          title: "Account Pending Approval",
          description: error.message,
          variant: "destructive",
          duration: 6000, // Show for longer
        });
      } else {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Registration failed");
      }
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      
      // Show a detailed message about the approval process
      if (!user.isApproved) {
        toast({
          title: "Registration successful",
          description: "Your account has been created and is pending admin approval. You'll be able to login once approved.",
          duration: 8000,
        });
      } else {
        toast({
          title: "Registration successful",
          description: `Welcome, ${user.username}!`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        // Use fetch directly instead of apiRequest to avoid parsing JSON
        const response = await fetch('/api/logout', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        // Don't try to parse response as JSON
        if (!response.ok) {
          throw new Error('Logout failed');
        }
        
        // Return void as expected by the mutation type
        return;
      } catch (error) {
        console.error('Logout error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      queryClient.invalidateQueries();
      toast({
        title: "Logout successful",
        description: "You have been logged out.",
      });
      // Redirect to login page
      window.location.href = '/';
    },
    onError: (error: Error) => {
      console.error('Logout error:', error);
      toast({
        title: "Logout failed",
        description: "There was an issue logging out. Please try again.",
        variant: "destructive",
      });
      // Even if there's an error, clear local user data and redirect
      queryClient.setQueryData(["/api/user"], null);
      window.location.href = '/';
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    console.error("AuthContext not found - useAuth must be used within an AuthProvider");
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}