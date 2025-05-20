import React, { useState, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ExerciseSelector from "./ExerciseSelector";

import {
  AdaptiveDialog,
  AdaptiveDialogContent,
  AdaptiveDialogHeader,
  AdaptiveDialogTitle,
  AdaptiveDialogFooter,
} from "@/components/ui/adaptive-dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, X, Search } from "lucide-react";
import { format } from "date-fns";

// Define the exercise types
type ExerciseType = 'strength' | 'cardio';

// Define the SetData interface for tracking per-set information
interface SetData {
  reps?: number;
  weight?: number;
  distance?: number;
  duration?: number;
  calories?: number;
  speed?: number;
  completed: boolean;
  notes?: string;
}

interface AddWorkoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
  initialDate?: string;
}

// Define schema for individual set data - supports both strength and cardio
const setDataSchema = z.object({
  reps: z.coerce.number().positive("Reps must be positive").optional(),
  weight: z.coerce.number().nonnegative("Weight cannot be negative").optional(),
  distance: z.coerce.number().nonnegative("Distance cannot be negative").optional(),
  duration: z.coerce.number().nonnegative("Duration cannot be negative").optional(),
  calories: z.coerce.number().nonnegative("Calories cannot be negative").optional(),
  speed: z.coerce.number().nonnegative("Speed cannot be negative").optional(),
  completed: z.boolean().default(false),
  notes: z.string().optional()
});

// Form schema with exercise type support
const createExerciseSchema = (isPlanMode: boolean, exerciseType: ExerciseType) => {
  // Base schema common to all exercise types
  const baseSchema = {
    name: z.string().min(1, "Exercise name is required"),
    exerciseType: z.enum(['strength', 'cardio']).default('strength'),
    sets: z.coerce.number().positive("Sets must be positive"),
    unit: z.string().default("kg"),
  };
  
  // Add strength-specific fields when needed
  if (exerciseType === 'strength') {
    return z.object({
      ...baseSchema,
      reps: isPlanMode 
        ? z.coerce.number().optional() 
        : z.coerce.number().positive("Reps must be positive"),
      weight: isPlanMode 
        ? z.coerce.number().optional() 
        : z.coerce.number().nonnegative("Weight cannot be negative").optional(),
      setsData: isPlanMode 
        ? z.array(setDataSchema).optional().or(z.undefined()) 
        : z.array(setDataSchema).optional()
    });
  } 
  // Add cardio-specific fields
  else {
    return z.object({
      ...baseSchema,
      distance: isPlanMode
        ? z.coerce.number().optional()
        : z.coerce.number().nonnegative("Distance cannot be negative").optional(),
      duration: isPlanMode
        ? z.coerce.number().optional()
        : z.coerce.number().positive("Duration is required for cardio").optional(),
      calories: z.coerce.number().nonnegative("Calories cannot be negative").optional(),
      speed: z.coerce.number().nonnegative("Speed cannot be negative").optional(),
      distanceUnit: z.string().default("km"),
      setsData: isPlanMode 
        ? z.array(setDataSchema).optional().or(z.undefined()) 
        : z.array(setDataSchema).optional()
    });
  }
};

// We'll create the actual schema in the component based on the plan mode state

// Create a dynamic form schema based on plan mode and exercise types
const createFormSchema = (isPlanMode: boolean, exerciseTypes: Record<number, ExerciseType>) => {
  return z.object({
    name: z.string().min(1, "Workout name is required"),
    date: z.string().min(1, "Date is required"),
    duration: z.coerce.number().positive("Duration must be positive"),
    notes: z.string().optional(),
    isPlanMode: z.boolean().optional(),
    exercises: z.array(
      z.union([
        createExerciseSchema(isPlanMode, 'strength'),
        createExerciseSchema(isPlanMode, 'cardio')
      ])
    ).min(1, "Add at least one exercise"),
  });
};

