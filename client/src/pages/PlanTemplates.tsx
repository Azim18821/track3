import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, Plus, LayoutTemplate, DumbbellIcon, UtensilsIcon, 
  Users, FileText, AlertCircle, Loader2, ArchiveIcon, Filter
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PlanTemplate {
  id: number;
  trainerId: number;
  name: string;
  description: string | null;
  type: 'fitness' | 'nutrition' | 'combined';
  category: string;
  workoutPlan?: any;
  mealPlan?: any;
  targetFitnessLevel?: string | null;
  targetBodyType?: string | null;
  tags: string[];
  duration?: number | null;
  createdAt: string;
  updatedAt: string;
  notes: string | null;
  isArchived: boolean;
}

export default function PlanTemplates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string | undefined>(undefined);
  const [filterCategory, setFilterCategory] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);

  // Redirect if not a trainer
  useEffect(() => {
    if (user && !user.isTrainer) {
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch all templates for this trainer
  const { data: templates, isLoading, error } = useQuery<PlanTemplate[]>({
    queryKey: ['/api/trainer/plan-templates'],
    retry: 1,
  });

  // Filter templates based on search, type, category, and archive status
  const filteredTemplates = templates?.filter((template) => {
    // Filter by search query
    const matchesSearch = 
      searchQuery === '' || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.description && template.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Filter by type
    const matchesType = !filterType || template.type === filterType;
    
    // Filter by category
    const matchesCategory = !filterCategory || template.category === filterCategory;
    
    // Filter by archive status
    const matchesArchiveStatus = showArchived ? true : !template.isArchived;
    
    // Filter by active tab
    let matchesTab = true;
    if (activeTab === 'fitness') {
      matchesTab = template.type === 'fitness';
    } else if (activeTab === 'nutrition') {
      matchesTab = template.type === 'nutrition';
    } else if (activeTab === 'combined') {
      matchesTab = template.type === 'combined';
    }
    
    return matchesSearch && matchesType && matchesCategory && matchesArchiveStatus && matchesTab;
  });

  // Get unique categories for filter dropdown
  const uniqueCategories = new Set<string>();
  if (templates) {
    templates.forEach(t => {
      if (t.category) {
        uniqueCategories.add(t.category);
      }
    });
  }
  const categories = Array.from(uniqueCategories);

  // Handle creating a new template
  const handleCreateTemplate = () => {
    navigate('/create-plan-template');
  };

  // Function to get the template type icon
  const getTemplateTypeIcon = (type: string) => {
    switch (type) {
      case 'fitness':
        return <DumbbellIcon className="h-4 w-4 mr-1 text-blue-500" />;
      case 'nutrition':
        return <UtensilsIcon className="h-4 w-4 mr-1 text-green-500" />;
      case 'combined':
        return <LayoutTemplate className="h-4 w-4 mr-1 text-purple-500" />;
      default:
        return <FileText className="h-4 w-4 mr-1 text-gray-500" />;
    }
  };

  // Function to get type badge color
  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'fitness':
        return "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400";
      case 'nutrition':
        return "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400";
      case 'combined':
        return "bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Function to get category badge color
  const getCategoryBadgeColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'weight_loss':
      case 'weight loss':
        return "bg-pink-100 text-pink-800 hover:bg-pink-200 dark:bg-pink-900/30 dark:text-pink-400";
      case 'muscle_gain':
      case 'muscle gain':
        return "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400";
      case 'strength':
        return "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400";
      case 'endurance':
        return "bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400";
      case 'maintenance':
        return "bg-cyan-100 text-cyan-800 hover:bg-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400";
      default:
        return "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-900/30 dark:text-slate-400";
    }
  };

  // If not a trainer, don't render anything
  if (user && !user.isTrainer) return null;

  return (
    <div className="container px-3 py-4 md:px-6 md:py-8 mx-auto max-w-7xl">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-3xl font-bold mb-1 md:mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Plan Templates
        </h1>
        <p className="text-xs md:text-base text-muted-foreground leading-tight md:leading-normal">
          Create and manage reusable plan templates for your clients
        </p>
      </div>

      {/* Search and Filter Section */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-grow">
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        
        <div className="flex gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All types</SelectItem>
              <SelectItem value="fitness">Fitness</SelectItem>
              <SelectItem value="nutrition">Nutrition</SelectItem>
              <SelectItem value="combined">Combined</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="icon"
            className={showArchived ? "border-amber-200 bg-amber-100 text-amber-700" : ""}
            onClick={() => setShowArchived(!showArchived)}
            title={showArchived ? "Hide archived templates" : "Show archived templates"}
          >
            <ArchiveIcon className="h-4 w-4" />
          </Button>
          
          <Button onClick={handleCreateTemplate} className="whitespace-nowrap">
            <Plus className="h-4 w-4 mr-2" /> New Template
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-4">
        <TabsList className="mb-4 w-full h-auto grid grid-cols-4 gap-1">
          <TabsTrigger value="all" className="flex items-center justify-center py-1 px-2">
            <FileText className="w-4 h-4 mr-1 md:mr-2" />
            <span className="text-xs md:text-sm">All</span>
          </TabsTrigger>
          <TabsTrigger value="fitness" className="flex items-center justify-center py-1 px-2">
            <DumbbellIcon className="w-4 h-4 mr-1 md:mr-2" />
            <span className="text-xs md:text-sm">Fitness</span>
          </TabsTrigger>
          <TabsTrigger value="nutrition" className="flex items-center justify-center py-1 px-2">
            <UtensilsIcon className="w-4 h-4 mr-1 md:mr-2" />
            <span className="text-xs md:text-sm">Nutrition</span>
          </TabsTrigger>
          <TabsTrigger value="combined" className="flex items-center justify-center py-1 px-2">
            <LayoutTemplate className="w-4 h-4 mr-1 md:mr-2" />
            <span className="text-xs md:text-sm">Combined</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load plan templates. Please try again later.
          </AlertDescription>
        </Alert>
      )}

      {/* Empty state */}
      {templates && templates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed rounded-lg">
          <FileText className="h-12 w-12 text-muted-foreground opacity-30 mb-4" />
          <h3 className="text-xl font-medium mb-2">No templates yet</h3>
          <p className="text-center text-muted-foreground mb-6 max-w-md">
            You haven't created any plan templates yet. Templates help you quickly assign workout and nutrition plans to multiple clients.
          </p>
          <Button onClick={handleCreateTemplate}>
            <Plus className="h-4 w-4 mr-2" /> Create your first template
          </Button>
        </div>
      )}

      {/* Templates grid */}
      {filteredTemplates && filteredTemplates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <Card 
              key={template.id} 
              className={`overflow-hidden transition-all duration-200 hover:shadow-md ${template.isArchived ? 'opacity-70' : ''}`}
            >
              <CardHeader className="pb-2 relative">
                {template.isArchived && (
                  <Badge variant="outline" className="absolute top-2 right-2 bg-amber-50 text-amber-700 border-amber-200">
                    <ArchiveIcon className="h-3 w-3 mr-1" /> Archived
                  </Badge>
                )}
                <CardTitle className="text-base">{template.name}</CardTitle>
                <CardDescription className="line-clamp-2 mt-1">
                  {template.description || "No description provided"}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-2 pb-2">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <Badge variant="outline" className={getTypeBadgeColor(template.type)}>
                    {getTemplateTypeIcon(template.type)}
                    {template.type.charAt(0).toUpperCase() + template.type.slice(1)}
                  </Badge>
                  
                  <Badge variant="outline" className={getCategoryBadgeColor(template.category)}>
                    {template.category.replace('_', ' ')}
                  </Badge>
                  
                  {template.duration && (
                    <Badge variant="outline">
                      {template.duration} {template.duration === 1 ? 'week' : 'weeks'}
                    </Badge>
                  )}
                </div>
                
                {template.tags && template.tags.length > 0 && (
                  <ScrollArea className="max-h-8">
                    <div className="flex flex-wrap gap-1">
                      {template.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs bg-muted">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </ScrollArea>
                )}
                
                <div className="text-xs text-muted-foreground mt-3">
                  Created {new Date(template.createdAt).toLocaleDateString()}
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-between pt-2 pb-3 gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-primary border-primary-light hover:bg-primary/5 flex-1"
                  onClick={() => navigate(`/view-plan-template/${template.id}`)}
                >
                  View
                </Button>
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => navigate(`/edit-plan-template/${template.id}`)}
                >
                  Edit
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Assign
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Assign Template to Client</DialogTitle>
                      <DialogDescription>
                        Select a client to assign this template to
                      </DialogDescription>
                    </DialogHeader>
                    {/* Client selection would go here */}
                    <DialogFooter>
                      <Button variant="outline">Cancel</Button>
                      <Button>Assign</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Filtered to empty state */}
      {templates && templates.length > 0 && filteredTemplates && filteredTemplates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 px-4 border border-dashed rounded-lg">
          <Filter className="h-8 w-8 text-muted-foreground opacity-30 mb-2" />
          <h3 className="text-lg font-medium mb-1">No matching templates</h3>
          <p className="text-center text-muted-foreground mb-4">
            No templates match your current search and filter settings.
          </p>
          <Button 
            variant="outline" 
            onClick={() => {
              setSearchQuery('');
              setFilterType(undefined);
              setFilterCategory(undefined);
              setShowArchived(false);
              setActiveTab('all');
            }}
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}