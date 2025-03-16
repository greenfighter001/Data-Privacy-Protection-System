import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { Download, RefreshCw } from "lucide-react";

interface LogsFilterProps {
  filters: {
    type: string;
    userId: string;
    fromDate: string;
    toDate: string;
  };
  onFilterChange: (newFilters: Partial<LogsFilterProps["filters"]>) => void;
}

export default function LogsFilter({ filters, onFilterChange }: LogsFilterProps) {
  // Fetch users for the filter dropdown
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Handle export logs
  const handleExport = () => {
    // In a real app, this would call an API to generate a CSV/Excel file
    alert("Export functionality would be implemented here");
  };

  return (
    <Card className="mt-6 bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Log Filters</h3>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <Label htmlFor="log-type">Log Type</Label>
          <Select
            value={filters.type}
            onValueChange={(value) => onFilterChange({ type: value })}
          >
            <SelectTrigger id="log-type" className="mt-1">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="USER_LOGIN">Authentication</SelectItem>
              <SelectItem value="DATA_ENCRYPT">Encryption</SelectItem>
              <SelectItem value="DATA_DECRYPT">Decryption</SelectItem>
              <SelectItem value="KEY_GENERATE">Key Management</SelectItem>
              <SelectItem value="USER_UPDATE">User Management</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="log-user">User</Label>
          <Select
            value={filters.userId}
            onValueChange={(value) => onFilterChange({ userId: value })}
          >
            <SelectTrigger id="log-user" className="mt-1">
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users &&
                users.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.fullName}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="log-date-from">From Date</Label>
          <Input
            type="date"
            id="log-date-from"
            className="mt-1"
            value={filters.fromDate}
            onChange={(e) => onFilterChange({ fromDate: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="log-date-to">To Date</Label>
          <Input
            type="date"
            id="log-date-to"
            className="mt-1"
            value={filters.toDate}
            onChange={(e) => onFilterChange({ toDate: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center">
        <Button
          onClick={() => onFilterChange({
            type: "all",
            userId: "all",
            fromDate: "",
            toDate: ""
          })}
          variant="outline"
          className="ml-3"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset
        </Button>
        <Button
          onClick={handleExport}
          variant="outline"
          className="ml-auto"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Logs
        </Button>
      </div>
    </Card>
  );
}
