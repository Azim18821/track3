import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { OnboardingData } from '@/types/onboarding';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format } from "date-fns";
import { Calendar as CalendarIcon, User, Ruler, Weight, ArrowLeft } from "lucide-react";
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

interface MeasurementsInputProps {
  data: OnboardingData;
  onSubmit: (data: Partial<OnboardingData>) => void;
  onBack: () => void;
}

// Helper functions for height conversions
const inchesToFeetAndInches = (totalInches: number) => {
  const ft = Math.floor(totalInches / 12);
  const inch = Math.round(totalInches % 12);
  // If inches is 12, increment feet and set inches to 0
  if (inch === 12) {
    return { feet: ft + 1, inches: 0 };
  }
  return { feet: ft, inches: inch };
};

const feetAndInchesToInches = (feet: number, inches: number) => {
  return (feet * 12) + inches;
};

const convertHeight = (value: number, fromUnit: string, toUnit: string) => {
  if (fromUnit === toUnit) return value;
  
  if (fromUnit === 'cm' && toUnit === 'inches') {
    return Math.round(value / 2.54 * 10) / 10; // cm to inches
  }
  if (fromUnit === 'inches' && toUnit === 'cm') {
    return Math.round(value * 2.54); // inches to cm
  }
  return value;
};

export default function MeasurementsInput({ data, onSubmit, onBack }: MeasurementsInputProps) {
  // For feet and inches input
  const [feet, setFeet] = useState<number>(5);
  const [inches, setInches] = useState<number>(8);
  
  // Create a schema for form validation
  const formSchema = z.object({
    height: z.number({
      required_error: "Height is required",
      invalid_type_error: "Height must be a number",
    }).positive('Height must be positive').min(100, 'Height must be at least 100cm or 40 inches'),
    
    weight: z.number({
      required_error: "Weight is required",
      invalid_type_error: "Weight must be a number",
    }).positive('Weight must be positive').min(30, 'Weight must be at least 30kg or 66lb'),
    
    heightUnit: z.enum(['cm', 'inches'], {
      required_error: "Height unit is required",
    }),
    
    weightUnit: z.enum(['kg', 'lb'], {
      required_error: "Weight unit is required",
    }),
    
    dateOfBirth: z.date({
      required_error: "Date of birth is required",
      invalid_type_error: "Invalid date format"
    }).transform(date => {
      // Ensure date is not in the future and not too far in the past
      if (date > new Date()) {
        return new Date(); // Use today's date if in future
      }
      if (date < new Date('1900-01-01')) {
        return new Date('1900-01-01');
      }
      return date;
    }),
    
    gender: z.enum(['male', 'female', 'other'], {
      required_error: "Please select a gender",
    }),
  });

  // Set up the form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      height: data.height || 170,
      weight: data.weight || 70,
      heightUnit: data.heightUnit || 'cm',
      weightUnit: data.weightUnit || 'kg',
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      gender: data.gender || undefined,
    },
  });

  // Get form field values for monitoring
  const heightUnit = form.watch('heightUnit');
  const weightUnit = form.watch('weightUnit');
  const currentHeight = form.watch('height');

  // Update default values when data changes
  useEffect(() => {
    if (data) {
      form.reset({
        height: data.height || 170,
        weight: data.weight || 70,
        heightUnit: data.heightUnit || 'cm',
        weightUnit: data.weightUnit || 'kg',
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        gender: data.gender || undefined,
      });
      
      // Initialize feet and inches from height if unit is inches
      if (data.heightUnit === 'inches' && data.height) {
        const { feet: ft, inches: inch } = inchesToFeetAndInches(data.height);
        setFeet(ft);
        setInches(inch);
      }
    }
  }, [data]);
  
  // Update height when feet/inches change if unit is inches
  useEffect(() => {
    if (heightUnit === 'inches') {
      const totalInches = feetAndInchesToInches(feet, inches);
      // Only update if there's a meaningful difference to prevent infinite loops
      if (Math.abs(totalInches - form.getValues('height')) > 0.1) {
        form.setValue('height', totalInches);
      }
    }
  }, [feet, inches, heightUnit, form]);
  
  // Update feet/inches when height or unit changes
  useEffect(() => {
    if (heightUnit === 'inches' && currentHeight > 0) {
      const { feet: ft, inches: inch } = inchesToFeetAndInches(currentHeight);
      setFeet(ft);
      setInches(inch);
    }
  }, [heightUnit, currentHeight]);

  // Get min/max ranges based on units
  const getHeightRange = () => {
    return heightUnit === 'cm' ? [120, 220] : [48, 87];
  };
  
  const getWeightRange = () => {
    return weightUnit === 'kg' ? [30, 160] : [66, 352];
  };

  // Handle form submission
  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    // Ensure all required fields are present
    if (!values.height || !values.weight || !values.dateOfBirth || !values.gender) {
      console.error('Missing required fields in form submission');
      return; // Form validation should prevent this, but double-check
    }
    
    // Ensure date is formatted correctly
    let formattedDate: string | null = null;
    
    if (values.dateOfBirth) {
      try {
        // Format as YYYY-MM-DD for consistent API handling
        formattedDate = format(values.dateOfBirth, 'yyyy-MM-dd');
        console.log('Formatted date:', formattedDate);
      } catch (e) {
        console.error('Error formatting date of birth:', e);
        // Use a fallback date instead of null
        const today = new Date();
        // Default to 30 years ago if there's an error
        formattedDate = format(new Date(today.getFullYear() - 30, 0, 1), 'yyyy-MM-dd');
      }
    }
    
    // Ensure all values are within reasonable ranges
    const minHeight = values.heightUnit === 'cm' ? 100 : 40; 
    const maxHeight = values.heightUnit === 'cm' ? 250 : 96;
    const minWeight = values.weightUnit === 'kg' ? 30 : 66;
    const maxWeight = values.weightUnit === 'kg' ? 300 : 660;
    
    const height = Math.max(minHeight, Math.min(maxHeight, values.height));
    const weight = Math.max(minWeight, Math.min(maxWeight, values.weight));
    
    console.log('Submitting measurements with validated data:', {
      height,
      weight,
      heightUnit: values.heightUnit,
      weightUnit: values.weightUnit,
      dateOfBirth: formattedDate,
      gender: values.gender
    });
    
    onSubmit({
      height,
      weight,
      heightUnit: values.heightUnit,
      weightUnit: values.weightUnit,
      dateOfBirth: formattedDate,
      gender: values.gender
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 pt-2 sm:pt-4">
      <div className="text-center mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-medium mb-2">Your Body Measurements</h2>
        <p className="text-muted-foreground text-sm sm:text-base px-1">
          These measurements help us understand your current status and create a personalized plan.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 sm:space-y-8">
          {/* Height Input */}
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
              <div className="w-full sm:w-1/2 bg-accent/20 dark:bg-accent/10 rounded-lg p-2 sm:p-4">
                <FormField
                  control={form.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem className="space-y-2 sm:space-y-3">
                      <div className="flex items-center justify-between">
                        <FormLabel className="flex items-center gap-1 text-sm sm:text-base font-medium">
                          <Ruler className="h-3 w-3 sm:h-4 sm:w-4" />
                          Height
                        </FormLabel>
                        <div className="flex items-center gap-1">
                          {heightUnit === 'cm' ? (
                            <span className="text-base sm:text-lg font-semibold">{field.value}</span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="text-sm sm:text-base font-semibold">{feet}'</span>
                              <span className="text-sm sm:text-base font-semibold">{inches}"</span>
                            </div>
                          )}
                          <FormField
                            control={form.control}
                            name="heightUnit"
                            render={({ field: unitField }) => (
                              <FormItem className="space-y-0">
                                <Select
                                  onValueChange={unitField.onChange}
                                  defaultValue={unitField.value}
                                >
                                  <SelectTrigger className="w-14 sm:w-16 h-7 sm:h-8 text-xs sm:text-sm">
                                    <SelectValue placeholder="Unit" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="cm">cm</SelectItem>
                                    <SelectItem value="inches">ft/in</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      {heightUnit === 'inches' ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <Label className="text-sm">Feet</Label>
                            <div className="flex-1 max-w-[160px]">
                              <div className="grid grid-cols-6 gap-1">
                                {[4, 5, 6, 7, 8, 9].map((ft) => (
                                  <Button 
                                    key={ft} 
                                    type="button"
                                    size="sm"
                                    variant={feet === ft ? "default" : "outline"}
                                    className="h-8 text-xs px-1"
                                    onClick={() => setFeet(ft)}
                                  >
                                    {ft}'
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between gap-2">
                            <Label className="text-sm">Inches</Label>
                            <div className="flex-1 max-w-[160px]">
                              <div className="grid grid-cols-6 gap-1">
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((inch) => (
                                  <Button 
                                    key={inch} 
                                    type="button"
                                    size="sm"
                                    variant={inches === inch ? "default" : "outline"}
                                    className="h-8 text-xs px-1"
                                    onClick={() => setInches(inch)}
                                  >
                                    {inch}"
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <FormControl>
                          <Slider
                            value={[field.value]}
                            min={getHeightRange()[0]}
                            max={getHeightRange()[1]}
                            step={1}
                            onValueChange={(vals) => field.onChange(vals[0])}
                            className="py-2 sm:py-3"
                          />
                        </FormControl>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="w-full sm:w-1/2 bg-accent/20 dark:bg-accent/10 rounded-lg p-2 sm:p-4">
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem className="space-y-2 sm:space-y-3">
                      <div className="flex items-center justify-between">
                        <FormLabel className="flex items-center gap-1 text-sm sm:text-base font-medium">
                          <Weight className="h-3 w-3 sm:h-4 sm:w-4" />
                          Weight
                        </FormLabel>
                        <div className="flex items-center gap-1">
                          <span className="text-base sm:text-lg font-semibold">{field.value}</span>
                          <FormField
                            control={form.control}
                            name="weightUnit"
                            render={({ field: unitField }) => (
                              <FormItem className="space-y-0">
                                <Select
                                  onValueChange={unitField.onChange}
                                  defaultValue={unitField.value}
                                >
                                  <SelectTrigger className="w-14 sm:w-16 h-7 sm:h-8 text-xs sm:text-sm">
                                    <SelectValue placeholder="Unit" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="kg">kg</SelectItem>
                                    <SelectItem value="lb">lb</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      <FormControl>
                        <Slider
                          value={[field.value]}
                          min={getWeightRange()[0]}
                          max={getWeightRange()[1]}
                          step={1}
                          onValueChange={(vals) => field.onChange(vals[0])}
                          className="py-2 sm:py-3"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Date of Birth Input */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="w-full sm:w-1/2">
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="flex items-center gap-1 text-sm sm:text-base font-medium mb-1">
                      <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                      Date of Birth
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full px-2 text-left font-normal text-xs sm:text-sm h-8 sm:h-9",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2 max-w-[95vw] sm:max-w-[300px]" align="start">
                        <div className="space-y-3">
                          {/* Simplified Mobile-friendly Age Selection */}
                          <div>
                            <Label className="text-sm font-medium">Quick Age Selection</Label>
                            <div className="grid grid-cols-3 gap-1 mt-1">
                              {[18, 25, 30, 40, 50, 60].map(age => {
                                const yearOfBirth = new Date().getFullYear() - age;
                                const dateOfBirth = new Date(yearOfBirth, 0, 1);
                                return (
                                  <Button 
                                    key={age}
                                    type="button"
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      field.onChange(dateOfBirth);
                                    }}
                                    className="text-xs h-8"
                                  >
                                    {age} years
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                          
                          {/* Year Selector - Simplified dropdown */}
                          <div>
                            <Label className="text-sm font-medium">Birth Year</Label>
                            <Select
                              value={field.value ? new Date(field.value).getFullYear().toString() : undefined}
                              onValueChange={(value) => {
                                const year = parseInt(value);
                                if (field.value) {
                                  const newDate = new Date(field.value);
                                  newDate.setFullYear(year);
                                  field.onChange(newDate);
                                } else {
                                  field.onChange(new Date(year, 0, 1));
                                }
                              }}
                            >
                              <SelectTrigger className="w-full mt-1">
                                <SelectValue placeholder="Select Birth Year" />
                              </SelectTrigger>
                              <SelectContent className="max-h-[200px]">
                                <SelectGroup>
                                  {Array.from({ length: 83 }, (_, i) => {
                                    const year = new Date().getFullYear() - 18 - i;
                                    return (
                                      <SelectItem key={year} value={year.toString()}>
                                        {year}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Month selector */}
                          <div>
                            <Label className="text-sm font-medium">Birth Month</Label>
                            <Select
                              value={field.value ? (new Date(field.value).getMonth()).toString() : undefined}
                              onValueChange={(value) => {
                                const month = parseInt(value);
                                if (field.value) {
                                  const newDate = new Date(field.value);
                                  newDate.setMonth(month);
                                  field.onChange(newDate);
                                } else {
                                  const year = new Date().getFullYear() - 30;
                                  field.onChange(new Date(year, month, 1));
                                }
                              }}
                            >
                              <SelectTrigger className="w-full mt-1">
                                <SelectValue placeholder="Select Birth Month" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, i) => (
                                    <SelectItem key={i} value={i.toString()}>
                                      {month}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Gender Display (Read-only) */}
            <div className="w-full sm:w-1/2">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="flex items-center gap-1 text-sm sm:text-base font-medium mb-1">
                      <User className="h-3 w-3 sm:h-4 sm:w-4" />
                      Gender
                    </FormLabel>
                    <FormControl>
                      <div className="border rounded-md px-3 py-2 h-9 text-sm flex items-center">
                        {field.value === 'male' && (
                          <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                            Male
                          </span>
                        )}
                        {field.value === 'female' && (
                          <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-pink-500"></span>
                            Female
                          </span>
                        )}
                        {field.value === 'other' && (
                          <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                            Other
                          </span>
                        )}
                        {!field.value && (
                          <span className="text-muted-foreground italic">Please select gender at step 1</span>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex justify-between pt-2 sm:pt-4">
            <Button type="button" variant="outline" onClick={onBack} className="w-1/3 sm:w-1/4">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button type="submit" className="w-1/2 sm:w-1/3">
              Continue
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}