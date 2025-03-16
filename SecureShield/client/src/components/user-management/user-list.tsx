import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User as UserIcon,
  CheckCircle,
  XCircle,
  Clock,
  PencilIcon,
} from "lucide-react";
import EditUserDialog from "./edit-user-dialog";
import { formatDistanceToNow } from "date-fns";

interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  createdAt: string;
  lastLogin: string | null;
}

export default function UserList() {
  const { toast } = useToast();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Fetch users
  const { data: users, isLoading, error } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Update user status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}`, { status });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User status updated",
        description: "The user status has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle user status change
  const handleStatusChange = (user: User) => {
    const newStatus = user.status === "active" ? "inactive" : "active";
    const action = newStatus === "active" ? "activate" : "deactivate";
    
    if (confirm(`Are you sure you want to ${action} this user?`)) {
      updateStatusMutation.mutate({ userId: user.id, status: newStatus });
    }
  };

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    try {
      const date = new Date(dateStr);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return "Invalid date";
    }
  };

  // Get status indicator
  const getStatusIndicator = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
            <CheckCircle className="h-4 w-4 mr-1" /> Active
          </span>
        );
      case "inactive":
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
            <XCircle className="h-4 w-4 mr-1" /> Inactive
          </span>
        );
      default:
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  // Get role badge
  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-primary bg-opacity-10 text-primary",
      manager: "bg-yellow-100 text-yellow-800",
      user: "bg-blue-100 text-blue-800",
    };
    
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[role] || "bg-gray-100 text-gray-800"}`}>
        {role}
      </span>
    );
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Get avatar background color
  const getAvatarColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-primary",
      manager: "bg-emerald-500",
      user: "bg-amber-500",
    };
    
    return colors[role] || "bg-gray-400";
  };

  return (
    <>
      <Card className="mt-6">
        <CardHeader className="px-6">
          <CardTitle>System Users</CardTitle>
          <CardDescription>List of all users with access to the system</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="border-t border-gray-200">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    Array(3).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="flex items-center">
                            <Skeleton className="h-10 w-10 rounded-full mr-4" />
                            <div>
                              <Skeleton className="h-4 w-24 mb-1" />
                              <Skeleton className="h-3 w-32" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-16 rounded-md ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  )}

                  {error && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-red-500">
                        Error loading users: {error.toString()}
                      </TableCell>
                    </TableRow>
                  )}

                  {users && users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                        No users found.
                      </TableCell>
                    </TableRow>
                  )}

                  {users && users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <div className={`h-10 w-10 rounded-full ${getAvatarColor(user.role)} text-white flex items-center justify-center`}>
                            {getInitials(user.fullName)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.fullName}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {getRoleBadge(user.role)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {getStatusIndicator(user.status)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.lastLogin)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-sm font-medium">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="mr-3"
                          onClick={() => setEditingUser(user)}
                        >
                          <PencilIcon className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className={user.status === "active" ? "text-red-600 hover:text-red-900 hover:bg-red-50" : "text-green-600 hover:text-green-900 hover:bg-green-50"}
                          onClick={() => handleStatusChange(user)}
                          disabled={updateStatusMutation.isPending}
                        >
                          {user.status === "active" ? "Disable" : "Enable"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      {editingUser && (
        <EditUserDialog
          user={editingUser}
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
        />
      )}
    </>
  );
}
