import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

/**
 * This page now redirects to the new onboarding flow
 * We keep it for backward compatibility with existing links
 */
const ProfileCompletionPage = () => {
  const [, navigate] = useLocation();

  useEffect(() => {
    // Redirect to the new onboarding flow
    navigate("/onboarding");
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-border" />
      <span className="ml-2">Redirecting to new onboarding experience...</span>
    </div>
  );
};

export default ProfileCompletionPage;