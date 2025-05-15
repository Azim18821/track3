import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Scale, Plus, ChevronLeft, Calendar, LineChart, Camera, Image } from "lucide-react";
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
import { FileUpload } from "@/components/ui/file-upload";
import axios from "axios";

interface WeightLogEntry {
  id: number;
  userId: number;
  weight: number;
  unit: string;
  date: string;
  notes?: string;
  photoUrl?: string;
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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Fetch weight log data
  const { data, isLoading, error } = useQuery<WeightLogData>({
    queryKey: ["/api/weight-log"],
    refetchOnWindowFocus: true
  });

  // Upload photo mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadingPhoto(true);
      try {
        const formData = new FormData();
        formData.append('photo', file);
        
        const response = await axios.post('/api/weight/upload-photo', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          }
        });
        
        return response.data.photoUrl;
      } catch (error) {
        console.error('Photo upload error:', error);
        throw new Error('Failed to upload photo');
      } finally {
        setUploadingPhoto(false);
      }
    },
    onSuccess: (photoUrl) => {
      setPhotoUrl(photoUrl);
      toast({
        title: "Photo uploaded successfully",
        description: "Your progress photo has been uploaded",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to upload photo",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Add new weight entry mutation
  const addWeightMutation = useMutation({
    mutationFn: async (weightData: { weight: number; unit: string; notes?: string; photoUrl?: string }) => {
      return apiRequest("POST", "/api/weight", weightData);
    },
    onSuccess: () => {
      toast({
        title: "Weight logged successfully",
        description: "Your weight entry has been saved",
      });
      setIsAddDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/weight-log"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      // Reset form fields
      setNewWeight("");
      setNotes("");
      setPhotoFile(null);
      setPhotoUrl(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to log weight",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeight || isNaN(parseFloat(newWeight))) {
      toast({
        title: "Invalid weight",
        description: "Please enter a valid weight",
        variant: "destructive",
      });
      return;
    }

    // First upload the photo if one is selected
    let uploadedPhotoUrl = photoUrl;
    if (photoFile && !uploadedPhotoUrl) {
      try {
        uploadedPhotoUrl = await uploadPhotoMutation.mutateAsync(photoFile);
      } catch (error) {
        // If photo upload fails, ask user if they want to continue with weight entry
        if (!window.confirm("Photo upload failed. Do you want to continue logging your weight without a photo?")) {
          return;
        }
      }
    }

    const weightData = {
      weight: parseFloat(newWeight),
      unit,
      notes: notes || undefined,
      photoUrl: uploadedPhotoUrl || undefined
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
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/weight-log"] })}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const weightData = data || {
    entries: [],
    stats: {
      current: { weight: 0, unit: 'kg' },
      change: 0,
      startWeight: 0,
      goalWeight: 0
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
              
              <div>
                <Label htmlFor="photo">Progress Photo (optional)</Label>
                <div className="mt-1">
                  <FileUpload
                    onChange={(file) => {
                      setPhotoFile(file);
                      setPhotoUrl(null); // Clear previously uploaded URL when new file is selected
                    }}
                    value={photoFile}
                    showPreview={true}
                    accept="image/*"
                    maxSizeMB={5}
                  />
                  {uploadingPhoto && (
                    <div className="flex items-center mt-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Uploading photo...
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
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
                    <div className="flex items-center justify-between">
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
                        {entry.photoUrl && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="mt-1 h-6 text-xs flex items-center text-purple-600 dark:text-purple-400"
                            onClick={() => window.open(entry.photoUrl, '_blank')}
                          >
                            <Image className="h-3 w-3 mr-1" />
                            View Photo
                          </Button>
                        )}
                      </div>
                    </div>
                    {entry.photoUrl && (
                      <div className="mt-3">
                        <img 
                          src={entry.photoUrl} 
                          alt="Progress photo" 
                          className="rounded-md w-full h-auto max-h-48 object-cover object-center" 
                        />
                      </div>
                    )}
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