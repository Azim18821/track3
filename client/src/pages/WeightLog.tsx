import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdaptiveDialog, AdaptiveDialogContent, AdaptiveDialogDescription, AdaptiveDialogHeader, AdaptiveDialogTitle, AdaptiveDialogTrigger } from "@/components/ui/adaptive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Camera, Loader2, Trash2, X } from "lucide-react";

// Weight entry schema
const weightEntrySchema = z.object({
  weight: z.coerce
    .number({
      required_error: "Weight is required",
      invalid_type_error: "Weight must be a number",
    })
    .positive("Weight must be a positive number")
    .refine(val => !isNaN(val), {
      message: "Please enter a valid number",
    }),
  unit: z.string().min(1, "Unit is required").default("kg"),
  date: z.string()
    .min(1, "Date is required")
    .default(() => format(new Date(), "yyyy-MM-dd"))
    .refine(val => !isNaN(new Date(val).getTime()), {
      message: "Please enter a valid date",
    }),
  photoUrl: z.string().url().optional(),
});

type WeightEntry = z.infer<typeof weightEntrySchema>;

interface Weight {
  id: number;
  weight: number;
  unit: string;
  date: string;
  photoUrl?: string;
}

const WeightLog = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Handle dialog close to reset form
  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setPhotoPreview(null);
    }
    setIsDialogOpen(open);
  };
  const { toast } = useToast();
  
  // Handle photo upload
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: "Please select a photo smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Handle photo removal
  const handleRemovePhoto = () => {
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  // Upload photo to server
  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('photo', file);
      
      const response = await fetch('/api/weight/photo', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload photo');
      }
      
      const data = await response.json();
      return data.photoUrl;
    } catch (error) {
      console.error('Photo upload error:', error);
      toast({
        title: "Photo upload failed",
        description: error instanceof Error ? error.message : "Failed to upload photo",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Form setup
  const form = useForm<WeightEntry>({
    resolver: zodResolver(weightEntrySchema),
    defaultValues: {
      weight: undefined,
      unit: "kg",
      date: format(new Date(), "yyyy-MM-dd"),
    },
  });

  // Fetch weight entries
  const { data: weights = [], isLoading } = useQuery<Weight[]>({
    queryKey: ['/api/weight'],
  });

  // Format data for chart
  const chartData = [...weights]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(entry => ({
      date: format(new Date(entry.date), "MMM dd"),
      weight: entry.weight,
    }));

  // Delete weight entry mutation
  const deleteWeightMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/weight/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete weight entry');
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/weight'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      toast({
        title: "Weight entry deleted",
        description: "The weight entry has been successfully deleted",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete weight entry",
        variant: "destructive",
      });
    }
  });
  
  const handleDeleteWeight = (id: number) => {
    if (confirm("Are you sure you want to delete this weight entry?")) {
      deleteWeightMutation.mutate(id);
    }
  };

  // Add weight entry mutation
  const addWeightMutation = useMutation({
    mutationFn: async (data: WeightEntry) => {
      try {
        // If there's a photo to upload, upload it first
        let photoUrl = null;
        if (photoPreview && fileInputRef.current?.files?.[0]) {
          photoUrl = await uploadPhoto(fileInputRef.current.files[0]);
        }
        
        // Format the weight data to match the expected schema
        const formattedData = {
          weight: Number(data.weight),   // Ensure it's a number
          unit: data.unit || "kg",      // Provide default if empty
          date: data.date,              // Keep as string, server will convert this to a Date
          photoUrl: photoUrl            // Add the photo URL if available
        };
        
        console.log("Submitting weight data:", formattedData);
        
        const res = await fetch('/api/weight', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formattedData),
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          console.error("Server validation error:", errorData);
          if (errorData.errors) {
            // Format validation errors into a readable message
            const errorMessages = errorData.errors
              .map((err: any) => `${err.path.join('.')}: ${err.message}`)
              .join(', ');
            throw new Error(errorMessages || errorData.message);
          }
          throw new Error(errorData.message || 'Failed to add weight entry');
        }
        
        return res.json();
      } catch (error) {
        console.error("Weight logging error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/weight'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      setIsDialogOpen(false);
      form.reset();
      setPhotoPreview(null);
      toast({
        title: "Weight logged",
        description: "Your weight has been successfully recorded",
      });
    },
    onError: (error) => {
      console.error("Weight logging error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to log weight",
        variant: "destructive",
      });
    }
  });

  // Form submission
  const onSubmit = (data: WeightEntry) => {
    addWeightMutation.mutate(data);
  };

  // Get latest weight or default by sorting dates in descending order
  // This ensures the most recent weight entry is always displayed as the current weight
  const latestWeight = weights.length > 0 
    ? [...weights].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Weight Tracker
          </h2>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <AdaptiveDialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
            <AdaptiveDialogTrigger asChild>
              <Button>
                Log Weight
              </Button>
            </AdaptiveDialogTrigger>
            <AdaptiveDialogContent>
              <AdaptiveDialogHeader>
                <AdaptiveDialogTitle>Log Your Weight</AdaptiveDialogTitle>
                <AdaptiveDialogDescription>
                  Track your progress by recording your weight. We've set kilograms (kg) as the default unit, but you can also use pounds (lbs).
                </AdaptiveDialogDescription>
              </AdaptiveDialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Enter your weight" 
                            {...field} 
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(value ? parseFloat(value) : undefined);
                            }}
                            value={field.value === undefined ? "" : field.value}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="kg">Kilograms (kg)</SelectItem>
                            <SelectItem value="lbs">Pounds (lbs)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Photo upload section */}
                  <div className="space-y-2 my-4">
                    <Label htmlFor="weight-photo" className="flex items-center gap-2">
                      <Camera size={16} /> Progress Photo (optional)
                    </Label>
                    
                    {photoPreview ? (
                      <div className="relative w-full h-48 bg-muted rounded-md overflow-hidden">
                        <img 
                          src={photoPreview} 
                          alt="Weight progress preview" 
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="absolute top-2 right-2 p-1 bg-background/80 rounded-full"
                          aria-label="Remove photo"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full">
                        <label
                          htmlFor="weight-photo"
                          className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted"
                        >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Camera className="w-8 h-8 mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              Click to upload a photo
                            </p>
                            <p className="text-xs text-muted-foreground">
                              (Max 10MB)
                            </p>
                          </div>
                          <input
                            id="weight-photo"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePhotoChange}
                            ref={fileInputRef}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={addWeightMutation.isPending || isUploading}
                  >
                    {(addWeightMutation.isPending || isUploading) ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isUploading ? "Uploading photo..." : "Saving..."}
                      </>
                    ) : "Save Weight"}
                  </Button>
                </form>
              </Form>
            </AdaptiveDialogContent>
          </AdaptiveDialog>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="md:col-span-1">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium">Current Weight</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestWeight ? (
                <>
                  {latestWeight.weight} {latestWeight.unit}
                </>
              ) : (
                "No data"
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {latestWeight 
                ? `Last updated on ${format(new Date(latestWeight.date), "MMM dd, yyyy")}`
                : "Log your weight to start tracking"}
            </p>
            
            {/* Show latest weight photo if available */}
            {latestWeight?.photoUrl && (
              <div className="mt-4">
                <div 
                  className="relative w-full h-40 overflow-hidden rounded-md cursor-pointer"
                  onClick={() => window.open(latestWeight.photoUrl, '_blank')}
                >
                  <img 
                    src={latestWeight.photoUrl} 
                    alt={`Latest progress photo (${format(new Date(latestWeight.date), "MMM dd, yyyy")})`} 
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>
            )}
            
            {/* Added quick-access button for mobile */}
            <div className="mt-4 md:hidden">
              <Button 
                onClick={() => handleDialogOpenChange(true)} 
                size="sm"
                className="w-full"
              >
                Log New Weight
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-3">
          <CardHeader className="py-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Weight History</CardTitle>
            {/* Chart type toggle could be added here in the future */}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : chartData.length > 1 ? (
              <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ 
                      top: 5, 
                      right: 10, 
                      left: 10, 
                      bottom: 5 
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis 
                      dataKey="date"
                      tick={{fontSize: 10}}
                      tickMargin={10}
                    />
                    <YAxis 
                      domain={['dataMin - 5', 'dataMax + 5']}
                      tick={{fontSize: 10}}
                      width={30}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                      }}
                      labelStyle={{fontWeight: 'bold'}}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="weight" 
                      stroke="#2463eb" 
                      strokeWidth={2}
                      activeDot={{ r: 6 }}
                      dot={{ r: 4, strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64">
                <p className="text-muted-foreground mb-4 text-center px-4">
                  {chartData.length === 0 
                    ? "No weight entries yet. Add your first weight to see your progress."
                    : "Add more weight entries to see your progress graph."}
                </p>
                <Button 
                  onClick={() => handleDialogOpenChange(true)} 
                  variant="outline"
                >
                  Log Weight
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {weights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Weight History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              {/* Desktop view - table */}
              <div className="hidden md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Weight</th>
                      <th className="text-left p-2">Unit</th>
                      <th className="text-left p-2">Photo</th>
                      <th className="text-right p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...weights]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((entry) => (
                        <tr key={entry.id} className="border-b">
                          <td className="p-2">{format(new Date(entry.date), "MMMM dd, yyyy")}</td>
                          <td className="p-2">{entry.weight}</td>
                          <td className="p-2">{entry.unit}</td>
                          <td className="p-2">
                            {entry.photoUrl ? (
                              <div className="relative w-12 h-12 overflow-hidden rounded-md cursor-pointer"
                                   onClick={() => window.open(entry.photoUrl, '_blank')}>
                                <img 
                                  src={entry.photoUrl} 
                                  alt={`Progress on ${format(new Date(entry.date), "MMM dd, yyyy")}`} 
                                  className="object-cover w-full h-full"
                                />
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">No photo</span>
                            )}
                          </td>
                          <td className="p-2 text-right">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteWeight(entry.id)}
                              disabled={deleteWeightMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              
              {/* Mobile view - cards */}
              <div className="md:hidden space-y-2">
                {[...weights]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {entry.photoUrl && (
                          <div 
                            className="relative w-12 h-12 overflow-hidden rounded-md cursor-pointer"
                            onClick={() => window.open(entry.photoUrl, '_blank')}
                          >
                            <img 
                              src={entry.photoUrl} 
                              alt={`Progress on ${format(new Date(entry.date), "MMM dd, yyyy")}`} 
                              className="object-cover w-full h-full"
                            />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-medium">{entry.weight} {entry.unit}</span>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(entry.date), "MMM dd, yyyy")}
                          </span>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteWeight(entry.id)}
                        disabled={deleteWeightMutation.isPending}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WeightLog;