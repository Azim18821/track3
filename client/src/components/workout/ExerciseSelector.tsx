import { useState, useEffect, useRef } from "react";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Loader2, Search, Check, ChevronsUpDown } from "lucide-react";

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
  const [open, setOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

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

  // Automatically open the dropdown when the component is mounted
  useEffect(() => {
    if (isOpen) {
      // Reset state when the dialog opens
      setSearchTerm("");
      setSelectedExercise(null);
    }
  }, [isOpen]);

  // Auto-focus the search input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        const inputElement = document.querySelector('.command-input');
        if (inputElement instanceof HTMLInputElement) {
          inputElement.focus();
        }
      }, 100);
    }
  }, [open]);

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
              <div className="flex-1">
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className="w-full justify-between text-sm"
                    >
                      {selectedExercise ? selectedExercise.name : "Search exercises..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command className="w-full">
                      <CommandInput 
                        placeholder="Search exercises..." 
                        value={searchTerm}
                        onValueChange={setSearchTerm}
                        className="h-9"
                      />
                      <CommandList>
                        <CommandEmpty>No exercises found.</CommandEmpty>
                        <CommandGroup>
                          {isLoading ? (
                            <div className="flex justify-center items-center py-6">
                              <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            </div>
                          ) : (
                            filteredExercises.map((exercise: Exercise) => (
                              <CommandItem
                                key={exercise.id}
                                value={exercise.name}
                                onSelect={() => {
                                  setSelectedExercise(exercise);
                                  handleSelectLibraryExercise(exercise.name);
                                  setOpen(false);
                                }}
                                className="flex items-center justify-between"
                              >
                                <div>
                                  <p className="font-medium text-sm">{exercise.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {exercise.muscleGroup.charAt(0).toUpperCase() + exercise.muscleGroup.slice(1)} • {exercise.difficulty.charAt(0).toUpperCase() + exercise.difficulty.slice(1)}
                                  </p>
                                </div>
                                <Check
                                  className={`h-4 w-4 ${
                                    selectedExercise?.id === exercise.id ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                              </CommandItem>
                            ))
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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

            <div className="border rounded-md p-4 text-sm">
              <p className="font-medium mb-1">Selected Exercise</p>
              {selectedExercise ? (
                <div>
                  <p className="text-md font-semibold">{selectedExercise.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedExercise.muscleGroup.charAt(0).toUpperCase() + selectedExercise.muscleGroup.slice(1)} • {selectedExercise.difficulty.charAt(0).toUpperCase() + selectedExercise.difficulty.slice(1)}
                  </p>
                  {selectedExercise.description && (
                    <p className="text-xs mt-2 line-clamp-2">{selectedExercise.description}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No exercise selected. Use the search dropdown above.</p>
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