const AddWorkoutDialog: React.FC<AddWorkoutDialogProps> = ({
  isOpen,
  onClose,
  initialData,
  initialDate
}) => {
  const { toast } = useToast();
  const [isExerciseSelectorOpen, setIsExerciseSelectorOpen] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isPlanMode, setIsPlanMode] = useState(false);
  // Track exercise types for each exercise (default to strength)
  const [exerciseTypes, setExerciseTypes] = useState<Record<number, ExerciseType>>({0: 'strength'});

  // Create a memoized form schema based on the current plan mode state and exercise types
  const currentFormSchema = useMemo(() => 
    createFormSchema(isPlanMode, exerciseTypes), 
    [isPlanMode, exerciseTypes]
  );
  
  const form = useForm<z.infer<typeof currentFormSchema>>({
    resolver: zodResolver(currentFormSchema),
    defaultValues: initialData || {
      name: "",
      date: initialDate || format(new Date(), "yyyy-MM-dd"),
      duration: 45,
      notes: "",
      isPlanMode: isPlanMode,
      exercises: [{ 
        name: "", 
        exerciseType: 'strength',
        sets: 3, 
        reps: isPlanMode ? undefined : 10, 
        weight: isPlanMode ? undefined : 0, 
        unit: "kg",
        setsData: isPlanMode ? undefined : Array(3).fill({ reps: 10, weight: 0, completed: false })
      }],
    },
    mode: "onChange"
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "exercises"
  });

  // Mutation for adding a workout
  const addWorkoutMutation = useMutation({
    mutationFn: async (data: z.infer<typeof currentFormSchema>) => {
      return await apiRequest("POST", "/api/workouts", data);
    },
    onSuccess: () => {
      toast({
        title: "Workout added",
        description: "Your workout has been successfully saved",
      });
      onClose();
      queryClient.invalidateQueries({ queryKey: ['/api/workouts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save workout: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: z.infer<typeof currentFormSchema>) => {
    // Include the plan mode flag in the submitted data
    data.isPlanMode = isPlanMode;
    addWorkoutMutation.mutate(data);
  };

  const addExercise = () => {
    // Get the next index for exercise type tracking
    const nextIndex = form.getValues().exercises.length;
    // Default to strength exercise
    setExerciseTypes(prev => ({ ...prev, [nextIndex]: 'strength' }));
    
    if (isPlanMode) {
      append({ 
        name: "",
        exerciseType: 'strength', 
        sets: 3, 
        unit: "kg"
      });
    } else {
      append({ 
        name: "",
        exerciseType: 'strength', 
        sets: 3, 
        reps: 10, 
        weight: 0, 
        unit: "kg",
        setsData: Array(3).fill({ reps: 10, weight: 0, completed: false }) 
      });
    }
  };

  return (
    <AdaptiveDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AdaptiveDialogContent className="sm:max-w-lg max-h-[80vh] md:max-h-[85vh] overflow-y-auto">
        <AdaptiveDialogHeader>
          <AdaptiveDialogTitle>Add Workout</AdaptiveDialogTitle>
          <div className="flex items-center space-x-2 mt-2">
            <Switch 
              id="plan-mode" 
              checked={isPlanMode}
              onCheckedChange={(checked) => {
                setIsPlanMode(checked);
                // Reset form with new values appropriate for the mode
                form.reset({
                  ...form.getValues(),
                  isPlanMode: checked,
                  exercises: form.getValues().exercises.map(exercise => ({
                    ...exercise,
                    reps: checked ? undefined : (exercise.reps || 10),
                    weight: checked ? undefined : (exercise.weight || 0),
                    setsData: checked ? undefined : 
                      exercise.setsData || Array(exercise.sets).fill({ 
                        reps: 10, 
                        weight: 0, 
                        completed: false 
                      })
                  }))
                });
              }} 
            />
            <Label htmlFor="plan-mode" className="text-sm">
              Plan Mode (just pick exercises and sets, track actual weights during workout)
            </Label>
          </div>
        </AdaptiveDialogHeader>
        
        {/* Exercise Selector Dialog */}
        <ExerciseSelector
          isOpen={isExerciseSelectorOpen}
          onClose={() => setIsExerciseSelectorOpen(false)}
          onSelectExercise={(exerciseName) => {
            handleSelectExercise(exerciseName, form, currentExerciseIndex);
            setIsExerciseSelectorOpen(false);
          }}
        />
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workout Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Upper Body Workout" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} min="1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <Label className="block mb-2">Exercises</Label>
              {fields.map((field, index) => (
                <div key={field.id} className="mb-4 border border-gray-200 rounded-md p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium">Exercise {index + 1}</h4>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => fields.length > 1 && remove(index)}
                      disabled={fields.length <= 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name={`exercises.${index}.name`}
                    render={({ field }) => (
                      <FormItem className="mb-3">
                        <FormLabel>Exercise Name</FormLabel>
                        <div className="flex gap-2">
                          <FormControl className="flex-1">
                            <Input {...field} placeholder="Bench Press" />
                          </FormControl>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={() => {
                              setCurrentExerciseIndex(index);
                              setIsExerciseSelectorOpen(true);
                            }}
                          >
                            <Search className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Exercise Type Selector */}
                  <FormField
                    control={form.control}
                    name={`exercises.${index}.exerciseType`}
                    render={({ field }) => (
                      <FormItem className="mb-3">
                        <FormLabel>Exercise Type</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(value: ExerciseType) => {
                            // Update the form field
                            field.onChange(value);
                            // Update our tracking state
                            setExerciseTypes(prev => ({ ...prev, [index]: value }));
                            
                            // Reset fields based on exercise type
                            if (value === 'cardio') {
                              // Set cardio defaults
                              form.setValue(`exercises.${index}.duration`, 20);
                              form.setValue(`exercises.${index}.distance`, 2);
                              form.setValue(`exercises.${index}.distanceUnit`, 'km');
                              form.setValue(`exercises.${index}.calories`, 200);
                            } else {
                              // Set strength defaults
                              form.setValue(`exercises.${index}.reps`, 10);
                              form.setValue(`exercises.${index}.weight`, 0);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select exercise type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="strength">Strength</SelectItem>
                            <SelectItem value="cardio">Cardio</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Hidden field to track sets count */}
                  <FormField
                    control={form.control}
                    name={`exercises.${index}.sets`}
                    render={({ field }) => (
                      <FormItem className="hidden">
                        <FormControl>
                          <Input type="hidden" {...field} min="1" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {/* Hidden fields for default values */}
                  <FormField
                    control={form.control}
                    name={`exercises.${index}.reps`}
                    render={({ field }) => (
                      <FormItem className="hidden">
                        <FormControl>
                          <Input type="hidden" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name={`exercises.${index}.weight`}
                    render={({ field }) => (
                      <FormItem className="hidden">
                        <FormControl>
                          <Input type="hidden" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {/* Per-set configuration */}
                  <div className="pt-3">
                    {isPlanMode ? (
                      // Plan mode - just show number of sets selector
                      <div>
                        <FormField
                          control={form.control}
                          name={`exercises.${index}.sets`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Number of Sets</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  {...field} 
                                  onChange={(e) => {
                                    // Don't default to 1 if input is invalid
                                    const parsedValue = parseInt(e.target.value);
                                    const newSets = isNaN(parsedValue) ? '' : parsedValue;
                                    field.onChange(newSets);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    ) : (
                      // Normal mode - show either strength or cardio configuration based on exercise type
                      exerciseTypes[index] === 'cardio' ? (
                        // Cardio exercise configuration
                        <>
                          <h5 className="text-sm font-medium mb-2">Cardio Configuration</h5>
                          <p className="text-xs text-muted-foreground mb-3">Set distance, duration and other cardio metrics</p>
                          
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            {/* Duration field */}
                            <FormField
                              control={form.control}
                              name={`exercises.${index}.duration`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Duration (minutes)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min="1" 
                                      {...field} 
                                      onChange={(e) => {
                                        const value = parseInt(e.target.value);
                                        field.onChange(isNaN(value) ? '' : value);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            {/* Distance field with unit */}
                            <div>
                              <FormField
                                control={form.control}
                                name={`exercises.${index}.distance`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Distance</FormLabel>
                                    <div className="flex space-x-2">
                                      <FormControl className="flex-1">
                                        <Input 
                                          type="number" 
                                          min="0" 
                                          step="0.1"
                                          {...field} 
                                          onChange={(e) => {
                                            const value = parseFloat(e.target.value);
                                            field.onChange(isNaN(value) ? '' : value);
                                          }}
                                        />
                                      </FormControl>
                                      <FormField
                                        control={form.control}
                                        name={`exercises.${index}.distanceUnit`}
                                        render={({ field }) => (
                                          <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                          >
                                            <SelectTrigger className="w-20">
                                              <SelectValue placeholder="Unit" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="km">km</SelectItem>
                                              <SelectItem value="mi">mi</SelectItem>
                                              <SelectItem value="m">m</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        )}
                                      />
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            {/* Optional calories field */}
                            <FormField
                              control={form.control}
                              name={`exercises.${index}.calories`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Calories</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min="0" 
                                      placeholder="Calories burned"
                                      {...field} 
                                      onChange={(e) => {
                                        const value = parseInt(e.target.value);
                                        field.onChange(isNaN(value) ? '' : value);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            {/* Optional average speed field */}
                            <FormField
                              control={form.control}
                              name={`exercises.${index}.speed`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Avg. Speed</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min="0" 
                                      step="0.1"
                                      placeholder="km/h or mph"
                                      {...field} 
                                      onChange={(e) => {
                                        const value = parseFloat(e.target.value);
                                        field.onChange(isNaN(value) ? '' : value);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </>
                      ) : (
                        // Strength exercise configuration
                        <>
                          <h5 className="text-sm font-medium mb-2">Set Configuration</h5>
                          <p className="text-xs text-muted-foreground mb-3">Configure each set with different weights and reps</p>
                        
                        {(form.watch(`exercises.${index}.setsData`) || []).map((set: SetData, setIndex: number) => (
                          <div key={setIndex} className="mb-3 p-3 border rounded-md">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium">Set {setIndex + 1}</span>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => {
                                  // Get current sets data and sets count
                                  const currentSetsData = form.getValues(`exercises.${index}.setsData`) || [];
                                  const currentSetsCount = form.getValues(`exercises.${index}.sets`);
                                  
                                  // Remove this set if we have more than 1 set
                                  if (currentSetsData.length > 1) {
                                    const newSetsData = currentSetsData.filter((_: any, i: number) => i !== setIndex);
                                    form.setValue(`exercises.${index}.setsData`, newSetsData);
                                    form.setValue(`exercises.${index}.sets`, currentSetsCount - 1);
                                  }
                                }}
                                disabled={(form.watch(`exercises.${index}.setsData`) || []).length <= 1}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs" htmlFor={`set-weight-${setIndex}`}>Weight (kg)</Label>
                                <Input
                                  id={`set-weight-${setIndex}`}
                                  type="number"
                                  min="0"
                                  value={set.weight === 0 ? "" : set.weight}
                                  onChange={(e) => {
                                    const currentSetsData = form.getValues(`exercises.${index}.setsData`) || [];
                                    const newSetsData = [...currentSetsData];
                                    newSetsData[setIndex] = {
                                      ...newSetsData[setIndex],
                                      weight: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0
                                    };
                                    form.setValue(`exercises.${index}.setsData`, newSetsData);
                                  }}
                                  className="mt-1"
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <Label className="text-xs" htmlFor={`set-reps-${setIndex}`}>Reps</Label>
                                <Input
                                  id={`set-reps-${setIndex}`}
                                  type="number"
                                  min="1"
                                  value={set.reps === 0 || set.reps === 1 ? "" : set.reps}
                                  onChange={(e) => {
                                    const currentSetsData = form.getValues(`exercises.${index}.setsData`) || [];
                                    const newSetsData = [...currentSetsData];
                                    newSetsData[setIndex] = {
                                      ...newSetsData[setIndex],
                                      reps: e.target.value === "" ? 0 : parseInt(e.target.value) || 0
                                    };
                                    form.setValue(`exercises.${index}.setsData`, newSetsData);
                                  }}
                                  placeholder="0"
                                  className="mt-1"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const currentSetsData = form.getValues(`exercises.${index}.setsData`) || [];
                            const currentSetsCount = form.getValues(`exercises.${index}.sets`);
                            const defaultReps = form.getValues(`exercises.${index}.reps`);
                            const defaultWeight = form.getValues(`exercises.${index}.weight`) || 0;
                            
                            // Add one more set
                            const newSetsData = [
                              ...currentSetsData, 
                              {
                                reps: defaultReps || 10,
                                weight: defaultWeight || 0,
                                completed: false
                              }
                            ];
                            
                            // Update both setsData and sets count
                            form.setValue(`exercises.${index}.setsData`, newSetsData);
                            form.setValue(`exercises.${index}.sets`, currentSetsCount + 1);
                          }}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-1" /> Add Another Set
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addExercise}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Another Exercise
              </Button>
              {form.formState.errors.exercises?.message && (
                <p className="mt-1 text-sm text-red-500">{form.formState.errors.exercises.message}</p>
              )}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Any additional notes..."
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <AdaptiveDialogFooter className="pt-4">
              <Button variant="outline" onClick={onClose} type="button">Cancel</Button>
              <Button 
                type="submit" 
                disabled={addWorkoutMutation.isPending}
              >
                {addWorkoutMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </AdaptiveDialogFooter>
          </form>
        </Form>
      </AdaptiveDialogContent>
    </AdaptiveDialog>
  );
};

// Function to update exercise name from library or custom entry
const handleSelectExercise = (exerciseName: string, form: any, index: number) => {
  // Get the current exercise and isPlanMode status
  const currentExercise = form.getValues(`exercises.${index}`);
  const isPlanMode = form.getValues('isPlanMode');
  
  // Update just the name field
  form.setValue(`exercises.${index}.name`, exerciseName);
};

export default AddWorkoutDialog;
