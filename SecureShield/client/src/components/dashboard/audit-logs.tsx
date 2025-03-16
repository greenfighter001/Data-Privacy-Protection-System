
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Filter } from "lucide-react";

interface AuditLog {
  id: number;
  timestamp: string;
  userId: number;
  userName: string;
  action: string;
  resource: string;
  details: any;
}

export default function AuditLogs() {
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  
  // Fetch audit logs
  const { data: logs, isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit/logs"],
    refetchInterval: 60000, // Refetch every minute
  });
  
  // Toggle log details expansion
  const toggleLogDetails = (logId: number) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };
  
  // Get action badge
  const getActionBadge = (action: string) => {
    switch (action.toUpperCase()) {
      case "LOGIN":
      case "LOGOUT":
        return <Badge className="bg-blue-500">{action}</Badge>;
      case "CREATE":
      case "GENERATE":
        return <Badge className="bg-green-500">{action}</Badge>;
      case "DELETE":
        return <Badge className="bg-red-500">{action}</Badge>;
      case "UPDATE":
        return <Badge className="bg-amber-500">{action}</Badge>;
      case "ANOMALY_DETECTED":
        return <Badge className="bg-purple-500">{action}</Badge>;
      default:
        return <Badge>{action}</Badge>;
    }
  };
  
  if (isLoading) {
    return <div className="text-center py-4">Loading audit logs...</div>;
  }
  
  if (!logs || logs.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p>No audit logs found.</p>
      </Card>
    );
  }
  
  return (
    <Card className="mt-6 overflow-hidden">
      <div className="p-4 flex justify-between items-center border-b">
        <h3 className="text-lg font-medium">Activity Logs</h3>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} className="group">
                <TableCell className="whitespace-nowrap">
                  {format(new Date(log.timestamp), "MMM d, yyyy HH:mm:ss")}
                </TableCell>
                <TableCell>{log.userName}</TableCell>
                <TableCell>{getActionBadge(log.action)}</TableCell>
                <TableCell>{log.resource}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleLogDetails(log.id)}
                    className="h-8 w-8 p-0"
                  >
                    {expandedLogId === log.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
