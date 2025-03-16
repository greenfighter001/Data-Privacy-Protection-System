import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Eye, MoreHorizontal } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";

interface ActivityItem {
  id: number;
  action: string;
  status: string;
  timestamp: string;
  user: string;
  resource: string;
}

export default function RecentActivity() {
  // Fetch recent activity
  const { data: activities, isLoading } = useQuery<ActivityItem[]>({
    queryKey: ["/api/dashboard/recent-activity"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  
  // Format action name
  const formatAction = (action: string) => {
    return action
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  };
  
  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (e) {
      return "Unknown time";
    }
  };
  
  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "success":
        return <Badge className="bg-green-500">Success</Badge>;
      case "failed":
        return <Badge className="bg-red-500">Failed</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium flex items-center">
          <Activity className="h-5 w-5 text-primary mr-2" />
          Recent Activity
        </CardTitle>
        <Link href="/logs">
          <Button variant="ghost" size="sm" className="text-xs">
            <Eye className="h-3.5 w-3.5 mr-1" />
            View All
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Activity className="h-8 w-8 animate-pulse text-muted-foreground" />
          </div>
        ) : !activities || activities.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map(activity => (
              <div key={activity.id} className="flex items-start justify-between border-b pb-3 last:border-b-0 last:pb-0">
                <div className="space-y-1">
                  <p className="font-medium">{formatAction(activity.action)}</p>
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <span>{activity.user}</span>
                    {activity.resource && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[150px]">{activity.resource}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div>{getStatusBadge(activity.status)}</div>
                  <time className="text-xs text-muted-foreground">
                    {formatTimestamp(activity.timestamp)}
                  </time>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}