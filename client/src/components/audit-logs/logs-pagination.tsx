import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

interface LogsPaginationProps {
  pagination: {
    page: number;
    limit: number;
  };
  onPageChange: (page: number) => void;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function LogsPagination({ pagination, onPageChange }: LogsPaginationProps) {
  // Build query params to get the current pagination info
  const queryParams = new URLSearchParams();
  queryParams.append("page", pagination.page.toString());
  queryParams.append("limit", pagination.limit.toString());
  
  // Fetch logs to get pagination info
  const { data, isLoading } = useQuery<{ pagination: PaginationInfo }>({
    queryKey: [`/api/logs?${queryParams.toString()}`],
  });
  
  // Generate page numbers to display
  const getPageNumbers = (currentPage: number, totalPages: number) => {
    const delta = 1; // Number of pages to show before and after current page
    const range = [];
    const rangeWithDots = [];
    let l;
    
    // Always show first page
    range.push(1);
    
    // Calculate the range of page numbers to show
    for (let i = currentPage - delta; i <= currentPage + delta; i++) {
      if (i > 1 && i < totalPages) {
        range.push(i);
      }
    }
    
    // Always show last page if there is more than one page
    if (totalPages > 1) {
      range.push(totalPages);
    }
    
    // Add dots where needed
    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push(-1); // -1 represents dots
        }
      }
      rangeWithDots.push(i);
      l = i;
    }
    
    return rangeWithDots;
  };
  
  if (isLoading) {
    return (
      <Card className="mt-4">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-48" />
            <div className="flex space-x-2">
              <Skeleton className="h-10 w-10 rounded-md" />
              <Skeleton className="h-10 w-10 rounded-md" />
              <Skeleton className="h-10 w-10 rounded-md" />
              <Skeleton className="h-10 w-10 rounded-md" />
              <Skeleton className="h-10 w-10 rounded-md" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // If no pagination data or only one page, don't show pagination
  if (!data || !data.pagination || data.pagination.totalPages <= 1) {
    return null;
  }
  
  const { page, limit, total, totalPages } = data.pagination;
  const pageNumbers = getPageNumbers(page, totalPages);
  
  return (
    <Card className="mt-4">
      <CardContent className="py-3 flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{" "}
          <span className="font-medium">{Math.min(page * limit, total)}</span> of{" "}
          <span className="font-medium">{total}</span> results
        </div>
        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
          <Button
            variant="outline"
            size="icon"
            className="rounded-l-md"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <span className="sr-only">Previous</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {pageNumbers.map((pageNumber, index) => (
            pageNumber === -1 ? (
              <Button key={`dots-${index}`} variant="outline" disabled className="cursor-default">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                key={pageNumber}
                variant={pageNumber === page ? "default" : "outline"}
                onClick={() => onPageChange(pageNumber as number)}
                className={pageNumber === page ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
              >
                {pageNumber}
              </Button>
            )
          ))}
          
          <Button
            variant="outline"
            size="icon"
            className="rounded-r-md"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            <span className="sr-only">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </nav>
      </CardContent>
    </Card>
  );
}
