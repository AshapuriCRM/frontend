"use client";

import { useEffect, useState, useCallback } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmployeeStats } from "@/components/employees/EmployeeStats";
import { EmployeeList } from "@/components/employees/EmployeeList";
import { EmployeeModal } from "@/components/employees/EmployeeModal";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus } from "lucide-react";
import apiClient from "@/lib/api-client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Employee } from "@/lib/types";

export default function AllEmployeesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 1,
    page: 1,
    limit: 10,
  });

  interface EmployeeStatsType {
    totalEmployees: number;
    activeEmployees: number;
    inactiveEmployees: number;
    terminatedEmployees: number;
    onLeaveEmployees: number;
    averageSalary: number;
    totalSalaryExpense: number;
  }
  const [stats, setStats] = useState<EmployeeStatsType | null>(null);

  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "create">(
    "view"
  );
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch employees when debouncedSearch, page, or limit changes
  useEffect(() => {
    fetchEmployees(page, limit, debouncedSearch);
    // eslint-disable-next-line
  }, [debouncedSearch, page, limit]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchEmployees = useCallback(
    async (pageNum = 1, pageSize = 10, searchVal = "") => {
      setLoading(true);
      try {
        const res = await apiClient.getEmployees({
          page: pageNum,
          limit: pageSize,
          search: searchVal,
        });
        if (res.success && res.data) {
          setEmployees(res.data.employees);
          setPagination(res.data.pagination);
        } else {
          toast({
            title: "Error",
            description: res.error || "Failed to fetch employees",
            variant: "destructive",
          });
        }
      } catch (e: any) {
        toast({
          title: "Error",
          description: e.message || "Failed to fetch employees",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await apiClient.getEmployeeStats();
      if (res.success && res.data) {
        setStats(res.data);
      } else {
        toast({
          title: "Error",
          description: res.error || "Failed to fetch stats",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to fetch stats",
        variant: "destructive",
      });
    } finally {
      setStatsLoading(false);
    }
  }, [toast]);

  const handleSearchChange = (e: any) => {
    setSearch(e.target.value);
    setPage(1);
  };
  const handlePageChange = (newPage: any) => setPage(newPage);
  const handleEmployeeAction = (
    employee: any,
    mode: "view" | "edit" | "create" = "view"
  ) => {
    setSelectedEmployee(employee);
    setModalMode(mode);
    setModalOpen(true);
  };
  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedEmployee(null);
  };
  const handleEmployeeUpdated = () => {
    fetchEmployees(page, limit, search);
    fetchStats();
    handleModalClose();
  };
  const handleEmployeeDelete = () => {
    fetchEmployees(page, limit, search);
    fetchStats();
  };

  return (
    <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen w-full p-4 md:p-8 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h1 className="text-2xl font-bold tracking-tight">All Employees</h1>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1">
                <Input
                  placeholder="Search employees..."
                  value={search}
                  onChange={handleSearchChange}
                  className="pl-10"
                  disabled={loading}
                  aria-label="Search employees"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setModalMode("create");
                  setModalOpen(true);
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" /> Add Employee
              </Button>
            </div>
          </div>
          <EmployeeStats stats={stats} loading={statsLoading} />
          <EmployeeList
            employees={employees}
            loading={loading}
            pagination={pagination}
            onPageChange={handlePageChange}
            onEmployeeAction={handleEmployeeAction}
            onEmployeeDelete={handleEmployeeDelete}
          />
          <EmployeeModal
            open={modalOpen}
            mode={modalMode}
            employee={selectedEmployee}
            onClose={handleModalClose}
            onUpdated={handleEmployeeUpdated}
          />
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
}
