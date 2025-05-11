// Added a placeholder function for hasMessagingAccess.  Replace with your actual implementation.
const hasMessagingAccess = (user: any) => {
  // Replace this with your actual logic to check for messaging access.
  // This example assumes a boolean 'hasMessaging' property exists in the user object.
  return user?.hasMessaging; 
};

import React, { ReactNode, useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNavCircular";
import { Menu, X, RefreshCw, Trash2, AlertCircle, LogOut, User, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import TrainerRequestNotification from "./TrainerRequestNotification";
import OfflineIndicator from "./OfflineIndicator";
import InstallPrompt from "./pwa/InstallPrompt";
import { useServiceWorker } from "@/hooks/use-service-worker";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { swState } = useServiceWorker();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setLocation("/auth");
      }
    });
  };

  const isMobile = useIsMobile();

  return (
    <div className="flex h-[100svh] w-screen overflow-hidden bg-background full-screen-container">
      {/* Mobile sidebar backdrop - only visible when sidebar is open on mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden notch-friendly-container"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - only visible on desktop */}
      {!isMobile && (
        <div className="hidden md:block w-72 overflow-y-auto bg-card shadow-lg">
          <div className="flex h-16 items-center border-b border-border px-6">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              TrackMadeEazE
            </h1>
          </div>
          <Sidebar closeMobileSidebar={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main content area with fixed header and scrollable content */}
      <div className="fixed inset-0 flex flex-col">
        {/* Mobile Header - Fixed at top, non-scrollable */}
        <header className="flex items-center justify-between border-b border-border bg-white/90 dark:bg-gray-900/90 backdrop-blur-md dark:text-white px-4 app-header h-14">
          <div className="flex items-center">
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              TrackMadeEazE
            </h1>
          </div>

          {user && (
            <div className="flex items-center space-x-2">
              <TrainerRequestNotification />

              {/* Theme Toggle Button - Admin Only */}
              {user?.isAdmin && <ThemeToggle />}

              {/* Messages button in top navigation */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setLocation('/messages')}
                    >
                      <MessageSquare className="text-gray-700 dark:text-gray-300" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Messages</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Profile button in top navigation */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setLocation('/profile')}
                    >
                      <User className="text-gray-700 dark:text-gray-300" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Profile</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Admin-only cache clearing button */}
              {user?.isAdmin && isMobile && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => window.location.href = '/admin/clear-cache'}
                  className="h-8 w-8"
                >
                  <Trash2 size={16} className="text-red-500" />
                </Button>
              )}

              {!isMobile && (
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Sign Out
                </Button>
              )}

              {isMobile && (
                <Button variant="ghost" size="icon" onClick={handleLogout}>
                  <LogOut size={18} className="dark:text-gray-300" />
                </Button>
              )}
            </div>
          )}
        </header>

        {/* Page content - With padding for fixed header and bottom nav */}
        <main className={`flex-1 overflow-y-auto bg-white dark:bg-gray-950 dark:text-white notch-friendly-container ${isMobile ? 'pb-24 mt-header-height' : 'p-4 md:p-6'}`}>
          {children}
        </main>

        {/* Bottom Navigation - Mobile only */}
        {isMobile && <BottomNav />}
      </div>

      {/* Offline indicator */}
      <OfflineIndicator />

      {/* PWA Installation Prompt */}
      <InstallPrompt delay={5000} />
    </div>
  );
};

export default Layout;