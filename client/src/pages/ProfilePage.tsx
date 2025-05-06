import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdaptiveDialog, AdaptiveDialogContent, AdaptiveDialogHeader, AdaptiveDialogTitle, AdaptiveDialogTrigger } from "@/components/ui/adaptive-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, 
  UserCircle, 
  Lock, 
  Mail, 
  Scale, 
  Ruler, 
  Calendar, 
  User, 
  Cake,
  LineChart,
  Bell
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { PushNotificationSettings } from "@/components/PushNotificationSettings";

// Define schemas for weight data
const weightSchema = z.object({
  weight: z.coerce.number().min(20, "Weight must be at least 20").max(500, "Weight cannot exceed 500"),
  unit: z.enum(["kg", "lb"]).default("kg"),
  date: z.date().default(() => new Date())
});

type WeightLog = z.infer<typeof weightSchema>;

// Extended profile update schema
const profileUpdateSchema = z.object({
  email: z.string().email("Invalid email address"),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  height: z.coerce.number().min(50, "Height must be at least 50").max(300, "Height cannot exceed 300").optional().nullable(),
  weight: z.coerce.number().min(20, "Weight must be at least 20").max(500, "Weight cannot exceed 500").optional().nullable(),
  heightUnit: z.enum(["cm", "inches"]).default("cm"),
  weightUnit: z.enum(["kg", "lb"]).default("kg")
});

// Password change schema
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
type PasswordChange = z.infer<typeof passwordChangeSchema>;

