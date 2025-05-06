import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, AlertTriangle, ShoppingCart, Store } from "lucide-react";
import { 
  ShoppingItem, 
  DailyShoppingGroup, 
  processShoppingItems, 
  groupShoppingItemsByDay 
} from '@/utils/shopping/shoppingUtils';

export interface ShoppingListProps {
  shoppingItems: ShoppingItem[];
  budgetLimit: number;
  isMobile: boolean;
}

function ShoppingBudgetCard({ shoppingItems, budgetLimit }: { shoppingItems: ShoppingItem[], budgetLimit: number }) {
  const groupedData = groupShoppingItemsByDay(shoppingItems);
  const totalCost = groupedData.overall.totalCost;
  
  // Calculate budget usage percentage
  const usagePercent = Math.min(Math.round((totalCost / budgetLimit) * 100), 100);
  
  // Determine if over budget - allow a 2% margin for rounding
  const isOverBudget = totalCost > (budgetLimit * 1.02);
  
  // Determine budget status class and message
  const statusClass = isOverBudget 
    ? 'text-destructive bg-destructive/10 border-destructive/20' 
    : (usagePercent > 90 
      ? 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800/30 dark:text-orange-400' 
      : 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800/30 dark:text-green-400');
  
  const statusMessage = isOverBudget 
    ? 'Over budget' 
    : (usagePercent > 90 
      ? 'Near budget limit' 
      : 'Within budget');
  
  // Get only days with items, sorted by day order
  const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'shared'];
  const daysWithItems = daysOrder.filter(day => 
    groupedData.byDay[day] && groupedData.byDay[day].items.length > 0
  );
  
  // Calculate category percentages for the pie chart visualization
  const categories: Record<string, { cost: number, percent: number, color: string }> = {};
  const colors = [
    'rgb(79, 70, 229)', // indigo
    'rgb(16, 185, 129)', // emerald
    'rgb(239, 68, 68)', // red
    'rgb(245, 158, 11)', // amber
    'rgb(99, 102, 241)', // indigo-light
    'rgb(139, 92, 246)', // violet
    'rgb(14, 165, 233)', // sky
    'rgb(249, 115, 22)', // orange
  ];
  
  // Group items by category and calculate totals
  shoppingItems.forEach(item => {
    const category = item.category || 'Other';
    if (!categories[category]) {
      categories[category] = { 
        cost: 0, 
        percent: 0, 
        color: colors[Object.keys(categories).length % colors.length]
      };
    }
    categories[category].cost += (Number(item.estimatedCost) || 0);
  });
  
  // Calculate percentage for each category
  Object.keys(categories).forEach(category => {
    categories[category].percent = Math.round((categories[category].cost / totalCost) * 100);
  });
  
  // Sort categories by cost (descending)
  const sortedCategories = Object.entries(categories)
    .sort((a, b) => b[1].cost - a[1].cost)
    .slice(0, 5); // Take top 5 categories for display
  
  return (
    <div>
      {/* Budget overview card */}
      <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl p-4 mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
          <div>
            <h3 className="text-lg font-bold mb-1">Weekly Budget</h3>
            <p className="text-sm text-muted-foreground">Your meal plan's estimated cost</p>
          </div>
          <div className="flex items-center mt-3 sm:mt-0">
            <div className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 ${statusClass}`}>
              {isOverBudget ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {statusMessage}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6 mt-4">
          <div className="flex-1">
            {/* Budget progress meter */}
            <div className="mb-6">
              <div className="flex justify-between items-end mb-2">
                <div className="font-medium">Budget Usage</div>
                <div className="text-right">
                  <span className={`font-bold text-lg ${isOverBudget ? 'text-destructive' : 'text-primary'}`}>
                    £{totalCost.toFixed(2)}
                  </span>
                  <span className="text-muted-foreground"> / £{budgetLimit.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    isOverBudget 
                      ? 'bg-destructive' 
                      : (usagePercent > 90 
                        ? 'bg-orange-500' 
                        : 'bg-gradient-to-r from-blue-500 to-indigo-600')
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              
              <div className="flex justify-between mt-2">
                <div className="text-sm">
                  <span className="font-medium">{usagePercent}%</span> used
                </div>
                <div className="text-sm font-medium">
                  {isOverBudget 
                    ? <span className="text-destructive">£{(totalCost - budgetLimit).toFixed(2)} over budget</span> 
                    : <span className="text-primary">£{(budgetLimit - totalCost).toFixed(2)} remaining</span>
                  }
                </div>
              </div>
            </div>
            
            {/* Daily breakdown with improved visuals */}
            <div>
              <h4 className="font-medium mb-3">Daily Breakdown</h4>
              <div className="space-y-3">
                {daysWithItems.map(day => {
                  // Calculate percentage of daily cost relative to budget
                  const dayPercent = Math.round((groupedData.byDay[day].totalCost / budgetLimit) * 100);
                  return (
                    <div key={day} className="relative">
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{groupedData.byDay[day].dayName}</div>
                          <div className="text-xs text-muted-foreground">
                            {groupedData.byDay[day].items.length} {groupedData.byDay[day].items.length === 1 ? 'item' : 'items'}
                          </div>
                        </div>
                        <div className="font-semibold">£{groupedData.byDay[day].totalCost.toFixed(2)}</div>
                      </div>
                      
                      {/* Day progress bar */}
                      <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-blue-500 dark:bg-blue-600"
                          style={{ width: `${Math.min(dayPercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* Category breakdown */}
          <div className="flex-1 mt-4 md:mt-0">
            <h4 className="font-medium mb-3">Top Spending Categories</h4>
            <div className="space-y-3">
              {sortedCategories.map(([category, data]) => (
                <div key={category} className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: data.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <div className="text-sm font-medium truncate pr-2">{category}</div>
                      <div className="text-sm text-muted-foreground whitespace-nowrap">£{data.cost.toFixed(2)}</div>
                    </div>
                    <div className="mt-1 h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full" 
                        style={{ width: `${data.percent}%`, backgroundColor: data.color }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 px-4 py-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900/30">
              <div className="flex items-start gap-2">
                <ShoppingCart className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Shopping Tip</p>
                  <p className="text-xs text-blue-600 dark:text-blue-500 mt-0.5">
                    For best value, consider buying the highest-cost categories at budget supermarkets like Aldi or Lidl.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShoppingItemList({ items }: { items: ShoppingItem[] }) {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-4">
        <ShoppingCart className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">No items in this category</p>
      </div>
    );
  }
  
  // Group by category if available
  const byCategory: Record<string, ShoppingItem[]> = {};
  
  items.forEach(item => {
    const category = item.category || 'Other';
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(item);
  });
  
  // Function to render a single shopping item
  const renderShoppingItem = (item: ShoppingItem, index: number) => {
    const meals = item.mealAssociations || (item as any).meals || [];
    const hasAlternatives = item.alternativeOptions && item.alternativeOptions.length > 0;
    const hasMeals = meals.length > 0;
    
    return (
      <div key={index} className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-100 dark:border-gray-800 hover:shadow-sm transition-shadow">
        <div className="flex justify-between items-start">
          <div className="flex-1 pr-3">
            <div className="font-medium text-md">{item.name || (item as any).itemName || 'Unknown Item'}</div>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-md px-2 py-1 text-sm font-medium border border-emerald-100 dark:border-emerald-800/30">
                {item.quantity || "1"} {item.unit || ''}
              </div>
              
              {/* Store badge inline with quantity */}
              {item.store && (
                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-md px-2 py-1 text-sm font-medium border border-blue-100 dark:border-blue-800/30 flex items-center">
                  <Store className="h-3 w-3 mr-1 inline" /> 
                  {item.storeUrl ? (
                    <a 
                      href={item.storeUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {item.store}
                    </a>
                  ) : (
                    <span>{item.store}</span>
                  )}
                </div>
              )}
            </div>
            
            {item.brand && (
              <div className="text-xs text-muted-foreground mt-2">Brand: {item.brand}</div>
            )}
          </div>
          
          {/* Price tag with improved styling */}
          <div className="text-right flex-shrink-0">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-100 dark:border-blue-800/40 rounded-lg px-3 py-2 shadow-sm">
              <span className="font-bold text-lg text-blue-700 dark:text-blue-300">£{(Number(item.estimatedCost) || 0).toFixed(2)}</span>
              {item.unitPrice && (
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 text-center">
                  {item.unitPrice}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Bottom row for expandable details */}
        {(hasMeals || hasAlternatives) && (
          <div className="mt-3 pt-2 border-t border-dashed border-gray-200 dark:border-gray-700/50 flex flex-wrap gap-3">
            {/* Meal associations */}
            {hasMeals && (
              <details className="text-xs group">
                <summary className="cursor-pointer text-primary hover:text-primary-dark inline-flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary group-open:bg-primary-dark mr-0.5"></span>
                  Used in {meals.length} {meals.length === 1 ? 'meal' : 'meals'}
                </summary>
                <ul className="mt-1.5 pl-4 list-disc text-muted-foreground">
                  {meals.map((meal: string, idx: number) => (
                    <li key={idx}>{meal}</li>
                  ))}
                </ul>
              </details>
            )}
            
            {/* Alternative options with price comparison */}
            {hasAlternatives && (
              <details className="text-xs group">
                <summary className="cursor-pointer text-primary hover:text-primary-dark inline-flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary group-open:bg-primary-dark mr-0.5"></span>
                  {item.alternativeOptions!.length} Alternative {item.alternativeOptions!.length === 1 ? 'option' : 'options'}
                </summary>
                <div className="mt-1.5 bg-gray-50 dark:bg-gray-800 rounded-md p-2">
                  <ul className="space-y-2">
                    {item.alternativeOptions!.map((alt, idx) => (
                      <li key={idx} className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-md px-1.5 py-0.5 text-xs mr-1.5">
                            {alt.store}
                          </div>
                          <span className="text-gray-700 dark:text-gray-300">{alt.name}</span>
                        </div>
                        <span className="font-medium text-indigo-600 dark:text-indigo-400">£{alt.price.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    );
  };
  
  // If no categories or only one category, just return the flat list
  if (Object.keys(byCategory).length <= 1) {
    return (
      <div className="grid grid-cols-1 gap-3">
        {items.map((item, index) => renderShoppingItem(item, index))}
      </div>
    );
  }
  
  // Otherwise, return categorized list
  return (
    <div className="space-y-6">
      {Object.entries(byCategory).map(([category, categoryItems]) => (
        <div key={category} className="bg-gray-50/50 dark:bg-gray-850/50 rounded-lg p-3">
          <h4 className="font-medium mb-3 px-1 flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400"></div>
            {category}
            <span className="text-xs text-muted-foreground">
              ({categoryItems.length} {categoryItems.length === 1 ? 'item' : 'items'})
            </span>
          </h4>
          <div className="grid grid-cols-1 gap-3">
            {categoryItems.map((item, index) => renderShoppingItem(item, index))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ShoppingItemsAccordion({ shoppingItems }: { shoppingItems: ShoppingItem[] }) {
  try {
    // Group items by day
    const groupedItemsByDay = groupShoppingItemsByDay(shoppingItems);
    
    // Sort days of the week properly
    const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'shared'];
    const sortedGroups = daysOrder.filter(day => 
      groupedItemsByDay.byDay[day] && groupedItemsByDay.byDay[day].items.length > 0
    );
    
    if (sortedGroups.length === 0) {
      return (
        <div className="text-center py-8">
          <ShoppingCart className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">No shopping items available</p>
        </div>
      );
    }
    
    return (
      <Accordion type="single" collapsible className="w-full">
        {sortedGroups.map((day) => {
          const itemCount = groupedItemsByDay.byDay[day].items.length;
          // Apply different colors based on the day to make it more visually appealing
          const colorMap: Record<string, string> = {
            monday: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
            tuesday: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300',
            wednesday: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
            thursday: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
            friday: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
            saturday: 'bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300',
            sunday: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
            shared: 'bg-slate-50 dark:bg-slate-900/20 text-slate-700 dark:text-slate-300',
          };
          const dayColor = colorMap[day] || 'bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300';
          
          return (
            <AccordionItem key={day} value={day} className="border rounded-lg mb-3 overflow-hidden">
              <AccordionTrigger className={`px-4 py-3 hover:no-underline hover:bg-opacity-80 ${dayColor}`}>
                <div className="flex justify-between w-full items-center">
                  <div className="flex items-center">
                    <span className="font-medium">
                      {groupedItemsByDay.byDay[day].dayName}
                    </span>
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300">
                      {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-semibold text-lg mr-3">
                      £{groupedItemsByDay.byDay[day].totalCost.toFixed(2)}
                    </span>
                    {/* Icon is handled by AccordionTrigger */}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-1 pb-1">
                <div className="bg-white dark:bg-gray-900 rounded-b-lg p-3">
                  <ShoppingItemList items={groupedItemsByDay.byDay[day].items} />
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    );
  } catch (err) {
    console.error('Error rendering shopping accordion:', err);
    return (
      <div className="text-center py-8 border rounded-lg bg-red-50 dark:bg-red-900/10">
        <AlertTriangle className="h-12 w-12 text-red-500/60 mx-auto mb-3" />
        <p className="text-red-500 dark:text-red-400">Error loading shopping data</p>
      </div>
    );
  }
}

export function ShoppingList({ shoppingItems, budgetLimit, isMobile }: ShoppingListProps) {
  const totalCost = shoppingItems.reduce(
    (acc: number, item: ShoppingItem) => acc + (Number(item.estimatedCost) || 0), 
    0
  );
  
  return (
    <div>
      <div className="mb-4">
        <h3 className={`${isMobile ? "text-xl" : "text-2xl"} font-bold mb-2`}>Weekly Shopping List</h3>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-muted-foreground">Complete shopping list with estimated costs based on your meal plan</p>
            <p className="text-xs text-muted-foreground mt-1">Note: Budget is a guideline - actual costs may be higher or lower depending on stores and product availability</p>
          </div>
          <Badge variant="outline" className="ml-2 font-medium text-primary border-primary whitespace-nowrap">
            Budget Limit: £{budgetLimit.toFixed(2)}
          </Badge>
        </div>
      </div>
      
      {/* Budget Summary Card */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Shopping Budget Overview</CardTitle>
          <CardDescription>
            Weekly budget breakdown by day of your meal plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ShoppingBudgetCard shoppingItems={shoppingItems} budgetLimit={budgetLimit} />
        </CardContent>
      </Card>
      
      {/* Shopping Items Card */}
      <Card>
        <CardHeader>
          <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle>Shopping List</CardTitle>
              <CardDescription className="mt-1">
                Organized by day for easy meal planning
              </CardDescription>
            </div>
            <div className="flex items-center bg-blue-50 dark:bg-blue-950/30 px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800/50">
              <span className="text-blue-700 dark:text-blue-400 font-bold">Est. Total: </span>
              <span className="text-blue-700 dark:text-blue-400 font-bold text-lg ml-1">£{totalCost.toFixed(2)}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ShoppingItemsAccordion shoppingItems={shoppingItems} />
        </CardContent>
      </Card>
    </div>
  );
}

interface StoreRecommendationProps {
  stores: Array<{
    name: string;
    recommendation: string;
    bestDeals?: string;
  } | string>;
}

export function StoreRecommendationCard({ stores }: StoreRecommendationProps) {
  if (!stores || stores.length === 0) return null;
  
  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center">
          <Store className="h-5 w-5 mr-2 text-primary" />
          Recommended UK Stores
        </CardTitle>
        <CardDescription>Where to find the best deals on your shopping list</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stores.map((store, index) => (
            <div key={index} className={`${index < (stores.length - 1) ? "pb-4 border-b" : ""} rounded-lg`}>
              <div className="flex items-center mb-2">
                <div className="bg-primary/10 text-primary rounded-full p-1.5 mr-2">
                  <Store className="h-4 w-4" />
                </div>
                <h4 className="font-semibold text-lg">{typeof store === 'string' ? store : store.name}</h4>
              </div>
              
              {typeof store !== 'string' && store.recommendation && (
                <p className="text-sm text-muted-foreground ml-9">{store.recommendation}</p>
              )}
              
              {typeof store !== 'string' && store.bestDeals && (
                <div className="mt-2 ml-9 bg-green-50 border border-green-100 rounded-md p-2">
                  <div className="flex items-center mb-1">
                    <span className="text-xs font-medium text-green-800 bg-green-100 px-2 py-0.5 rounded-full">
                      Best Deals
                    </span>
                  </div>
                  <p className="text-sm text-green-800">{store.bestDeals}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}