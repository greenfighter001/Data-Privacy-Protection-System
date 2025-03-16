import { useQuery } from "@tanstack/react-query";
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
  UserIcon,
  Clock,
  Activity,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface LogsTableProps {
  filters: {
    type: string;
    userId: string;
    fromDate: string;
    toDate: string;
  };
  pagination: {
    page: number;
    limit: number;
  };
}

interface AuditLog {
  id: number;
  action: string;
  userId: number | null;
  userName: string;
  resource: string | null;
  status: string;
  timestamp: string;
  ipAddress: string | null;
  details: Record<string, any> | null;
}

interface LogsResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function LogsTable({ filters, pagination }: LogsTableProps) {
  // Build query params
  const queryParams = new URLSearchParams();
  queryParams.append("page", pagination.page.toString());
  queryParams.append("limit", pagination.limit.toString());
  
  if (filters.type !== "all") {
    queryParams.append("action", filters.type);
  }
  
  if (filters.userId !== "all") {
    queryParams.append("userId", filters.userId);
  }
  
  // Fetch logs
  const { data, isLoading, error } = useQuery<LogsResponse>({
    queryKey: [`/api/logs?${queryParams.toString()}`],
  });

  // Format date
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch (error) {
      return dateStr;
    }
  };

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return dateStr;
    }
  };

  // Get status indicator
  const getStatusIndicator = (status: string) => {
    switch (status.toUpperCase()) {
      case "SUCCESS":
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
            <CheckCircle className="h-4 w-4 mr-1" /> SUCCESS
          </span>
        );
      case "FAILED":
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
            <XCircle className="h-4 w-4 mr-1" /> FAILED
          </span>
        );
      case "WARNING":
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
            <AlertCircle className="h-4 w-4 mr-1" /> WARNING
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

  // Get action badge
  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      USER_LOGIN: "bg-yellow-100 text-yellow-800",
      USER_LOGOUT: "bg-blue-100 text-blue-800",
      USER_REGISTER: "bg-green-100 text-green-800",
      USER_UPDATE: "bg-purple-100 text-purple-800",
      DATA_ENCRYPT: "bg-blue-100 text-blue-800",
      DATA_DECRYPT: "bg-indigo-100 text-indigo-800",
      KEY_GENERATE: "bg-purple-100 text-purple-800",
      KEY_REVOKE: "bg-red-100 text-red-800",
      KEY_BACKUP: "bg-green-100 text-green-800",
      KEY_RESTORE: "bg-amber-100 text-amber-800",
    };
    
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[action] || "bg-gray-100 text-gray-800"}`}>
        {action}
      </span>
    );
  };

  return (
    <Card className="mt-8">
      <CardHeader className="px-6">
        <CardTitle>System Logs</CardTitle>
        <CardDescription>Showing the most recent activities first</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <div className="border-t border-gray-200">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Skeleton className="h-8 w-8 rounded-full mr-3" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-16 rounded-md ml-auto" /></TableCell>
                    </TableRow>
                  ))
                )}

                {error && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4 text-red-500">
                      Error loading logs: {error.toString()}
                    </TableCell>
                  </TableRow>
                )}

                {data && data.logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                      No audit logs found with the current filters.
                    </TableCell>
                  </TableRow>
                )}

                {data && data.logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm text-gray-500" title={formatDate(log.timestamp)}>
                      {formatRelativeTime(log.timestamp)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-400 text-white flex items-center justify-center text-xs">
                          {log.userName.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)}
                        </div>
                        <div className="ml-3 text-sm text-gray-900">
                          {log.userName}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-gray-500">
                      {log.resource || '-'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {getStatusIndicator(log.status)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-gray-500">
                      {log.ipAddress || '-'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm font-medium">
                      <Button variant="ghost" size="sm">
                        <Info className="h-4 w-4 mr-1" /> Details
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
  );
}
