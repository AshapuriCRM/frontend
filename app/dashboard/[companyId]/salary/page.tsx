'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { AnimatedPage } from '@/components/ui/animated-page';
import { mockEmployees, mockSalarySlips } from '@/data/mock-data';
import { Employee, SalarySlip } from '@/lib/types';
import { Plus, Eye, Receipt, X } from 'lucide-react';

interface EmployeeWithDetails extends Employee {
  pfPercentage: number;
  esicPercentage: number;
  daysPresent: number;
  daysAbsent: number;
  bonus: number;
  isSelected: boolean;
}

interface SalaryPageProps {
  params: { companyId: string };
}

export default function SalaryPage({ params }: SalaryPageProps) {
  const [employees] = useState<Employee[]>(mockEmployees.filter(e => e.companyId === params.companyId));
  const [salarySlips, setSalarySlips] = useState<SalarySlip[]>(mockSalarySlips.filter(s => s.companyId === params.companyId));
  
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
  const [globalDaysPresent, setGlobalDaysPresent] = useState<number>(0);
  const [globalDaysAbsent, setGlobalDaysAbsent] = useState<number>(0);
  const [globalBonus, setGlobalBonus] = useState<number>(0);
  
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewSlip, setPreviewSlip] = useState<SalarySlip | null>(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

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
      !tableEmployees.some(tableEmp => tableEmp.id === emp.id)
    );
    setSelectedEmployeeIds(availableEmployees.map(emp => emp.id));
  };

  // Clear all selected employees
  const handleClearAll = () => {
    setSelectedEmployeeIds([]);
  };

  // Add selected employees to table
  const addSelectedEmployeesToTable = () => {
    const employeesToAdd = employees
      .filter(emp => selectedEmployeeIds.includes(emp.id))
      .map(emp => ({
        ...emp,
        pfPercentage: 12,
        esicPercentage: 0.75,
        daysPresent: globalDaysPresent,
        daysAbsent: globalDaysAbsent,
        bonus: globalBonus,
        isSelected: false
      }));
    
    setTableEmployees(prev => [...prev, ...employeesToAdd]);
    setSelectedEmployeeIds([]);
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
  const generateSalarySlips = () => {
    const selectedTableEmployees = tableEmployees.filter(emp => emp.isSelected);
    if (selectedTableEmployees.length === 0 || !month) return;

    const newSlips = selectedTableEmployees.map((employee, index) => {
      const dailySalary = employee.salary / 30;
      const earnedSalary = dailySalary * employee.daysPresent;
      const pfDeduction = (employee.salary * employee.pfPercentage) / 100;
      const esicDeduction = (employee.salary * employee.esicPercentage) / 100;
      const totalSalary = earnedSalary + employee.bonus - pfDeduction - esicDeduction;

      return {
        id: (Date.now() + index).toString(),
        employeeId: employee.id,
        employeeName: employee.name,
        companyId: params.companyId,
        month,
        year,
        daysPresent: employee.daysPresent,
        daysAbsent: employee.daysAbsent,
        bonus: employee.bonus,
        basicSalary: employee.salary,
        totalSalary,
        createdAt: new Date()
      };
    });

    setSalarySlips([...newSlips, ...salarySlips]);
    
    // Remove generated employees from table
    setTableEmployees(prev => prev.filter(emp => !emp.isSelected));
  };

  const handlePreview = (slip: SalarySlip) => {
    setPreviewSlip(slip);
    setIsPreviewOpen(true);
  };

  const selectedCount = tableEmployees.filter(emp => emp.isSelected).length;
  const availableEmployees = employees.filter(emp => 
    !tableEmployees.some(tableEmp => tableEmp.id === emp.id)
  );

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
              <CardDescription>Choose employees and set global attendance values</CardDescription>
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
                          key={employee.id}
                          className="flex items-center space-x-2 px-3 py-2 hover:bg-muted cursor-pointer"
                          onClick={() => handleEmployeeToggle(employee.id)}
                        >
                          <Checkbox
                            checked={selectedEmployeeIds.includes(employee.id)}
                            onChange={() => handleEmployeeToggle(employee.id)}
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

              {/* Global Attendance Values */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Days Present</Label>
                  <Input
                    type="number"
                    min="0"
                    max="31"
                    value={globalDaysPresent}
                    onChange={(e) => setGlobalDaysPresent(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Days Absent</Label>
                  <Input
                    type="number"
                    min="0"
                    max="31"
                    value={globalDaysAbsent}
                    onChange={(e) => setGlobalDaysAbsent(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bonus (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={globalBonus}
                    onChange={(e) => setGlobalBonus(Number(e.target.value))}
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
          <Card>
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
                disabled={selectedCount === 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Generate for Selected ({selectedCount})
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
                    <TableHead>Bonus</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        PF (%)
                        <Switch
                          checked={pfEditable}
                          onCheckedChange={setPfEditable}
                        />
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        ESIC (%)
                        <Switch
                          checked={esicEditable}
                          onCheckedChange={setEsicEditable}
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
                        <Input
                          type="number"
                          min="0"
                          max="31"
                          value={employee.daysAbsent}
                          onChange={(e) => updateEmployeeInTable(employee.id, 'daysAbsent', Number(e.target.value))}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={employee.bonus}
                          onChange={(e) => updateEmployeeInTable(employee.id, 'bonus', Number(e.target.value))}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        {pfEditable ? (
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={employee.pfPercentage}
                            onChange={(e) => updateEmployeeInTable(employee.id, 'pfPercentage', Number(e.target.value))}
                            className="w-20"
                          />
                        ) : (
                          <span>{employee.pfPercentage}%</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {esicEditable ? (
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={employee.esicPercentage}
                            onChange={(e) => updateEmployeeInTable(employee.id, 'esicPercentage', Number(e.target.value))}
                            className="w-20"
                          />
                        ) : (
                          <span>{employee.esicPercentage}%</span>
                        )}
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
                  <TableHead>Bonus</TableHead>
                  <TableHead>Total Salary</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salarySlips.map((slip) => (
                  <TableRow key={slip.id}>
                    <TableCell className="font-medium">{slip.employeeName}</TableCell>
                    <TableCell>{slip.month} {slip.year}</TableCell>
                    <TableCell>{slip.daysPresent}</TableCell>
                    <TableCell>₹{slip.bonus.toLocaleString()}</TableCell>
                    <TableCell>₹{slip.totalSalary.toLocaleString()}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => handlePreview(slip)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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
                      <TableCell>Bonus</TableCell>
                      <TableCell className="text-right">{previewSlip.bonus.toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow className="border-t-2">
                      <TableCell className="font-semibold">Net Salary</TableCell>
                      <TableCell className="text-right font-semibold">{previewSlip.totalSalary.toLocaleString()}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AnimatedPage>
  );
}
