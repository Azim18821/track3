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
import { AlertCircle, Dumbbell, Salad, CheckCircle, Clock, Mail } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Login form schema - with more tolerant validation for mobile
const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Registration form schema with more tolerant email validation for mobile
const registerSchema = z.object({
  username: z.string().trim().min(2, "Username must be at least 2 characters"),
  // More flexible email validation for iOS
  email: z.string()
    .trim()
    .min(5, "Email must be at least 5 characters")
    .refine(
      (val) => val.includes('@') && val.includes('.'), 
      { message: "Must be a valid email address" }
    ),
  password: z.string().min(4, "Password must be at least 4 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password")
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<{ username: string, email: string } | null>(null);
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation, logoutMutation } = useAuth();
  
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
    },
  });
  
  // Effect to switch to login tab after registration success
  useEffect(() => {
    if (registerMutation.isSuccess && !registrationComplete) {
      setRegistrationComplete(true);
      setRegisteredUser({
        username: registerForm.getValues().username,
        email: registerForm.getValues().email
      });
      
      // Clear the form
      registerForm.reset();
    }
  }, [registerMutation.isSuccess, registrationComplete, registerForm]);

  // Effect for redirect if already logged in
  // Note: This must be after all hook calls to avoid the "rendered fewer hooks than expected" error
  if (user && user.isApproved) {
    // Use setTimeout to avoid the state update during render
    setTimeout(() => {
      setLocation("/");
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

  return (
    <div className="h-screen h-[100dvh] w-screen flex flex-col md:flex-row bg-black fixed inset-0" style={{paddingBottom: '34px', marginBottom: '-34px'}}>
      {/* Auth Form Section */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-center">
              {registrationComplete 
                ? "Registration Successful" 
                : activeTab === "login" 
                  ? "Sign In" 
                  : "Create Account"}
            </CardTitle>
            <CardDescription className="text-center">
              {registrationComplete
                ? "Your account is pending admin approval"
                : activeTab === "login"
                  ? "Enter your credentials to access your account"
                  : "Register to track your fitness journey"}
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                <TabsList className="grid grid-cols-2 mb-6">
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
                        className="w-full"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Signing in..." : "Sign In"}
                      </Button>
                      
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full mt-3"
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
                    <AlertDescription className="text-blue-700">
                      New accounts require admin approval before you can login. You'll be notified when your account is approved.
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
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
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
                      
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? "Creating account..." : "Create Account"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hero Section */}
      <div className="flex-1 bg-gradient-to-br from-primary to-primary-foreground text-white p-8 flex items-center">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center space-x-3 mb-6">
            <Dumbbell className="h-8 w-8" />
            <h1 className="text-3xl font-bold">TrackMadeEazE</h1>
          </div>
          
          <h2 className="text-4xl font-bold mb-4">Track your fitness journey, achieve your goals</h2>
          
          <p className="text-lg mb-8">
            A comprehensive fitness tracking application to monitor your nutrition intake and 
            workout progress with auto-saving functionality.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Salad className="h-6 w-6 mt-1 text-primary-foreground" />
              <div>
                <h3 className="font-bold text-xl">Nutrition Tracking</h3>
                <p>Monitor your calories, protein, carbs, and fat intake with accurate information</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Dumbbell className="h-6 w-6 mt-1 text-primary-foreground" />
              <div>
                <h3 className="font-bold text-xl">Workout Progress</h3>
                <p>Record exercises, sets, reps, and weights to track your strength progression</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-6 w-6 mt-1 text-primary-foreground" />
              <div>
                <h3 className="font-bold text-xl">Auto-Saving</h3>
                <p>Never lose your data with our automatic saving functionality</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}