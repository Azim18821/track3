import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import ExerciseDetail from "@/components/exercises/ExerciseDetail";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AdaptiveDialog,
  AdaptiveDialogContent,
  AdaptiveDialogDescription,
  AdaptiveDialogFooter,
  AdaptiveDialogHeader,
  AdaptiveDialogTitle,
  AdaptiveDialogTrigger,
} from "@/components/ui/adaptive-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Video, Edit, Trash2 } from "lucide-react";

type Exercise = {
  id: number;
  name: string;
  description: string;
  muscleGroup: string;
  difficulty: string;
  videoUrl?: string;
  imageUrl?: string;
  instructions: string;
  createdAt: string;
  updatedAt: string;
};

const muscleGroups = [
  "chest",
  "back",
  "shoulders",
  "legs",
  "arms",
  "core",
  "full body",
  "cardio"
];

const difficultyLevels = [
  "beginner",
  "intermediate",
  "advanced"
];

const ExerciseLibrary = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [exerciseForm, setExerciseForm] = useState({
    name: "",
    description: "",
    muscleGroup: "",
    difficulty: "",
    videoUrl: "",
    imageUrl: "",
    instructions: ""
  });
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  // Fetch all exercises
  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ["/api/exercise-library", selectedMuscleGroup],
    queryFn: async () => {
      let url = "/api/exercise-library";
      if (selectedMuscleGroup) {
        url += `?muscleGroup=${selectedMuscleGroup}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch exercises");
      return res.json();
    }
  });

  // Create exercise mutation
  const createExerciseMutation = useMutation({
    mutationFn: async (exerciseData: typeof exerciseForm) => {
      const response = await apiRequest("POST", "/api/exercise-library", exerciseData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Exercise created",
        description: "The exercise has been added to the library.",
      });
      setIsAddDialogOpen(false);
      setExerciseForm({
        name: "",
        description: "",
        muscleGroup: "",
        difficulty: "",
        videoUrl: "",
        imageUrl: "",
        instructions: ""
      });
      queryClient.invalidateQueries({ queryKey: ["/api/exercise-library"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to create exercise",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update exercise mutation
  const updateExerciseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<typeof exerciseForm> }) => {
      const response = await apiRequest("PUT", `/api/exercise-library/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Exercise updated",
        description: "The exercise has been updated in the library.",
      });
      setIsAddDialogOpen(false);
      setCurrentExercise(null);
      queryClient.invalidateQueries({ queryKey: ["/api/exercise-library"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to update exercise",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete exercise mutation
  const deleteExerciseMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/exercise-library/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Exercise deleted",
        description: "The exercise has been removed from the library.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/exercise-library"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete exercise",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setExerciseForm({
      ...exerciseForm,
      [e.target.name]: e.target.value
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setExerciseForm({
      ...exerciseForm,
      [name]: value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentExercise) {
      updateExerciseMutation.mutate({
        id: currentExercise.id,
        data: exerciseForm
      });
    } else {
      createExerciseMutation.mutate(exerciseForm);
    }
  };

  const openEditDialog = (exercise: Exercise) => {
    setCurrentExercise(exercise);
    setExerciseForm({
      name: exercise.name,
      description: exercise.description,
      muscleGroup: exercise.muscleGroup,
      difficulty: exercise.difficulty,
      videoUrl: exercise.videoUrl || "",
      imageUrl: exercise.imageUrl || "",
      instructions: exercise.instructions
    });
    setIsAddDialogOpen(true);
  };

  const openAddDialog = () => {
    setCurrentExercise(null);
    setExerciseForm({
      name: "",
      description: "",
      muscleGroup: "",
      difficulty: "",
      videoUrl: "",
      imageUrl: "",
      instructions: ""
    });
    setIsAddDialogOpen(true);
  };

  const handleDeleteExercise = (id: number) => {
    if (window.confirm("Are you sure you want to delete this exercise?")) {
      deleteExerciseMutation.mutate(id);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-500";
      case "intermediate":
        return "bg-yellow-500";
      case "advanced":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };
  
  // Helper function to capitalize difficulty levels for display
  const formatDifficulty = (difficulty: string): string => {
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  };

  return (
    <div className="container mx-auto py-4 px-4 sm:py-6 sm:px-6">
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold">Exercise Library</h1>
          {user?.isAdmin && (
            <Button onClick={openAddDialog} size="sm" className="sm:size-md">
              <Plus className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              Add Exercise
            </Button>
          )}
        </div>

        <Tabs defaultValue="all" className="w-full">
          <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:pb-0 sm:mx-0 sm:px-0">
            <TabsList className="mb-4 flex flex-wrap min-w-max">
              <TabsTrigger 
                value="all" 
                onClick={() => setSelectedMuscleGroup(null)}
                className="text-xs sm:text-sm"
              >
                All
              </TabsTrigger>
              {muscleGroups.map((group) => (
                <TabsTrigger 
                  key={group} 
                  value={group}
                  onClick={() => setSelectedMuscleGroup(group)}
                  className="text-xs sm:text-sm whitespace-nowrap"
                >
                  {group.charAt(0).toUpperCase() + group.slice(1)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value={selectedMuscleGroup || "all"} className="mt-0">
            {isLoading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : exercises.length === 0 ? (
              <div className="text-center p-12">
                <p className="text-muted-foreground">No exercises found in this category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {exercises.map((exercise: Exercise) => (
                  <Card key={exercise.id} className="overflow-hidden flex flex-col h-full">
                    {exercise.imageUrl && (
                      <div className="relative h-36 sm:h-48 w-full">
                        <img 
                          src={exercise.imageUrl} 
                          alt={exercise.name} 
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader className="p-3 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                        <div>
                          <CardTitle className="text-base sm:text-lg">{exercise.name}</CardTitle>
                          <CardDescription className="mt-1 text-xs sm:text-sm">
                            {exercise.muscleGroup.charAt(0).toUpperCase() + exercise.muscleGroup.slice(1)}
                          </CardDescription>
                        </div>
                        <Badge className={`${getDifficultyColor(exercise.difficulty)} text-xs whitespace-nowrap`}>
                          {formatDifficulty(exercise.difficulty)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pb-0 sm:p-6 sm:pb-0 flex-grow">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-3">{exercise.description}</p>
                      <Button 
                        variant="ghost" 
                        className="p-0 h-auto text-primary hover:text-primary/80 text-xs sm:text-sm mt-auto"
                        onClick={() => {
                          setSelectedExercise(exercise);
                          setIsDetailOpen(true);
                        }}
                      >
                        View details
                      </Button>
                    </CardContent>
                    <CardFooter className="flex justify-between items-center p-3 pt-1 sm:p-6 sm:pt-1">
                      {exercise.videoUrl && (
                        <div className="flex items-center">
                          <Video className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-primary" />
                          <Button 
                            variant="link" 
                            className="p-0 h-auto text-xs sm:text-sm"
                            onClick={() => {
                              setSelectedExercise(exercise);
                              setIsDetailOpen(true);
                            }}
                          >
                            Watch video
                          </Button>
                        </div>
                      )}
                      
                      {user?.isAdmin && (
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEditDialog(exercise)}
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteExercise(exercise.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AdaptiveDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <AdaptiveDialogContent className="max-w-md max-h-[80vh] md:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <AdaptiveDialogHeader>
            <AdaptiveDialogTitle className="text-xl sm:text-2xl">
              {currentExercise ? "Edit Exercise" : "Add New Exercise"}
            </AdaptiveDialogTitle>
            <AdaptiveDialogDescription className="text-xs sm:text-sm">
              {currentExercise 
                ? "Update the exercise details below." 
                : "Fill in the details to add a new exercise to the library."}
            </AdaptiveDialogDescription>
          </AdaptiveDialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 mt-2">
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="name" className="text-xs sm:text-sm">Exercise Name</Label>
              <Input
                id="name"
                name="name"
                value={exerciseForm.name}
                onChange={handleInputChange}
                required
                className="text-xs sm:text-sm h-8 sm:h-10"
              />
            </div>
            
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="description" className="text-xs sm:text-sm">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={exerciseForm.description}
                onChange={handleInputChange}
                required
                className="text-xs sm:text-sm min-h-[60px] sm:min-h-[80px]"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="muscleGroup" className="text-xs sm:text-sm">Muscle Group</Label>
                <Select
                  value={exerciseForm.muscleGroup}
                  onValueChange={(value) => handleSelectChange("muscleGroup", value)}
                  required
                >
                  <SelectTrigger className="h-8 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="Select muscle group" />
                  </SelectTrigger>
                  <SelectContent>
                    {muscleGroups.map((group) => (
                      <SelectItem key={group} value={group} className="text-xs sm:text-sm">
                        {group.charAt(0).toUpperCase() + group.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="difficulty" className="text-xs sm:text-sm">Difficulty</Label>
                <Select
                  value={exerciseForm.difficulty}
                  onValueChange={(value) => handleSelectChange("difficulty", value)}
                  required
                >
                  <SelectTrigger className="h-8 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    {difficultyLevels.map((level) => (
                      <SelectItem key={level} value={level} className="text-xs sm:text-sm">
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="videoUrl" className="text-xs sm:text-sm">Video URL (optional)</Label>
              <Input
                id="videoUrl"
                name="videoUrl"
                type="url"
                value={exerciseForm.videoUrl}
                onChange={handleInputChange}
                placeholder="https://..."
                className="text-xs sm:text-sm h-8 sm:h-10"
              />
            </div>
            
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="imageUrl" className="text-xs sm:text-sm">Image URL (optional)</Label>
              <Input
                id="imageUrl"
                name="imageUrl"
                type="url"
                value={exerciseForm.imageUrl}
                onChange={handleInputChange}
                placeholder="https://..."
                className="text-xs sm:text-sm h-8 sm:h-10"
              />
            </div>
            
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="instructions" className="text-xs sm:text-sm">Instructions</Label>
              <Textarea
                id="instructions"
                name="instructions"
                value={exerciseForm.instructions}
                onChange={handleInputChange}
                required
                rows={4}
                className="text-xs sm:text-sm min-h-[80px] sm:min-h-[120px]"
              />
            </div>
            
            <AdaptiveDialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 pt-2 sm:pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                size="sm"
                className="h-8 sm:h-10 text-xs sm:text-sm w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createExerciseMutation.isPending || updateExerciseMutation.isPending}
                size="sm"
                className="h-8 sm:h-10 text-xs sm:text-sm w-full sm:w-auto order-1 sm:order-2"
              >
                {(createExerciseMutation.isPending || updateExerciseMutation.isPending) && (
                  <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                )}
                {currentExercise ? "Update" : "Save"}
              </Button>
            </AdaptiveDialogFooter>
          </form>
        </AdaptiveDialogContent>
      </AdaptiveDialog>

      {/* Exercise Detail Dialog */}
      <ExerciseDetail
        exercise={selectedExercise}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  );
};

export default ExerciseLibrary;