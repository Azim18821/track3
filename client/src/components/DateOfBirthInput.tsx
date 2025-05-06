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
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

interface DateOfBirthInputProps {
  value?: string | null; // Expected in format 'YYYY-MM-DD'
  onChange: (date: string | null) => void;
  required?: boolean;
  className?: string;
}

export default function DateOfBirthInput({ 
  value, 
  onChange, 
  required = false, 
  className
}: DateOfBirthInputProps) {
  // Create a schema for form validation
  const formSchema = z.object({
    dateOfBirth: required 
      ? z.date({ required_error: "Date of birth is required" })
      : z.date().optional(),
  });

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dateOfBirth: value ? new Date(value) : undefined,
    },
  });

  // Update the parent component's state when the form value changes
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (values.dateOfBirth) {
      onChange(format(values.dateOfBirth, 'yyyy-MM-dd'));
    } else {
      onChange(null);
    }
  };

  // Keep local form state in sync with parent component's state
  useEffect(() => {
    if (value) {
      form.setValue('dateOfBirth', new Date(value));
    } else {
      form.setValue('dateOfBirth', undefined);
    }
  }, [value, form]);

  // Update when form values change (not just on submit)
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (value.dateOfBirth) {
        try {
          const formattedDate = format(value.dateOfBirth as Date, 'yyyy-MM-dd');
          console.log('DateOfBirthInput updating with formatted date:', formattedDate);
          onChange(formattedDate);
        } catch (e) {
          console.error('Error formatting date in DateOfBirthInput:', e, 'Value was:', value.dateOfBirth);
          onChange(null);
        }
      } else {
        onChange(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, onChange]);

  return (
    <div className={cn("w-full", className)}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="flex items-center gap-1 sm:gap-2 text-base sm:text-md font-medium mb-1">
                  <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  Date of Birth
                </FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full px-2 sm:pl-3 text-left font-normal text-sm sm:text-base h-9 sm:h-10",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Select date of birth</span>
                        )}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 max-w-[95vw] sm:max-w-none" align="start">
                    <div className="p-2 sm:p-3">
                      <div className="flex flex-col gap-3">
                        {/* Birth Year Selector - Mobile-friendly version */}
                        <div className="space-y-4">
                          <Label className="text-sm text-muted-foreground">Birth Year</Label>
                          
                          {/* Simple year buttons in a grid */}
                          <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto p-1">
                            {Array.from({ length: 60 }, (_, i) => {
                              const year = new Date().getFullYear() - 18 - i;
                              return (
                                <Button 
                                  key={year}
                                  variant={field.value && new Date(field.value).getFullYear() === year ? "default" : "outline"} 
                                  size="sm"
                                  onClick={() => {
                                    if (field.value) {
                                      const newDate = new Date(field.value);
                                      newDate.setFullYear(year);
                                      field.onChange(newDate);
                                    } else {
                                      field.onChange(new Date(year, 0, 1));
                                    }
                                  }}
                                  className="text-base py-2 h-10"
                                >
                                  {year}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                        
                        {/* Common ages quick selection */}
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Common Ages</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {[18, 25, 30, 40, 50, 60].map(age => {
                              const yearOfBirth = new Date().getFullYear() - age;
                              const dateOfBirth = new Date(yearOfBirth, 0, 1);
                              return (
                                <Button 
                                  key={age}
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    field.onChange(dateOfBirth);
                                  }}
                                  className="text-xs sm:text-sm py-0 px-2 h-8"
                                >
                                  {age} years old
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                        
                        {/* Calendar for fine-tuning */}
                        <div className="pt-2 border-t">
                          <Label className="text-sm text-muted-foreground mb-2 block">Select Month/Day (Optional)</Label>
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                            // Set a default year appropriate for birth dates (about 30 years ago)
                            defaultMonth={field.value || new Date(new Date().getFullYear() - 30, 0, 1)}
                            captionLayout="dropdown-buttons"
                            fromYear={1940}
                            toYear={new Date().getFullYear() - 18}
                          />
                        </div>
                        
                        {/* Clear button */}
                        {field.value && (
                          <Button 
                            variant="ghost" 
                            className="mt-2" 
                            onClick={() => field.onChange(undefined)}
                          >
                            Clear selection
                          </Button>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  );
}