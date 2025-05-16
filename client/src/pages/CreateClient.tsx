import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

// UI Components
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Loader2, UserPlus, UserCheck } from 'lucide-react';

// Validation schema for client creation
const createClientSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot be more than 30 characters')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Username can only contain letters, numbers, dots, underscores, and hyphens'),
  email: z.string()
    .email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password cannot be more than 100 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  notes: z.string().optional(),
});

type CreateClientFormValues = z.infer<typeof createClientSchema>;

export default function CreateClient() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [createdClientId, setCreatedClientId] = React.useState<number | null>(null);

  // Initialize the form
  const form = useForm<CreateClientFormValues>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      notes: '',
    },
  });

  // Redirect if not a trainer
  React.useEffect(() => {
    if (user && !user.isTrainer && !user.isAdmin) {
      navigate('/');
    }
  }, [user, navigate]);

  // Handle form submission
  const onSubmit = async (values: CreateClientFormValues) => {
    if (!user?.isTrainer && !user?.isAdmin) {
      toast({
        title: 'Permission Denied',
        description: 'You must be a trainer to create client accounts',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/trainer/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create client');
      }

      const data = await response.json();
      
      // Set success state and store the created client ID
      setSuccess(true);
      setCreatedClientId(data.clientId);
      
      toast({
        title: 'Client Created Successfully',
        description: `${values.username} has been created and connected to your account.`,
      });
    } catch (error) {
      toast({
        title: 'Error Creating Client',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render success state
  if (success && createdClientId) {
    return (
      <div className="container py-10 max-w-3xl">
        <Card className="border-green-100 dark:border-green-900 bg-green-50/50 dark:bg-green-900/10">
          <CardHeader>
            <div className="flex items-center">
              <UserCheck className="h-6 w-6 mr-2 text-green-600 dark:text-green-500" />
              <CardTitle>Client Created Successfully</CardTitle>
            </div>
            <CardDescription>
              The client account has been created and is now connected to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">
              Client username: <strong>{form.getValues('username')}</strong>
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                onClick={() => navigate('/trainer')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Dashboard
              </Button>
              <Button 
                onClick={() => navigate(`/trainer/clients/${createdClientId}`)}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Manage Client
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  form.reset();
                  setSuccess(false);
                  setCreatedClientId(null);
                }}
              >
                Create Another Client
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-10 max-w-3xl">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          className="mr-4 text-muted-foreground hover:text-foreground p-0"
          onClick={() => navigate('/trainer')}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Create Client Account</h1>
      </div>

      {!user?.isTrainer && !user?.isAdmin && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Permission Denied</AlertTitle>
          <AlertDescription>
            You must be a trainer to create client accounts.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
          <CardDescription>
            Create a new client account that will be automatically connected to you as their trainer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="client_username" {...field} />
                    </FormControl>
                    <FormDescription>
                      Username must be unique and will be used for login
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="client@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormDescription>
                      Must be at least 8 characters with a number and uppercase letter
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trainer Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add any notes about this client. Only visible to you." 
                        className="min-h-32"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      These notes will be saved in your trainer-client relationship
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                disabled={isSubmitting || !user?.isTrainer && !user?.isAdmin}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Client
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}