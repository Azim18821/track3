import React, { useState, useEffect } from 'react';
import { API_URL, isIOS, isAndroid } from '@/utils/env';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle, RefreshCw, Server, Globe } from 'lucide-react';

/**
 * API Debug Panel
 * 
 * Displays real-time connectivity information for mobile apps. Useful for
 * diagnosing connection issues between iOS/Android apps and the backend.
 */
export default function ApiDebugPanel() {
  const [pingStatus, setPingStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [authStatus, setAuthStatus] = useState<'loading' | 'success' | 'error' | 'unauthorized'>('loading');
  const [pingTime, setPingTime] = useState<number | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [networkInfo, setNetworkInfo] = useState<{
    online: boolean;
    effectiveType?: string;
    downlink?: number;
  }>({
    online: navigator.onLine
  });

  // Function to ping API server
  const pingServer = async () => {
    setPingStatus('loading');
    setAuthStatus('loading');
    setPingTime(null);
    setErrorDetails(null);
    
    try {
      const startTime = performance.now();
      // Ping a simple endpoint that should return quickly
      const pingResponse = await fetch('/api/ping', {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' },
        credentials: 'include'
      });
      
      const endTime = performance.now();
      setPingTime(Math.round(endTime - startTime));
      
      if (pingResponse.ok) {
        setPingStatus('success');
        
        // Now check authentication
        try {
          const authResponse = await fetch('/api/user', { 
            credentials: 'include',
            headers: { 'Cache-Control': 'no-cache' }
          });
          
          if (authResponse.ok) {
            setAuthStatus('success');
          } else if (authResponse.status === 401) {
            setAuthStatus('unauthorized');
          } else {
            setAuthStatus('error');
            const text = await authResponse.text();
            setErrorDetails(`Auth check failed: ${authResponse.status} ${authResponse.statusText}\n${text}`);
          }
        } catch (authError) {
          setAuthStatus('error');
          setErrorDetails(`Auth check error: ${(authError as Error).message}`);
        }
      } else {
        setPingStatus('error');
        const text = await pingResponse.text();
        setErrorDetails(`Ping failed: ${pingResponse.status} ${pingResponse.statusText}\n${text}`);
      }
    } catch (err) {
      setPingStatus('error');
      setErrorDetails(`Connection error: ${(err as Error).message}`);
    }
  };
  
  // Get network information
  useEffect(() => {
    // Check for Network Information API
    const connection = (navigator as any).connection;
    
    if (connection) {
      const updateNetworkInfo = () => {
        setNetworkInfo({
          online: navigator.onLine,
          effectiveType: connection.effectiveType,
          downlink: connection.downlink
        });
      };
      
      updateNetworkInfo();
      connection.addEventListener('change', updateNetworkInfo);
      return () => connection.removeEventListener('change', updateNetworkInfo);
    } else {
      // Basic online/offline detection fallback
      const updateOnlineStatus = () => {
        setNetworkInfo({
          online: navigator.onLine
        });
      };
      
      window.addEventListener('online', updateOnlineStatus);
      window.addEventListener('offline', updateOnlineStatus);
      return () => {
        window.removeEventListener('online', updateOnlineStatus);
        window.removeEventListener('offline', updateOnlineStatus);
      };
    }
  }, []);
  
  // Initial ping on component mount
  useEffect(() => {
    pingServer();
  }, []);
  
  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="w-5 h-5" /> 
          API Connection Status
        </CardTitle>
        <CardDescription>
          Diagnostic tool for iOS/Android API connectivity
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Environment Info */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Environment:</span>
            <Badge variant={isIOS || isAndroid ? "outline" : "default"}>
              {isIOS ? 'iOS App' : isAndroid ? 'Android App' : 'Web Browser'}
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">API Endpoint:</span>
            <span className="text-xs truncate max-w-[220px] font-mono bg-muted p-1 rounded">
              {API_URL || window.location.origin}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Network Status:</span>
            <Badge 
              variant={networkInfo.online ? "default" : "destructive"}
              className={`flex items-center gap-1 ${networkInfo.online ? "bg-green-500 hover:bg-green-600" : ""}`}
            >
              <Globe className="w-3 h-3" />
              {networkInfo.online ? 'Online' : 'Offline'}
              {networkInfo.effectiveType && ` (${networkInfo.effectiveType})`}
            </Badge>
          </div>
          
          {networkInfo.downlink && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Connection Speed:</span>
              <span className="text-sm">{networkInfo.downlink} Mbps</span>
            </div>
          )}
        </div>
        
        <Separator />
        
        {/* Ping Results */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Server Connection:</span>
            {pingStatus === 'loading' ? (
              <Badge variant="outline" className="flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> 
                Testing...
              </Badge>
            ) : pingStatus === 'success' ? (
              <Badge variant="default" className="flex items-center gap-1 bg-green-500 hover:bg-green-600">
                <CheckCircle className="w-3 h-3" /> 
                Connected {pingTime && `(${pingTime}ms)`}
              </Badge>
            ) : (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> 
                Failed
              </Badge>
            )}
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Authentication:</span>
            {authStatus === 'loading' ? (
              <Badge variant="outline" className="flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> 
                Checking...
              </Badge>
            ) : authStatus === 'success' ? (
              <Badge variant="default" className="flex items-center gap-1 bg-green-500 hover:bg-green-600">
                <CheckCircle className="w-3 h-3" /> 
                Authenticated
              </Badge>
            ) : authStatus === 'unauthorized' ? (
              <Badge variant="outline" className="flex items-center gap-1 bg-amber-100 text-amber-800 hover:bg-amber-200">
                <AlertCircle className="w-3 h-3" /> 
                Not Logged In
              </Badge>
            ) : (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> 
                Failed
              </Badge>
            )}
          </div>
        </div>
        
        {/* Error details */}
        {errorDetails && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>
              <div className="whitespace-pre-wrap text-xs font-mono mt-2 max-h-24 overflow-auto">
                {errorDetails}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={pingServer}
          className="w-full"
          disabled={pingStatus === 'loading' || authStatus === 'loading'}
        >
          {(pingStatus === 'loading' || authStatus === 'loading') ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Testing Connection...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Test Connection
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}