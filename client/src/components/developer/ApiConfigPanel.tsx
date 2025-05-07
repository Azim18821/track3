import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { setCustomApiUrl, resetApiUrl, getCurrentApiUrl } from '@/utils/apiConfig';
import { isNative } from '@/utils/env';

/**
 * API Configuration Panel
 * 
 * A developer tool component for easily configuring API endpoints during testing
 * Only shown in development mode and when explicitly enabled
 */
export function ApiConfigPanel() {
  const [apiUrl, setApiUrl] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if this component should be visible (dev mode, query param, localStorage)
    const shouldShowConfig = 
      import.meta.env.DEV || // Show in dev mode
      window.localStorage.getItem('show_api_config') === 'true' || // Or if explicitly enabled
      new URLSearchParams(window.location.search).has('dev_mode'); // Or if dev_mode is in URL
    
    setIsVisible(shouldShowConfig);
    
    // Get current API URL
    setCurrentUrl(getCurrentApiUrl());
  }, []);

  if (!isVisible) return null;

  const handleSave = () => {
    if (apiUrl.trim()) {
      setCustomApiUrl(apiUrl.trim());
      setCurrentUrl(getCurrentApiUrl());
      
      // Reload to apply changes if we're in native mode
      if (isNative) {
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    }
  };

  const handleReset = () => {
    resetApiUrl();
    setApiUrl('');
    setCurrentUrl(getCurrentApiUrl());
    
    // Reload to apply changes if we're in native mode
    if (isNative) {
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  return (
    <Card className="mb-4 border-yellow-400 bg-yellow-50 dark:bg-yellow-950">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Developer API Configuration</CardTitle>
        <CardDescription>Configure the API endpoint for testing</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <Label htmlFor="current-api">Current API:</Label>
            <div className="text-sm p-2 bg-yellow-100 dark:bg-yellow-900 rounded">
              {currentUrl}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="api-url">New API URL:</Label>
            <Input
              id="api-url"
              placeholder="https://your-api-server.example.com"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Enter the full URL including protocol (http:// or https://)
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-1 flex gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={handleSave}
          disabled={!apiUrl.trim()}
        >
          Save API URL
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
        >
          Reset to Default
        </Button>
      </CardFooter>
    </Card>
  );
}