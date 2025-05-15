import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  AdaptiveDialog,
  AdaptiveDialogContent,
  AdaptiveDialogHeader,
  AdaptiveDialogTitle,
  AdaptiveDialogFooter,
} from "@/components/ui/adaptive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search } from "lucide-react";

interface Exercise {
  id: number;
  name: string;
  description: string;
  muscleGroup: string;
  difficulty: string;
  videoUrl?: string;
  imageUrl?: string;
  instructions: string;
}

interface ExerciseSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExercise: (exerciseName: string) => void;
}

const muscleGroups = [
  "all",
  "chest",
  "back",
  "shoulders",
  "legs",
  "arms",
  "core",
  "full body",
  "cardio"
];

const ExerciseSelector: React.FC<ExerciseSelectorProps> = ({
  isOpen,
  onClose,
  onSelectExercise
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>("all");
  const [customExerciseName, setCustomExerciseName] = useState("");
  const [activeTab, setActiveTab] = useState<string>("library");

  // Fetch exercises from the library
  const { data: exerciseLibrary = [], isLoading } = useQuery({
    queryKey: ["/api/exercise-library", selectedMuscleGroup],
    queryFn: async () => {
      let url = "/api/exercise-library";
      if (selectedMuscleGroup && selectedMuscleGroup !== "all") {
        url += `?muscleGroup=${selectedMuscleGroup}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch exercises");
      return res.json();
    },
    enabled: isOpen,
  });

  // Filter exercises based on search term
  const filteredExercises = exerciseLibrary.filter((exercise: Exercise) =>
    exercise.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle selecting an exercise from the library
  const handleSelectLibraryExercise = (exerciseName: string) => {
    onSelectExercise(exerciseName);
    onClose();
  };

  // Handle adding a custom exercise
  const handleAddCustomExercise = () => {
    if (customExerciseName.trim()) {
      onSelectExercise(customExerciseName.trim());
      onClose();
    }
  };

  return (
    <AdaptiveDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AdaptiveDialogContent className="sm:max-w-md max-h-[80vh] md:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <AdaptiveDialogHeader>
          <AdaptiveDialogTitle className="text-xl sm:text-2xl">Select Exercise</AdaptiveDialogTitle>
        </AdaptiveDialogHeader>

        <Tabs defaultValue="library" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="library" className="text-xs sm:text-sm">Exercise Library</TabsTrigger>
            <TabsTrigger value="custom" className="text-xs sm:text-sm">Custom Exercise</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2">
              <div className="flex-1 relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search exercises..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 text-sm"
                />
              </div>
              <Select
                value={selectedMuscleGroup}
                onValueChange={setSelectedMuscleGroup}
              >
                <SelectTrigger className="w-full sm:w-[180px] text-xs sm:text-sm">
                  <SelectValue placeholder="Muscle Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel className="text-xs sm:text-sm">Muscle Group</SelectLabel>
                    {muscleGroups.map((group) => (
                      <SelectItem key={group} value={group} className="text-xs sm:text-sm">
                        {group === "all" ? "All Groups" : group.charAt(0).toUpperCase() + group.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-md h-60 sm:h-72 overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-primary" />
                </div>
              ) : filteredExercises.length === 0 ? (
                <div className="flex justify-center items-center h-full text-muted-foreground p-4 text-center text-xs sm:text-sm">
                  No exercises found. Try a different search or add a custom exercise.
                </div>
              ) : (
                <div className="divide-y">
                  {filteredExercises.map((exercise: Exercise) => (
                    <button
                      key={exercise.id}
                      className="w-full text-left px-3 py-2 sm:px-4 sm:py-3 hover:bg-accent transition-colors flex items-center justify-between"
                      onClick={() => handleSelectLibraryExercise(exercise.name)}
                    >
                      <div>
                        <p className="font-medium text-xs sm:text-sm">{exercise.name}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {exercise.muscleGroup.charAt(0).toUpperCase() + exercise.muscleGroup.slice(1)} • {exercise.difficulty.charAt(0).toUpperCase() + exercise.difficulty.slice(1)}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        Select
                      </Button>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <div>
              <Label htmlFor="customExercise" className="text-xs sm:text-sm">Custom Exercise Name</Label>
              <Input
                id="customExercise"
                placeholder="e.g., Overhead Cable Twist"
                value={customExerciseName}
                onChange={(e) => setCustomExerciseName(e.target.value)}
                className="mt-1 text-xs sm:text-sm"
              />
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                Add your own exercise if you can't find it in the library.
              </p>
            </div>

            <div className="pt-3 sm:pt-4">
              <Button
                className="w-full text-xs sm:text-sm h-8 sm:h-10"
                onClick={handleAddCustomExercise}
                disabled={!customExerciseName.trim()}
                size="sm"
              >
                Add Custom Exercise
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <AdaptiveDialogFooter className="mt-2 sm:mt-4">
          <Button 
            variant="outline" 
            onClick={onClose}
            size="sm"
            className="text-xs sm:text-sm h-8 sm:h-10"
          >
            Cancel
          </Button>
        </AdaptiveDialogFooter>
      </AdaptiveDialogContent>
    </AdaptiveDialog>
  );
};

export default ExerciseSelector;