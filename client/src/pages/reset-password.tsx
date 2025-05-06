import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Link } from "wouter";

// Form validation schema
const resetPasswordSchema = z.object({
  password: z.string().min(6, {
    message: "Password must be at least 6 characters",
  }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState("");

  const params = new URLSearchParams(search);
  const token = params.get("token");
  const email = params.get("email");

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Verify the token when the component mounts
  useEffect(() => {
    async function verifyToken() {
      if (!token || !email) {
        setTokenError("Missing token or email");
        setIsVerifying(false);
        return;
      }

      try {
        const response = await apiRequest(
          "GET",
          `/api/password-reset/verify?token=${token}&email=${encodeURIComponent(email)}`
        );

        const data = await response.json();
        
        if (response.ok && data.valid) {
          setIsTokenValid(true);
        } else {
          setTokenError(data.error || "Invalid or expired token");
        }
      } catch (error) {
        setTokenError("Failed to verify token");
      } finally {
        setIsVerifying(false);
      }
    }

    verifyToken();
  }, [token, email]);

  async function onSubmit(data: ResetPasswordFormData) {
    if (!token || !email) {
      toast({
        title: "Error",
        description: "Missing token or email",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiRequest(
        "POST",
        "/api/password-reset/reset",
        {
          token,
          email,
          password: data.password,
          confirmPassword: data.confirmPassword,
        }
      );
      
      if (response.ok) {
        setIsSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          setLocation("/auth");
        }, 3000);
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to reset password",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const renderContent = () => {
    if (isVerifying) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p>Verifying reset token...</p>
        </div>
      );
    }

    if (!isTokenValid) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Invalid Token</AlertTitle>
          <AlertDescription>
            {tokenError || "Your password reset link is invalid or has expired."}
          </AlertDescription>
          <div className="mt-4">
            <Link href="/forgot-password">
              <Button variant="outline" size="sm">Request a new link</Button>
            </Link>
          </div>
        </Alert>
      );
    }

    if (isSuccess) {
      return (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertTitle>Password Reset Successful!</AlertTitle>
          <AlertDescription>
            Your password has been successfully reset. You will be redirected to the login page in a few seconds.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your new password"
                    type="password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Confirm your new password"
                    type="password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Resetting..." : "Reset Password"}
          </Button>
        </form>
      </Form>
    );
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Reset Your Password
          </CardTitle>
          <CardDescription className="text-center">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/auth" className="flex items-center text-sm text-blue-600">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}