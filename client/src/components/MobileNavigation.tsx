import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";

const MobileNavigation = () => {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Home", icon: "home" },
    { href: "/nutrition", label: "Nutrition", icon: "utensils" },
    { href: "/workouts", label: "Workouts", icon: "dumbbell" },
    { href: "/coach", label: "Coach", icon: "user-md" },
    { href: "/profile", label: "Profile", icon: "user" }
  ];

  return (
    <div className="md:hidden bg-background border-t border-border fixed bottom-0 w-full z-10 shadow-lg">
      <div className="flex justify-around h-16">
        {navItems.map(item => {
          const isActive = location === item.href || 
            (item.href !== "/" && location.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex flex-col items-center justify-center px-5 py-2 text-xs font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <i className={cn(
                `fas fa-${item.icon} text-lg mb-1`,
                isActive ? "text-primary" : "text-muted-foreground"
              )}></i>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default MobileNavigation;
