import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Home,
  Utensils,
  Dumbbell,
  Brain,
  Weight,
  Target,
  User,
  Settings,
  Users,
  LineChart,
  Dices,
  BookOpen,
  ChefHat,
  ClipboardList,
  UserCheck,
  MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  closeMobileSidebar?: () => void;
}

const Sidebar = ({ closeMobileSidebar }: SidebarProps) => {
  const [location] = useLocation();
  const { user } = useAuth();

  // Fetch unread messages count
  const { data: unreadCount } = useQuery({
    queryKey: ["/api/messages/unread/count"],
    queryFn: async () => {
      if (!user) return { count: 0 };
      try {
        const res = await apiRequest("GET", "/api/messages/unread/count");
        if (!res.ok) return { count: 0 };
        return await res.json();
      } catch (error) {
        console.error("Failed to fetch unread messages count:", error);
        return { count: 0 };
      }
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Basic navigation items for all users
  const baseNavItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/nutrition", label: "Nutrition", icon: Utensils },
    { href: "/workouts", label: "Workouts", icon: Dumbbell },
    { href: "/exercises", label: "Exercise Library", icon: Dices },
    { href: "/meals", label: "Meal Library", icon: ChefHat },
    { href: "/coach", label: "Fitness Coach", icon: Brain },
    { href: "/weight", label: "Weight Log", icon: LineChart },
    { href: "/goals", label: "Goals", icon: Target },
    {
      href: "/messages",
      label: "Messages",
      icon: MessageSquare,
      badge: unreadCount?.count,
    },
    { href: "/profile", label: "Profile", icon: User },
  ];

  // Admin-specific navigation items
  const adminNavItems = [
    { href: "/admin/users", label: "User Management", icon: Users },
    { href: "/admin/fitness-plans", label: "Fitness Plans", icon: Target },
    { href: "/admin/settings", label: "System Settings", icon: Settings },
  ];

  // Trainer-specific navigation items
  const trainerNavItems = [
    { href: "/trainer", label: "My Clients", icon: UserCheck },
    { href: "/trainer/plans", label: "Client Plans", icon: ClipboardList },
    { href: "/plan-templates", label: "Plan Templates", icon: BookOpen },
    { href: "/trainer/messages", label: "Client Messages", icon: MessageSquare, badge: unreadCount?.count },
  ];

  // Combine the navigation items based on user role
  const navItems = user?.isAdmin
    ? [...baseNavItems, ...adminNavItems]
    : user?.isTrainer
      ? [...baseNavItems, ...trainerNavItems]
      : baseNavItems;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Welcome Card */}
      <div className="px-6 py-4">
        <div className="bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-lg p-4">
          <p className="text-sm font-medium text-primary mb-1">
            Welcome{user ? `, ${user.username}` : ""}!
          </p>
          <p className="text-xs text-muted-foreground">
            Track your fitness journey
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-3 py-2 flex-1">
        <div className="space-y-1">
          {/* Basic navigation section */}
          <div className="pb-2">
            {baseNavItems.map((item) => {
              const Icon = item.icon;
              // For exact path matching or paths that should match their children
              const isActive =
                location === item.href ||
                (item.href !== "/" &&
                  // Special case for trainer items to prevent overlap
                  !(
                    item.href === "/trainer" && location.startsWith("/trainer/")
                  ) &&
                  location.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => closeMobileSidebar && closeMobileSidebar()}
                  className={cn(
                    "group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-all my-1",
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
                      : "text-foreground hover:bg-accent/50 hover:text-primary",
                  )}
                >
                  <Icon
                    className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0",
                      isActive
                        ? "text-white"
                        : "text-muted-foreground group-hover:text-primary",
                    )}
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <Badge className="ml-2 bg-primary text-primary-foreground">
                      {item.badge}
                    </Badge>
                  ) : null}
                </Link>
              );
            })}
          </div>

          {/* Admin section */}
          {user?.isAdmin && (
            <>
              <div className="pt-2">
                <div className="px-3 mb-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Admin
                  </h3>
                </div>
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  // For exact path matching or paths that should match their children
                  const isActive =
                    location === item.href ||
                    (item.href !== "/" &&
                      // Special case for admin items to prevent overlap between sections
                      !(
                        item.href === "/admin" && location.startsWith("/admin/")
                      ) &&
                      location.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => closeMobileSidebar && closeMobileSidebar()}
                      className={cn(
                        "group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-all my-1",
                        isActive
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
                          : "text-foreground hover:bg-accent/50 hover:text-primary",
                      )}
                    >
                      <Icon
                        className={cn(
                          "mr-3 h-5 w-5 flex-shrink-0",
                          isActive
                            ? "text-white"
                            : "text-muted-foreground group-hover:text-primary",
                        )}
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </>
          )}

          {/* Trainer section */}
          {user?.isTrainer && !user?.isAdmin && (
            <>
              <div className="pt-2">
                <div className="px-3 mb-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Trainer
                  </h3>
                </div>
                {trainerNavItems.map((item) => {
                  const Icon = item.icon;
                  // Exact matching for trainer pages
                  const isActive =
                    location === item.href ||
                    (item.href === "/trainer" && location === "/trainer") ||
                    (item.href === "/trainer/plans" &&
                      location === "/trainer/plans");

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => closeMobileSidebar && closeMobileSidebar()}
                      className={cn(
                        "group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-all my-1",
                        isActive
                          ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm"
                          : "text-foreground hover:bg-accent/50 hover:text-primary",
                      )}
                    >
                      <Icon
                        className={cn(
                          "mr-3 h-5 w-5 flex-shrink-0",
                          isActive
                            ? "text-white"
                            : "text-muted-foreground group-hover:text-primary",
                        )}
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </nav>

      {/* User profile footer */}
      <div className="border-t border-border p-4">
        <Link
          href="/profile"
          onClick={() => closeMobileSidebar && closeMobileSidebar()}
          className="flex items-center rounded-md p-2 transition-colors hover:bg-accent"
        >
          <div className="flex-shrink-0">
            <span className="inline-flex h-9 w-9 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white justify-center items-center">
              <User className="h-5 w-5" />
            </span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-foreground">
              {user ? user.username : "User"}
            </p>
            <div className="flex flex-col text-xs">
              <p className="font-medium text-muted-foreground">View profile</p>
              {user?.isAdmin && (
                <span className="text-blue-600 dark:text-blue-400">Admin</span>
              )}
              {user?.isTrainer && !user?.isAdmin && (
                <span className="text-purple-600 dark:text-purple-400">
                  Trainer
                </span>
              )}
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;
