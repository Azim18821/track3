import React, { ReactNode } from 'react';
import { useLocation, Link } from 'wouter';
import { cn } from '@/lib/utils';

interface NavigationItem {
  label: string;
  href: string;
  icon?: ReactNode;
  disabled?: boolean;
}

interface VerticalNavigationProps {
  items: NavigationItem[];
  className?: string;
}

const VerticalNavigation: React.FC<VerticalNavigationProps> = ({ 
  items,
  className = ""
}) => {
  const [location] = useLocation();

  return (
    <nav className={cn("space-y-1", className)}>
      {items.map((item, index) => {
        const isActive = location === item.href;
        return (
          <Link
            key={index}
            href={item.disabled ? "#" : item.href}
            className={cn(
              "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-accent hover:text-accent-foreground",
              item.disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={(e) => {
              if (item.disabled) {
                e.preventDefault();
              }
            }}
          >
            {item.icon && (
              <div className={cn("mr-2 h-4 w-4", isActive ? "text-primary-foreground" : "text-foreground")}>
                {item.icon}
              </div>
            )}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
};

export default VerticalNavigation;