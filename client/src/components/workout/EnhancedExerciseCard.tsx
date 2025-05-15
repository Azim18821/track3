import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Pencil, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SetData {
  reps?: number | null;
  weight?: number | null;
  completed: boolean;
  setType?: string;
  targetRPE?: number;
  tempo?: string;
  notes?: string;
}

interface Exercise {
  id?: number;
  name: string;
  sets: number;
  reps?: number;
  weight?: number;
  unit?: string;
  setsData?: SetData[];
  rest?: string;
}

interface EnhancedExerciseCardProps {
  exercise: Exercise;
  exerciseIndex: number;
  onSetDataUpdate: (setIndex: number, data: Partial<SetData>) => void;
}

export default function EnhancedExerciseCard({
  exercise,
  exerciseIndex,
  onSetDataUpdate,
}: EnhancedExerciseCardProps) {
  const [editingSetIndex, setEditingSetIndex] = useState<number | null>(null);
  const [editingValues, setEditingValues] = useState<{
    reps: string;
    weight: string;
  }>({ reps: "", weight: "" });

  // Ensure exercise has setsData
  const setsData = exercise.setsData || Array(exercise.sets).fill({
    reps: exercise.reps || null,
    weight: exercise.weight || null,
    completed: false,
  });

  // Handle toggling set completion
  const handleToggleCompletion = (setIndex: number) => {
    onSetDataUpdate(setIndex, {
      completed: !setsData[setIndex].completed,
    });
  };

  // Start editing a set
  const handleStartEditing = (setIndex: number) => {
    setEditingSetIndex(setIndex);
    setEditingValues({
      reps: setsData[setIndex].reps?.toString() || "",
      weight: setsData[setIndex].weight?.toString() || "",
    });
  };

  // Save edited set values
  const handleSaveEditing = () => {
    if (editingSetIndex !== null) {
      onSetDataUpdate(editingSetIndex, {
        reps: editingValues.reps ? parseInt(editingValues.reps) : null,
        weight: editingValues.weight ? parseFloat(editingValues.weight) : null,
      });
      setEditingSetIndex(null);
    }
  };

  // Cancel editing
  const handleCancelEditing = () => {
    setEditingSetIndex(null);
  };

  // Update editing values
  const handleEditingChange = (field: "reps" | "weight", value: string) => {
    setEditingValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="space-y-3">
      {setsData.map((setData, setIndex) => (
        <Collapsible key={`set-${setIndex}`} className="w-full">
          <Card
            className={`border ${
              setData.completed
                ? "bg-primary/5 border-primary/20"
                : "bg-card border-border"
            }`}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`set-${exerciseIndex}-${setIndex}-completed`}
                    checked={setData.completed}
                    onCheckedChange={() => handleToggleCompletion(setIndex)}
                    className="h-5 w-5 rounded-full"
                  />
                  <div>
                    <Badge variant="outline" className="font-mono text-xs">
                      SET {setIndex + 1}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {editingSetIndex === setIndex ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        <Input
                          type="number"
                          value={editingValues.reps}
                          onChange={(e) =>
                            handleEditingChange("reps", e.target.value)
                          }
                          className="w-14 text-center h-8"
                          placeholder="Reps"
                        />
                        <span className="mx-1 text-xs text-muted-foreground">
                          reps
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Input
                          type="number"
                          value={editingValues.weight}
                          onChange={(e) =>
                            handleEditingChange("weight", e.target.value)
                          }
                          className="w-16 text-center h-8"
                          placeholder="Weight"
                          step="0.5"
                        />
                        <span className="mx-1 text-xs text-muted-foreground">
                          {exercise.unit || "kg"}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleSaveEditing}
                        className="h-8 w-8"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCancelEditing}
                        className="h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm font-medium flex gap-2">
                        <span>{setData.reps || "-"} reps</span>
                        <span>×</span>
                        <span>
                          {setData.weight || "-"} {exercise.unit || "kg"}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleStartEditing(setIndex)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </CollapsibleTrigger>
                    </>
                  )}
                </div>
              </div>

              <CollapsibleContent className="mt-3 pt-3 border-t">
                <div className="space-y-3">
                  {setData.targetRPE && (
                    <div className="flex justify-between items-center">
                      <Label className="text-sm">Target RPE</Label>
                      <Badge variant="secondary">{setData.targetRPE}</Badge>
                    </div>
                  )}
                  {setData.tempo && (
                    <div className="flex justify-between items-center">
                      <Label className="text-sm">Tempo</Label>
                      <Badge variant="secondary" className="font-mono">
                        {setData.tempo}
                      </Badge>
                    </div>
                  )}
                  {setData.notes && (
                    <div>
                      <Label className="text-sm">Notes</Label>
                      <p className="text-sm mt-1 text-muted-foreground">
                        {setData.notes}
                      </p>
                    </div>
                  )}
                  {!setData.targetRPE && !setData.tempo && !setData.notes && (
                    <p className="text-sm text-muted-foreground italic">
                      No additional details for this set
                    </p>
                  )}
                </div>
              </CollapsibleContent>
            </CardContent>
          </Card>
        </Collapsible>
      ))}
    </div>
  );
}