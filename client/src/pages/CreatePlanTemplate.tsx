import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Save, Loader2, Tag, Plus, X, 
  DumbbellIcon, UtensilsIcon, LayoutTemplate, ActivityIcon
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Categories for each template type
const fitnessCategories = [
  'weight_loss',
  'muscle_gain',
  'strength', 
  'endurance',
  'hypertrophy',
  'maintenance',
  'rehabilitation',
  'athletic',
  'functional'
];

const nutritionCategories = [
  'weight_loss',
  'muscle_gain',
  'maintenance',
  'ketogenic',
  'paleo',
  'vegetarian',
  'vegan',
  'high_protein',
  'high_carb',
  'low_fat'
];

const combinedCategories = [
  'weight_loss',
  'muscle_gain',
  'strength',
  'endurance',
  'maintenance',
  'athletic',
  'beginner',
  'intermediate',
  'advanced'
];

// Form validation schema
const templateSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  description: z.string().optional(),
  type: z.enum(['fitness', 'nutrition', 'combined']),
  category: z.string().min(1, 'Please select a category'),
  targetFitnessLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  targetBodyType: z.enum(['ectomorph', 'mesomorph', 'endomorph']).optional(),
  duration: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number().min(1, 'Duration must be at least 1 week').optional()
  ),
  notes: z.string().optional(),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

export default function CreatePlanTemplate() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState('details');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Get URL params
  const params = new URLSearchParams(location.split('?')[1] || '');
  const editId = params.get('edit');
  const isEditMode = Boolean(editId);

  // Redirect if not a trainer
  useEffect(() => {
    if (user && !user.isTrainer) {
      navigate('/');
    }
  }, [user, navigate]);

  // Initialize form with default values
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'fitness',
      category: '',
      targetFitnessLevel: undefined,
      targetBodyType: undefined,
      duration: undefined,
      notes: '',
    }
  });

  // Watch for the type field to update category options
  const templateType = form.watch('type');

  // Get the appropriate categories based on the selected type
  const getCategoriesForType = (type: string) => {
    switch (type) {
      case 'fitness':
        return fitnessCategories;
      case 'nutrition':
        return nutritionCategories;
      case 'combined':
        return combinedCategories;
      default:
        return fitnessCategories;
    }
  };

  // Get template data for edit mode
  useEffect(() => {
    if (isEditMode && editId) {
      // Fetch template data if in edit mode
      const fetchTemplateData = async () => {
        try {
          const res = await fetch(`/api/trainer/plan-templates/${editId}`);
          if (!res.ok) {
            throw new Error('Failed to fetch template data');
          }
          const templateData = await res.json();
          
          // Update form with fetched data
          form.reset({
            name: templateData.name,
            description: templateData.description || '',
            type: templateData.type,
            category: templateData.category,
            targetFitnessLevel: templateData.targetFitnessLevel as any || undefined,
            targetBodyType: templateData.targetBodyType as any || undefined,
            duration: templateData.duration || undefined,
            notes: templateData.notes || '',
          });
          
          // Set tags
          if (templateData.tags && Array.isArray(templateData.tags)) {
            setTags(templateData.tags);
          }
        } catch (error) {
          console.error('Error fetching template:', error);
          toast({
            title: 'Error',
            description: 'Failed to load template data',
            variant: 'destructive'
          });
        }
      };
      
      fetchTemplateData();
    }
  }, [isEditMode, editId, form, toast]);

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      // Use PUT for edit mode, POST for create
      const url = isEditMode ? 
        `/api/trainer/plan-templates/${editId}` : 
        '/api/trainer/plan-templates';
      
      const method = isEditMode ? 'PUT' : 'POST';
      
      const response = await apiRequest(url, method, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create template');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ 
        title: 'Success', 
        description: isEditMode ? 'Template updated successfully' : 'Template created successfully',
      });
      navigate('/plan-templates');
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to save template',
        variant: 'destructive'
      });
      setIsSaving(false);
    }
  });

  // Add tag to the list
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  // Remove tag from the list
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Handle form submission
  const onSubmit = (values: TemplateFormValues) => {
    setIsSaving(true);
    
    // Add tags to the form data
    const templateData = {
      ...values,
      tags: tags,
      // Initially create empty workout/meal plans based on the template type
      workoutPlan: templateType === 'fitness' || templateType === 'combined' 
        ? { weeklySchedule: {}, notes: values.notes || '' } 
        : undefined,
      mealPlan: templateType === 'nutrition' || templateType === 'combined'
        ? { weeklyMeals: {}, notes: values.notes || '' }
        : undefined,
    };
    
    createTemplateMutation.mutate(templateData);
  };

  return (
    <div className="container max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="ghost"
          size="sm"
          onClick={() => navigate('/plan-templates')}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} className="mr-1" />
          Back to Templates
        </Button>
        
        <Button 
          size="sm"
          disabled={isSaving}
          onClick={form.handleSubmit(onSubmit)}
          className="bg-primary hover:bg-primary/90"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Save Template
            </>
          )}
        </Button>
      </div>

      <div className="mb-4">
        <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          {isEditMode ? 'Edit Plan Template' : 'Create New Plan Template'}
        </h1>
        <p className="text-muted-foreground text-sm">
          Create a reusable template that can be assigned to multiple clients
        </p>
      </div>

      {/* Main form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Template Information</CardTitle>
              <CardDescription>
                Basic information about your template
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 8-Week Weight Loss Program" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Type</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Reset category when type changes
                          form.setValue('category', '');
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="fitness">
                            <div className="flex items-center">
                              <DumbbellIcon className="h-4 w-4 mr-2 text-blue-500" />
                              Fitness
                            </div>
                          </SelectItem>
                          <SelectItem value="nutrition">
                            <div className="flex items-center">
                              <UtensilsIcon className="h-4 w-4 mr-2 text-green-500" />
                              Nutrition
                            </div>
                          </SelectItem>
                          <SelectItem value="combined">
                            <div className="flex items-center">
                              <LayoutTemplate className="h-4 w-4 mr-2 text-purple-500" />
                              Combined
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getCategoriesForType(templateType).map((category) => (
                            <SelectItem key={category} value={category}>
                              {category.replace('_', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (weeks)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="e.g. 4, 8, 12" 
                          min={1}
                          {...field}
                          value={field.value === undefined ? '' : field.value}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        How many weeks this plan is designed for
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="targetFitnessLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Fitness Level</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a fitness level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="targetBodyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Body Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a body type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ectomorph">Ectomorph</SelectItem>
                          <SelectItem value="mesomorph">Mesomorph</SelectItem>
                          <SelectItem value="endomorph">Endomorph</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the purpose and benefits of this template" 
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div>
                <FormLabel>Tags</FormLabel>
                <div className="flex mt-1 mb-2">
                  <div className="relative flex-grow">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Add tags (e.g. hiit, bodyweight, quick)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      className="pr-16"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addTag}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2"
                      disabled={!tagInput.trim()}
                    >
                      <Tag className="h-3.5 w-3.5 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
                
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <X
                          className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground"
                          onClick={() => removeTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
                
                <FormDescription className="text-xs mt-2">
                  Tags help you and your clients find this template more easily
                </FormDescription>
              </div>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Additional notes for yourself about this template" 
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
            <ActivityIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-800 dark:text-blue-300">Next steps after saving</AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-400">
              After creating this template, you'll be able to add detailed workout and meal plans before assigning it to clients.
            </AlertDescription>
          </Alert>
        </form>
      </Form>
    </div>
  );
}