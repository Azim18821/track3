import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Home, 
  Dumbbell, 
  Utensils, 
  Target,
  User,
  Settings,
  Users,
  MessageSquare,
  Dna
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import CenterNavButton from '@/components/CenterNavButton';
import { Capacitor } from '@capacitor/core';

export function BottomNavCircular() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [hasHomeIndicator, setHasHomeIndicator] = useState(false);
  
  // We're not using home indicator detection for now
  useEffect(() => {
    setHasHomeIndicator(false);
  }, []);
  
  const isActive = (path: string) => {
    if (path === '/' && location === '/dashboard') return true;
    return location === path;
  };

  // Define navigation items with proper icons and routes
  const navItems = [
    { 
      name: 'Home', 
      icon: Home, 
      path: '/dashboard',
      active: isActive('/dashboard') || isActive('/')
    },
    { 
      name: 'Exercise Library', 
      icon: Dumbbell, 
      path: '/exercises',
      active: isActive('/exercises')
    },
    { 
      name: 'Meal Library', 
      icon: Utensils, 
      path: '/meals',
      active: isActive('/meals')
    },
    { 
      name: 'Goals', 
      icon: Target, 
      path: '/goals',
      active: isActive('/goals')
    }
  ];
  
  // Message item for clients and trainers
  const messageItem = {
    name: 'Messages',
    icon: MessageSquare,
    path: '/messages',
    active: isActive('/messages')
  };
  
  // Admin-specific navigation items
  const adminItems = user?.isAdmin ? [
    { 
      name: 'Users', 
      icon: Users, 
      path: '/admin/users',
      active: isActive('/admin/users')
    },
    { 
      name: 'Settings', 
      icon: Settings, 
      path: '/admin/settings',
      active: isActive('/admin/settings')
    }
  ] : [];

  // Trainer-specific item for trainer dashboard
  const trainerItem = {
    name: 'My Clients',
    icon: Users,
    path: '/trainer',
    active: isActive('/trainer') || location.indexOf('/trainer/') === 0
  };

  // AI Coach item
  const coachItem = {
    name: 'Coach',
    icon: Dna,
    path: '/coach',
    active: isActive('/coach')
  };

  // Choose which nav items to show based on user type
  let displayItems = [];
  
  if (user?.isAdmin) {
    // Admin navigation
    displayItems = [...navItems.slice(0, 3), ...adminItems];
  } else if (user?.isTrainer) {
    // Trainer navigation with AI Coach and Trainer Dashboard access
    displayItems = [...navItems.slice(0, 3), trainerItem, coachItem];
  } else {
    // Regular user navigation with messages and possibly AI Coach
    // We'll check if they have trainers assigned in Dashboard.tsx and FitnessCoach.tsx
    displayItems = [...navItems.slice(0, 4), coachItem, messageItem];
  }
  
  // Limit to 5 items max for good mobile UX
  const finalItems = displayItems.slice(0, 5);

  // Create left and right side nav items for 2-2 split
  const leftItems = finalItems.slice(0, 2);
  const rightItems = finalItems.slice(2, 4);

  return (
    <div 
      className="fixed left-0 z-50 w-full backdrop-blur-lg bg-white/80 dark:bg-gray-900/90 border-t border-gray-200 dark:border-gray-800 shadow-lg bottom-nav pb-safe transition-all duration-200"
      style={{
        borderTopLeftRadius: '20px',
        borderTopRightRadius: '20px',
        transform: 'translateY(0)',
        bottom: '20px', /* Position it much lower from the bottom */
        paddingBottom: 'max(env(safe-area-inset-bottom, 20px) + 10px)'
      }}
    >
      {/* iOS safe area padding bottom is handled with pb-safe class and home indicator detection */}
      <div className="grid h-24 grid-cols-5 px-1 pt-2">
        {/* Left side items */}
        {leftItems.map((item, index) => (
          <Link 
            key={`left-${index}`}
            href={item.path}
            className="inline-flex flex-col items-center justify-center h-full px-1 py-1 touch-none"
          >
            <div 
              className={`relative flex items-center justify-center w-12 h-12 rounded-full mb-0.5 transition-all duration-200 ${
                item.active 
                  ? 'bg-primary/15 text-primary scale-110' 
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
              }`}
              style={{
                WebkitTapHighlightColor: 'transparent',
                transform: item.active ? 'translateY(-2px)' : 'none'
              }}
            >
              <item.icon className={`w-6 h-6 ${item.active ? 'text-primary' : 'text-gray-600 dark:text-gray-300'}`} />
              {item.active && (
                <>
                  <div className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                  <div className="absolute inset-0 rounded-full ring-2 ring-primary/20"></div>
                </>
              )}
            </div>
            <span 
              className={`text-[10px] font-medium whitespace-nowrap max-w-[70px] text-center truncate ${
                item.active 
                  ? 'text-primary' 
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              {item.name}
            </span>
          </Link>
        ))}
        
        {/* Center Button */}
        <div className="relative flex justify-center">
          <CenterNavButton />
        </div>
        
        {/* Right side items */}
        {rightItems.map((item, index) => (
          <Link 
            key={`right-${index}`}
            href={item.path}
            className="inline-flex flex-col items-center justify-center h-full px-1 py-1 touch-none"
          >
            <div 
              className={`relative flex items-center justify-center w-12 h-12 rounded-full mb-0.5 transition-all duration-200 ${
                item.active 
                  ? 'bg-primary/15 text-primary scale-110' 
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
              }`}
              style={{
                WebkitTapHighlightColor: 'transparent',
                transform: item.active ? 'translateY(-2px)' : 'none'
              }}
            >
              <item.icon className={`w-6 h-6 ${item.active ? 'text-primary' : 'text-gray-600 dark:text-gray-300'}`} />
              {item.active && (
                <>
                  <div className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                  <div className="absolute inset-0 rounded-full ring-2 ring-primary/20"></div>
                </>
              )}
            </div>
            <span 
              className={`text-[10px] font-medium whitespace-nowrap max-w-[70px] text-center truncate ${
                item.active 
                  ? 'text-primary' 
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              {item.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default BottomNavCircular;