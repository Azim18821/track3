import { useState, useEffect } from 'react';
import { Download, X, Info, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePwa } from '@/hooks/use-pwa';

interface InstallPromptProps {
  /** Title shown in the install prompt */
  title?: string;
  /** Description shown in the install prompt */
  description?: string;
  /** Custom class to apply to the prompt container */
  className?: string;
  /** Delay in milliseconds before showing the prompt */
  delay?: number;
}

/**
 * A component that shows a prompt to install the PWA
 * Only shown if the app can be installed and is not already in standalone mode
 */
export default function InstallPrompt({
  title = 'Install App',
  description = 'Add TrackMadeEazE to your home screen for the best experience.',
  className = '',
  delay = 5000,
}: InstallPromptProps) {
  const { canInstall, isStandalone, install } = usePwa();
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  
  // Check if device is iOS
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  
  // Only show the prompt if the app can be installed and is not already installed
  useEffect(() => {
    // Delay showing the prompt to avoid annoying the user immediately
    if ((canInstall || isIOS) && !isStandalone) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, delay); // Show after the specified delay
      
      return () => clearTimeout(timer);
    }
  }, [canInstall, isStandalone, isIOS, delay]);
  
  if (!showPrompt || isStandalone) {
    return null;
  }
  
  const handleInstall = async () => {
    if (isIOS) {
      // iOS devices need special instructions
      setShowIOSInstructions(true);
    } else {
      // Non-iOS devices can use the install API
      const success = await install();
      if (success) {
        setShowPrompt(false);
      }
    }
  };
  
  return (
    <>
      <div className={`fixed bottom-16 left-0 right-0 mx-auto p-4 max-w-md z-30 ${className}`}>
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between p-4 pb-2">
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 p-2 rounded-full">
                <Download className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-800">{title}</h3>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full" 
              onClick={() => setShowPrompt(false)}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          
          <div className="px-4 py-2 pb-4">
            <p className="text-gray-600 text-sm mb-4">{description}</p>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPrompt(false)}>
                Not now
              </Button>
              <Button onClick={handleInstall}>
                <Download className="h-4 w-4 mr-2" />
                Install
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* iOS Install Instructions Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex justify-between items-center">
              <h3 className="font-bold text-xl text-white flex items-center">
                <Smartphone className="w-5 h-5 mr-2" />
                Install on iPhone
              </h3>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/20" 
                onClick={() => setShowIOSInstructions(false)}
              >
                <span className="sr-only">Close</span>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-center font-medium text-gray-700">Follow these steps to install TrackMadeEazE:</p>
              
              <div className="bg-gray-50 rounded-lg p-4 flex items-start border border-gray-200">
                <div className="bg-blue-100 rounded-full h-8 w-8 flex items-center justify-center text-blue-600 font-bold mr-3 flex-shrink-0">1</div>
                <div>
                  <p className="font-medium text-gray-800">Tap the Share button</p>
                  <p className="text-gray-600 text-sm">Tap the <span className="inline-block w-5 h-5 bg-blue-500 text-white rounded text-center leading-5">⬆</span> button at the bottom of your screen</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 flex items-start border border-gray-200">
                <div className="bg-blue-100 rounded-full h-8 w-8 flex items-center justify-center text-blue-600 font-bold mr-3 flex-shrink-0">2</div>
                <div>
                  <p className="font-medium text-gray-800">Scroll and tap Add to Home Screen</p>
                  <p className="text-gray-600 text-sm">You may need to scroll down to find this option</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 flex items-start border border-gray-200">
                <div className="bg-blue-100 rounded-full h-8 w-8 flex items-center justify-center text-blue-600 font-bold mr-3 flex-shrink-0">3</div>
                <div>
                  <p className="font-medium text-gray-800">Tap Add</p>
                  <p className="text-gray-600 text-sm">Look for the Add button in the top-right corner</p>
                </div>
              </div>
              
              <p className="text-center text-sm text-gray-500 italic">
                You'll get the full app experience with offline capabilities!
              </p>
              
              <div className="pt-2 flex justify-end">
                <Button onClick={() => setShowIOSInstructions(false)}>Got it</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}