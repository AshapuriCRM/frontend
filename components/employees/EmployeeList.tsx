import { Employee } from "@/lib/types";
import { EmployeeListItem } from "./EmployeeListItem";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";

interface EmployeeListProps {
  employees: Employee[];
  loading?: boolean;
  pagination: { total: number; pages: number; page: number; limit: number };
  onPageChange: (page: number) => void;
  onEmployeeAction: (employee: Employee, mode?: "view" | "edit") => void;
  onEmployeeDelete?: (employee: Employee) => void;
}

export function EmployeeList({
  employees,
  loading,
  pagination,
  onPageChange,
  onEmployeeAction,
  onEmployeeDelete,
}: EmployeeListProps) {
  const { page, pages } = pagination;
  return (
    <div className="w-full bg-card rounded-lg border p-0 md:p-2 shadow-sm">
      <div className="divide-y">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-none" />
          ))
        ) : employees.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No employees found.
          </div>
        ) : (
          employees.map((emp) => (
            <EmployeeListItem
              key={emp.id || emp._id}
              employee={emp}
              onAction={onEmployeeAction}
              onDelete={onEmployeeDelete}
            />
          ))
        )}
      </div>
      {pages > 1 && (
        <div className="flex justify-center py-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (page > 1) onPageChange(page - 1);
                  }}
                  aria-disabled={page === 1}
                  tabIndex={page === 1 ? -1 : 0}
                />
              </PaginationItem>
              {Array.from({ length: pages }).map((_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink
                    href="#"
                    isActive={page === i + 1}
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(i + 1);
                    }}
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (page < pages) onPageChange(page + 1);
                  }}
                  aria-disabled={page === pages}
                  tabIndex={page === pages ? -1 : 0}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
