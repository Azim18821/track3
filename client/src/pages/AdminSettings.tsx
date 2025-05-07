import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, Save, AlertCircle, CheckCircle, Settings, Database, 
  RefreshCw, Trash2, Activity, RotateCcw, Globe
} from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useLocation } from 'wouter';
import LibraryUpdateForm from '@/components/admin/LibraryUpdateForm';
import { ApiConfigPanel } from '@/components/developer/ApiConfigPanel';

interface ResetStuckGenerationsResult {
  resetCount: number;
  userIds: number[];
  message: string;
}

// Component for the reset button with loading state
function ResetStuckGenerationsButton({ 
  onResult 
}: { 
  onResult: (result: ResetStuckGenerationsResult) => void 
}) {
  const { toast } = useToast();
  
  // Mutation for resetting stuck plan generations
  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/reset-stuck-generations');
      if (!res.ok) throw new Error('Failed to reset stuck plan generations');
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.resetCount > 0 
          ? "Reset successful" 
          : "No stuck generations found",
        description: data.message,
      });
      onResult(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Reset failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  return (
    <Button 
      variant="outline" 
      className="w-full"
      onClick={() => resetMutation.mutate()}
      disabled={resetMutation.isPending}
    >
      {resetMutation.isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Resetting...
        </>
      ) : (
        <>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset Stuck Generations
        </>
      )}
    </Button>
  );
}

interface SystemSetting {
  id: number;
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
}

