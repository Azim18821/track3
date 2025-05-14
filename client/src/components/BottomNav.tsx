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
// Using standard bottom navigation without a center button

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
    <div className="bottom-nav bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      {/* Standard 5-item bottom navigation for iOS */}
      <div className="flex justify-around items-center h-16 px-2">
        {finalItems.map((item, index) => (
          <Link 
            key={index}
            href={item.path}
            className="flex flex-col items-center justify-center touch-none px-2"
          >
            <div className="mb-1">
              <item.icon className={`w-6 h-6 ${item.active ? 'text-primary' : 'text-gray-600 dark:text-gray-400'}`} />
            </div>
            <span 
              className={`text-xs font-medium ${
                item.active 
                  ? 'text-primary' 
                  : 'text-gray-600 dark:text-gray-400'
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