const ProfilePage = () => {
  const { user } = useAuth();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isAddWeightOpen, setIsAddWeightOpen] = useState(false);
  const { toast } = useToast();

  // Fetch user's weight history
  const { data: weights = [], isLoading: isLoadingWeights } = useQuery({
    queryKey: ['/api/weights'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/weights');
      if (!response.ok) {
        throw new Error('Failed to fetch weight history');
      }
      return response.json();
    }
  });

  // Weight log form
  const weightForm = useForm<WeightLog>({
    resolver: zodResolver(weightSchema),
    defaultValues: {
      weight: user?.weight || undefined,
      unit: user?.weightUnit || "kg",
      date: new Date()
    }
  });
  
  // Profile update form
  const profileForm = useForm<ProfileUpdate>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      email: user?.email || "",
      dateOfBirth: user?.dateOfBirth ? format(new Date(user.dateOfBirth), 'yyyy-MM-dd') : undefined,
      gender: user?.gender || "",
      height: user?.height || undefined,
      weight: user?.weight || undefined,
      heightUnit: user?.heightUnit || "cm",
      weightUnit: user?.weightUnit || "kg"
    },
  });

  // Update profile form values when user data changes
  useEffect(() => {
    if (user) {
      profileForm.reset({
        email: user.email || "",
        dateOfBirth: user.dateOfBirth ? format(new Date(user.dateOfBirth), 'yyyy-MM-dd') : undefined,
        gender: user.gender || "",
        height: user.height || undefined,
        weight: user.weight || undefined,
        heightUnit: user.heightUnit || "cm",
        weightUnit: user.weightUnit || "kg"
      });
      
      // Also update weight form default with current user weight
      if (user.weight) {
        weightForm.setValue("weight", user.weight);
      }
      if (user.weightUnit) {
        weightForm.setValue("unit", user.weightUnit as "kg" | "lb");
      }
    }
  }, [user, profileForm, weightForm]);
  
  // Password change form
  const passwordForm = useForm<PasswordChange>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Weight log mutation
  const logWeightMutation = useMutation({
    mutationFn: async (data: WeightLog) => {
      const res = await apiRequest("POST", "/api/weights", {
        weight: data.weight,
        unit: data.unit,
        date: format(data.date, 'yyyy-MM-dd')
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to log weight");
      }
      return res.json();
    },
    onSuccess: () => {
      setIsAddWeightOpen(false);
      weightForm.reset({
        weight: user?.weight || undefined,
        unit: user?.weightUnit as "kg" | "lb" || "kg",
        date: new Date()
      });
      toast({
        title: "Weight logged",
        description: "Your weight has been logged successfully.",
      });
      // Refresh weight history
      queryClient.invalidateQueries({ queryKey: ['/api/weights'] });
      // Also refresh user data since profile is updated with new weight
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to log weight",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileUpdate) => {
      const res = await apiRequest("PATCH", "/api/profile", data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: () => {
      setIsEditProfileOpen(false);
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully.",
      });
      // Refresh user data
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      // Also refresh weight history if weight was updated
      queryClient.invalidateQueries({ queryKey: ['/api/weights'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordChange) => {
      const res = await apiRequest("PUT", "/api/user/password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to change password");
      }
      return res.json();
    },
    onSuccess: () => {
      setIsChangePasswordOpen(false);
      passwordForm.reset();
      toast({
        title: "Password changed",
        description: "Your password has been changed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Password change failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Form submissions
  const onUpdateProfile = (data: ProfileUpdate) => {
    updateProfileMutation.mutate(data);
  };

  const onChangePassword = (data: PasswordChange) => {
    changePasswordMutation.mutate(data);
  };
  
  const onLogWeight = (data: WeightLog) => {
    logWeightMutation.mutate(data);
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-96">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
          My Profile
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader className="pb-0">
            <div className="flex justify-center">
              <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <UserCircle className="w-24 h-24 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-center">
            <h3 className="font-semibold text-lg">{user.username}</h3>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            
            <div className="mt-6 space-y-4">
              <AdaptiveDialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
                <AdaptiveDialogTrigger asChild>
                  <Button className="w-full">
                    Edit Profile
                  </Button>
                </AdaptiveDialogTrigger>
                <AdaptiveDialogContent className="sm:max-w-[500px]">
                  <AdaptiveDialogHeader>
                    <AdaptiveDialogTitle>Edit Profile</AdaptiveDialogTitle>
                  </AdaptiveDialogHeader>
                  
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onUpdateProfile as any)} className="space-y-6">
                      <Tabs defaultValue="basic">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="basic">Basic Info</TabsTrigger>
                          <TabsTrigger value="physical">Physical Info</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="basic" className="space-y-4 mt-4">
                          <FormField
                            control={profileForm.control as any}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input placeholder="Email address" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={profileForm.control as any}
                            name="dateOfBirth"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Date of Birth</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={profileForm.control as any}
                            name="gender"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Gender</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value || ''}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select gender" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Male">Male</SelectItem>
                                    <SelectItem value="Female">Female</SelectItem>
                                    <SelectItem value="Non-binary">Non-binary</SelectItem>
                                    <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TabsContent>
                        
                        <TabsContent value="physical" className="space-y-4 mt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={profileForm.control as any}
                              name="height"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Height</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      placeholder="Height" 
                                      {...field}
                                      onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={profileForm.control as any}
                              name="heightUnit"
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
                              control={profileForm.control as any}
                              name="weight"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Weight</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      placeholder="Weight" 
                                      {...field}
                                      onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={profileForm.control as any}
                              name="weightUnit"
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
                                      <SelectItem value="lb">Pounds (lb)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="text-sm text-muted-foreground">
                            <p>Note: Updating weight will automatically log this as a new weight entry</p>
                          </div>
                        </TabsContent>
                      </Tabs>
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Updating...
                          </>
                        ) : "Update Profile"}
                      </Button>
                    </form>
                  </Form>
                </AdaptiveDialogContent>
              </AdaptiveDialog>
              
              <AdaptiveDialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
                <AdaptiveDialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    Change Password
                  </Button>
                </AdaptiveDialogTrigger>
                <AdaptiveDialogContent>
                  <AdaptiveDialogHeader>
                    <AdaptiveDialogTitle>Change Password</AdaptiveDialogTitle>
                  </AdaptiveDialogHeader>
                  
                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-6">
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm New Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={changePasswordMutation.isPending}
                      >
                        {changePasswordMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Changing...
                          </>
                        ) : "Change Password"}
                      </Button>
                    </form>
                  </Form>
                </AdaptiveDialogContent>
              </AdaptiveDialog>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic">
              <TabsList className="grid grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="biometrics">Biometrics</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Username</Label>
                    <div className="mt-1 p-2 bg-muted rounded-md">
                      {user.username}
                    </div>
                  </div>
                  
                  <div>
                    <Label>Email</Label>
                    <div className="mt-1 p-2 bg-muted rounded-md flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                      {user.email}
                    </div>
                  </div>
                  
                  <div>
                    <Label>Account Type</Label>
                    <div className="mt-1 p-2 bg-muted rounded-md">
                      {user.isAdmin 
                        ? "Administrator" 
                        : user.isTrainer 
                          ? "Trainer" 
                          : "Standard User"}
                    </div>
                  </div>
                  
                  <div>
                    <Label>Account Status</Label>
                    <div className="mt-1 p-2 bg-muted rounded-md">
                      {user.isApproved ? (
                        <span className="text-green-600 font-medium">Approved</span>
                      ) : (
                        <span className="text-amber-600 font-medium">Pending Approval</span>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <Label>Date of Birth</Label>
                    <div className="mt-1 p-2 bg-muted rounded-md flex items-center">
                      <Cake className="w-4 h-4 mr-2 text-muted-foreground" />
                      {user.dateOfBirth ? format(new Date(user.dateOfBirth), 'MMMM d, yyyy') : 'Not set'}
                    </div>
                  </div>
                  
                  <div>
                    <Label>Gender</Label>
                    <div className="mt-1 p-2 bg-muted rounded-md flex items-center">
                      <User className="w-4 h-4 mr-2 text-muted-foreground" />
                      {user.gender || 'Not set'}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end mt-4">
                  <Button 
                    onClick={() => setIsEditProfileOpen(true)}
                    variant="outline"
                  >
                    Edit Information
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="biometrics" className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Height</Label>
                    <div className="mt-1 p-2 bg-muted rounded-md flex items-center">
                      <Ruler className="w-4 h-4 mr-2 text-muted-foreground" />
                      {user.height ? `${user.height} ${user.heightUnit || 'cm'}` : 'Not set'}
                    </div>
                  </div>
                  
                  <div>
                    <Label>Current Weight</Label>
                    <div className="mt-1 p-2 bg-muted rounded-md flex items-center">
                      <Scale className="w-4 h-4 mr-2 text-muted-foreground" />
                      {user.weight ? `${user.weight} ${user.weightUnit || 'kg'}` : 'Not set'}
                    </div>
                  </div>
                </div>
                
                <Card className="mt-4">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">Weight History</CardTitle>
                      <AdaptiveDialog open={isAddWeightOpen} onOpenChange={setIsAddWeightOpen}>
                        <AdaptiveDialogTrigger asChild>
                          <Button size="sm">
                            Log Weight
                          </Button>
                        </AdaptiveDialogTrigger>
                        <AdaptiveDialogContent>
                          <AdaptiveDialogHeader>
                            <AdaptiveDialogTitle>Log Your Weight</AdaptiveDialogTitle>
                          </AdaptiveDialogHeader>
                          
                          <Form {...weightForm}>
                            <form onSubmit={weightForm.handleSubmit(onLogWeight)} className="space-y-4">
                              <FormField
                                control={weightForm.control}
                                name="weight"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Weight</FormLabel>
                                    <FormControl>
                                      <Input type="number" placeholder="Enter your weight" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={weightForm.control}
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
                                        <SelectItem value="lb">Pounds (lb)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <Button 
                                type="submit" 
                                className="w-full"
                                disabled={logWeightMutation.isPending}
                              >
                                {logWeightMutation.isPending ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                  </>
                                ) : "Log Weight"}
                              </Button>
                            </form>
                          </Form>
                        </AdaptiveDialogContent>
                      </AdaptiveDialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoadingWeights ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : weights.length > 0 ? (
                      <div className="mt-2">
                        <div className="space-y-2">
                          {weights.slice().reverse().slice(0, 5).map((weight, index) => (
                            <div key={index} className="flex justify-between items-center p-2 rounded-md bg-muted">
                              <div className="flex items-center">
                                <Scale className="w-4 h-4 mr-2 text-muted-foreground" />
                                <span>{weight.weight} {weight.unit}</span>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(weight.date), 'MMM d, yyyy')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <Scale className="h-8 w-8 mx-auto mb-2 opacity-70" />
                        <p>No weight data available</p>
                        <p className="text-sm">Click "Log Weight" to start tracking</p>
                      </div>
                    )}
                  </CardContent>
                  {weights.length > 5 && (
                    <CardFooter className="flex justify-center pt-0">
                      <Button variant="link" className="text-sm">
                        View All History
                      </Button>
                    </CardFooter>
                  )}
                </Card>
                
                <div className="flex justify-end mt-4">
                  <Button 
                    onClick={() => setIsEditProfileOpen(true)}
                    variant="outline"
                  >
                    Edit Biometrics
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="security" className="mt-4 space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center">
                      <Lock className="w-5 h-5 mr-3 text-muted-foreground" />
                      <div>
                        <h4 className="font-medium">Password</h4>
                        <p className="text-sm text-muted-foreground">
                          Last updated: Not available
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsChangePasswordOpen(true)}
                    >
                      Change
                    </Button>
                  </div>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Security Tips</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <ul className="list-disc list-inside space-y-2">
                        <li>Use a strong, unique password for your account</li>
                        <li>Change your password regularly</li>
                        <li>Don't reuse passwords from other websites</li>
                        <li>Never share your login information with others</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="notifications" className="mt-4 space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center">
                      <Bell className="w-5 h-5 mr-3 text-muted-foreground" />
                      <div>
                        <h4 className="font-medium">Mobile Push Notifications</h4>
                        <p className="text-sm text-muted-foreground">
                          Manage mobile app notifications
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <PushNotificationSettings />
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Notification Tips</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <ul className="list-disc list-inside space-y-2">
                        <li>Enable push notifications to get reminded about your workouts</li>
                        <li>Allow meal reminders to maintain your nutrition schedule</li>
                        <li>Stay informed when your fitness plan is updated</li>
                        <li>Install our mobile app for the best notification experience</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;