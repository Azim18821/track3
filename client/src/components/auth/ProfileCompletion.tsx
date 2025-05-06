import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-user";

// Profile completion schema
const profileCompletionSchema = z.object({
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female", "other"], {
    required_error: "Please select your gender",
  }),
  height: z.coerce.number().min(50, "Height must be at least 50").max(300, "Height cannot exceed 300"),
  weight: z.coerce.number().min(20, "Weight must be at least 20").max(500, "Weight cannot exceed 500"),
  heightUnit: z.enum(["cm", "inches"]).default("cm"),
  weightUnit: z.enum(["kg", "lb"]).default("kg")
});

type ProfileCompletionData = z.infer<typeof profileCompletionSchema>;

export function ProfileCompletion() {
  const { user, refetchUser } = useUser();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const form = useForm<ProfileCompletionData>({
    resolver: zodResolver(profileCompletionSchema),
    defaultValues: {
      dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : "",
      gender: (user?.gender as "male" | "female" | "other") || undefined,
      height: user?.height || undefined,
      weight: user?.weight || undefined,
      heightUnit: user?.heightUnit as "cm" | "inches" || "cm",
      weightUnit: user?.weightUnit as "kg" | "lb" || "kg"
    },
  });

  // Update form fields when user data changes
  useEffect(() => {
    if (user) {
      form.reset({
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : "",
        gender: (user?.gender as "male" | "female" | "other") || undefined,
        height: user?.height || undefined,
        weight: user?.weight || undefined,
        heightUnit: user?.heightUnit as "cm" | "inches" || "cm",
        weightUnit: user?.weightUnit as "kg" | "lb" || "kg"
      });
    }
  }, [user, form]);

  // Mutation to update profile
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileCompletionData) => {
      const res = await apiRequest("PATCH", "/api/profile", data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      // Refetch user to get the latest data
      refetchUser();
      // Redirect to dashboard or home page
      navigate("/"); 
    },
    onError: (error: Error) => {
      toast({
        title: "Profile update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: ProfileCompletionData) => {
    updateProfileMutation.mutate(data);
  };

  return (
    <div className="container mx-auto py-8 px-4 flex items-center justify-center min-h-[calc(100vh-6rem)]">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="bg-primary/5 rounded-t-lg">
          <CardTitle className="text-xl font-bold text-center text-primary">Complete Your Profile</CardTitle>
          <CardDescription className="text-center">
            Please provide the following information to complete your profile. This information is essential for accurate fitness and nutrition planning.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" className="focus:ring-2 focus:ring-primary/50" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs text-muted-foreground">
                      Used to calculate your BMR (Basal Metabolic Rate)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Used for accurate health calculations
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Height" 
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="heightUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cm">Centimeters (cm)</SelectItem>
                          <SelectItem value="inches">Inches (in)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Weight" 
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="weightUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="kg">Kilograms (kg)</SelectItem>
                          <SelectItem value="lb">Pounds (lb)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : "Complete Profile"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}