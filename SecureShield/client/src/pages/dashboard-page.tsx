import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/layout/layout";
import StatsCard from "@/components/dashboard/stats-card";
import RecentActivity from "@/components/dashboard/recent-activity";
import SecurityAlerts from "@/components/dashboard/security-alerts";
import ActivityChart from "@/components/dashboard/activity-chart";
import { Key, Shield, Lock, Users } from "lucide-react";

interface DashboardStats {
  totalEncryptions: number;
  totalDecryptions: number;
  activeKeys: number;
  totalUsers: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  
  const { data: stats, isLoading: isLoadingStats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });
  
  return (
    <Layout>
      <div className="p-6 space-y-8">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.fullName || "User"}
          </p>
        </div>
        
        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Encryption Operations"
            value={isLoadingStats ? "Loading..." : stats?.totalEncryptions || 0}
            icon={Lock}
            color="bg-blue-500"
            linkText="View operations"
            linkHref="/encryption"
          />
          <StatsCard
            title="Decryption Operations"
            value={isLoadingStats ? "Loading..." : stats?.totalDecryptions || 0}
            icon={Lock}
            color="bg-emerald-500"
            linkText="View operations"
            linkHref="/encryption"
          />
          <StatsCard
            title="Active Keys"
            value={isLoadingStats ? "Loading..." : stats?.activeKeys || 0}
            icon={Key}
            color="bg-amber-500"
            linkText="Manage keys"
            linkHref="/keys"
          />
          {user?.role === "admin" && (
            <StatsCard
              title="Total Users"
              value={isLoadingStats ? "Loading..." : stats?.totalUsers || 0}
              icon={Users}
              color="bg-purple-500"
              linkText="Manage users"
              linkHref="/users"
            />
          )}
        </div>
        
        {/* Main Content */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          <SecurityAlerts />
          <RecentActivity />
        </div>
        
        {/* Charts Section */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          <ActivityChart
            title="Encryption Activity"
            type="line"
            data={[
              { date: "Jan", encryptions: 5, decryptions: 3 },
              { date: "Feb", encryptions: 12, decryptions: 8 },
              { date: "Mar", encryptions: 18, decryptions: 15 },
              { date: "Apr", encryptions: 25, decryptions: 22 },
              { date: "May", encryptions: 30, decryptions: 28 },
              { date: "Jun", encryptions: 45, decryptions: 40 }
            ]}
            dataKeys={[
              { key: "encryptions", color: "#3b82f6" },
              { key: "decryptions", color: "#10b981" }
            ]}
          />
          <ActivityChart
            title="Key Usage"
            type="bar"
            data={[
              { name: "AES-256", count: 30 },
              { name: "RSA-2048", count: 15 },
              { name: "ECC-P256", count: 25 }
            ]}
            dataKeys={[
              { key: "count", color: "#f59e0b" }
            ]}
          />
        </div>
      </div>
    </Layout>
  );
}
import React from "react";
import { Layout } from "../components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

const data = [
  { name: 'AES', count: 65 },
  { name: 'RSA', count: 40 },
  { name: 'HMAC', count: 25 },
  { name: 'ECC', count: 15 },
];

export default function DashboardPage() {
  return (
    <Layout>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Security overview and statistics</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">145</div>
            <p className="text-xs text-muted-foreground">
              +12% from last week
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              +3 new users today
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Security Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">
              Requires attention
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Encryption Operations</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
