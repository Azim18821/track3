import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Scale, UserCircle, Ruler, Cake } from 'lucide-react';

export default function ProfilePrompt() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Check if profile was created through onboarding
  const completedOnboarding = localStorage.getItem('onboardingCompleted');
  
  // Check if the profile is incomplete - missing weight, height, gender or dateOfBirth
  const isProfileIncomplete = user && (
    !user.weight || 
    !user.height || 
    !user.gender || 
    !user.dateOfBirth
  );

  // Use local storage to prevent showing the prompt on every page load
  const hasShownPrompt = localStorage.getItem('profilePromptShown');

  useEffect(() => {
    // Only show the prompt if:
    // 1. User is logged in
    // 2. Profile is incomplete
    // 3. Prompt hasn't been shown in this session
    // 4. User hasn't completed onboarding
    if (user && isProfileIncomplete && !hasShownPrompt && !completedOnboarding) {
      setOpen(true);
      // Set flag in localStorage to avoid showing the prompt again in this session
      localStorage.setItem('profilePromptShown', 'true');
    }
  }, [user, isProfileIncomplete, hasShownPrompt, completedOnboarding]);

  const handleCompleteProfile = () => {
    setOpen(false);
    setLocation('/onboarding');
  };

  const handleSkip = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-primary">Complete Your Profile</DialogTitle>
          <DialogDescription className="text-center text-base">
            We noticed some information is missing from your profile. Complete it to get the most out of your fitness journey.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="flex flex-col items-center space-y-2 p-3 rounded-lg border border-muted">
            <UserCircle className="h-8 w-8 text-primary" />
            <span className="text-sm font-medium">Personal Details</span>
          </div>
          
          <div className="flex flex-col items-center space-y-2 p-3 rounded-lg border border-muted">
            <Scale className="h-8 w-8 text-primary" />
            <span className="text-sm font-medium">Weight Tracking</span>
          </div>
          
          <div className="flex flex-col items-center space-y-2 p-3 rounded-lg border border-muted">
            <Ruler className="h-8 w-8 text-primary" />
            <span className="text-sm font-medium">Height & Body</span>
          </div>
          
          <div className="flex flex-col items-center space-y-2 p-3 rounded-lg border border-muted">
            <Cake className="h-8 w-8 text-primary" />
            <span className="text-sm font-medium">Date of Birth</span>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={handleSkip}>
            Skip for Now
          </Button>
          <Button onClick={handleCompleteProfile}>
            Complete Profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}