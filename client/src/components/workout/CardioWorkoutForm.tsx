import { useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus, Trash2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

// Define exercise type to differentiate between strength and cardio
type ExerciseType = 'strength' | 'cardio';

// Exercise schema for both strength and cardio types
const exerciseSchema = z.object({
  name: z.string().min(1, { message: "Exercise name is required" }),
  exerciseType: z.enum(['strength', 'cardio']).default('strength'),
  sets: z.coerce.number().min(1, { message: "At least 1 set is required" }),
  // Fields for strength exercises
  reps: z.coerce.number().min(1, { message: "At least 1 rep is required" }).optional(),
  weight: z.coerce.number().optional(),
  // Fields for cardio exercises
  duration: z.coerce.number().min(1, { message: "Duration is required" }).optional(),
  distance: z.coerce.number().min(0, { message: "Distance cannot be negative" }).optional(),
  distanceUnit: z.string().default("km"),
  calories: z.coerce.number().min(0, { message: "Calories cannot be negative" }).optional(),
  speed: z.coerce.number().min(0, { message: "Speed cannot be negative" }).optional(),
  notes: z.string().optional(),
}).refine((data) => {
  // If it's a strength exercise, ensure reps are provided
  if (data.exerciseType === 'strength' && (data.reps === undefined || data.reps === null)) {
    return false;
  }
  // If it's a cardio exercise, ensure duration is provided
  if (data.exerciseType === 'cardio' && (data.duration === undefined || data.duration === null)) {
    return false;
  }
  return true;
}, {
  message: "Required fields missing for the exercise type",
  path: ['exerciseType']
});

// Main workout schema
const workoutSchema = z.object({
  name: z.string().min(1, { message: "Workout name is required" }),
  date: z.date(),
  duration: z.coerce.number().min(1, { message: "Duration must be positive" }),
  notes: z.string().optional(),
  exercises: z.array(exerciseSchema).min(1, { message: "Add at least one exercise" }),
});

type WorkoutFormValues = z.infer<typeof workoutSchema>;
type ExerciseFormValues = z.infer<typeof exerciseSchema>;

interface CardioWorkoutFormProps {
  onSubmit: (data: WorkoutFormValues) => void;
  initialData?: WorkoutFormValues;
  clientId?: number;
  onCancel: () => void;
  isEditMode?: boolean;
}

export default function CardioWorkoutForm({
  onSubmit,
  initialData,
  clientId,
  onCancel,
  isEditMode = false
}: CardioWorkoutFormProps) {
  const [isExerciseDialogOpen, setIsExerciseDialogOpen] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState<number | null>(null);
  const [exerciseLibrary, setExerciseLibrary] = useState<any[]>([]);
  const [showExerciseLibrary, setShowExerciseLibrary] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>("all");

  // Initialize form with default values or initial data
  const form = useForm<WorkoutFormValues>({
    resolver: zodResolver(workoutSchema),
    defaultValues: initialData || {
      name: "",
      date: new Date(),
      duration: 45,
      notes: "",
      exercises: [],
    },
    mode: "onChange",
  });

  // Set up field array for exercises
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "exercises",
  });

  // Handle form submission
  const handleSubmit = (data: WorkoutFormValues) => {
    onSubmit(data);
  };

  // Add a new exercise
  const addExercise = (exerciseType: ExerciseType = 'strength') => {
    if (exerciseType === 'strength') {
      append({
        name: "",
        exerciseType: 'strength',
        sets: 3,
        reps: 10,
        weight: 0,
      });
    } else {
      append({
        name: "",
        exerciseType: 'cardio',
        sets: 1,
        duration: 20,
        distance: 2,
        distanceUnit: "km",
        calories: 200,
      });
    }
  };

  // Edit an existing exercise
  const editExercise = (index: number) => {
    setCurrentExerciseIndex(index);
    setIsExerciseDialogOpen(true);
  };

  // Fetch exercise library for searching
  const fetchExerciseLibrary = async (muscleGroup: string = "all") => {
    try {
      let url = "/api/exercise-library";
      if (muscleGroup !== "all") {
        url += `?muscleGroup=${muscleGroup}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setExerciseLibrary(data);
      }
    } catch (error) {
      console.error("Error fetching exercise library:", error);
    }
  };

  // Filter exercises based on search term
  const filteredExercises = exerciseLibrary.filter((exercise) => 
    exercise.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle selecting an exercise from the library
  const selectExerciseFromLibrary = (exercise: any, index: number) => {
    const currentExercise = form.getValues(`exercises.${index}`);
    const exerciseType = exercise.muscleGroup === "cardio" ? "cardio" : "strength";
    
    // Update the exercise with library data
    update(index, {
      ...currentExercise,
      name: exercise.name,
      exerciseType: exerciseType,
      // Keep other existing values or set defaults based on type
      ...(exerciseType === 'cardio' ? {
        duration: currentExercise.duration || 20,
        distance: currentExercise.distance || 2,
        distanceUnit: currentExercise.distanceUnit || "km"
      } : {
        reps: currentExercise.reps || 10,
        weight: currentExercise.weight || 0
      })
    });
    
    setShowExerciseLibrary(false);
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>
          {isEditMode ? "Edit Workout" : "Create New Workout"}
        </CardTitle>
        <CardDescription>
          Create a workout with both strength and cardio exercises
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workout Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Upper Body Strength" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Workout Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workout Duration (minutes)</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Exercises</h3>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addExercise('strength')}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Strength Exercise
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addExercise('cardio')}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Cardio Exercise
                  </Button>
                </div>
              </div>

              {fields.length === 0 ? (
                <div className="text-center py-10 border rounded-md border-dashed">
                  <p className="text-sm text-muted-foreground mb-4">
                    No exercises added yet. Add a strength or cardio exercise to get started.
                  </p>
                  <div className="flex justify-center space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addExercise('strength')}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Strength Exercise
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addExercise('cardio')}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Cardio Exercise
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {fields.map((field, index) => {
                    const exerciseType = form.watch(`exercises.${index}.exerciseType`);
                    return (
                      <div key={field.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-medium">
                            Exercise {index + 1} ({exerciseType === 'cardio' ? 'Cardio' : 'Strength'})
                          </h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <FormField
                            control={form.control}
                            name={`exercises.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Exercise Name</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl>
                                    <Input {...field} placeholder={exerciseType === 'cardio' ? "e.g. Running" : "e.g. Bench Press"} />
                                  </FormControl>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                      setCurrentExerciseIndex(index);
                                      fetchExerciseLibrary(exerciseType === 'cardio' ? 'cardio' : 'all');
                                      setShowExerciseLibrary(true);
                                    }}
                                  >
                                    <Search className="h-4 w-4" />
                                  </Button>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`exercises.${index}.exerciseType`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Exercise Type</FormLabel>
                                <Select
                                  value={field.value}
                                  onValueChange={(value: ExerciseType) => {
                                    field.onChange(value);
                                    
                                    // Reset fields based on new type
                                    if (value === 'cardio') {
                                      form.setValue(`exercises.${index}.duration`, 20);
                                      form.setValue(`exercises.${index}.distance`, 2);
                                      form.setValue(`exercises.${index}.distanceUnit`, 'km');
                                      form.setValue(`exercises.${index}.calories`, 200);
                                      // Clear strength fields
                                      form.setValue(`exercises.${index}.reps`, undefined);
                                      form.setValue(`exercises.${index}.weight`, undefined);
                                    } else {
                                      form.setValue(`exercises.${index}.reps`, 10);
                                      form.setValue(`exercises.${index}.weight`, 0);
                                      // Clear cardio fields
                                      form.setValue(`exercises.${index}.duration`, undefined);
                                      form.setValue(`exercises.${index}.distance`, undefined);
                                      form.setValue(`exercises.${index}.calories`, undefined);
                                      form.setValue(`exercises.${index}.speed`, undefined);
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
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
                        </div>

                        {/* Show different fields based on exercise type */}
                        {exerciseType === 'strength' ? (
                          // Strength exercise fields
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                              control={form.control}
                              name={`exercises.${index}.sets`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Sets</FormLabel>
                                  <FormControl>
                                    <Input type="number" min="1" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`exercises.${index}.reps`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Reps</FormLabel>
                                  <FormControl>
                                    <Input type="number" min="1" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`exercises.${index}.weight`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Weight (kg)</FormLabel>
                                  <FormControl>
                                    <Input type="number" min="0" step="0.5" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        ) : (
                          // Cardio exercise fields
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name={`exercises.${index}.duration`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Duration (minutes)</FormLabel>
                                    <FormControl>
                                      <Input type="number" min="1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-2">
                                  <FormField
                                    control={form.control}
                                    name={`exercises.${index}.distance`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Distance</FormLabel>
                                        <FormControl>
                                          <Input type="number" min="0" step="0.1" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <FormField
                                  control={form.control}
                                  name={`exercises.${index}.distanceUnit`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Unit</FormLabel>
                                      <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Unit" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="km">km</SelectItem>
                                          <SelectItem value="mi">mi</SelectItem>
                                          <SelectItem value="m">m</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name={`exercises.${index}.calories`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Calories Burned</FormLabel>
                                    <FormControl>
                                      <Input type="number" min="0" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`exercises.${index}.speed`}
                                render={({ field: { value, onChange, ...fieldProps }}) => (
                                  <FormItem>
                                    <FormLabel>Average Speed</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        min="0" 
                                        step="0.1" 
                                        value={value || ''}
                                        onChange={e => {
                                          const val = e.target.value === '' ? undefined : Number(e.target.value);
                                          onChange(val);
                                        }}
                                        {...fieldProps} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {form.formState.errors.exercises?.message && (
                <p className="text-red-500 text-sm mt-2">{form.formState.errors.exercises.message}</p>
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
                      placeholder="Add any additional notes about this workout"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit">
                {isEditMode ? "Update Workout" : "Create Workout"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>

      {/* Exercise Library Dialog */}
      <Dialog open={showExerciseLibrary} onOpenChange={setShowExerciseLibrary}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Exercise</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="Search exercises..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Select
                value={selectedMuscleGroup}
                onValueChange={(value) => {
                  setSelectedMuscleGroup(value);
                  fetchExerciseLibrary(value);
                }}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Muscle Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="chest">Chest</SelectItem>
                  <SelectItem value="back">Back</SelectItem>
                  <SelectItem value="shoulders">Shoulders</SelectItem>
                  <SelectItem value="legs">Legs</SelectItem>
                  <SelectItem value="arms">Arms</SelectItem>
                  <SelectItem value="core">Core</SelectItem>
                  <SelectItem value="cardio">Cardio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="max-h-[300px] overflow-y-auto border rounded-md">
              {filteredExercises.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No exercises found. Try a different search.
                </div>
              ) : (
                <div className="divide-y">
                  {filteredExercises.map((exercise) => (
                    <div
                      key={exercise.id}
                      className="p-3 hover:bg-accent cursor-pointer flex justify-between items-center"
                      onClick={() => 
                        currentExerciseIndex !== null && 
                        selectExerciseFromLibrary(exercise, currentExerciseIndex)
                      }
                    >
                      <div>
                        <p className="font-medium">{exercise.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {exercise.muscleGroup} • {exercise.difficulty}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost">
                        Select
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExerciseLibrary(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}