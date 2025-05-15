import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMealEntriesForDate, MealEntry, calculateMealEntryTotals } from "@/hooks/use-meal-entries";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon, PencilIcon, Trash2Icon, PlusIcon } from "lucide-react";
import MultiFoodMealDialog from "./MultiFoodMealDialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useDeleteMealEntry } from "@/hooks/use-meal-entries";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatMacros } from "@/lib/format-macros";

interface MealEntriesDisplayProps {
  date: Date;
  onAddMeal?: () => void;
}

export function MealEntriesDisplay({ date, onAddMeal }: MealEntriesDisplayProps) {
  const { toast } = useToast();
  const { data: mealEntries, isLoading, refetch } = useMealEntriesForDate(date);
  const deleteMealEntry = useDeleteMealEntry();
  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Group entries by meal type
  const mealTypeGroups = {
    breakfast: mealEntries?.filter(entry => entry.mealType === 'breakfast') || [],
    lunch: mealEntries?.filter(entry => entry.mealType === 'lunch') || [],
    dinner: mealEntries?.filter(entry => entry.mealType === 'dinner') || [],
    snack: mealEntries?.filter(entry => entry.mealType === 'snack') || []
  };

  const editMeal = (meal: MealEntry) => {
    setEditingMeal(meal);
    setIsEditDialogOpen(true);
  };

  const handleDeleteMeal = async (mealId: number) => {
    try {
      await deleteMealEntry.mutateAsync(mealId);
      toast({
        title: "Meal deleted",
        description: "Your meal has been successfully deleted"
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error deleting meal",
        description: "There was an error deleting your meal",
        variant: "destructive"
      });
    }
  };

  const handleMealSaved = () => {
    refetch();
    setEditingMeal(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    );
  }

  const renderMealGroup = (title: string, entries: MealEntry[]) => {
    if (entries.length === 0) {
      return (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-2 text-muted-foreground">
              No meals logged for {title.toLowerCase()}
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {entries.map(entry => {
            const totals = calculateMealEntryTotals(entry);
            
            return (
              <div key={entry.id} className="p-2 border rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h4 className="font-medium">{entry.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(entry.date), "h:mm a")}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => editMeal(entry)}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDeleteMeal(entry.id!)}
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1 mb-2">
                  <Badge variant="outline">{totals.calories} cal</Badge>
                  <Badge variant="outline">P: {formatMacros(totals.protein)}g</Badge>
                  <Badge variant="outline">C: {formatMacros(totals.carbs)}g</Badge>
                  <Badge variant="outline">F: {formatMacros(totals.fat)}g</Badge>
                </div>
                
                {entry.items.length > 0 && (
                  <ScrollArea className="h-24 w-full rounded-md border p-2">
                    <div className="space-y-1">
                      {entry.items.map((item, idx) => (
                        <div key={idx} className="text-sm flex justify-between">
                          <span>{item.foodName} ({item.servingSize} {item.servingUnit})</span>
                          <span>{item.calories} cal</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
                
                {entry.notes && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    <Separator className="my-1" />
                    <p>{entry.notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  const totalCalories = mealEntries?.reduce((sum, entry) => {
    const totals = calculateMealEntryTotals(entry);
    return sum + totals.calories;
  }, 0) || 0;
  
  const totalProtein = mealEntries?.reduce((sum, entry) => {
    const totals = calculateMealEntryTotals(entry);
    return sum + totals.protein;
  }, 0) || 0;
  
  const totalCarbs = mealEntries?.reduce((sum, entry) => {
    const totals = calculateMealEntryTotals(entry);
    return sum + totals.carbs;
  }, 0) || 0;
  
  const totalFat = mealEntries?.reduce((sum, entry) => {
    const totals = calculateMealEntryTotals(entry);
    return sum + totals.fat;
  }, 0) || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <CalendarIcon className="mr-2 h-5 w-5" />
          <h2 className="text-xl font-bold">{format(date, "MMMM d, yyyy")}</h2>
        </div>
        <MultiFoodMealDialog 
          trigger={
            <Button onClick={onAddMeal}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Meal
            </Button>
          }
          defaultDate={date}
          onSaveMeal={handleMealSaved}
        />
      </div>
      
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-2xl font-bold">{totalCalories}</div>
              <div className="text-xs text-muted-foreground">Calories</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{formatMacros(totalProtein)}g</div>
              <div className="text-xs text-muted-foreground">Protein</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{formatMacros(totalCarbs)}g</div>
              <div className="text-xs text-muted-foreground">Carbs</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{formatMacros(totalFat)}g</div>
              <div className="text-xs text-muted-foreground">Fat</div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {renderMealGroup("Breakfast", mealTypeGroups.breakfast)}
      {renderMealGroup("Lunch", mealTypeGroups.lunch)}
      {renderMealGroup("Dinner", mealTypeGroups.dinner)}
      {renderMealGroup("Snacks", mealTypeGroups.snack)}
      
      {editingMeal && (
        <MultiFoodMealDialog 
          isOpen={isEditDialogOpen}
          setOpen={setIsEditDialogOpen}
          defaultMeal={editingMeal}
          onSaveMeal={handleMealSaved}
        />
      )}
    </div>
  );
}