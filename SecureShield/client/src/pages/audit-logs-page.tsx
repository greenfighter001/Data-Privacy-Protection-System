import Layout from "@/components/layout/layout";
import LogsFilter from "@/components/audit-logs/logs-filter";
import LogsTable from "@/components/audit-logs/logs-table";
import LogsPagination from "@/components/audit-logs/logs-pagination";
import { useState } from "react";

export default function AuditLogsPage() {
  const [filters, setFilters] = useState({
    type: "all",
    userId: "all",
    fromDate: "",
    toDate: "",
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20
  });

  // Handler for filter changes
  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page on filter change
  };

  // Handler for pagination changes
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  return (
    <Layout>
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold text-gray-900">Audit Logs</h2>
        <p className="mt-1 text-sm text-gray-500">System activity logs for security monitoring</p>
        
        {/* Filters Section */}
        <LogsFilter 
          filters={filters} 
          onFilterChange={handleFilterChange} 
        />
        
        {/* Logs Table */}
        <LogsTable 
          filters={filters}
          pagination={pagination}
        />
        
        {/* Pagination */}
        <LogsPagination 
          pagination={pagination}
          onPageChange={handlePageChange}
        />
      </div>
    </Layout>
  );
}
import Layout from "@/components/layout/layout";
import AuditLogs from "@/components/dashboard/audit-logs";

export default function AuditLogsPage() {
  return (
    <Layout>
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Audit Logs</h1>
        <AuditLogs />
      </div>
    </Layout>
  );
}
