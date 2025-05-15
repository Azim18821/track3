import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Scale, Plus, ChevronLeft, Calendar, LineChart, Camera, ImageIcon, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AdaptiveDialog, 
  AdaptiveDialogContent, 
  AdaptiveDialogHeader, 
  AdaptiveDialogTitle, 
  AdaptiveDialogTrigger 
} from "@/components/ui/adaptive-dialog";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";

interface WeightLogEntry {
  id: number;
  userId: number;
  weight: number;
  unit: string;
  date: string;
  notes?: string;
  imageUrl?: string;
}

interface WeightLogData {
  entries: WeightLogEntry[];
  stats: {
    current?: {
      weight: number;
      unit: string;
    };
    change: number;
    startWeight?: number;
    goalWeight?: number;
  };
}

const WeightLogPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newWeight, setNewWeight] = useState("");
  const [unit, setUnit] = useState("kg");
  const [notes, setNotes] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch weight log data
  const { data: weightEntries = [], isLoading, error } = useQuery<WeightLogEntry[]>({
    queryKey: ["/api/weight"],
    refetchOnWindowFocus: true
  });

  // Image upload mutation
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      return apiRequest("POST", "/api/weight/upload-image", formData);
    },
    onSuccess: (data) => {
      setImageUrl(data.imageUrl);
      setIsUploading(false);
      toast({
        title: "Image uploaded",
        description: "Your progress photo was uploaded successfully",
      });
    },
    onError: (error: Error) => {
      setIsUploading(false);
      toast({
        title: "Failed to upload image",
        description: error.message || "An error occurred while uploading the image",
        variant: "destructive",
      });
    }
  });

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPEG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    uploadImageMutation.mutate(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removeImage = () => {
    setImageUrl(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Add new weight entry mutation
  const addWeightMutation = useMutation({
    mutationFn: async (weightData: { weight: number; unit: string; notes?: string; imageUrl?: string }) => {
      // Format the weight data to match the expected schema
      const formattedData = {
        weight: Number(weightData.weight),
        unit: weightData.unit || "kg",
        date: format(new Date(), "yyyy-MM-dd"), // Use current date as default
        notes: weightData.notes,
        imageUrl: weightData.imageUrl
      };
      console.log("Submitting weight data:", formattedData);
      return apiRequest("POST", "/api/weight", formattedData);
    },
    onSuccess: () => {
      toast({
        title: "Weight logged successfully",
        description: "Your weight entry has been saved",
      });
      setIsAddDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/weight"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      // Reset form fields
      setNewWeight("");
      setNotes("");
      setImageUrl(undefined);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to log weight",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeight || isNaN(parseFloat(newWeight))) {
      toast({
        title: "Invalid weight",
        description: "Please enter a valid weight",
        variant: "destructive",
      });
      return;
    }

    const weightData = {
      weight: parseFloat(newWeight),
      unit,
      notes: notes || undefined,
      imageUrl: imageUrl
    };
    
    addWeightMutation.mutate(weightData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary dark:text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-2">Failed to load weight data</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/weight"] })}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Process weight entries to create stats
  const sortedEntries = [...weightEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latestWeight = sortedEntries.length > 0 ? sortedEntries[0] : null;
  const oldestWeight = sortedEntries.length > 0 ? sortedEntries[sortedEntries.length - 1] : null;
  
  // Calculate weight change if we have at least two entries
  const weightChange = sortedEntries.length >= 2 
    ? latestWeight && oldestWeight && latestWeight.unit === oldestWeight.unit
      ? Number((latestWeight.weight - oldestWeight.weight).toFixed(1))
      : 0
    : 0;
  
  // Get user's goal weight from profile (if available)
  // This would typically come from the user's profile
  const goalWeight = 0; // Placeholder for actual goal weight
  
  const weightData = {
    entries: weightEntries,
    stats: {
      current: latestWeight ? { weight: latestWeight.weight, unit: latestWeight.unit } : { weight: 0, unit: 'kg' },
      change: weightChange,
      startWeight: oldestWeight?.weight,
      goalWeight: goalWeight
    }
  };

  return (
    <div className={isMobile ? "mx-auto px-4 pt-3 pb-24" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9" 
            onClick={() => window.history.back()}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg shadow-sm">
              <Scale className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h1 className="text-xl font-bold">Weight Log</h1>
          </div>
        </div>
        
        <AdaptiveDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <AdaptiveDialogTrigger asChild>
            <Button size="sm" className="flex items-center gap-1">
              <Plus className="h-4 w-4 mr-1" />
              <span>{isMobile ? "Add" : "Log Weight"}</span>
            </Button>
          </AdaptiveDialogTrigger>
          <AdaptiveDialogContent className="sm:max-w-[425px]">
            <AdaptiveDialogHeader>
              <AdaptiveDialogTitle>Log Your Weight</AdaptiveDialogTitle>
            </AdaptiveDialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <Label htmlFor="weight">Weight</Label>
                  <Input
                    id="weight"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    type="number"
                    step="0.1"
                    placeholder="Enter weight"
                    className="mt-1"
                    required
                  />
                </div>
                <div className="w-24">
                  <Label htmlFor="unit">Unit</Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger id="unit" className="mt-1">
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="lbs">lbs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add optional notes"
                  className="mt-1"
                />
              </div>
              
              {/* Image Upload Section */}
              <div className="mt-2">
                <Label className="mb-2 block">Progress Photo (optional)</Label>
                
                {/* Hidden file input */}
                <input 
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                  capture="environment"
                />
                
                {/* Image preview or upload button */}
                {imageUrl ? (
                  <div className="relative mt-2 rounded-md overflow-hidden border border-input">
                    <img 
                      src={imageUrl} 
                      alt="Progress" 
                      className="w-full h-auto max-h-56 object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/80 hover:bg-background"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-16 border-dashed gap-2"
                    onClick={triggerFileInput}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4" />
                        Add Photo
                      </>
                    )}
                  </Button>
                )}
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={addWeightMutation.isPending}
                >
                  {addWeightMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : "Save"}
                </Button>
              </div>
            </form>
          </AdaptiveDialogContent>
        </AdaptiveDialog>
      </div>

      {/* Weight Stats Summary */}
      <div className="mb-6">
        <Card className="rounded-xl shadow-sm overflow-hidden border-purple-100 dark:border-purple-900/50 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
          <CardContent className="p-5">
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <h3 className="text-sm text-muted-foreground mb-1">Current Weight</h3>
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                  {weightData.stats.current?.weight || "N/A"} 
                  <span className="text-sm font-normal ml-1">
                    {weightData.stats.current?.unit || ""}
                  </span>
                </div>
                {weightData.stats.change !== 0 && (
                  <div className={`text-xs mt-1 ${weightData.stats.change < 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {weightData.stats.change > 0 ? '+' : ''}{weightData.stats.change} {weightData.stats.current?.unit || ""}
                  </div>
                )}
              </div>
              
              <div className="text-center">
                <h3 className="text-sm text-muted-foreground mb-1">Goal Weight</h3>
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                  {weightData.stats.goalWeight || "N/A"} 
                  <span className="text-sm font-normal ml-1">
                    {weightData.stats.current?.unit || ""}
                  </span>
                </div>
                {weightData.stats.goalWeight && weightData.stats.current?.weight && (
                  <div className="text-xs mt-1 text-purple-600 dark:text-purple-400">
                    {Math.abs(weightData.stats.goalWeight - weightData.stats.current.weight)} {weightData.stats.current.unit} to go
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Weight Log History */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-medium">History</h2>
          {!isMobile && (
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <LineChart className="h-4 w-4 mr-1" />
              <span>View Chart</span>
            </Button>
          )}
        </div>
        
        {weightData.entries.length === 0 ? (
          <Card className="rounded-xl shadow-sm overflow-hidden border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-full inline-block mb-3">
                <Scale className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-base font-medium mb-1">No entries yet</h3>
              <p className="text-muted-foreground text-sm mb-3">
                Start tracking your weight to see your progress
              </p>
              <Button 
                size="sm" 
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add First Entry
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {weightData.entries.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="rounded-xl shadow-sm overflow-hidden border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className={`flex ${entry.imageUrl ? 'flex-col' : 'items-center'} justify-between`}>
                      <div className="flex items-center justify-between w-full">
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            {entry.weight} {entry.unit}
                          </div>
                          {entry.notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {entry.notes}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {format(new Date(entry.date), 'MMM d, yyyy')}
                          </div>
                        </div>
                      </div>
                      
                      {entry.imageUrl && (
                        <div className="mt-3 rounded-md overflow-hidden border border-gray-200 dark:border-gray-700">
                          <img 
                            src={entry.imageUrl} 
                            alt={`Weight progress on ${format(new Date(entry.date), 'MMM d, yyyy')}`}
                            className="w-full h-auto max-h-48 object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WeightLogPage;