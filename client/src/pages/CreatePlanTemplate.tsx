import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

// UI Components
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Icons
import {
  ArrowLeft,
  Check,
  Dumbbell,
  Info,
  PlusCircle,
  Save,
  Tag,
  Utensils,
  CalendarRange,
  AlignJustify,
  X,
  Smile,
} from 'lucide-react';

// Form schema
const templateFormSchema = z.object({
  name: z.string().min(3, 'Template name must be at least 3 characters').max(100),
  description: z.string().optional(),
  type: z.enum(['fitness', 'nutrition', 'combined']),
  tags: z.array(z.string()).optional(),
  // Workout plan is required for fitness and combined templates
  workoutPlan: z.any(),
  // Meal plan is required for nutrition and combined templates
  mealPlan: z.any(),
  // Nutrition targets are required for nutrition and combined templates
  nutritionTargets: z.any().optional(),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

const workoutDays = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

const mealTypes = [
  'breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout'
];

const CreatePlanTemplate: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTag, setSelectedTag] = useState('');
  const [activeTab, setActiveTab] = useState('info');
  const [completedTabs, setCompletedTabs] = useState<string[]>([]);
  const formRef = React.useRef(null);

  // Initialize form
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'fitness',
      tags: [],
      workoutPlan: {
        weeklySchedule: {
          monday: { name: 'Rest Day', exercises: [] },
          tuesday: { name: 'Rest Day', exercises: [] },
          wednesday: { name: 'Rest Day', exercises: [] },
          thursday: { name: 'Rest Day', exercises: [] },
          friday: { name: 'Rest Day', exercises: [] },
          saturday: { name: 'Rest Day', exercises: [] },
          sunday: { name: 'Rest Day', exercises: [] },
        },
        notes: '',
      },
      mealPlan: {
        weeklyMeals: {
          monday: { breakfast: null, lunch: null, dinner: null, snacks: [] },
          tuesday: { breakfast: null, lunch: null, dinner: null, snacks: [] },
          wednesday: { breakfast: null, lunch: null, dinner: null, snacks: [] },
          thursday: { breakfast: null, lunch: null, dinner: null, snacks: [] },
          friday: { breakfast: null, lunch: null, dinner: null, snacks: [] },
          saturday: { breakfast: null, lunch: null, dinner: null, snacks: [] },
          sunday: { breakfast: null, lunch: null, dinner: null, snacks: [] },
        },
        notes: '',
      },
      nutritionTargets: {
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 70,
      },
    },
  });

  // Watch form values
  const watchType = form.watch('type');
  const watchTags = form.watch('tags') || [];
  
  // Handle form submission
  const onSubmit = async (values: TemplateFormValues) => {
    if (!user?.isTrainer) {
      toast({
        title: 'Unauthorized',
        description: 'Only trainers can create plan templates',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Based on the selected type, ensure required fields are included
      const payload = {
        ...values,
        // For fitness plans, only include workout plan
        workoutPlan: ['fitness', 'combined'].includes(values.type) ? values.workoutPlan : undefined,
        // For nutrition plans, only include meal plan and nutrition targets
        mealPlan: ['nutrition', 'combined'].includes(values.type) ? values.mealPlan : undefined,
        nutritionTargets: ['nutrition', 'combined'].includes(values.type) ? values.nutritionTargets : undefined,
      };

      const response = await fetch('/api/trainer/plan-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to create template');
      }

      const newTemplate = await response.json();

      toast({
        title: 'Template created',
        description: `"${values.name}" has been created successfully`,
      });

      // Navigate back to templates page
      navigate('/plan-templates');
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: 'Error',
        description: 'Failed to create the template. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manual function to check tab completion without triggering state updates
  const checkTabsCompletion = () => {
    const formValues = form.getValues();
    const tabs = [];
    
    // Check if basic info is completed
    if (formValues.name?.length >= 3 && formValues.type) {
      tabs.push('info');
    }
    
    // Check if workout plan is completed for fitness and combined templates
    if (!['fitness', 'combined'].includes(formValues.type) || 
        (formValues.workoutPlan && Object.values(formValues.workoutPlan.weeklySchedule || {}).some((day: any) => 
          day && day.name !== 'Rest Day' && day.exercises && day.exercises.length > 0))) {
      tabs.push('workout');
    }
    
    // Check if meal plan is completed for nutrition and combined templates
    if (!['nutrition', 'combined'].includes(formValues.type) || 
        (formValues.nutritionTargets && formValues.nutritionTargets.calories > 0)) {
      tabs.push('nutrition');
    }
    
    return tabs;
  };
  
  // Set initial tabs state once on mount
  React.useEffect(() => {
    // Update completed tabs only once on initial render
    setCompletedTabs(checkTabsCompletion());
  }, []); // Empty dependency array to run only once
  
  // Update completed tabs when user navigates between tabs
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCompletedTabs(checkTabsCompletion());
  };

  // Add a tag to the form
  const addTag = () => {
    if (!selectedTag || selectedTag.trim() === '') return;
    
    const currentTags = form.getValues('tags') || [];
    if (currentTags.includes(selectedTag)) return;
    
    form.setValue('tags', [...currentTags, selectedTag]);
    setSelectedTag('');
  };
  
  // Remove a tag from the form
  const removeTag = (tag: string) => {
    const currentTags = form.getValues('tags') || [];
    form.setValue('tags', currentTags.filter(t => t !== tag));
  };

  // Check if a tab is completed
  const isTabCompleted = (tabName: string) => {
    return completedTabs.includes(tabName);
  };

  // Simplified dummy component for workout plan UI (to be expanded)
  const WorkoutPlanEditor = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Weekly Workout Schedule</h3>
        <Button variant="outline" size="sm">
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Exercise
        </Button>
      </div>
      
      {workoutDays.map((day) => (
        <Card key={day} className="overflow-hidden">
          <CardHeader className="bg-muted/40 pb-2">
            <CardTitle className="text-base capitalize">{day}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <Input 
                className="max-w-[250px]" 
                placeholder={`${day.charAt(0).toUpperCase() + day.slice(1)} workout name`}
                defaultValue={form.getValues(`workoutPlan.weeklySchedule.${day}.name`)}
                onChange={(e) => {
                  const newWorkoutPlan = {...form.getValues('workoutPlan')};
                  newWorkoutPlan.weeklySchedule[day].name = e.target.value;
                  form.setValue('workoutPlan', newWorkoutPlan);
                }}
              />
              <Button variant="ghost" size="sm">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Exercise
              </Button>
            </div>
            
            {/* Placeholder for exercises */}
            <div className="text-center text-muted-foreground py-6">
              <p>No exercises added yet</p>
              <p className="text-sm">Add exercises to create your workout plan</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Simplified dummy component for nutrition plan UI (to be expanded)
  const NutritionPlanEditor = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Nutrition Targets</h3>
      </div>
      
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="nutritionTargets.calories"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Daily Calories</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                  </FormControl>
                  <FormDescription>
                    Recommended daily calorie intake
                  </FormDescription>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="nutritionTargets.protein"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Protein (g)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                  </FormControl>
                  <FormDescription>
                    Daily protein target in grams
                  </FormDescription>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="nutritionTargets.carbs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Carbohydrates (g)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                  </FormControl>
                  <FormDescription>
                    Daily carbohydrates target in grams
                  </FormDescription>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="nutritionTargets.fat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fat (g)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                  </FormControl>
                  <FormDescription>
                    Daily fat target in grams
                  </FormDescription>
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>
      
      <div className="flex items-center justify-between mt-8">
        <h3 className="text-lg font-medium">Meal Plan Templates</h3>
        <Button variant="outline" size="sm">
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Meal
        </Button>
      </div>
      
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Meal planning will be expanded in the full implementation. For now, you can set nutrition targets.
        </AlertDescription>
      </Alert>
    </div>
  );

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/plan-templates')}
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Create Plan Template</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full lg:w-64 space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div 
                  className={`flex items-center p-2 rounded-md cursor-pointer ${activeTab === 'info' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                  onClick={() => handleTabChange('info')}
                >
                  <AlignJustify className="h-4 w-4 mr-3" />
                  <span>Basic Information</span>
                  {isTabCompleted('info') && <Check className="h-4 w-4 ml-auto text-green-500" />}
                </div>
                
                <div 
                  className={`flex items-center p-2 rounded-md cursor-pointer ${activeTab === 'workout' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'} ${!['fitness', 'combined'].includes(watchType) ? 'opacity-50' : ''}`}
                  onClick={() => ['fitness', 'combined'].includes(watchType) && handleTabChange('workout')}
                >
                  <Dumbbell className="h-4 w-4 mr-3" />
                  <span>Workout Plan</span>
                  {isTabCompleted('workout') && <Check className="h-4 w-4 ml-auto text-green-500" />}
                </div>
                
                <div 
                  className={`flex items-center p-2 rounded-md cursor-pointer ${activeTab === 'nutrition' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'} ${!['nutrition', 'combined'].includes(watchType) ? 'opacity-50' : ''}`}
                  onClick={() => ['nutrition', 'combined'].includes(watchType) && handleTabChange('nutrition')}
                >
                  <Utensils className="h-4 w-4 mr-3" />
                  <span>Nutrition Plan</span>
                  {isTabCompleted('nutrition') && <Check className="h-4 w-4 ml-auto text-green-500" />}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Completion Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={(completedTabs.length / 3) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {completedTabs.length} of 3 sections completed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="flex-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {/* Basic Information Tab */}
              {activeTab === 'info' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>
                      Enter the details for your plan template
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Template Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 12-Week Muscle Building" {...field} />
                          </FormControl>
                          <FormDescription>
                            A clear, descriptive name for your template
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe your template and its intended use..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Optional details about this template
                          </FormDescription>
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
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="fitness">
                                <div className="flex items-center">
                                  <Dumbbell className="h-4 w-4 mr-2" />
                                  Fitness Plan
                                </div>
                              </SelectItem>
                              <SelectItem value="nutrition">
                                <div className="flex items-center">
                                  <Utensils className="h-4 w-4 mr-2" />
                                  Nutrition Plan
                                </div>
                              </SelectItem>
                              <SelectItem value="combined">
                                <div className="flex items-center">
                                  <span className="flex items-center mr-2">
                                    <Dumbbell className="h-4 w-4" />
                                    <span className="mx-0.5">+</span>
                                    <Utensils className="h-4 w-4" />
                                  </span>
                                  Combined Plan
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            The type determines which components are included in your template
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Tags input */}
                    <FormField
                      control={form.control}
                      name="tags"
                      render={() => (
                        <FormItem>
                          <FormLabel>Tags</FormLabel>
                          <div className="flex mt-1.5 mb-1.5">
                            <Input
                              placeholder="Add a tag..."
                              value={selectedTag}
                              onChange={(e) => setSelectedTag(e.target.value)}
                              className="flex-1 mr-2"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addTag();
                                }
                              }}
                            />
                            <Button
                              type="button"
                              onClick={addTag}
                              variant="secondary"
                            >
                              Add
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {watchTags.map((tag) => (
                              <Badge key={tag} variant="secondary">
                                <span className="mr-1">{tag}</span>
                                <X
                                  className="h-3 w-3 cursor-pointer"
                                  onClick={() => removeTag(tag)}
                                />
                              </Badge>
                            ))}
                            {watchTags.length === 0 && (
                              <span className="text-sm text-muted-foreground">
                                No tags added
                              </span>
                            )}
                          </div>
                          <FormDescription>
                            Add tags to help organize and filter your templates
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => navigate('/plan-templates')}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        if (['fitness', 'combined'].includes(watchType)) {
                          setActiveTab('workout');
                        } else {
                          setActiveTab('nutrition');
                        }
                      }}
                    >
                      {isTabCompleted('info') ? 'Continue' : 'Save and Continue'}
                    </Button>
                  </CardFooter>
                </Card>
              )}

              {/* Workout Plan Tab */}
              {activeTab === 'workout' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Workout Plan</CardTitle>
                    <CardDescription>
                      Design a weekly workout schedule for your clients
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <WorkoutPlanEditor />
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => handleTabChange('info')}
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        if (watchType === 'combined') {
                          setActiveTab('nutrition');
                        } else {
                          form.handleSubmit(onSubmit)();
                        }
                      }}
                    >
                      {watchType === 'combined' ? 'Continue' : 'Save Template'}
                    </Button>
                  </CardFooter>
                </Card>
              )}

              {/* Nutrition Plan Tab */}
              {activeTab === 'nutrition' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Nutrition Plan</CardTitle>
                    <CardDescription>
                      Set nutrition goals and meal recommendations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <NutritionPlanEditor />
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (watchType === 'combined') {
                          setActiveTab('workout');
                        } else {
                          setActiveTab('info');
                        }
                      }}
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Saving...' : 'Save Template'}
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default CreatePlanTemplate;