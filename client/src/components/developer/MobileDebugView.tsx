import React, { useState } from 'react';
import { Cog, LayoutDashboard, Server, X } from 'lucide-react';
import { isIOS, isAndroid } from '@/utils/env';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ApiDebugPanel from './ApiDebugPanel';
import { API_BASE_URL } from '@/utils/apiConfig';

/**
 * Debug view that's useful for iOS & Android testing
 * Shows connection details and API debugging tools
 */
export default function MobileDebugView() {
  const [isOpen, setIsOpen] = useState(false);
  
  // Only show on mobile devices in development mode
  if (!(isIOS || isAndroid) && !import.meta.env.DEV) {
    return null;
  }
  
  if (!isOpen) {
    return (
      <Button 
        size="sm" 
        variant="outline"
        className="fixed bottom-4 right-4 z-50 rounded-full shadow-lg h-12 w-12 p-0"
        onClick={() => setIsOpen(true)}
      >
        <Cog className="h-5 w-5" />
      </Button>
    );
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-[90%] max-w-md max-h-[80vh] overflow-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-bold">Developer Tools</h2>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => setIsOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <Tabs defaultValue="api">
          <div className="px-4 pt-4">
            <TabsList className="w-full">
              <TabsTrigger value="api" className="flex items-center gap-1">
                <Server className="h-4 w-4" /> API
              </TabsTrigger>
              <TabsTrigger value="info" className="flex items-center gap-1">
                <LayoutDashboard className="h-4 w-4" /> App Info
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="api" className="p-4">
            <ApiDebugPanel />
          </TabsContent>
          
          <TabsContent value="info">
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Environment</h3>
                <div className="text-sm space-y-1 font-mono bg-muted p-2 rounded overflow-auto">
                  <div>Platform: {isIOS ? "iOS" : isAndroid ? "Android" : "Web"}</div>
                  <div>API URL: {API_BASE_URL || "Default (relative)"}</div>
                  <div>Mode: {import.meta.env.DEV ? "Development" : "Production"}</div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Device Info</h3>
                <div className="text-sm space-y-1 font-mono bg-muted p-2 rounded overflow-auto">
                  <div>User Agent: {navigator.userAgent}</div>
                  <div>Screen: {window.screen.width}x{window.screen.height}</div>
                  <div>Window: {window.innerWidth}x{window.innerHeight}</div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Local Storage</h3>
                <div className="text-sm space-y-1 font-mono bg-muted p-2 h-32 rounded overflow-auto">
                  {Object.keys(localStorage).map(key => (
                    <div key={key} className="break-all">
                      <span className="text-amber-600">{key}:</span> 
                      <span className="text-green-600">
                        {localStorage.getItem(key)?.substring(0, 30)}
                        {(localStorage.getItem(key)?.length || 0) > 30 ? '...' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  localStorage.clear();
                  alert('Local storage cleared!');
                }}
              >
                Clear Local Storage
              </Button>
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}