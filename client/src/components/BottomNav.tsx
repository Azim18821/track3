import React from 'react';
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

export function BottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  
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
    <div className="fixed bottom-0 left-0 z-50 w-full h-20 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg bottom-nav">
      <div className="grid h-full grid-cols-5">
        {/* Left side items */}
        {leftItems.map((item, index) => (
          <Link 
            key={`left-${index}`}
            href={item.path}
            className="inline-flex flex-col items-center justify-center h-full px-1 py-2"
          >
            <div 
              className={`flex items-center justify-center w-11 h-11 rounded-full mb-1 ${
                item.active 
                  ? 'bg-primary/15 text-primary' 
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <item.icon className={`w-5 h-5 ${item.active ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}`} />
            </div>
            <span 
              className={`text-xs whitespace-nowrap max-w-[70px] text-center truncate ${
                item.active 
                  ? 'text-primary font-medium' 
                  : 'text-gray-500 dark:text-gray-400'
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
            className="inline-flex flex-col items-center justify-center h-full px-1 py-2"
          >
            <div 
              className={`flex items-center justify-center w-11 h-11 rounded-full mb-1 ${
                item.active 
                  ? 'bg-primary/15 text-primary' 
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <item.icon className={`w-5 h-5 ${item.active ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}`} />
            </div>
            <span 
              className={`text-xs whitespace-nowrap max-w-[70px] text-center truncate ${
                item.active 
                  ? 'text-primary font-medium' 
                  : 'text-gray-500 dark:text-gray-400'
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

export default BottomNav;