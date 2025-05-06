import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdaptiveDialog, AdaptiveDialogContent, AdaptiveDialogDescription, AdaptiveDialogHeader, AdaptiveDialogTitle, AdaptiveDialogTrigger } from "@/components/ui/adaptive-dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, ChefHat, DollarSign, Heart } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface MealRecipe {
  id: number;
  name: string;
  description: string;
  ingredients: string;
  instructions: string;
  prepTime: number;
  cookTime: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: string;
  imageUrl?: string;
  budget: string;
  isPublic: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

const MealLibrary = () => {
  const { toast } = useToast();
  const [selectedRecipe, setSelectedRecipe] = useState<MealRecipe | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [budgetFilter, setBudgetFilter] = useState<string>("all");
  const [mealTypeFilter, setMealTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Fetch all meal recipes
  const { data: recipes, isLoading, error } = useQuery<MealRecipe[]>({
    queryKey: ["/api/meal-recipes"],
    queryFn: () => fetch("/api/meal-recipes").then(res => {
      if (!res.ok) throw new Error("Failed to fetch recipes");
      return res.json();
    }),
  });

  // Fetch featured meal recipes
  const { data: featuredRecipes } = useQuery<MealRecipe[]>({
    queryKey: ["/api/meal-recipes/featured"],
    queryFn: () => fetch("/api/meal-recipes/featured").then(res => {
      if (!res.ok) throw new Error("Failed to fetch featured recipes");
      return res.json();
    }),
  });

  // Filter recipes based on user selections
  const filteredRecipes = recipes?.filter(recipe => {
    const matchesBudget = budgetFilter === "all" || recipe.budget === budgetFilter;
    const matchesMealType = mealTypeFilter === "all" || recipe.mealType === mealTypeFilter;
    const matchesQuery = searchQuery === "" || 
      recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesBudget && matchesMealType && matchesQuery;
  });

  // Format ingredients for display (converting from JSON string)
  const formatIngredients = (ingredientsStr: string) => {
    try {
      const ingredients = JSON.parse(ingredientsStr);
      return Array.isArray(ingredients) 
        ? ingredients 
        : Object.entries(ingredients).map(([name, amount]) => `${name}: ${amount}`);
    } catch (e) {
      return ingredientsStr.split(',').map(i => i.trim());
    }
  };

  // Handle opening recipe details
  const handleOpenDetails = (recipe: MealRecipe) => {
    setSelectedRecipe(recipe);
    setIsDetailOpen(true);
  };

  // Budget badge color helper
  const getBudgetColor = (budget: string) => {
    switch (budget.toLowerCase()) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'high': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Format budget text for UK (£)
  const formatBudget = (budget: string) => {
    switch (budget.toLowerCase()) {
      case 'low': return '£ Budget-Friendly';
      case 'medium': return '££ Mid-Range';
      case 'high': return '£££ Premium';
      default: return budget;
    }
  };

  // Display error if fetch failed
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Meal Recipe Library</h1>
        <div className="p-4 bg-red-100 text-red-700 rounded-md">
          Error loading meal recipes: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Meal Recipe Library</h1>
      <p className="text-muted-foreground mb-6">Discover delicious and nutritious recipes for your meal plan</p>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="featured">Featured Recipes</TabsTrigger>
          <TabsTrigger value="all">All Recipes</TabsTrigger>
        </TabsList>

        {/* Featured Recipes Tab */}
        <TabsContent value="featured">
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Today's Featured Recipes</h2>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-64 bg-muted rounded-lg"></div>
                ))}
              </div>
            ) : featuredRecipes && featuredRecipes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredRecipes.map(recipe => (
                  <Card key={recipe.id} className="overflow-hidden">
                    {recipe.imageUrl && (
                      <div className="w-full h-48 overflow-hidden">
                        <img 
                          src={recipe.imageUrl} 
                          alt={recipe.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{recipe.name}</CardTitle>
                        <Badge className={getBudgetColor(recipe.budget)}>
                          {formatBudget(recipe.budget)}
                        </Badge>
                      </div>
                      <CardDescription>{recipe.description.substring(0, 100)}...</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Clock className="mr-1 h-4 w-4" />
                          <span>{recipe.prepTime + recipe.cookTime} min</span>
                        </div>
                        <div className="flex items-center">
                          <ChefHat className="mr-1 h-4 w-4" />
                          <span className="capitalize">{recipe.mealType}</span>
                        </div>
                        <div>
                          <span>{recipe.calories} kcal</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" onClick={() => handleOpenDetails(recipe)} className="w-full">
                        View Recipe
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No featured recipes available at the moment.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* All Recipes Tab */}
        <TabsContent value="all">
          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-4">
              <Select value={budgetFilter} onValueChange={setBudgetFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Budget Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Budgets</SelectItem>
                  <SelectItem value="low">Low Budget</SelectItem>
                  <SelectItem value="medium">Medium Budget</SelectItem>
                  <SelectItem value="high">High Budget</SelectItem>
                </SelectContent>
              </Select>

              <Select value={mealTypeFilter} onValueChange={setMealTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Meal Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Meal Types</SelectItem>
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                  <SelectItem value="snack">Snack</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-64 bg-muted rounded-lg"></div>
              ))}
            </div>
          ) : filteredRecipes && filteredRecipes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecipes.map(recipe => (
                <Card key={recipe.id} className="overflow-hidden">
                  {recipe.imageUrl && (
                    <div className="w-full h-48 overflow-hidden">
                      <img 
                        src={recipe.imageUrl} 
                        alt={recipe.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{recipe.name}</CardTitle>
                      <Badge className={getBudgetColor(recipe.budget)}>
                        {formatBudget(recipe.budget)}
                      </Badge>
                    </div>
                    <CardDescription>{recipe.description.substring(0, 100)}...</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Clock className="mr-1 h-4 w-4" />
                        <span>{recipe.prepTime + recipe.cookTime} min</span>
                      </div>
                      <div className="flex items-center">
                        <ChefHat className="mr-1 h-4 w-4" />
                        <span className="capitalize">{recipe.mealType}</span>
                      </div>
                      <div>
                        <span>{recipe.calories} kcal</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" onClick={() => handleOpenDetails(recipe)} className="w-full">
                      View Recipe
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No recipes match your search criteria.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Recipe Detail Dialog */}
      <AdaptiveDialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <AdaptiveDialogContent className="max-w-4xl w-full max-h-[80vh] md:max-h-[85vh] overflow-hidden">
          {selectedRecipe && (
            <>
              <AdaptiveDialogHeader>
                <AdaptiveDialogTitle className="text-xl">{selectedRecipe.name}</AdaptiveDialogTitle>
                <AdaptiveDialogDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={getBudgetColor(selectedRecipe.budget)}>
                      {formatBudget(selectedRecipe.budget)}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {selectedRecipe.mealType}
                    </Badge>
                    <span className="text-sm text-muted-foreground ml-auto flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      Prep: {selectedRecipe.prepTime} min | Cook: {selectedRecipe.cookTime} min
                    </span>
                  </div>
                </AdaptiveDialogDescription>
              </AdaptiveDialogHeader>

              <ScrollArea className="max-h-[calc(80vh-120px)] md:max-h-[calc(85vh-120px)] pr-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left column with image and nutrition info */}
                  <div className="md:col-span-1">
                    {selectedRecipe.imageUrl ? (
                      <div className="rounded-md overflow-hidden mb-4">
                        <img 
                          src={selectedRecipe.imageUrl} 
                          alt={selectedRecipe.name} 
                          className="w-full aspect-square object-cover"
                        />
                      </div>
                    ) : (
                      <div className="bg-muted rounded-md h-40 flex items-center justify-center mb-4">
                        <p className="text-muted-foreground">No image available</p>
                      </div>
                    )}

                    <div className="bg-muted/30 p-4 rounded-md mb-4">
                      <h4 className="font-medium mb-2">Nutrition Information</h4>
                      <div className="grid grid-cols-2 gap-y-2">
                        <div>Calories:</div>
                        <div className="font-medium">{selectedRecipe.calories} kcal</div>
                        <div>Protein:</div>
                        <div className="font-medium">{selectedRecipe.protein}g</div>
                        <div>Carbs:</div>
                        <div className="font-medium">{selectedRecipe.carbs}g</div>
                        <div>Fat:</div>
                        <div className="font-medium">{selectedRecipe.fat}g</div>
                      </div>
                    </div>
                  </div>

                  {/* Right column with recipe details */}
                  <div className="md:col-span-2">
                    <div className="mb-6">
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-muted-foreground">{selectedRecipe.description}</p>
                    </div>

                    <div className="mb-6">
                      <h4 className="font-medium mb-2">Ingredients</h4>
                      <ul className="list-disc pl-5 space-y-1">
                        {formatIngredients(selectedRecipe.ingredients).map((ingredient, idx) => (
                          <li key={idx} className="text-muted-foreground">{ingredient}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Instructions</h4>
                      <div className="space-y-4">
                        {selectedRecipe.instructions.split('\n').map((step, idx) => {
                          // Skip empty steps
                          if (!step.trim()) return null;
                          
                          // Extract step number if it includes 'Step X:' format
                          const stepMatch = step.match(/^Step\s+(\d+):\s+(.*)/i);
                          const stepNumber = stepMatch ? stepMatch[1] : (idx + 1).toString();
                          const stepContent = stepMatch ? stepMatch[2] : step;
                          
                          return (
                            <div key={idx} className="flex gap-3 items-start bg-muted/20 p-3 rounded-lg">
                              <div className="bg-primary text-primary-foreground w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                                {stepNumber}
                              </div>
                              <p className="text-muted-foreground text-base">{stepContent}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </AdaptiveDialogContent>
      </AdaptiveDialog>
    </div>
  );
};

export default MealLibrary;