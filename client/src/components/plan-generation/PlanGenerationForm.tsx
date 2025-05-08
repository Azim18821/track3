/**
 * Plan Generation Form
 * Form component for users to input their preferences for plan generation
 */

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { usePlanGeneration } from "@/hooks/use-plan-generation";
import type { PlanGenerationParams } from "@/services/planGenerationService";

// Form validation schema
const formSchema = z.object({
  fitnessGoal: z.enum(["weightLoss", "muscleBuild", "stamina", "strength"], {
    required_error: "Please select a fitness goal",
  }),
  workoutDaysPerWeek: z.number().min(1).max(7),
  dietPreferences: z.array(z.string()).default([]),
  restrictions: z.array(z.string()).default([]),
  weeklyBudget: z.number().min(20).max(500),
  budgetCurrency: z.string().default("GBP"),
  activityLevel: z.enum(["sedentary", "light", "moderate", "very_active", "extra_active"], {
    required_error: "Please select your activity level",
  }),
  workoutDuration: z.number().min(15).max(120),
  fitnessLevel: z.enum(["beginner", "intermediate", "advanced"], {
    required_error: "Please select your fitness level",
  }),
});

// Diet preference options
const dietPreferenceOptions = [
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "pescatarian", label: "Pescatarian" },
  { id: "paleo", label: "Paleo" },
  { id: "keto", label: "Keto" },
  { id: "mediterranean", label: "Mediterranean" },
  { id: "low_carb", label: "Low Carb" },
  { id: "high_protein", label: "High Protein" },
];

// Dietary restriction options
const dietaryRestrictionOptions = [
  { id: "gluten", label: "Gluten-Free" },
  { id: "lactose", label: "Lactose-Free" },
  { id: "nuts", label: "No Nuts" },
  { id: "shellfish", label: "No Shellfish" },
  { id: "soy", label: "No Soy" },
  { id: "eggs", label: "No Eggs" },
];

// Fitness goal readable labels
const fitnessGoalLabels: Record<string, string> = {
  weightLoss: "Weight Loss",
  muscleBuild: "Muscle Building",
  stamina: "Endurance & Stamina",
  strength: "Strength Training",
};

// Activity level readable labels
const activityLevelLabels: Record<string, string> = {
  sedentary: "Sedentary (little or no exercise)",
  light: "Light (exercise 1-3 days/week)",
  moderate: "Moderate (exercise 3-5 days/week)",
  very_active: "Very Active (exercise 6-7 days/week)",
  extra_active: "Extra Active (physical job & daily exercise)",
};

/**
 * PlanGenerationForm component
 * @param onSuccess - Callback for when the plan is successfully submitted
 */
export function PlanGenerationForm({ onSuccess }: { onSuccess?: () => void }) {
  const { startGenerationMutation } = usePlanGeneration();
  
  // Define form with validation
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fitnessGoal: "weightLoss",
      workoutDaysPerWeek: 3,
      dietPreferences: [],
      restrictions: [],
      weeklyBudget: 80,
      budgetCurrency: "GBP",
      activityLevel: "moderate",
      workoutDuration: 45,
      fitnessLevel: "intermediate",
    },
  });

  // Handle form submission
  async function onSubmit(data: z.infer<typeof formSchema>) {
    try {
      await startGenerationMutation.mutateAsync(data as PlanGenerationParams);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error submitting plan generation form:", error);
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Create Your Custom Fitness Plan</CardTitle>
        <CardDescription>
          Provide your preferences to generate a personalized workout & meal plan
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Fitness Goal */}
            <FormField
              control={form.control}
              name="fitnessGoal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fitness Goal</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your primary fitness goal" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(fitnessGoalLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Your primary fitness objective
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Workout Days Per Week */}
            <FormField
              control={form.control}
              name="workoutDaysPerWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workout Days Per Week</FormLabel>
                  <FormControl>
                    <div className="flex items-center space-x-4">
                      <Slider
                        min={1}
                        max={7}
                        step={1}
                        defaultValue={[field.value]}
                        onValueChange={(values) => field.onChange(values[0])}
                        className="flex-grow"
                      />
                      <span className="font-medium w-8 text-center">
                        {field.value}
                      </span>
                    </div>
                  </FormControl>
                  <FormDescription>
                    How many days per week can you commit to working out?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Workout Duration */}
            <FormField
              control={form.control}
              name="workoutDuration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workout Duration (minutes)</FormLabel>
                  <FormControl>
                    <div className="flex items-center space-x-4">
                      <Slider
                        min={15}
                        max={120}
                        step={5}
                        defaultValue={[field.value]}
                        onValueChange={(values) => field.onChange(values[0])}
                        className="flex-grow"
                      />
                      <span className="font-medium w-12 text-center">
                        {field.value}
                      </span>
                    </div>
                  </FormControl>
                  <FormDescription>
                    How long can each workout session be?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fitness Level */}
            <FormField
              control={form.control}
              name="fitnessLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fitness Level</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your fitness level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Your current experience with regular exercise
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Activity Level */}
            <FormField
              control={form.control}
              name="activityLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Daily Activity Level</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your activity level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(activityLevelLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Your typical daily activity level outside of planned workouts
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Weekly Budget */}
            <FormField
              control={form.control}
              name="weeklyBudget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weekly Food Budget (£)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={20}
                      max={500}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Weekly budget for groceries (in GBP)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Diet Preferences */}
            <FormField
              control={form.control}
              name="dietPreferences"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel>Dietary Preferences</FormLabel>
                    <FormDescription>
                      Select any dietary preferences you follow
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {dietPreferenceOptions.map((option) => (
                      <FormField
                        key={option.id}
                        control={form.control}
                        name="dietPreferences"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={option.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(option.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, option.id])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== option.id
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {option.label}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dietary Restrictions */}
            <FormField
              control={form.control}
              name="restrictions"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel>Dietary Restrictions</FormLabel>
                    <FormDescription>
                      Select any foods you need to avoid
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {dietaryRestrictionOptions.map((option) => (
                      <FormField
                        key={option.id}
                        control={form.control}
                        name="restrictions"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={option.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(option.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, option.id])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== option.id
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {option.label}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={startGenerationMutation.isPending}
            >
              {startGenerationMutation.isPending
                ? "Starting Generation..."
                : "Generate My Plan"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}