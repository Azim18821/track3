import React, { useEffect, useState, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { UserCog, Users, Dna } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from "@/hooks/use-toast";

export function CenterNavButton() {
  const [location] = useLocation();
  const [hasPlan, setHasPlan] = useState(false);
  const { user } = useAuth();
  const isTrainer = user?.isTrainer;
  const [hasTrainer, setHasTrainer] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Check if user has an active fitness plan
  const { data: activePlan } = useQuery({
    queryKey: ['/api/fitness-plans/active'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/fitness-plans/active', {
          credentials: "include"
        });
        
        if (res.status === 404) {
          return null;  // No active plan found
        }
        if (!res.ok) throw new Error('Failed to fetch fitness plan');
        return await res.json();
      } catch (err: any) {
        if (err.message !== 'Failed to fetch fitness plan') {
          return null;
        }
        throw err;
      }
    },
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) return false;
      return failureCount < 2;
    }
  });
  
  // Check if user has a trainer assigned (for clients)
  const { data: trainerAssignments } = useQuery({
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
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) return false;
      return failureCount < 2;
    },
    // Refresh more frequently to catch new trainer assignments
    refetchInterval: 30000, // Check every 30 seconds
  });
  
  // Set up WebSocket listener for real-time updates
  useEffect(() => {
    if (!user) return;
    
    // Listen for client-trainer relationship updates via WebSocket
    const handleWebSocketMessage = (event: any) => {
      try {
        // Get the data from the event - could be a string or a CustomEvent
        const eventData = event.detail?.data || event.detail || event;
        const data = typeof eventData === 'string' ? JSON.parse(eventData) : eventData;
        
        console.log('[CenterNavButton] Received WebSocket message:', data);
        
        // Handle trainer request acceptance
        if (data.type === 'trainer_request_accepted' && data.clientId === user.id) {
          // Force refresh the trainer assignments query
          queryClient.invalidateQueries({ queryKey: ['/api/client/trainers'] });
          console.log('[CenterNavButton] Received trainer assignment update, refreshing data');
        }
        
        // Handle new plan assignments
        if ((data.type === 'plan_assigned' || data.type === 'fitness_plan_updated') && 
            (data.clientId === user.id || data.data?.clientId === user.id)) {
          // Force refresh the active plan query
          queryClient.invalidateQueries({ queryKey: ['/api/fitness-plans/active'] });
          console.log('[CenterNavButton] Received plan assignment update, refreshing data');
          
          // Also show a toast notification
          toast({
            title: "New Fitness Plan",
            description: "Your trainer has assigned you a new fitness plan",
            duration: 5000
          });
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    };
    
    // Add WebSocket message listener
    window.addEventListener('ws-message', handleWebSocketMessage);
    
    // Clean up when component unmounts
    return () => {
      window.removeEventListener('ws-message', handleWebSocketMessage);
    };
  }, [user, queryClient]);
  
  // Update state when data changes
  useEffect(() => {
    setHasPlan(!!activePlan);
  }, [activePlan]);
  
  // Update hasTrainer state when trainer assignments change
  useEffect(() => {
    setHasTrainer(!!trainerAssignments && trainerAssignments.length > 0);
  }, [trainerAssignments]);
  
  // Determine button configuration based on user role
  let targetPath = '/ai-coach';  // All regular users go to AI Coach
  let buttonIcon = <Dna className="w-8 h-8" />;
  let buttonText = 'AI Coach';
  
  if (isTrainer) {
    // For trainers: show Clients button
    targetPath = '/trainer';
    buttonIcon = <Users className="w-8 h-8" />;
    buttonText = 'My Clients';
  } else if (hasTrainer) {
    // For clients with trainers: show Fitness Plan button
    targetPath = '/view-plan';  // Ensure clients with trainers go to view-plan
    buttonIcon = <UserCog className="w-8 h-8" />;
    buttonText = 'Fitness Plan';
  }
  
  // Determine if the button is active
  const isActive = (
    (isTrainer && (location === '/trainer' || location.startsWith('/trainer/'))) ||
    (hasTrainer && (location === '/view-plan' || location === '/fitness-plan')) ||  // Include both routes for backward compatibility
    (!isTrainer && !hasTrainer && (location === '/ai-coach' || location === '/coach'))
  );
  
  return (
    <div className="relative flex justify-center items-center">
      <div className="absolute -top-7 flex justify-center">
        <Link
          href={targetPath}
          className="inline-flex flex-col items-center touch-none"
        >
          <div 
            className={`relative flex items-center justify-center w-18 h-18 rounded-full shadow-lg border-[3px] border-white dark:border-gray-900 ${
              isActive 
                ? 'bg-primary text-white scale-105 transition-transform duration-200' 
                : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transition-all duration-200'
            } translate-z-0`}
            style={{
              width: '4.25rem',
              height: '4.25rem',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
            }}
          >
            {buttonIcon}
            {isActive && (
              <>
                <div className="absolute -bottom-1 w-2 h-2 rounded-full bg-white animate-pulse"></div>
                <div className="absolute inset-0 rounded-full ring-2 ring-white/20"></div>
              </>
            )}
          </div>
          <span 
            className={`text-[11px] font-semibold mt-1 ${
              isActive 
                ? 'text-primary' 
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {buttonText}
          </span>
        </Link>
      </div>
    </div>
  );
}

export default CenterNavButton;