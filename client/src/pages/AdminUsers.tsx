import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, User, Search, Check, X, Mail, Settings, Users, Shield,
  Trophy, FileDown, UserCheck, Trash2, AlertTriangle
} from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLocation } from 'wouter';
import { format } from 'date-fns';

interface AppUser {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
  isApproved: boolean;
  isTrainer?: boolean;
  registered_at: string;
}

export default function AdminUsers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Redirect if not admin
  useEffect(() => {
    if (user && !user.isAdmin) {
      navigate('/');
    }
  }, [user, navigate]);
  
  // Fetch all users
  const { data: users, isLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return await res.json();
    },
    enabled: !!user?.isAdmin
  });

  // Approve user mutation
  const approveUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest('POST', `/api/admin/approve/${userId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to approve user');
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User approved",
        description: "The user has been approved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error approving user",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest('DELETE', `/api/admin/users/${userId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to delete user');
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "The user has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting user",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle user approval
  const handleApproveUser = (userId: number) => {
    approveUserMutation.mutate(userId);
  };
  
  // Handle user deletion
  const handleDeleteUser = (userId: number, username: string) => {
    if (window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      deleteUserMutation.mutate(userId);
    }
  };
  
  // Filter users based on search query
  const filteredUsers = users?.filter((user: AppUser) => {
    const query = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  });
  
  // Check if not admin
  if (!user || !user.isAdmin) {
    return (
      <div className="container py-10">
        <Alert variant="destructive">
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to view this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="container py-10 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="container py-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">Manage user accounts, roles, and permissions</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1"
            onClick={() => navigate('/profile')}
          >
            <User size={16} />
            My Profile
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            className="flex items-center gap-1 bg-gradient-to-r from-blue-600 to-indigo-600"
            onClick={() => navigate('/admin/settings')}
          >
            <Settings size={16} />
            System Settings
          </Button>
        </div>
      </div>
      
      <div className="mt-6 mb-8">
        <h2 className="text-lg font-medium mb-3">User Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard 
            title="Total Users" 
            value={users?.length || 0}
            icon={<Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />} 
            color="blue" 
          />
          <StatsCard 
            title="Pending Approval" 
            value={users?.filter((u: AppUser) => !u.isApproved).length || 0} 
            highlight={users?.some((u: AppUser) => !u.isApproved)} 
            icon={<UserCheck className="h-6 w-6 text-amber-600 dark:text-amber-400" />}
            color="amber"
          />
          <StatsCard 
            title="Admins"
            value={users?.filter((u: AppUser) => u.isAdmin).length || 0}
            icon={<Shield className="h-6 w-6 text-red-600 dark:text-red-400" />}
            color="red"
          />
          <StatsCard 
            title="Trainers"
            value={users?.filter((u: AppUser) => u.isTrainer).length || 0}
            icon={<Trophy className="h-6 w-6 text-purple-600 dark:text-purple-400" />}
            color="purple"
          />
          <StatsCard 
            title="Regular Users"
            value={users?.filter((u: AppUser) => u.isApproved && !u.isAdmin && !u.isTrainer).length || 0}
            icon={<User className="h-6 w-6 text-green-600 dark:text-green-400" />}
            color="green"
          />
        </div>
      </div>
      
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl flex items-center">
            <Users className="mr-2" size={20} />
            Manage Users
          </CardTitle>
          <Button variant="outline" size="sm" className="text-xs h-8">
            <FileDown className="h-3.5 w-3.5 mr-1" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers?.length > 0 ? (
                  filteredUsers.map((user: AppUser) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.username}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Mail className="mr-2" size={16} />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(user.registered_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {user.isApproved ? (
                          <Badge className="bg-green-500 hover:bg-green-600 text-white">Approved</Badge>
                        ) : (
                          <Badge variant="destructive">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.isAdmin ? (
                            <Badge variant="secondary" className="bg-blue-500 text-white hover:bg-blue-600">Admin</Badge>
                          ) : user.isTrainer ? (
                            <Badge variant="secondary" className="bg-purple-500 text-white hover:bg-purple-600">Trainer</Badge>
                          ) : (
                            <Badge variant="outline">User</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!user.isApproved ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex items-center text-green-600 hover:text-green-700"
                              onClick={() => handleApproveUser(user.id)}
                              disabled={approveUserMutation.isPending}
                            >
                              {approveUserMutation.isPending ? (
                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="mr-2 h-3 w-3" />
                              )}
                              Approve
                            </Button>
                          ) : (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="flex items-center"
                                onClick={() => navigate(`/admin/users/${user.id}`)}
                              >
                                Edit
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="flex items-center"
                                onClick={() => navigate(`/admin/users/${user.id}/workouts`)}
                              >
                                Workouts
                              </Button>
                              {!user.isAdmin && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center text-red-600 hover:text-red-700"
                                  onClick={() => handleDeleteUser(user.id, user.username)}
                                  disabled={deleteUserMutation.isPending}
                                >
                                  {deleteUserMutation.isPending && deleteUserMutation.variables === user.id ? (
                                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="mr-2 h-3 w-3" />
                                  )}
                                  Delete
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      {searchQuery ? (
                        <div className="text-muted-foreground">
                          <p>No users matching "{searchQuery}"</p>
                        </div>
                      ) : (
                        <div className="text-muted-foreground">
                          <p>No users found</p>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <div className="mt-6">
        <h2 className="text-lg font-medium mb-3">Usage Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard title="Total Users" value={users?.length || 0} />
          <StatsCard 
            title="Pending Approval" 
            value={users?.filter((u: AppUser) => !u.isApproved).length || 0} 
            highlight={users?.some((u: AppUser) => !u.isApproved)} 
          />
          <StatsCard 
            title="Admins"
            value={users?.filter((u: AppUser) => u.isAdmin).length || 0}
          />
          <StatsCard 
            title="Trainers"
            value={users?.filter((u: AppUser) => u.isTrainer).length || 0}
          />
          <StatsCard 
            title="Regular Users"
            value={users?.filter((u: AppUser) => u.isApproved && !u.isAdmin && !u.isTrainer).length || 0}
          />
        </div>
      </div>
    </div>
  );
}

// Stats card component for displaying user statistics
function StatsCard({ 
  title, 
  value, 
  highlight = false, 
  icon,
  color
}: { 
  title: string; 
  value: number; 
  highlight?: boolean;
  icon?: React.ReactNode;
  color?: string;
}) {
  return (
    <Card className={highlight ? `border-${color || "amber"}-500` : ""}>
      <CardContent className="pt-6">
        <div className="flex justify-between items-center">
          {icon && (
            <div className={`bg-${color || "blue"}-100 dark:bg-${color || "blue"}-900/30 p-3 rounded-full`}>
              {icon}
            </div>
          )}
          <div className="text-2xl font-bold">{value}</div>
        </div>
        <p className="text-sm text-muted-foreground mt-3">{title}</p>
      </CardContent>
    </Card>
  );
}