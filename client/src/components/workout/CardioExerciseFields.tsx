import React from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UseFormReturn } from 'react-hook-form';

interface CardioExerciseFieldsProps {
  form: UseFormReturn<any>;
  index: number;
  isVisible: boolean;
}

/**
 * Component that renders cardio-specific exercise fields
 * To use this component, add it alongside your existing workout form
 */
const CardioExerciseFields: React.FC<CardioExerciseFieldsProps> = ({ 
  form, 
  index,
  isVisible
}) => {
  if (!isVisible) return null;
  
  return (
    <div className="space-y-4 mt-3 p-3 bg-muted/30 rounded-md border border-muted">
      <h5 className="text-sm font-medium">Cardio Exercise Details</h5>
      
      <div className="grid grid-cols-2 gap-3">
        {/* Duration field */}
        <FormField
          control={form.control}
          name={`exercises.${index}.duration`}
          render={({ field: { value, onChange, ...fieldProps }}) => (
            <FormItem>
              <FormLabel className="text-xs">Duration (minutes)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min="1" 
                  placeholder="20"
                  value={value || ''}
                  onChange={e => {
                    const val = e.target.value === '' ? undefined : Number(e.target.value);
                    onChange(val);
                  }}
                  {...fieldProps}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Distance field with unit selector */}
        <div className="flex space-x-2">
          <div className="flex-1">
            <FormField
              control={form.control}
              name={`exercises.${index}.distance`}
              render={({ field: { value, onChange, ...fieldProps }}) => (
                <FormItem>
                  <FormLabel className="text-xs">Distance</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      step="0.1"
                      placeholder="2.0"
                      value={value || ''}
                      onChange={e => {
                        const val = e.target.value === '' ? undefined : Number(e.target.value);
                        onChange(val);
                      }}
                      {...fieldProps}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name={`exercises.${index}.distanceUnit`}
            defaultValue="km"
            render={({ field }) => (
              <FormItem className="w-20 mt-8">
                <Select
                  value={field.value || 'km'}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="km">km</SelectItem>
                    <SelectItem value="mi">mi</SelectItem>
                    <SelectItem value="m">m</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {/* Calories burned */}
        <FormField
          control={form.control}
          name={`exercises.${index}.calories`}
          render={({ field: { value, onChange, ...fieldProps }}) => (
            <FormItem>
              <FormLabel className="text-xs">Calories Burned</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min="0"
                  placeholder="200"
                  value={value || ''}
                  onChange={e => {
                    const val = e.target.value === '' ? undefined : Number(e.target.value);
                    onChange(val);
                  }}
                  {...fieldProps}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Average Speed */}
        <FormField
          control={form.control}
          name={`exercises.${index}.speed`}
          render={({ field: { value, onChange, ...fieldProps }}) => (
            <FormItem>
              <FormLabel className="text-xs">Average Speed</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min="0" 
                  step="0.1"
                  placeholder="10.0"
                  value={value || ''}
                  onChange={e => {
                    const val = e.target.value === '' ? undefined : Number(e.target.value);
                    onChange(val);
                  }}
                  {...fieldProps}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      
      <p className="text-xs text-muted-foreground">
        Track your cardio exercise with precise metrics for better fitness insights
      </p>
    </div>
  );
};

export default CardioExerciseFields;