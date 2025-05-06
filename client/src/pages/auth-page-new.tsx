import { useState, useEffect } from "react";
import { useAuth } from "../hooks/use-auth";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient } from "../lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Dumbbell, Salad, CheckCircle, Clock, Mail, Activity } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useIsMobile } from "../hooks/use-mobile";

// Login form schema
const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Registration form schema with email validation and password confirmation
const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
  trainerUsername: z.string().optional(), // Optional trainer username field
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<{ username: string, email: string } | null>(null);
  const [splashVisible, setSplashVisible] = useState(true);
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation, logoutMutation } = useAuth();
  const isMobile = useIsMobile();
  
  // Login form
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      trainerUsername: "",
    },
  });
  
  // Effect to handle registration success
  useEffect(() => {
    if (registerMutation.isSuccess && !registrationComplete) {
      setRegistrationComplete(true);
      setRegisteredUser({
        username: registerForm.getValues().username,
        email: registerForm.getValues().email
      });
      
      // Clear the form
      registerForm.reset();
      
      // Store the username to prefill onboarding later
      try {
        localStorage.setItem('registeredUsername', registerForm.getValues().username);
      } catch (e) {
        console.error('Failed to store username in localStorage:', e);
      }
    }
  }, [registerMutation.isSuccess, registrationComplete, registerForm]);

  // Effect for redirect if already logged in
  // Note: This must be after all hook calls to avoid the "rendered fewer hooks than expected" error
  if (user && user.isApproved) {
    // Use setTimeout to avoid the state update during render
    setTimeout(() => {
      setLocation("/dashboard");
    }, 0);
  }

  // Form submission handlers
  const onLoginSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(values);
  };

  const onRegisterSubmit = (values: z.infer<typeof registerSchema>) => {
    // Omit the confirmPassword field when sending to the server
    const { confirmPassword, ...registrationData } = values;
    registerMutation.mutate(registrationData);
  };
  
  // Go back to login form - simpler approach
  const handleStartOver = () => {
    // Using a global variable to signal we need to reset when the component loads
    window.localStorage.setItem('reset_registration', 'true');
    
    // Reload the page to reset all state
    window.location.reload();
  };
  
  // Effect to check if we need to reset registration state
  useEffect(() => {
    const needsReset = window.localStorage.getItem('reset_registration');
    if (needsReset === 'true') {
      // Clear the flag
      window.localStorage.removeItem('reset_registration');
      
      // Reset all state
      setRegistrationComplete(false);
      setRegisteredUser(null);
      queryClient.setQueryData(["/api/user"], null);
      setActiveTab("login");
      loginForm.reset();
    }
  }, [loginForm, setActiveTab, setRegistrationComplete, setRegisteredUser]);
  
  // Effect to hide splash screen after delay
  useEffect(() => {
    if (splashVisible) {
      const timer = setTimeout(() => {
        setSplashVisible(false);
      }, 2500); // 2.5 seconds delay
      
      return () => clearTimeout(timer);
    }
  }, [splashVisible]);

  return (
    <>
      {/* Splash Screen */}
      {splashVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden" 
          style={{ 
            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)'
          }}
        >
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-64 bg-white/5 transform -skew-y-6"></div>
            <div className="absolute bottom-0 right-0 w-full h-64 bg-white/5 transform skew-y-6"></div>
            <div className="absolute h-full w-full bg-[url('/assets/fitness-pattern.svg')] opacity-5 bg-repeat"></div>
          </div>
          <div className="flex flex-col items-center relative">
            <div className="flex items-center bg-white/10 backdrop-blur-sm px-8 py-6 rounded-2xl shadow-2xl mb-4">
              <Dumbbell className="h-12 w-12 text-blue-200 mr-3" />
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">TrackMadeEazE</h1>
                <p className="text-indigo-200 text-sm">Your AI Fitness Coach</p>
              </div>
            </div>
            <div className="relative mt-4">
              <div className="h-2 w-48 bg-indigo-300/30 rounded-full overflow-hidden">
                <div className="h-2 bg-indigo-200 rounded-full animate-load-progress"></div>
              </div>
              <p className="text-indigo-200 text-sm mt-3 text-center font-medium">
                Personalizing your fitness experience...
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className={`min-h-screen flex flex-col ${isMobile ? '' : 'md:flex-row'} transition-opacity duration-500 ${splashVisible ? 'opacity-0' : 'opacity-100'}`}
         style={{ backgroundImage: "url('/assets/fitness-pattern.svg')", backgroundSize: '400px', opacity: 0.97 }}>
        {/* Auth Form Section */}
        <div className="flex-1 flex items-center justify-center p-4 md:p-6 bg-white bg-opacity-95">
          <Card className="w-full max-w-md shadow-xl border-0">
            <CardHeader className={`${isMobile ? 'pt-6 pb-4' : 'pt-8 pb-6'} bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg`}>
              <div className="flex justify-center mb-3">
                <div className="bg-white/15 p-3 rounded-full backdrop-blur-sm">
                  <Activity className="h-8 w-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-center">
                {registrationComplete 
                  ? "Registration Successful" 
                  : activeTab === "login" 
                    ? "Welcome Back" 
                    : "Join TrackMadeEazE"}
              </CardTitle>
              <CardDescription className="text-center text-blue-100">
                {registrationComplete
                  ? "Your account is pending admin approval"
                  : activeTab === "login"
                    ? "Sign in to access your fitness dashboard"
                    : "Create an account with your AI fitness coach"}
              </CardDescription>
            </CardHeader>
            <CardContent className={isMobile ? 'pt-2' : ''}>
              {registrationComplete && registeredUser ? (
                <div className="flex flex-col items-center text-center">
                  <div className="bg-green-50 rounded-full p-4 mb-6">
                    <CheckCircle className="h-12 w-12 text-green-500" />
                  </div>
                  
                  <h2 className="text-2xl font-bold mb-2">Registration Complete!</h2>
                  <p className="text-gray-600 mb-6">
                    Thank you for registering, <span className="font-semibold">{registeredUser.username}</span>. Your account has been created and is now pending administrator approval.
                  </p>
                  
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 w-full">
                    <div className="flex items-start mb-3">
                      <Clock className="h-5 w-5 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
                      <p className="text-amber-700 text-sm text-left">
                        <span className="font-semibold">Account approval required</span>: 
                        An administrator will review and approve your account. This process usually takes 1-2 business days.
                      </p>
                    </div>
                    
                    <div className="flex items-start">
                      <Mail className="h-5 w-5 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
                      <p className="text-amber-700 text-sm text-left">
                        <span className="font-semibold">Next steps</span>: 
                        We'll notify you via email ({registeredUser.email}) once your account has been approved. You can then return to this page to log in.
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => {
                      // Use the logoutMutation from useAuth to properly clear the session
                      logoutMutation.mutate(undefined, {
                        onSuccess: () => {
                          // Clear all cached data
                          queryClient.clear();
                          // Reset registration state
                          setRegistrationComplete(false);
                          setRegisteredUser(null);
                          // Switch to login tab
                          setActiveTab("login");
                          // Force reload to clear all state
                          window.location.href = '/auth';
                        }
                      });
                    }}
                    className="w-full"
                    disabled={logoutMutation.isPending}
                  >
                    {logoutMutation.isPending ? "Returning to Login..." : "Return to Login"}
                  </Button>
                </div>
              ) : (
                <Tabs
                  defaultValue="login"
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList className="grid grid-cols-2 mb-4">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="register">Register</TabsTrigger>
                  </TabsList>
    
                  {/* Login Tab */}
                  <TabsContent value="login">
                    {/* Show message for unapproved users who are trying to login */}
                    {user && !user.isApproved && (
                      <Alert className="mb-4 border-amber-500 bg-amber-50 text-amber-900">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        <AlertDescription className="text-amber-700">
                          Your account is pending approval by an administrator. Please check back later.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {loginMutation.isError && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {loginMutation.error?.message || "Invalid credentials"}
                        </AlertDescription>
                      </Alert>
                    )}
    
                    <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                        <FormField
                          control={loginForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your username" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
    
                        <FormField
                          control={loginForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="••••••" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
    
                        <Button
                          type="submit"
                          className="w-full h-11"
                          disabled={loginMutation.isPending}
                        >
                          {loginMutation.isPending ? "Signing in..." : "Sign In"}
                        </Button>
                        
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full mt-2 h-11"
                          onClick={() => window.location.href = '/forgot-password'}
                        >
                          Forgot Password?
                        </Button>
                      </form>
                    </Form>
                  </TabsContent>
    
                  {/* Register Tab */}
                  <TabsContent value="register">
                    <Alert className="mb-4 border-blue-500 bg-blue-50 text-blue-900">
                      <AlertCircle className="h-4 w-4 text-blue-500" />
                      <AlertDescription className="text-blue-700 text-xs">
                        New accounts require admin approval before you can login.
                      </AlertDescription>
                    </Alert>
                    
                    {registerMutation.isError && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {registerMutation.error?.message || "Registration failed"}
                        </AlertDescription>
                      </Alert>
                    )}
    
                    <Form {...registerForm}>
                      <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-3">
                        <FormField
                          control={registerForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input placeholder="Choose a username" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
    
                        <FormField
                          control={registerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email" 
                                  placeholder="your.email@example.com" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
    
                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="••••••" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={registerForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="••••••" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={registerForm.control}
                          name="trainerUsername"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Trainer Username (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Trainer's username if you have one" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
    
                        <Button 
                          type="submit" 
                          className="w-full h-11 mt-2"
                          disabled={registerMutation.isPending}
                        >
                          {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                        </Button>
                      </form>
                    </Form>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Only show info section on larger screens */}
        {!isMobile && (
          <div className="flex-1 bg-indigo-600 p-8 flex items-center justify-center text-white hidden md:flex">
            <div className="max-w-md space-y-6">
              <h1 className="text-3xl font-bold tracking-tight">TrackMadeEazE</h1>
              <p className="text-indigo-100 text-lg">
                A comprehensive fitness tracking application to monitor your nutrition intake and 
                workout progress with auto-saving functionality.
              </p>
              
              <div className="grid grid-cols-1 gap-6 mt-8">
                <div className="flex items-start space-x-4 bg-indigo-700/40 p-4 rounded-lg mb-5">
                  <Activity className="h-8 w-8 text-white mt-1" />
                  <div>
                    <h3 className="font-bold text-xl">AI Personal Trainer</h3>
                    <p>Get custom workout and meal plans generated by our proprietary AI technology, tailored to your goals</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <Dumbbell className="h-8 w-8 text-indigo-300 mt-1" />
                  <div>
                    <h3 className="font-bold text-xl">Workout Tracking</h3>
                    <p>Monitor your sets, reps, and weight progression over time</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <Salad className="h-8 w-8 text-indigo-300 mt-1" />
                  <div>
                    <h3 className="font-bold text-xl">Nutrition Monitoring</h3>
                    <p>Log your meals and track your macro and micronutrient intake</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}