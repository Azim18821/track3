import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

import { CalendarIcon, ChevronLeft, ChevronRight, Filter, ArrowLeft, BarChart, ShoppingCart, Utensils, Clock, Target, Info, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { DatePickerWithRange } from '@/components/date-range-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

// Type definitions
interface Meal {
  id: number;
  userId: number;
  name: string;
  mealType: string;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  date: string;
  isPlanned: boolean;
}

interface NutritionGoal {
  id: number;
  userId: number;
  caloriesPerDay: number;
  proteinPerDay: number;
  carbsPerDay: number;
  fatPerDay: number;
  createdAt: string;
}

interface DailyTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealTypeStats {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meals: Meal[];
}

interface ClientMealData {
  meals: Meal[];
  mealsByDate: Record<string, Meal[]>;
  dailyTotals: Record<string, DailyTotals>;
  nutritionGoal?: NutritionGoal;
}

interface DetailedDayData {
  date: string;
  meals: Meal[];
  mealTypeTotals: Record<string, MealTypeStats>;
  dailyTotals: DailyTotals;
  nutritionGoal?: NutritionGoal;
  adherence?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export default function ClientMealTracking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams();
  const clientId = params.clientId;
  
  // State for date range filtering
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 7),
    to: new Date()
  });
  
  // Handle date range updates
  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range && range.from) {
      setDateRange({
        from: range.from,
        to: range.to || range.from
      });
    }
  };
  
  // State for detailed day view
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dayDetails, setDayDetails] = useState<DetailedDayData | null>(null);
  
  // Fetch client meal data
  const { data: mealData, isLoading, error } = useQuery<ClientMealData>({
    queryKey: ['/api/trainer/clients', clientId, 'meals', dateRange.from, dateRange.to],
    queryFn: async () => {
      try {
        const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
        const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : '';
        
        const response = await fetch(
          `/api/trainer/clients/${clientId}/meals?start=${startDate}&end=${endDate}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch meal data');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error fetching meal data:', error);
        throw error;
      }
    },
    enabled: !!clientId && !!user?.isTrainer,
  });
  
  // Fetch client details (just for name and basic info)
  const { data: clientData, isLoading: clientLoading } = useQuery({
    queryKey: ['/api/trainer/clients', clientId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/trainer/clients/${clientId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch client data');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error fetching client data:', error);
        throw error;
      }
    },
    enabled: !!clientId && !!user?.isTrainer,
  });
  
  // Helper function to check if a date has meal data
  const hasMealData = (date: Date) => {
    if (!mealData?.mealsByDate) return false;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    return !!mealData.mealsByDate[dateStr] && mealData.mealsByDate[dateStr].length > 0;
  };
  
  // Helper function to check if a date is the selected date
  const isSelectedDate = (date: Date) => {
    if (!selectedDay) return false;
    return format(date, 'yyyy-MM-dd') === selectedDay;
  };
  
  // Helper function to get detailed data for a specific day
  const fetchDayDetails = (date: string) => {
    if (!mealData) return;
    
    const meals = mealData.mealsByDate[date] || [];
    const dailyTotals = mealData.dailyTotals[date] || { calories: 0, protein: 0, carbs: 0, fat: 0 };
    
    // Group and sum by meal type
    const mealTypeTotals: Record<string, MealTypeStats> = {};
    
    meals.forEach(meal => {
      if (!mealTypeTotals[meal.mealType]) {
        mealTypeTotals[meal.mealType] = {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          meals: []
        };
      }
      
      mealTypeTotals[meal.mealType].calories += meal.calories;
      mealTypeTotals[meal.mealType].protein += meal.protein;
      mealTypeTotals[meal.mealType].carbs += meal.carbs;
      mealTypeTotals[meal.mealType].fat += meal.fat;
      mealTypeTotals[meal.mealType].meals.push(meal);
    });
    
    // Calculate adherence if nutrition goals exist
    let adherence;
    if (mealData.nutritionGoal) {
      adherence = {
        calories: calculateAdherence(dailyTotals.calories, mealData.nutritionGoal.caloriesPerDay),
        protein: calculateAdherence(dailyTotals.protein, mealData.nutritionGoal.proteinPerDay),
        carbs: calculateAdherence(dailyTotals.carbs, mealData.nutritionGoal.carbsPerDay),
        fat: calculateAdherence(dailyTotals.fat, mealData.nutritionGoal.fatPerDay)
      };
    }
    
    setSelectedDay(date);
    setDayDetails({
      date,
      meals,
      mealTypeTotals,
      dailyTotals,
      nutritionGoal: mealData.nutritionGoal,
      adherence
    });
  };
  
  // Helper to calculate adherence percentage capped at 100%
  const calculateAdherence = (actual: number, target: number) => {
    if (!target || target <= 0) return 0;
    return Math.min(Math.round((actual / target) * 100), 100);
  };
  
  // Redirect if not a trainer
  useEffect(() => {
    if (user && !user.isTrainer && !user.isAdmin) {
      navigate('/');
    }
  }, [user, navigate]);
  
  // Handle access denied for non-trainers
  if (!user?.isTrainer && !user?.isAdmin) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You must be a trainer to view client meal tracking data.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // Display error state
  if (error) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load meal tracking data.'}
          </AlertDescription>
        </Alert>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => navigate(`/trainer/clients/${clientId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Client
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center mb-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-0 mr-2 hover:bg-transparent"
              onClick={() => navigate(`/trainer/clients/${clientId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            
            <h1 className="text-2xl font-bold">
              {clientLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  {clientData?.client?.username}'s Meal Tracking
                </>
              )}
            </h1>
          </div>
          
          <p className="text-muted-foreground">
            View and analyze your client's logged meals and nutritional data
          </p>
        </div>
        
        {/* Date range picker */}
        <div className="flex-shrink-0 w-full md:w-auto">
          <DatePickerWithRange
            dateRange={dateRange}
            onUpdate={(range) => setDateRange(range)}
          />
        </div>
      </div>
      
      {/* Main content */}
      <div className="grid md:grid-cols-12 gap-6">
        {/* Calendar and overview */}
        <div className="md:col-span-5 lg:col-span-4 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Meal Calendar
              </CardTitle>
              <CardDescription>
                Select a date to view detailed meal logs
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <CalendarComponent
                  mode="single"
                  onSelect={(date) => {
                    if (date) {
                      fetchDayDetails(format(date, 'yyyy-MM-dd'));
                    }
                  }}
                  selected={selectedDay ? new Date(selectedDay) : undefined}
                  defaultMonth={dateRange.to}
                  classNames={{
                    day_today: "bg-muted",
                    day_selected: "bg-primary !text-primary-foreground",
                  }}
                  modifiers={{
                    hasMealData: (date: Date) => hasMealData(date),
                    selected: (date: Date) => isSelectedDate(date),
                  }}
                  modifiersClassNames={{
                    hasMealData: "border-green-400 dark:border-green-700 border-2 bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50",
                    selected: "!border-primary !bg-primary hover:bg-primary/90 dark:hover:bg-primary/90",
                  }}
                />
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <BarChart className="h-4 w-4 mr-2" />
                Nutrition Summary
              </CardTitle>
              <CardDescription>
                {dateRange.from && dateRange.to ? (
                  <>
                    {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
                  </>
                ) : (
                  'Select a date range'
                )}
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                <>
                  {mealData && Object.keys(mealData.dailyTotals).length > 0 ? (
                    <div className="space-y-4">
                      {/* Calculate averages */}
                      {(() => {
                        const dayCount = Object.keys(mealData.dailyTotals).length;
                        const totals = Object.values(mealData.dailyTotals).reduce(
                          (acc, day) => {
                            acc.calories += day.calories;
                            acc.protein += day.protein;
                            acc.carbs += day.carbs;
                            acc.fat += day.fat;
                            return acc;
                          },
                          { calories: 0, protein: 0, carbs: 0, fat: 0 }
                        );
                        
                        const averages = {
                          calories: Math.round(totals.calories / dayCount),
                          protein: Math.round(totals.protein / dayCount),
                          carbs: Math.round(totals.carbs / dayCount),
                          fat: Math.round(totals.fat / dayCount),
                        };
                        
                        return (
                          <>
                            <div>
                              <div className="flex justify-between mb-1">
                                <Label className="text-xs">Daily Average Calories</Label>
                                <span className="text-xs font-medium">{averages.calories} kcal</span>
                              </div>
                              <Progress value={
                                mealData.nutritionGoal 
                                  ? calculateAdherence(averages.calories, mealData.nutritionGoal.caloriesPerDay) 
                                  : 50
                              } className="h-2" />
                            </div>
                            
                            <div>
                              <div className="flex justify-between mb-1">
                                <Label className="text-xs">Daily Average Protein</Label>
                                <span className="text-xs font-medium">{averages.protein} g</span>
                              </div>
                              <Progress value={
                                mealData.nutritionGoal
                                  ? calculateAdherence(averages.protein, mealData.nutritionGoal.proteinPerDay)
                                  : 50
                              } className="h-2 bg-blue-100 dark:bg-blue-950" />
                            </div>
                            
                            <div>
                              <div className="flex justify-between mb-1">
                                <Label className="text-xs">Daily Average Carbs</Label>
                                <span className="text-xs font-medium">{averages.carbs} g</span>
                              </div>
                              <Progress value={
                                mealData.nutritionGoal
                                  ? calculateAdherence(averages.carbs, mealData.nutritionGoal.carbsPerDay)
                                  : 50
                              } className="h-2 bg-amber-100 dark:bg-amber-950" />
                            </div>
                            
                            <div>
                              <div className="flex justify-between mb-1">
                                <Label className="text-xs">Daily Average Fat</Label>
                                <span className="text-xs font-medium">{averages.fat} g</span>
                              </div>
                              <Progress value={
                                mealData.nutritionGoal
                                  ? calculateAdherence(averages.fat, mealData.nutritionGoal.fatPerDay)
                                  : 50
                              } className="h-2 bg-red-100 dark:bg-red-950" />
                            </div>
                          </>
                        );
                      })()}
                      
                      {mealData.nutritionGoal && (
                        <div className="pt-2 text-xs text-muted-foreground flex items-start">
                          <Info className="h-3.5 w-3.5 mr-1.5 mt-0.5" />
                          <span>
                            Daily targets: {mealData.nutritionGoal.caloriesPerDay} kcal, 
                            {mealData.nutritionGoal.proteinPerDay}g protein, 
                            {mealData.nutritionGoal.carbsPerDay}g carbs, 
                            {mealData.nutritionGoal.fatPerDay}g fat
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Alert variant="default" className="bg-muted/30">
                      <Info className="h-4 w-4" />
                      <AlertTitle>No meal data</AlertTitle>
                      <AlertDescription>
                        No meals have been logged in the selected date range.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Detailed day view */}
        <div className="md:col-span-7 lg:col-span-8">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                {selectedDay ? (
                  <>
                    <Utensils className="h-4 w-4 mr-2" />
                    Meals for {format(new Date(selectedDay), 'EEEE, MMMM d, yyyy')}
                  </>
                ) : (
                  <>
                    <Info className="h-4 w-4 mr-2" />
                    Meal Details
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {selectedDay ? (
                  dayDetails ? (
                    `${dayDetails.meals.length} meal${dayDetails.meals.length !== 1 ? 's' : ''} logged`
                  ) : (
                    'Loading meal details...'
                  )
                ) : (
                  'Select a date from the calendar to view meal details'
                )}
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <>
                  {selectedDay && dayDetails ? (
                    <>
                      {/* Nutrition bars for the day */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                          <h3 className="text-sm font-medium mb-2">Daily Totals</h3>
                          <div className="space-y-2">
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span>Calories</span>
                                <span>{dayDetails.dailyTotals.calories} 
                                  {dayDetails.nutritionGoal && (
                                    <span className="text-muted-foreground"> / {dayDetails.nutritionGoal.caloriesPerDay} kcal</span>
                                  )}
                                </span>
                              </div>
                              <Progress 
                                value={dayDetails.adherence?.calories || 0} 
                                className="h-2" 
                              />
                            </div>
                            
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span>Protein</span>
                                <span>{dayDetails.dailyTotals.protein}
                                  {dayDetails.nutritionGoal && (
                                    <span className="text-muted-foreground"> / {dayDetails.nutritionGoal.proteinPerDay} g</span>
                                  )}
                                </span>
                              </div>
                              <Progress 
                                value={dayDetails.adherence?.protein || 0} 
                                className="h-2 bg-blue-100 dark:bg-blue-950" 
                              />
                            </div>
                            
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span>Carbs</span>
                                <span>{dayDetails.dailyTotals.carbs}
                                  {dayDetails.nutritionGoal && (
                                    <span className="text-muted-foreground"> / {dayDetails.nutritionGoal.carbsPerDay} g</span>
                                  )}
                                </span>
                              </div>
                              <Progress 
                                value={dayDetails.adherence?.carbs || 0} 
                                className="h-2 bg-amber-100 dark:bg-amber-950" 
                              />
                            </div>
                            
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span>Fat</span>
                                <span>{dayDetails.dailyTotals.fat}
                                  {dayDetails.nutritionGoal && (
                                    <span className="text-muted-foreground"> / {dayDetails.nutritionGoal.fatPerDay} g</span>
                                  )}
                                </span>
                              </div>
                              <Progress 
                                value={dayDetails.adherence?.fat || 0} 
                                className="h-2 bg-red-100 dark:bg-red-950" 
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium mb-2">Meal Distribution</h3>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(dayDetails.mealTypeTotals).map(([type, stats]) => (
                              <div key={type} className="border rounded-lg p-2">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-medium capitalize">{type}</span>
                                  <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                                    {stats.meals.length}
                                  </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {stats.calories} kcal · {stats.protein}g protein
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {/* Detailed meal list */}
                      <h3 className="text-sm font-medium mb-3">Logged Meals</h3>
                      
                      {dayDetails.meals.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Meal</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Serving</TableHead>
                                <TableHead className="text-right">Calories</TableHead>
                                <TableHead className="text-right">P/C/F</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {dayDetails.meals.map((meal) => (
                                <TableRow key={meal.id}>
                                  <TableCell className="font-medium">{meal.name}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="capitalize">
                                      {meal.mealType}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {meal.servingSize} {meal.servingUnit}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {meal.calories} kcal
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <span className="text-blue-600 dark:text-blue-400">{meal.protein}g</span> / 
                                    <span className="text-amber-600 dark:text-amber-400">{meal.carbs}g</span> / 
                                    <span className="text-red-600 dark:text-red-400">{meal.fat}g</span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <Alert className="bg-muted/20">
                          <Info className="h-4 w-4" />
                          <AlertTitle>No meals logged</AlertTitle>
                          <AlertDescription>
                            No meals were logged for this day.
                          </AlertDescription>
                        </Alert>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[400px] text-center">
                      <Utensils className="h-12 w-12 mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-1">Select a Date</h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Choose a date from the calendar to view detailed meal information for that day.
                        Days with logged meals are highlighted in green.
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Goals section */}
      <div className="mt-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Target className="h-4 w-4 mr-2" />
              Nutrition Goal Adherence
            </CardTitle>
            <CardDescription>
              Track how well your client is meeting their nutrition goals
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    {/* Daily adherence if nutrition goals exist */}
                    {mealData?.nutritionGoal && (
                      <div>
                        <h3 className="text-sm font-medium mb-3 flex items-center">
                          <Target className="h-4 w-4 mr-1" />
                          Goal Adherence
                        </h3>
                        <div className="space-y-4">
                          {Object.entries(mealData.dailyTotals).map(([date, totals]) => (
                            <div key={date} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">{format(new Date(date), 'EEE, MMM d')}</span>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => fetchDayDetails(date)}
                                >
                                  Details
                                </Button>
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <div className="flex justify-between text-xs mb-1">
                                    <span>Calories</span>
                                    <span>{totals.calories} / {mealData.nutritionGoal?.caloriesPerDay} kcal</span>
                                  </div>
                                  <Progress 
                                    value={calculateAdherence(totals.calories, mealData.nutritionGoal?.caloriesPerDay || 2000)} 
                                    className="h-2" 
                                  />
                                </div>
                                <div>
                                  <div className="flex justify-between text-xs mb-1">
                                    <span>Protein</span>
                                    <span>{totals.protein} / {mealData.nutritionGoal?.proteinPerDay} g</span>
                                  </div>
                                  <Progress 
                                    value={calculateAdherence(totals.protein, mealData.nutritionGoal?.proteinPerDay || 150)} 
                                    className="h-2 bg-blue-100 dark:bg-blue-950" 
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-3 flex items-center">
                      <BarChart className="h-4 w-4 mr-1" />
                      Overall Patterns
                    </h3>
                    
                    {mealData?.meals && mealData.meals.length > 0 ? (
                      <div className="space-y-4">
                        {/* Meal type distribution */}
                        <div>
                          <h4 className="text-xs font-medium mb-2">Meal Type Distribution</h4>
                          {(() => {
                            const mealTypes: Record<string, number> = {};
                            mealData.meals.forEach(meal => {
                              mealTypes[meal.mealType] = (mealTypes[meal.mealType] || 0) + 1;
                            });
                            
                            return (
                              <div className="grid grid-cols-2 gap-2">
                                {Object.entries(mealTypes).map(([type, count]) => (
                                  <div key={type} className="flex items-center">
                                    <div className="w-full">
                                      <div className="flex justify-between text-xs mb-1">
                                        <span className="capitalize">{type}</span>
                                        <span>{count} meals ({Math.round((count / mealData.meals.length) * 100)}%)</span>
                                      </div>
                                      <Progress 
                                        value={(count / mealData.meals.length) * 100} 
                                        className="h-2" 
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                        
                        {/* Most common foods */}
                        <div>
                          <h4 className="text-xs font-medium mb-2">Most Common Foods</h4>
                          {(() => {
                            const foodCounts: Record<string, {count: number, calories: number}> = {};
                            mealData.meals.forEach(meal => {
                              if (!foodCounts[meal.name]) {
                                foodCounts[meal.name] = { count: 0, calories: 0 };
                              }
                              foodCounts[meal.name].count += 1;
                              foodCounts[meal.name].calories += meal.calories;
                            });
                            
                            const topFoods = Object.entries(foodCounts)
                              .sort((a, b) => b[1].count - a[1].count)
                              .slice(0, 5);
                              
                            return (
                              <div className="space-y-1.5">
                                {topFoods.map(([name, data], i) => (
                                  <div key={name} className="flex justify-between text-xs">
                                    <span>{i+1}. {name}</span>
                                    <span>{data.count}x ({Math.round(data.calories / data.count)} kcal avg)</span>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    ) : (
                      <Alert className="bg-muted/20">
                        <Info className="h-4 w-4" />
                        <AlertTitle>No data available</AlertTitle>
                        <AlertDescription>
                          Not enough meal data to analyze patterns.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}