import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronRight, Dumbbell, FileEdit, PenBox, Plus, Search, Tags, Trash2, Utensils } from 'lucide-react';

// Define interfaces for the template data
interface PlanTemplate {
  id: number;
  trainerId: number;
  name: string;
  description: string | null;
  type: 'fitness' | 'nutrition' | 'combined';
  workoutPlan?: any;
  mealPlan?: any;
  nutritionTargets?: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  tags: string[] | null;
}

export default function PlanTemplates() {
  // Router
  const [, navigate] = useLocation();
  
  // Auth state
  const { user } = useAuth();
  const { toast } = useToast();
  
  // UI state
  const [activeTab, setActiveTab] = useState<'all' | 'fitness' | 'nutrition' | 'combined'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<PlanTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch templates based on active tab
  const { data: templates = [], isLoading, refetch } = useQuery<PlanTemplate[]>({
    queryKey: ['/api/trainer/plan-templates', activeTab],
    queryFn: async () => {
      try {
        const endpoint = activeTab === 'all' 
          ? '/api/trainer/plan-templates'
          : `/api/trainer/plan-templates/${activeTab}`;
          
        const res = await fetch(endpoint);
        
        if (!res.ok) {
          throw new Error('Failed to fetch templates');
        }
        
        return await res.json();
      } catch (error) {
        console.error('Error fetching templates:', error);
        return [];
      }
    },
    enabled: !!user?.isTrainer,
  });

  // Handle template deletion
  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;
    
    try {
      const res = await fetch(`/api/trainer/plan-templates/${selectedTemplate.id}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete template');
      }
      
      toast({
        title: 'Template deleted',
        description: `"${selectedTemplate.name}" has been deleted successfully`,
      });
      
      // Close dialog and refetch templates
      setDeleteDialogOpen(false);
      setSelectedTemplate(null);
      refetch();
      
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete the template. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Render template type badge
  const renderTypeBadge = (type: string) => {
    switch (type) {
      case 'fitness':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800">
            <Dumbbell className="h-3 w-3 mr-1" />
            Fitness
          </Badge>
        );
      case 'nutrition':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
            <Utensils className="h-3 w-3 mr-1" />
            Nutrition
          </Badge>
        );
      case 'combined':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              <path d="M9 12h6"></path>
              <path d="M9 16h6"></path>
            </svg>
            Combined
          </Badge>
        );
      default:
        return null;
    }
  };

  // Filter templates by search query
  const filteredTemplates = templates.filter(template => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      template.name.toLowerCase().includes(query) ||
      (template.description?.toLowerCase().includes(query)) ||
      (template.tags?.some(tag => tag.toLowerCase().includes(query)))
    );
  });

  // Redirect if not trainer
  React.useEffect(() => {
    if (user && !user.isTrainer && !user.isAdmin) {
      navigate('/');
    }
  }, [user, navigate]);

  // Render loading state
  if (isLoading) {
    return (
      <div className="container py-10 max-w-5xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Plan Templates</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <Skeleton className="h-12 w-full mb-6" />
        
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Plan Templates</h1>
        
        <Button onClick={() => navigate('/create-plan-template')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>
      
      {/* Filter and search */}
      <div className="mb-6 space-y-4">
        <Tabs defaultValue={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="fitness">Fitness</TabsTrigger>
            <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
            <TabsTrigger value="combined">Combined</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search templates by name, description or tags..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {/* Templates list */}
      {filteredTemplates.length > 0 ? (
        <div className="grid gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="overflow-hidden transition-all hover:border-primary/50">
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="line-clamp-1">
                      {template.description || 'No description provided'}
                    </CardDescription>
                  </div>
                  <div>{renderTypeBadge(template.type)}</div>
                </div>
              </CardHeader>
              
              <CardContent className="pb-2">
                {template.tags && template.tags.length > 0 && (
                  <div className="flex items-center text-sm text-muted-foreground mb-2">
                    <Tags className="h-3.5 w-3.5 mr-1.5" />
                    <div className="flex flex-wrap gap-1.5">
                      {template.tags.map((tag, i) => (
                        <span key={i} className="inline-block bg-muted px-2 py-0.5 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="text-sm text-muted-foreground">
                  Created: {new Date(template.createdAt).toLocaleDateString()}
                  {template.updatedAt !== template.createdAt && (
                    <span> · Updated: {new Date(template.updatedAt).toLocaleDateString()}</span>
                  )}
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-between pt-2">
                <div className="flex items-center">
                  {template.type === 'fitness' || template.type === 'combined' ? (
                    <span className="text-xs text-muted-foreground mr-4">
                      <Dumbbell className="h-3 w-3 inline mr-1" />
                      {template.workoutPlan?.weeklySchedule ? 
                        Object.values(template.workoutPlan.weeklySchedule).filter((day: any) => 
                          day.name !== 'Rest Day').length : 0} workout days
                    </span>
                  ) : null}
                  
                  {template.type === 'nutrition' || template.type === 'combined' ? (
                    <span className="text-xs text-muted-foreground">
                      <Utensils className="h-3 w-3 inline mr-1" />
                      {template.nutritionTargets?.calories ? `${template.nutritionTargets.calories} kcal/day` : 'No targets'}
                    </span>
                  ) : null}
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-950/30"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/edit-plan-template/${template.id}`)}
                  >
                    <PenBox className="h-4 w-4 mr-1.5" />
                    Edit
                  </Button>
                  
                  <Button 
                    size="sm"
                    onClick={() => navigate(`/enhanced-trainer-plan-creation?templateId=${template.id}`)}
                  >
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only md:not-sr-only md:ml-1.5">Use Template</span>
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Alert className="bg-muted/20">
          <AlertTitle>No templates found</AlertTitle>
          <AlertDescription>
            {searchQuery ? (
              <>No templates match your search query. Try another search term or clear the search.</>
            ) : (
              <>
                You haven't created any {activeTab !== 'all' ? activeTab : ''} templates yet. 
                Templates help you save and reuse fitness and nutrition plans with multiple clients.
              </>
            )}
          </AlertDescription>
          
          {searchQuery && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => setSearchQuery('')}
            >
              Clear Search
            </Button>
          )}
        </Alert>
      )}
      
      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the template "{selectedTemplate?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteTemplate}
            >
              Delete Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}