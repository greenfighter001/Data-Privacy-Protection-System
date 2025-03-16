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
import { Key, Eye, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface EncryptionKey {
  id: number;
  name: string;
  keyId: string;
  algorithm: string;
  status: string;
  createdAt: string;
  lastUsed: string | null;
  expiresAt: string | null;
}

export default function KeyList() {
  const { toast } = useToast();
  
  // Fetch keys
  const { data: keys, isLoading, error } = useQuery<EncryptionKey[]>({
    queryKey: ["keys"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/keys");
      return response.json();
    },
  });

  // Revoke key mutation
  const revokeMutation = useMutation({
    mutationFn: async (keyId: number) => {
      const res = await apiRequest("POST", `/api/keys/${keyId}/revoke`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Key revoked",
        description: "The key has been successfully revoked",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to revoke key",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle key revocation
  const handleRevokeKey = (id: number) => {
    if (confirm("Are you sure you want to revoke this key? This action cannot be undone.")) {
      revokeMutation.mutate(id);
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
      case "revoked":
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
            <XCircle className="h-4 w-4 mr-1" /> Revoked
          </span>
        );
      case "expired":
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
            <Clock className="h-4 w-4 mr-1" /> Expired
          </span>
        );
      case "expiring soon":
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
            <AlertTriangle className="h-4 w-4 mr-1" /> Expiring Soon
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

  // Get icon based on algorithm
  const getAlgorithmIcon = (algorithm: string) => {
    const colors: { [key: string]: string } = {
      'aes-256-cbc': 'bg-primary',
      'aes-128-cbc': 'bg-secondary',
      'rsa-2048': 'bg-accent',
      'ecc-p256': 'bg-purple-500',
      'default': 'bg-gray-400'
    };
    
    return (
      <div className={`flex-shrink-0 h-8 w-8 ${colors[algorithm] || colors['default']} text-white rounded-md flex items-center justify-center`}>
        <Key className="h-5 w-5" />
      </div>
    );
  };

  return (
    <Card className="mt-6">
      <CardHeader className="px-6">
        <CardTitle>Your Keys</CardTitle>
        <CardDescription>List of all your encryption keys</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <div className="border-t border-gray-200">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Algorithm</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  Array(3).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center">
                          <Skeleton className="h-8 w-8 rounded-md mr-4" />
                          <div>
                            <Skeleton className="h-4 w-24 mb-1" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-16 rounded-md ml-auto" /></TableCell>
                    </TableRow>
                  ))
                )}

                {error && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-red-500">
                      Error loading keys: {error.toString()}
                    </TableCell>
                  </TableRow>
                )}

                {keys && keys.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                      No encryption keys found. Generate your first key to get started.
                    </TableCell>
                  </TableRow>
                )}

                {keys && keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell>
                      <div className="flex items-center">
                        {getAlgorithmIcon(key.algorithm)}
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{key.name}</div>
                          <div className="text-sm text-gray-500">ID: {key.keyId}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-gray-500">
                      {key.algorithm}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-gray-500">
                      {formatDate(key.createdAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-gray-500">
                      {formatDate(key.lastUsed)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {getStatusIndicator(key.status)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm font-medium">
                      <Button variant="ghost" size="sm" className="mr-3">
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                      {key.status === 'active' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-900 hover:bg-red-50"
                          onClick={() => handleRevokeKey(key.id)}
                          disabled={revokeMutation.isPending}
                        >
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
