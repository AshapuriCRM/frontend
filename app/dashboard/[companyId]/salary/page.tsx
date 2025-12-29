'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimatedPage } from '@/components/ui/animated-page';
import { Employee, SalarySlip } from '@/lib/types';
import { Plus, Eye, Receipt, X, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { saveAs } from 'file-saver';

// Helper to resolve file URLs that may be stored as relative paths on the API
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const API_ORIGIN =
  API_BASE && /^https?:\/\//i.test(API_BASE)
    ? API_BASE.replace(/\/api\/?$/, "")
    : "";

function resolveFileUrl(fileUrl: string | undefined | null) {
  if (!fileUrl) return "";
  // Absolute URL (Cloudinary or any external host)
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  // Relative path coming from API (e.g. /uploads/salary-slips/...) -> prefix backend origin
  if (fileUrl.startsWith("/"))
    return API_ORIGIN ? `${API_ORIGIN}${fileUrl}` : fileUrl;
  return API_ORIGIN ? `${API_ORIGIN}/${fileUrl}` : fileUrl;
}

interface EmployeeWithDetails extends Omit<Employee, 'id' | '_id'> {
  id: string;
  pfPercentage: number;
  esicPercentage: number;
  daysPresent: number;
  daysAbsent: number;
  overtimeHours: number;
  isSelected: boolean;
}

interface SalaryPageProps {
  params: { companyId: string };
}

export default function SalaryPage({ params }: SalaryPageProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salarySlips, setSalarySlips] = useState<SalarySlip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingSlips, setIsCreatingSlips] = useState(false);
  
  // Employee selection state
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // Table state
  const [tableEmployees, setTableEmployees] = useState<EmployeeWithDetails[]>([]);
  const [pfEditable, setPfEditable] = useState(false);
  const [esicEditable, setEsicEditable] = useState(false);
  
  // Form state
  const [month, setMonth] = useState<string>('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [initialDaysPresent, setInitialDaysPresent] = useState<number>(0);
  const [initialOvertimeHours, setInitialOvertimeHours] = useState<number>(0);
  
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewSlip, setPreviewSlip] = useState<SalarySlip | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Days in selected month helper
  const getDaysInSelectedMonth = (): number => {
    const monthIndex = months.indexOf(month);
    if (monthIndex === -1) return 30;
    return new Date(year, monthIndex + 1, 0).getDate();
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchEmployees();
    fetchSalarySlips();
  }, [params.companyId]);

  // Resolve a stable employee id from possible `id` or `_id`
  const resolveEmployeeId = (emp: { id?: string; _id?: string }) => emp.id ?? emp._id ?? '';

  const fetchEmployees = async () => {
    try {
      const response = await apiClient.getEmployees({
        companyId: params.companyId,
        status: 'active',
        limit: 100
      });
      if (response.success && response.data?.employees) {
        setEmployees(response.data.employees);
      }
    } catch (error: any) {
      console.error('Failed to fetch employees:', error);
      toast.error('Failed to load employees');
    }
  };

  const fetchSalarySlips = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getCompanySalarySlips(params.companyId, {
        limit: 50
      });
      if (response.success && response.data?.salarySlips) {
        const mappedSlips = response.data.salarySlips.map((slip: any) => {
          const attendance = slip.attendance || {};
          const salary = slip.salary || {};
          // Extract file info from xlsxFile field (if present)
          const fileMeta: any = slip.xlsxFile || {};
          const fileUrl: string | undefined = fileMeta.secure_url || fileMeta.url;
          const fileName: string = fileMeta.original_filename ||
            `${slip.employeeName || 'employee'}-${slip.month || ''}-${slip.year || ''}.xlsx`;

          return {
            id: String(slip.id || slip._id),
            employeeId: String(
              typeof slip.employeeId === 'object' && slip.employeeId !== null
                ? slip.employeeId.id || slip.employeeId._id
                : slip.employeeId
            ),
            employeeName: slip.employeeName || (slip.employeeId && slip.employeeId.name) || '',
            companyId: String(
              typeof slip.companyId === 'object' && slip.companyId !== null
                ? slip.companyId.id || slip.companyId._id
                : slip.companyId
            ),
            month: slip.month,
            year: slip.year,
            daysPresent: Number(attendance.daysPresent || 0),
            daysAbsent: Number(attendance.daysAbsent || 0),
            overtimeHours: Number(attendance.overtimeHours || 0),
            basicSalary: Number(salary.basicSalary || 0),
            totalSalary: Number(slip.totalSalary || salary.grossSalary || 0),
            createdAt: new Date(slip.createdAt || Date.now()),
            // File info for download
            fileUrl,
            fileName,
            fileSize: fileMeta.bytes,
          } as SalarySlip & { fileUrl?: string; fileName?: string; fileSize?: number };
        });
        setSalarySlips(mappedSlips);
      }
    } catch (error: any) {
      console.error('Failed to fetch salary slips:', error);
      toast.error('Failed to load salary slips');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle employee selection in dropdown
  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployeeIds(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  // Select all employees in dropdown
  const handleSelectAllInDropdown = () => {
    const availableEmployees = employees.filter(emp => 
      !tableEmployees.some(tableEmp => tableEmp.id === resolveEmployeeId(emp))
    );
    setSelectedEmployeeIds(availableEmployees.map(emp => resolveEmployeeId(emp)));
  };

  // Clear all selected employees
  const handleClearAll = () => {
    setSelectedEmployeeIds([]);
  };

  // Add selected employees to table
  const addSelectedEmployeesToTable = () => {
    const employeesToAdd = employees
      .filter(emp => selectedEmployeeIds.includes(resolveEmployeeId(emp)))
      .map(emp => ({
        ...emp,
        id: resolveEmployeeId(emp),
        pfPercentage: pfEditable ? 12 : 0,
        esicPercentage: esicEditable ? 0.75 : 0,
        daysPresent: Math.max(0, Math.min(getDaysInSelectedMonth(), Number(initialDaysPresent) || 0)),
        daysAbsent: 0,
        overtimeHours: Math.max(0, Number(initialOvertimeHours) || 0),
        isSelected: false
      }));

    setTableEmployees(prev => [...prev, ...employeesToAdd]);
    setSelectedEmployeeIds([]);
  };

  // Toggle PF editable default and bulk-apply defaults while keeping per-row fields editable
  const handlePfEditableChange = (checked: boolean) => {
    setPfEditable(checked);
    setTableEmployees(prev => prev.map(emp => ({
      ...emp,
      pfPercentage: checked ? 12 : 0,
    })));
  };

  // Toggle ESIC editable default and bulk-apply defaults while keeping per-row fields editable
  const handleEsicEditableChange = (checked: boolean) => {
    setEsicEditable(checked);
    setTableEmployees(prev => prev.map(emp => ({
      ...emp,
      esicPercentage: checked ? 0.75 : 0,
    })));
  };

  // Remove employee from table
  const removeEmployeeFromTable = (employeeId: string) => {
    setTableEmployees(prev => prev.filter(emp => emp.id !== employeeId));
  };

  // Handle table employee selection
  const handleTableEmployeeToggle = (employeeId: string) => {
    setTableEmployees(prev => 
      prev.map(emp => 
        emp.id === employeeId 
          ? { ...emp, isSelected: !emp.isSelected }
          : emp
      )
    );
  };

  // Select all employees in table
  const handleSelectAllInTable = (checked: boolean) => {
    setTableEmployees(prev => 
      prev.map(emp => ({ ...emp, isSelected: checked }))
    );
  };

  // Update employee details in table
  const updateEmployeeInTable = (employeeId: string, field: string, value: number) => {
    setTableEmployees(prev => 
      prev.map(emp => 
        emp.id === employeeId 
          ? { ...emp, [field]: value }
          : emp
      )
    );
  };

  // Generate salary slips for selected table employees
  const generateSalarySlips = async () => {
    const selectedTableEmployees = tableEmployees.filter(emp => emp.isSelected);
    if (selectedTableEmployees.length === 0 || !month) {
      toast.error('Please select employees and month');
      return;
    }

    setIsCreatingSlips(true);
    try {
      const totalDays = getDaysInSelectedMonth();
      const employeesData = selectedTableEmployees.map(employee => {
        const daysPresent = Number(employee.daysPresent) || 0;
        const daysAbsent = Math.max(0, totalDays - daysPresent);
        const basicSalary = Number(employee.salary) || 0;
        const overtimeHours = Number(employee.overtimeHours) || 0;
        const earnedSalary = (basicSalary / totalDays) * daysPresent;
        const totalSalary = Math.round(earnedSalary); // backend will incorporate overtime via allowances if needed

        return {
          employeeId: String(employee.id),
          employeeName: employee.name,
          basicSalary,
          daysPresent,
          totalWorkingDays: totalDays,
          overtimeHours,
          pfPercentage: employee.pfPercentage,
          esicPercentage: employee.esicPercentage,
          totalSalary,
          daysAbsent,
        } as any;
      });

      const response = await apiClient.createBulkSalarySlips({
        companyId: params.companyId,
        month,
        year,
        employees: employeesData
      });

      console.table({companyId: params.companyId, month, year, employeesData});
      console.table({...employeesData});

      if (response.success && response.data) {
        const { created, errors } = response.data;
        toast.success(`Created ${created} salary slips successfully`);
        if (errors && errors.length > 0) {
          errors.forEach(error => toast.error(error));
        }
        
        // Refresh salary slips
        await fetchSalarySlips();
        
        // Remove generated employees from table
        setTableEmployees(prev => prev.filter(emp => !emp.isSelected));
      } else {
        throw new Error(response.error || 'Failed to create salary slips');
      }
    } catch (error: any) {
      console.error('Error creating salary slips:', error);
      toast.error(error.message || 'Failed to create salary slips');
    } finally {
      setIsCreatingSlips(false);
    }
  };

  const handlePreview = (slip: SalarySlip) => {
    setPreviewSlip(slip);
    setIsPreviewOpen(true);
  };

  // Download salary slip file
  const handleDownload = async (slip: any) => {
    const slipId = slip.id || slip._id;
    setDownloadingId(slipId);
    try {
      const url = resolveFileUrl(slip.fileUrl);
      if (!url) throw new Error("No file URL available");

      const response = await fetch(url, {
        mode: "cors",
        credentials: "omit",
      });
      if (!response.ok) throw new Error("Failed to fetch file");
      const blob = await response.blob();

      let fileName: string = slip.fileName || `salary-slip-${slip.employeeName}-${slip.month}-${slip.year}.xlsx`;
      const disposition = response.headers.get("content-disposition") || "";
      const match = /filename=\"?([^\";]+)\"?/i.exec(disposition);
      if (match?.[1]) fileName = match[1];

      saveAs(blob, fileName);
      toast.success("Download started");
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Failed to download file. Trying to open in new tab...");
      try {
        const url = resolveFileUrl(slip.fileUrl);
        if (url) window.open(url, "_blank", "noopener,noreferrer");
      } catch {}
    } finally {
      setDownloadingId(null);
    }
  };

  const selectedCount = tableEmployees.filter(emp => emp.isSelected).length;
  const availableEmployees = employees.filter(emp => 
    !tableEmployees.some(tableEmp => tableEmp.id === resolveEmployeeId(emp))
  );

  // Loading state
  if (isLoading) {
    return (
      <AnimatedPage>
        <div className="space-y-6">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 py-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Salary Slip Generator</h1>
          <p className="text-muted-foreground">Select employees and generate salary slips</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Employee Selection */}
          <Card>
              <CardHeader>
              <CardTitle>Select Employees</CardTitle>
              <CardDescription>Choose employees for the salary table below</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Employee Selection Dropdown */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="flex-1">Select Employees</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearAll}
                    disabled={selectedEmployeeIds.length === 0}
                  >
                    Clear All
                  </Button>
                </div>
                <div className="relative">
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                  >
                    {selectedEmployeeIds.length === 0 
                      ? "Select employees" 
                      : `${selectedEmployeeIds.length} employees selected`}
                    <svg
                      className="h-4 w-4 opacity-50"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </Button>
                  
                  {dropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                      {/* Select All Option */}
                      <div
                        className="flex items-center space-x-2 px-3 py-2 hover:bg-muted cursor-pointer font-medium border-b"
                        onClick={handleSelectAllInDropdown}
                      >
                        <Checkbox
                          checked={selectedEmployeeIds.length === availableEmployees.length && availableEmployees.length > 0}
                          onChange={handleSelectAllInDropdown}
                        />
                        <span>Select All Available</span>
                      </div>
                      
                      {/* Individual Employees */}
                      {availableEmployees.map((employee) => (
                        <div
                          key={resolveEmployeeId(employee)}
                          className="flex items-center space-x-2 px-3 py-2 hover:bg-muted cursor-pointer"
                          onClick={() => handleEmployeeToggle(resolveEmployeeId(employee))}
                        >
                          <Checkbox
                            checked={selectedEmployeeIds.includes(resolveEmployeeId(employee))}
                            onChange={() => handleEmployeeToggle(resolveEmployeeId(employee))}
                          />
                          <span>{employee.name} (₹{employee.salary.toLocaleString()})</span>
                        </div>
                      ))}
                      
                      {availableEmployees.length === 0 && (
                        <div className="px-3 py-2 text-muted-foreground text-sm">
                          No employees available to select
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Month Selection */}
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Initial Values */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Initial Present Days</Label>
                  <Input
                    type="number"
                    min="0"
                    max={getDaysInSelectedMonth()}
                    value={initialDaysPresent}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      const clamped = Math.max(0, Math.min(getDaysInSelectedMonth(), isNaN(value) ? 0 : value));
                      setInitialDaysPresent(clamped);
                    }}
                    placeholder="e.g. 26"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Initial Overtime (hrs)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={initialOvertimeHours}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      const sanitized = Math.max(0, isNaN(value) ? 0 : value);
                      setInitialOvertimeHours(sanitized);
                    }}
                    placeholder="e.g. 5"
                  />
                </div>
              </div>


              {/* Add Selected Button */}
              <Button 
                onClick={addSelectedEmployeesToTable}
                className="w-full"
                disabled={selectedEmployeeIds.length === 0 || !month}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Selected Employees ({selectedEmployeeIds.length})
              </Button>
            </CardContent>
          </Card>

          

                    {/* Recent Salary Slips - Month Wise */}
                    <Card className='hidden lg:block'>
            <CardHeader>
              <CardTitle>Recent Salary Slips</CardTitle>
              <CardDescription>Month-wise salary slip summary</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(() => {
                  // Group salary slips by month and year
                  const groupedSlips = salarySlips.reduce((acc, slip) => {
                    const key = `${slip.month} ${slip.year}`;
                    if (!acc[key]) {
                      acc[key] = {
                        month: slip.month,
                        year: slip.year,
                        employeeCount: 0,
                        totalAmount: 0,
                        slips: []
                      };
                    }
                    acc[key].employeeCount += 1;
                    acc[key].totalAmount += slip.totalSalary;
                    acc[key].slips.push(slip);
                    return acc;
                  }, {} as Record<string, {
                    month: string;
                    year: number;
                    employeeCount: number;
                    totalAmount: number;
                    slips: SalarySlip[];
                  }>);

                  // Convert to array and sort by date (most recent first)
              const sortedGroups = Object.values(groupedSlips)
                .sort((a, b) => {
                  if (a.year !== b.year) return b.year - a.year;
                  const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
                  return monthOrder.indexOf(b.month) - monthOrder.indexOf(a.month);
                })
                .slice(0, 5);

              return sortedGroups.map((group) => (
                <div key={`${group.month}-${group.year}`} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{group.month} {group.year}</p>
                      <p className="text-sm text-muted-foreground">
                        {group.employeeCount} employee{group.employeeCount !== 1 ? 's' : ''}
                      </p>
                      <p className="font-bold text-lg text-primary">
                        ₹{group.totalAmount.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          // Show all slips for this month in preview
                          setPreviewSlip(group.slips[0]); // You can modify this to show month summary
                          setIsPreviewOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <span className="text-xs text-center text-muted-foreground">
                        {group.employeeCount} slips
                      </span>
                    </div>
                  </div>
                  
                  {/* Show employee names in this month */}
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Employees:</p>
                    <div className="flex flex-wrap gap-1">
                      {group.slips.slice(0, 3).map((slip) => (
                        <span key={slip.id} className="text-xs bg-muted px-2 py-1 rounded">
                          {slip.employeeName}
                        </span>
                      ))}
                      {group.slips.length > 3 && (
                        <span className="text-xs text-muted-foreground px-2 py-1">
                          +{group.slips.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ));
            })()}
            
            {salarySlips.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No salary slips generated yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>


        </div>

        {/* Employee Table for Salary Generation */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Employees for Salary Generation</CardTitle>
                <CardDescription>Select employees and generate their salary slips</CardDescription>
              </div>
              <Button 
                onClick={generateSalarySlips}
                disabled={selectedCount === 0 || isCreatingSlips}
              >
                {isCreatingSlips ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                {isCreatingSlips ? 'Creating...' : `Generate for Selected (${selectedCount})`}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tableEmployees.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={tableEmployees.length > 0 && tableEmployees.every(emp => emp.isSelected)}
                        onCheckedChange={handleSelectAllInTable}
                      />
                    </TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Days Present</TableHead>
                    <TableHead>Days Absent</TableHead>
                    <TableHead>Overtime (hrs)</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        PF (%)
                        <Switch
                          checked={pfEditable}
                          onCheckedChange={handlePfEditableChange}
                        />
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        ESIC (%)
                        <Switch
                          checked={esicEditable}
                          onCheckedChange={handleEsicEditableChange}
                        />
                      </div>
                    </TableHead>
                    <TableHead>Basic Salary</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <Checkbox
                          checked={employee.isSelected}
                          onCheckedChange={() => handleTableEmployeeToggle(employee.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="31"
                          value={employee.daysPresent}
                          onChange={(e) => updateEmployeeInTable(employee.id, 'daysPresent', Number(e.target.value))}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <span className="inline-block w-20">
                          {Math.max(0, getDaysInSelectedMonth() - (Number(employee.daysPresent) || 0))}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={employee.overtimeHours}
                          onChange={(e) => updateEmployeeInTable(employee.id, 'overtimeHours', Number(e.target.value))}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={employee.pfPercentage}
                          onChange={(e) => updateEmployeeInTable(employee.id, 'pfPercentage', Number(e.target.value))}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={employee.esicPercentage}
                          onChange={(e) => updateEmployeeInTable(employee.id, 'esicPercentage', Number(e.target.value))}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>₹{employee.salary.toLocaleString()}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeEmployeeFromTable(employee.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No employees added yet. Select employees from above to add them here.
              </div>
            )}
          </CardContent>
        </Card>


          {/* Recent Salary Slips - Month Wise */}
          <Card className='lg:hidden block'>
            <CardHeader>
              <CardTitle>Recent Salary Slips</CardTitle>
              <CardDescription>Month-wise salary slip summary</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(() => {
                  // Group salary slips by month and year
                  const groupedSlips = salarySlips.reduce((acc, slip) => {
                    const key = `${slip.month} ${slip.year}`;
                    if (!acc[key]) {
                      acc[key] = {
                        month: slip.month,
                        year: slip.year,
                        employeeCount: 0,
                        totalAmount: 0,
                        slips: []
                      };
                    }
                    acc[key].employeeCount += 1;
                    acc[key].totalAmount += slip.totalSalary;
                    acc[key].slips.push(slip);
                    return acc;
                  }, {} as Record<string, {
                    month: string;
                    year: number;
                    employeeCount: number;
                    totalAmount: number;
                    slips: SalarySlip[];
                  }>);

                  // Convert to array and sort by date (most recent first)
              const sortedGroups = Object.values(groupedSlips)
                .sort((a, b) => {
                  if (a.year !== b.year) return b.year - a.year;
                  const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
                  return monthOrder.indexOf(b.month) - monthOrder.indexOf(a.month);
                })
                .slice(0, 5);

              return sortedGroups.map((group) => (
                <div key={`${group.month}-${group.year}`} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{group.month} {group.year}</p>
                      <p className="text-sm text-muted-foreground">
                        {group.employeeCount} employee{group.employeeCount !== 1 ? 's' : ''}
                      </p>
                      <p className="font-bold text-lg text-primary">
                        ₹{group.totalAmount.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          // Show all slips for this month in preview
                          setPreviewSlip(group.slips[0]); // You can modify this to show month summary
                          setIsPreviewOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <span className="text-xs text-center text-muted-foreground">
                        {group.employeeCount} slips
                      </span>
                    </div>
                  </div>
                  
                  {/* Show employee names in this month */}
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Employees:</p>
                    <div className="flex flex-wrap gap-1">
                      {group.slips.slice(0, 3).map((slip) => (
                        <span key={slip.id} className="text-xs bg-muted px-2 py-1 rounded">
                          {slip.employeeName}
                        </span>
                      ))}
                      {group.slips.length > 3 && (
                        <span className="text-xs text-muted-foreground px-2 py-1">
                          +{group.slips.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ));
            })()}
            
            {salarySlips.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No salary slips generated yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>

        {/* All Salary Slips Table */}
        <Card>
          <CardHeader>
            <CardTitle>Generated Salary Slips</CardTitle>
            <CardDescription>All generated salary slips</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Days Present</TableHead>
                  <TableHead>Overtime (hrs)</TableHead>
                  <TableHead>Total Salary</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salarySlips.map((slip) => {
                  const hasFile = Boolean((slip as any).fileUrl);
                  return (
                    <TableRow key={slip.id}>
                      <TableCell className="font-medium">{slip.employeeName}</TableCell>
                      <TableCell>{slip.month} {slip.year}</TableCell>
                      <TableCell>{slip.daysPresent}</TableCell>
                      <TableCell>{slip.overtimeHours}</TableCell>
                      <TableCell>₹{slip.totalSalary.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handlePreview(slip)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownload(slip)}
                            disabled={!hasFile || downloadingId === slip.id}
                            title={hasFile ? "Download salary slip" : "No file available"}
                          >
                            {downloadingId === slip.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className={`h-4 w-4 ${!hasFile ? 'opacity-30' : ''}`} />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Salary Slip Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Salary Slip Preview
              </DialogTitle>
              <DialogDescription>
                View salary slip details and download the file if available.
              </DialogDescription>
            </DialogHeader>
            {previewSlip && (
              <div className="space-y-6">
                <div className="text-center border-b pb-4">
                  <h2 className="text-2xl font-bold">SALARY SLIP</h2>
                  <p className="text-muted-foreground">{previewSlip.month} {previewSlip.year}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold">Employee Details:</h3>
                    <p><strong>Name:</strong> {previewSlip.employeeName}</p>
                    <p><strong>Basic Salary:</strong> ₹{previewSlip.basicSalary.toLocaleString()}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Attendance:</h3>
                    <p><strong>Days Present:</strong> {previewSlip.daysPresent}</p>
                    <p><strong>Days Absent:</strong> {previewSlip.daysAbsent}</p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Particulars</TableHead>
                      <TableHead className="text-right">Amount (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Basic Salary</TableCell>
                      <TableCell className="text-right">{previewSlip.basicSalary.toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Earned Salary ({previewSlip.daysPresent} days)</TableCell>
                      <TableCell className="text-right">{(previewSlip.basicSalary / 30 * previewSlip.daysPresent).toFixed(2)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Overtime Hours</TableCell>
                      <TableCell className="text-right">{previewSlip.overtimeHours}</TableCell>
                    </TableRow>
                    <TableRow className="border-t-2">
                      <TableCell className="font-semibold">Net Salary</TableCell>
                      <TableCell className="text-right font-semibold">{previewSlip.totalSalary.toLocaleString()}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                {/* Download Button */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setIsPreviewOpen(false)}
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => handleDownload(previewSlip)}
                    disabled={!(previewSlip as any).fileUrl || downloadingId === previewSlip.id}
                  >
                    {downloadingId === previewSlip.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        {(previewSlip as any).fileUrl ? "Download Salary Slip" : "No file available"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AnimatedPage>
  );
}
