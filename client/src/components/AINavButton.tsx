import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { UserCog, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';

export function AINavButton() {
  const [location] = useLocation();
  const [hasPlan, setHasPlan] = useState(false);
  const { user } = useAuth();
  const isTrainer = user?.isTrainer;
  
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
  
  // Update state when data changes
  useEffect(() => {
    setHasPlan(!!activePlan);
  }, [activePlan]);
  
  // Determine the target path based on whether user has a plan or is a trainer
  const targetPath = isTrainer ? '/trainer' : (hasPlan ? '/ai-coach' : '/coach');
  const isActive = isTrainer ? 
    (location === '/trainer' || location.startsWith('/trainer/')) : 
    (location === '/ai-coach' || location === '/coach');
  
  return (
    <div className="relative flex justify-center items-center">
      <div className="absolute -top-6 flex justify-center">
        <Link
          href={targetPath}
          className="inline-flex flex-col items-center"
        >
          <div 
            className={`flex items-center justify-center w-16 h-16 rounded-full shadow-md border-4 border-white dark:border-gray-900 ${
              isActive 
                ? 'bg-primary text-white' 
                : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700'
            }`}
          >
            {isTrainer ? <Users className="w-8 h-8" /> : <UserCog className="w-8 h-8" />}
          </div>
          <span 
            className={`text-xs font-medium mt-1 ${
              isActive 
                ? 'text-primary' 
                : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            {isTrainer ? 'My Clients' : 'Personal Trainer'}
          </span>
        </Link>
      </div>
    </div>
  );
}

export default AINavButton;