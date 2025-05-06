import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { 
  Users, 
  BarChart2, 
  ListChecks, 
  MessageSquare, 
  Settings, 
  Home,
  Menu,
  X, 
  Dumbbell,
  CalendarRange,
  PlusCircle
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  badge?: number | null;
}

const NavLink = ({ href, icon, children, active, onClick, badge = null }: NavLinkProps) => {
  return (
    <Link href={href}>
      <Button
        variant={active ? "default" : "ghost"}
        className={cn(
          "w-full justify-start gap-2 h-auto py-2 relative",
          active ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800" : 
                   "hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/30 dark:hover:text-blue-400"
        )}
        onClick={onClick}
      >
        {icon}
        <span className="flex-1 text-left">{children}</span>
        {badge !== null && badge > 0 && (
          <Badge variant="destructive" className="ml-auto h-5 min-w-5 px-1 flex items-center justify-center rounded-full text-[10px]">
            {badge > 99 ? '99+' : badge}
          </Badge>
        )}
      </Button>
    </Link>
  );
};

export function TrainerNavbar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);

  // Effect to fetch unread message count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/messages/unread/count', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.count);
        }
      } catch (error) {
        console.error("Failed to fetch unread messages count:", error);
      }
    };

    fetchUnreadCount();
    // Set up an interval to refresh unread count
    const interval = setInterval(fetchUnreadCount, 60000); // Every minute
    
    return () => clearInterval(interval);
  }, []);

  if (!user) return null;

  const isActive = (path: string) => {
    // For exact matches
    if (path === location) return true;
    
    // For nested routes (including enhanced trainer plan creation)
    if (path !== '/' && (
      location.startsWith(path) || 
      (path === '/trainer/fitness-plans' && location.includes('enhanced-trainer-plan-creation'))
    )) return true;
    
    return false;
  };

  const closeSheet = () => setSheetOpen(false);
  
  const navLinks = [
    { href: '/trainer', icon: <Home size={18} />, label: 'Dashboard' },
    { href: '/trainer/clients', icon: <Users size={18} />, label: 'Clients' },
    { href: '/trainer/fitness-plans', icon: <Dumbbell size={18} />, label: 'Fitness Plans' },
    { href: '/trainer/nutrition-plans', icon: <BarChart2 size={18} />, label: 'Nutrition Plans' },
    { href: '/messages', icon: <MessageSquare size={18} />, label: 'Messages', badge: unreadCount },
    { href: '/profile', icon: <Settings size={18} />, label: 'Settings' }
  ];

  const NavContent = () => (
    <div className="flex flex-col gap-1.5">
      {navLinks.map((link) => (
        <NavLink
          key={link.href}
          href={link.href}
          icon={link.icon}
          active={isActive(link.href)}
          onClick={closeSheet}
          badge={link.badge}
        >
          {link.label}
        </NavLink>
      ))}

      <div className="h-[1px] bg-muted/50 my-2"></div>
      
      <NavLink
        href="/enhanced-trainer-plan-creation"
        icon={<PlusCircle size={18} />}
        active={location === '/enhanced-trainer-plan-creation' && !location.includes('?')}
        onClick={closeSheet}
      >
        Create New Plan
      </NavLink>
    </div>
  );

  return (
    <>
      {/* Mobile navbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-b flex items-center justify-between px-4 h-14 shadow-sm">
        <div className="flex items-center space-x-3">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu size={20} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0">
              <div className="flex flex-col h-full pt-4">
                <div className="px-5 pb-3 mb-2 border-b">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white dark:from-blue-500 dark:to-indigo-500">
                        {user.username?.substring(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-base font-medium">{user.username}</span>
                      <span className="text-xs text-muted-foreground">Trainer Portal</span>
                    </div>
                  </div>
                </div>
                <div className="px-3 py-3 flex-1">
                  <NavContent />
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <span className="font-semibold text-base bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Trainer Portal
          </span>
        </div>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white dark:from-blue-500 dark:to-indigo-500">
            {user.username?.substring(0, 2).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
      </div>
      
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col w-64 p-4 border-r h-screen fixed left-0 top-0 overflow-y-auto bg-background z-30 shadow-sm">
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b">
          <Avatar className="h-11 w-11">
            <AvatarFallback className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white dark:from-blue-500 dark:to-indigo-500">
              {user.username?.substring(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{user.username}</span>
            <span className="text-sm text-muted-foreground">Trainer Portal</span>
          </div>
        </div>
        <NavContent />
      </div>
    </>
  );
}

export default TrainerNavbar;