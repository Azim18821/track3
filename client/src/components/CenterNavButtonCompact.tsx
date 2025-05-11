import React from 'react';
import { Link, useLocation } from 'wouter';
import { Dumbbell, Bot, Users } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';

const CenterNavButtonCompact: React.FC = () => {
  const [location] = useLocation();
  const { user } = useAuth();
  
  // Get trainer assignments to determine if the user has trainers
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
  });

  // Determine if user has trainers
  const hasTrainer = !!trainerAssignments && trainerAssignments.length > 0;
  
  // Determine which icon to show based on user type
  let buttonIcon = <Dumbbell className="w-7 h-7" />;
  let buttonText = "Fitness";
  let targetPath = "/fitness-plan";
  
  if (user?.isAdmin) {
    buttonIcon = <Users className="w-7 h-7" />;
    buttonText = "Dashboard";
    targetPath = "/dashboard";
  } else if (user?.isTrainer) {
    buttonIcon = <Users className="w-7 h-7" />;
    buttonText = "Clients";
    targetPath = "/trainer";
  } else if (!hasTrainer) {
    buttonIcon = <Bot className="w-7 h-7" />;
    buttonText = "AI Coach";
    targetPath = "/ai-coach";
  }

  // Check if current route is active
  const isActive = (
    (user?.isAdmin && location === '/dashboard') ||
    (user?.isTrainer && (location === '/trainer' || location.indexOf('/trainer/') === 0)) ||
    (hasTrainer && (location === '/view-plan' || location === '/fitness-plan')) ||  // Include both routes for backward compatibility
    (!user?.isTrainer && !hasTrainer && (location === '/ai-coach' || location === '/coach'))
  );
  
  return (
    <div className="relative flex justify-center items-center">
      <div className="absolute -top-5 flex justify-center">
        <Link
          href={targetPath}
          className="inline-flex flex-col items-center touch-none"
        >
          <div 
            className={`relative flex items-center justify-center rounded-full shadow-md border-[2px] border-white dark:border-gray-900 ${
              isActive 
                ? 'bg-primary text-white scale-105 transition-transform duration-200' 
                : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transition-all duration-200'
            } translate-z-0`}
            style={{
              width: '3.75rem',
              height: '3.75rem',
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)'
            }}
          >
            {buttonIcon}
            {isActive && (
              <>
                <div className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                <div className="absolute inset-0 rounded-full ring-2 ring-white/20"></div>
              </>
            )}
          </div>
          <span 
            className={`text-[10px] font-semibold mt-1 ${
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

export default CenterNavButtonCompact;