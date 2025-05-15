import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2 } from "lucide-react";

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

interface ExerciseAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  name?: string;
}

const ExerciseAutocomplete: React.FC<ExerciseAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Exercise name",
  className = "",
  name,
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset search when dropdown closes
  useEffect(() => {
    if (!open) {
      setSearchTerm("");
    }
  }, [open]);

  // Fetch all exercises from the library
  const { data: exerciseLibrary = [], isLoading } = useQuery({
    queryKey: ["/api/exercise-library"],
    queryFn: async () => {
      const res = await fetch("/api/exercise-library");
      if (!res.ok) throw new Error("Failed to fetch exercises");
      return res.json();
    },
  });

  // Filter exercises based on search term
  const filteredExercises = exerciseLibrary.filter((exercise: Exercise) =>
    exercise.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // When user selects an exercise from the dropdown
  const handleSelectExercise = (exerciseName: string) => {
    onChange(exerciseName);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            ref={inputRef}
            name={name}
            value={value}
            placeholder={placeholder}
            className={`${className}`}
            onChange={(e) => {
              // Update the input value
              onChange(e.target.value);
              
              // Update search term for filtering dropdown
              setSearchTerm(e.target.value);
              
              // Open dropdown if not already open and there's text
              if (!open && e.target.value) {
                setOpen(true);
              }
              
              // Close dropdown if field is empty
              if (open && !e.target.value) {
                setOpen(false);
              }
            }}
            onClick={() => {
              // Open dropdown on click if there's text
              if (value && !open) {
                setOpen(true);
              }
            }}
            onFocus={() => {
              // Also set search term when focusing
              setSearchTerm(value);
              // Open dropdown on focus if there's text
              if (value && !open) {
                setOpen(true);
              }
            }}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] max-h-[300px] overflow-y-auto" align="start">
        <Command>
          <CommandInput 
            placeholder="Search exercises..." 
            value={searchTerm}
            onValueChange={setSearchTerm}
            className="h-9"
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <CommandEmpty>No exercise found. Type to create a custom exercise.</CommandEmpty>
                <CommandGroup>
                  {filteredExercises.slice(0, 15).map((exercise: Exercise) => (
                    <CommandItem
                      key={exercise.id}
                      value={exercise.name}
                      onSelect={() => handleSelectExercise(exercise.name)}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <span className="font-medium">{exercise.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {exercise.muscleGroup.charAt(0).toUpperCase() + exercise.muscleGroup.slice(1)}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default ExerciseAutocomplete;