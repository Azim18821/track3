import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import NotFound from '@/pages/NotFound';

interface ClientWithTrainerLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout component that only allows clients with trainers to access wrapped content
 * Redirects other users to the dashboard
 */
export function ClientWithTrainerLayout({ children }: ClientWithTrainerLayoutProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [hasChecked, setHasChecked] = useState(false);
  
  // Check if user has a trainer
  const { data: userTrainers = [], isLoading } = useQuery({
    queryKey: ['/api/client/trainers'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/client/trainers');
        if (!res.ok) return [];
        return await res.json();
      } catch (error) {
        console.error('Failed to fetch trainer assignments:', error);
        return [];
      }
    },
    enabled: !!user && !user.isTrainer, // Only execute for non-trainer users who are logged in
  });

  const hasTrainer = userTrainers && userTrainers.length > 0;

  useEffect(() => {
    // Only navigate away if we've checked and the user doesn't have a trainer or is a trainer
    if (!isLoading) {
      setHasChecked(true);
      
      // If user is a trainer, navigate to trainer dashboard
      if (user?.isTrainer) {
        navigate('/trainer');
      }
      // If user doesn't have a trainer, navigate to dashboard
      else if (!hasTrainer) {
        navigate('/');
      }
    }
  }, [user, hasTrainer, isLoading, navigate]);

  // Show loading while checking
  if (isLoading || !hasChecked) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Checking account status...</span>
      </div>
    );
  }

  // If user has a trainer, render the children
  if (hasTrainer) {
    return <>{children}</>;
  }

  // Fallback in case navigation doesn't happen
  return <NotFound />;
}

export default ClientWithTrainerLayout;