export default function AdminSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({});
  const [resetResult, setResetResult] = useState<ResetStuckGenerationsResult | null>(null);
  
  // Redirect if not admin
  useEffect(() => {
    if (user && !user.isAdmin) {
      navigate('/');
    }
  }, [user, navigate]);
  
  // Fetch system settings
  const { data: systemSettings, isLoading } = useQuery({
    queryKey: ['/api/admin/settings'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/settings');
      if (!res.ok) throw new Error('Failed to fetch system settings');
      return await res.json();
    },
    enabled: !!user?.isAdmin
  });
  
  // Update settings on load
  useEffect(() => {
    if (systemSettings) {
      setSettings(systemSettings);
      
      // Initialize edited settings
      const initialEdits: Record<string, string> = {};
      systemSettings.forEach((setting: SystemSetting) => {
        initialEdits[setting.key] = setting.value;
      });
      setEditedSettings(initialEdits);
    }
  }, [systemSettings]);
  
  // Update settings mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await apiRequest('POST', '/api/admin/settings', { key, value });
      if (!res.ok) throw new Error('Failed to update setting');
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Setting updated",
        description: `${data.key} has been updated successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating setting",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Handle input change
  const handleInputChange = (key: string, value: string) => {
    setEditedSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Handle save setting
  const handleSaveSetting = (key: string) => {
    const value = editedSettings[key];
    if (value !== undefined) {
      updateSettingMutation.mutate({ key, value });
    }
  };
  
  // Check if setting is modified
  const isSettingModified = (key: string): boolean => {
    const originalSetting = settings.find(s => s.key === key);
    return originalSetting ? originalSetting.value !== editedSettings[key] : false;
  };
  
  // Helper function to format setting keys for display
  function formatSettingKey(key: string): string {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  if (!user || !user.isAdmin) {
    return (
      <div className="container py-10">
        <Alert variant="destructive">
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to view this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="container py-10 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
        Admin Control Panel
      </h1>
      
      <Tabs defaultValue="settings" className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>System Settings</span>
          </TabsTrigger>
          <TabsTrigger value="libraries" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span>Library Management</span>
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span>System Maintenance</span>
          </TabsTrigger>
          <TabsTrigger value="cache" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            <span>Cache Management</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="settings">
          <div className="grid gap-6">
            {settings.map(setting => (
              <Card key={setting.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{formatSettingKey(setting.key)}</CardTitle>
                  <CardDescription>{setting.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {setting.key === 'plan_generation_frequency_days' ? (
                    <>
                      <Label htmlFor={setting.key}>Days between fitness plan generation</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          id={setting.key}
                          type="number"
                          min="0"
                          max="365"
                          value={editedSettings[setting.key] || ''}
                          onChange={(e) => handleInputChange(setting.key, e.target.value)}
                          className="max-w-xs"
                        />
                        <span className="text-sm text-muted-foreground">days</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {editedSettings[setting.key] === '0' 
                          ? 'Set to 0 to allow unlimited plan generation'
                          : `Users can only generate a new fitness plan every ${editedSettings[setting.key] || setting.value} days`}
                      </p>
                    </>
                  ) : setting.key === 'fitness_coach_globally_disabled' ? (
                    <>
                      <div className="flex items-start space-x-4">
                        <div>
                          <Label htmlFor={setting.key}>Global Fitness Coach Status</Label>
                          <Select
                            value={editedSettings[setting.key]}
                            onValueChange={(value) => handleInputChange(setting.key, value)}
                          >
                            <SelectTrigger className="w-[280px] mt-2">
                              <SelectValue placeholder="Select option" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="false">Enabled for all users</SelectItem>
                              <SelectItem value="true">Disabled for all users</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="flex-1 pl-4 border-l border-border">
                          <h4 className="text-sm font-medium mb-2">Current status:</h4>
                          {editedSettings[setting.key] === 'true' ? (
                            <Alert variant="destructive" className="mt-2">
                              <AlertCircle className="h-4 w-4 mr-2" />
                              <div>
                                <AlertTitle>Fitness Coach Disabled</AlertTitle>
                                <AlertDescription>
                                  The AI fitness coach is currently disabled for all users except administrators.
                                </AlertDescription>
                              </div>
                            </Alert>
                          ) : (
                            <Alert className="mt-2 border-green-500">
                              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                              <div>
                                <AlertTitle className="text-green-600">Fitness Coach Enabled</AlertTitle>
                                <AlertDescription>
                                  The AI fitness coach is currently enabled and accessible to all users.
                                </AlertDescription>
                              </div>
                            </Alert>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-4">
                        Note: Users assigned to personal trainers will still be restricted from using the fitness coach regardless of this setting.
                      </p>
                    </>
                  ) : (
                    <>
                      <Label htmlFor={setting.key}>{formatSettingKey(setting.key)}</Label>
                      <Input
                        id={setting.key}
                        value={editedSettings[setting.key] || ''}
                        onChange={(e) => handleInputChange(setting.key, e.target.value)}
                        className="mt-2"
                      />
                    </>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                  <div className="text-xs text-muted-foreground">
                    Last updated: {new Date(setting.updatedAt).toLocaleString()}
                  </div>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => handleSaveSetting(setting.key)}
                    disabled={!isSettingModified(setting.key) || updateSettingMutation.isPending}
                  >
                    {updateSettingMutation.isPending && updateSettingMutation.variables?.key === setting.key ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="libraries">
          <div className="space-y-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold mb-2">Content Libraries</h2>
              <p className="text-muted-foreground">
                Manage and update your exercise and recipe libraries with AI-generated content
              </p>
            </div>
            
            <LibraryUpdateForm />
            
            <Alert className="mt-6 bg-blue-50 dark:bg-blue-950 border-blue-100 dark:border-blue-900">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertTitle>About Library Updates</AlertTitle>
              <AlertDescription>
                <p className="mb-2">The library update process runs in the background and may take several minutes to complete.</p>
                <ul className="list-disc ml-5 space-y-1 text-sm">
                  <li>Each item is checked for duplicates before being added to the library</li>
                  <li>New content is generated using OpenAI's models and consumes API credits</li>
                  <li>Featured recipes are automatically updated when new recipes are added</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>
        
        <TabsContent value="maintenance">
          <div className="space-y-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold mb-2">System Maintenance</h2>
              <p className="text-muted-foreground">
                System-wide maintenance operations and troubleshooting tools
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Globe className="h-5 w-5 text-indigo-500" />
                    API Configuration for Mobile Testing
                  </CardTitle>
                  <CardDescription>
                    Configure API endpoints for iOS/Android testing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ApiConfigPanel />
                </CardContent>
              </Card>
            
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <RotateCcw className="h-5 w-5 text-blue-500" />
                    Reset Stuck Plan Generations
                  </CardTitle>
                  <CardDescription>
                    Fix users unable to generate fitness plans due to stuck generation status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4">
                    This will reset the "is generating" flag for any stuck plan generations. Use this when:
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Users report they can't generate plans due to "already generating" errors</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Plan generation was interrupted or crashed</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>The system shows incorrect plan generation status</span>
                    </li>
                  </ul>
                  
                  {resetResult && (
                    <Alert className={`mt-4 ${resetResult.resetCount > 0 ? 'border-green-500' : 'border-blue-500'}`}>
                      <div>
                        <AlertTitle className={resetResult.resetCount > 0 ? 'text-green-600' : 'text-blue-600'}>
                          {resetResult.resetCount > 0
                            ? `Reset ${resetResult.resetCount} stuck generations`
                            : "No stuck generations found"}
                        </AlertTitle>
                        <AlertDescription>
                          {resetResult.resetCount > 0
                            ? `Successfully reset generation status for ${resetResult.resetCount} users.`
                            : "All plan generation statuses are currently valid."}
                            
                          {resetResult.resetCount > 0 && resetResult.userIds.length > 0 && (
                            <div className="mt-2">
                              <span className="font-medium">Affected user IDs:</span>{' '}
                              {resetResult.userIds.join(', ')}
                            </div>
                          )}
                        </AlertDescription>
                      </div>
                    </Alert>
                  )}
                </CardContent>
                <CardFooter>
                  <ResetStuckGenerationsButton onResult={setResetResult} />
                </CardFooter>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="cache">
          <div className="space-y-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold mb-2">Cache Management</h2>
              <p className="text-muted-foreground">
                Clear service workers, browser caches, and offline storage for the application
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trash2 className="h-5 w-5 text-red-500" />
                    Clear All Caches
                  </CardTitle>
                  <CardDescription>
                    Remove service workers, browser caches, and offline storage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4">
                    This will clear all types of cached data including:
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Service worker registrations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Cached API responses and assets</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Offline database (IndexedDB)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Local storage data</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={() => window.open('/admin/clear-cache', '_blank')}
                  >
                    Clear All Caches
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-blue-500" />
                    JavaScript Cache Cleanup
                  </CardTitle>
                  <CardDescription>
                    Run cache cleanup script via JavaScript API
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4">
                    This will run a JavaScript-based cleanup that:
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Clears all caches via the Cache API</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Unregisters service workers</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Removes offline database</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Reloads the application</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.open('/api/clear-cache', '_blank')}
                  >
                    Run JavaScript Cleanup
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            <Alert className="mt-6 bg-amber-50 dark:bg-amber-950 border-amber-100 dark:border-amber-900">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle>About Cache Management</AlertTitle>
              <AlertDescription>
                <p className="mb-2">Cache clearing should be used when:</p>
                <ul className="list-disc ml-5 space-y-1 text-sm">
                  <li>Users report UI issues after application updates</li>
                  <li>Offline functionality isn't working properly</li>
                  <li>Data appears stale or outdated after changes</li>
                  <li>Service worker errors appear in the console</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}