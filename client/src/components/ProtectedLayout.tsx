import React, { ReactNode, useEffect, useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { Loader2, ShieldAlert, UserCog } from "lucide-react";
import Layout from "./Layout";
import { ProfileCheckRedirect } from "./auth/ProfileCheckRedirect";
import { useQuery } from "@tanstack/react-query";

interface ProtectedLayoutProps {
  children: ReactNode;
  adminOnly?: boolean;
  aiCoachPath?: boolean; // Flag to indicate this is an AI Coach related path
  workoutMode?: boolean; // Flag to indicate workout mode (hides navigation)
}

/**
 * A layout component that wraps content with the app layout and ensures
 * the user is authenticated before rendering the children.
 * Redirects to auth page if not authenticated.
 * If adminOnly is true, also checks if the user is an admin.
 * If aiCoachPath is true, checks if the user has a trainer and redirects to fitness plan.
 */
const ProtectedLayout: React.FC<ProtectedLayoutProps> = ({ children, adminOnly, aiCoachPath, workoutMode }) => {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const [hasTrainer, setHasTrainer] = useState(false);
  
  // Check if user has a trainer assigned (for clients)
  const { data: trainerAssignments, isLoading: trainersLoading } = useQuery({
    queryKey: ['/api/client/trainers'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/client/trainers', {
          credentials: "include"
        });
        
        if (res.status === 404) {
          return [];  // No trainers found
        }
        if (!res.ok) throw new Error('Failed to fetch trainer assignments');
        return await res.json();
      } catch (err: any) {
        if (err.message !== 'Failed to fetch trainer assignments') {
          return [];
        }
        throw err;
      }
    },
    enabled: !!user && user.isTrainer === false, // Only execute for non-trainer users who are logged in
  });
  
  // Update hasTrainer state when trainer assignments change
  useEffect(() => {
    setHasTrainer(!!trainerAssignments && trainerAssignments.length > 0);
  }, [trainerAssignments]);
  
  // Check if this is an AI Coach related path
  const isAICoachPath = 
    aiCoachPath === true || 
    location === "/coach" || 
    location === "/ai-coach" || 
    location.startsWith("/coach/");
  
  if (isLoading || (isAICoachPath && trainersLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  if (!user.isApproved) {
    return <Redirect to="/auth" />;
  }
  
  // If adminOnly is true, check if the user is an admin
  if (adminOnly && !user.isAdmin) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[80vh] max-w-md mx-auto text-center">
          <ShieldAlert className="h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Admin Access Required</h1>
          <p className="text-muted-foreground mb-4">
            This page is restricted to admin users only. Please contact an administrator if you need access.
          </p>
          <Redirect to="/dashboard" />
        </div>
      </Layout>
    );
  }
  
  // If this is an AI Coach path and the user has a trainer, redirect to fitness plan
  if (isAICoachPath && !user.isAdmin && !user.isTrainer && hasTrainer) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[80vh] max-w-md mx-auto text-center">
          <UserCog className="h-16 w-16 text-primary mb-4" />
          <h1 className="text-2xl font-bold mb-2">You Have a Personal Trainer</h1>
          <p className="text-muted-foreground mb-4">
            You already have a personal trainer assigned to you. Please visit your fitness plan to see your personalized training program.
          </p>
          <Redirect to="/fitness-plan" />
        </div>
      </Layout>
    );
  }
  
  return (
    <ProfileCheckRedirect>
      <Layout workoutMode={workoutMode}>{children}</Layout>
    </ProfileCheckRedirect>
  );
};

export default ProtectedLayout;