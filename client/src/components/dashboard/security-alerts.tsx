import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, ShieldAlert, ShieldCheck, Clock, AlertCircle, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SecurityAlert {
  id: number;
  timestamp: string;
  type: string;
  severity: "low" | "medium" | "high";
  user: {
    id: number;
    name: string;
  };
  details: Record<string, any>;
}

export default function SecurityAlerts() {
  const { toast } = useToast();
  const [expandedAlertId, setExpandedAlertId] = useState<number | null>(null);
  
  // Fetch security alerts
  const { data: alerts, isLoading } = useQuery<SecurityAlert[]>({
    queryKey: ["/api/security/alerts"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  
  // Clear alerts mutation
  const clearAlertsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/security/alerts/clear");
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Alerts cleared",
        description: "Security alerts have been cleared successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/security/alerts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to clear alerts",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle expand/collapse of alert details
  const toggleAlertDetails = (alertId: number) => {
    setExpandedAlertId(expandedAlertId === alertId ? null : alertId);
  };
  
  // Get severity badge for alert
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return <Badge className="bg-red-500">High</Badge>;
      case "medium":
        return <Badge className="bg-amber-500">Medium</Badge>;
      case "low":
        return <Badge className="bg-blue-500">Low</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };
  
  // Get icon for alert type
  const getAlertIcon = (type: string) => {
    switch (type) {
      case "high_volume":
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case "high_failure_rate":
        return <ShieldAlert className="h-5 w-5 text-red-500" />;
      case "revoked_key_usage":
        return <ShieldAlert className="h-5 w-5 text-red-500" />;
      case "unusual_time":
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <Shield className="h-5 w-5 text-slate-500" />;
    }
  };
  
  // Format alert timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (e) {
      return "Unknown time";
    }
  };
  
  // Format alert details
  const formatDetails = (details: Record<string, any>) => {
    if (!details) return [];
    
    return Object.entries(details).map(([key, value]) => {
      // Format nested objects/arrays
      let displayValue = value;
      if (typeof value === "object" && value !== null) {
        displayValue = JSON.stringify(value, null, 2);
      }
      
      // Format key name
      const formattedKey = key.replace(/([A-Z])/g, " $1")
        .replace(/^./, str => str.toUpperCase())
        .replace(/([a-z])([A-Z])/g, "$1 $2");
      
      return {
        key: formattedKey,
        value: displayValue
      };
    });
  };
  
  // Check if there are any alerts
  const hasAlerts = alerts && alerts.length > 0;
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium flex items-center">
          <Shield className="h-5 w-5 text-primary mr-2" />
          Security Alerts
        </CardTitle>
        {hasAlerts && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => clearAlertsMutation.mutate()}
            disabled={clearAlertsMutation.isPending}
          >
            Clear All
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Shield className="h-8 w-8 animate-pulse text-muted-foreground" />
          </div>
        ) : !hasAlerts ? (
          <div className="text-center py-6 text-muted-foreground">
            <ShieldCheck className="h-10 w-10 mx-auto mb-3 text-primary/50" />
            <p>No security alerts detected</p>
            <p className="text-sm mt-1">Your system is currently operating normally</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map(alert => (
              <Collapsible 
                key={alert.id}
                open={expandedAlertId === alert.id}
                onOpenChange={() => toggleAlertDetails(alert.id)}
                className="border rounded-md p-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getAlertIcon(alert.type)}
                    <div>
                      <h4 className="font-medium">{alert.type.replace(/_/g, " ")}</h4>
                      <div className="flex items-center text-sm text-muted-foreground space-x-2 mt-1">
                        <time>{formatTimestamp(alert.timestamp)}</time>
                        <span>•</span>
                        {getSeverityBadge(alert.severity)}
                      </div>
                    </div>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      {expandedAlertId === alert.id ? "Less" : "More"}
                    </Button>
                  </CollapsibleTrigger>
                </div>
                
                <CollapsibleContent className="mt-2">
                  <div className="bg-muted/50 rounded p-3 text-sm">
                    <div className="flex items-center space-x-2 text-muted-foreground mb-2">
                      <User className="h-4 w-4" />
                      <span>{alert.user.name}</span>
                    </div>
                    
                    <div className="space-y-1">
                      {formatDetails(alert.details).map(({ key, value }, i) => (
                        <div key={i} className="grid grid-cols-3 gap-2">
                          <span className="text-muted-foreground">{key}:</span>
                          <span className="col-span-2 font-mono text-xs break-all">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}