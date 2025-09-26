'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimatedPage } from '@/components/ui/animated-page';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Employee, Company } from '@/lib/types';
import { Plus, Pencil, Trash2, Search, Users, Filter, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface EmployeesPageProps {
  params: { companyId: string };
}

export default function EmployeesPage({ params }: EmployeesPageProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const { user } = useAuth();
  
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    inactiveEmployees: 0,
    terminatedEmployees: 0,
    onLeaveEmployees: 0,
    averageSalary: 0,
    totalSalaryExpense: 0
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    category: '',
    salary: 0,
    status: 'active' as 'active' | 'inactive' | 'terminated' | 'on-leave'
  });

  useEffect(() => {
    fetchEmployees();
    fetchCompany();
    fetchEmployeeStats();
  }, []);

  const fetchCompany = async () => {
    try {
      const response = await apiClient.getCompany(params.companyId);
      if (response.success && response.data) {
        setCompany(response.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch company:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.getEmployees({
        companyId: params.companyId,
        limit: 100
      });
      if (response.success && response.data) {
        setEmployees(response.data.employees);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to fetch employees');
      toast.error('Failed to load employees');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployeeStats = async () => {
    try {
      const response = await apiClient.getEmployeeStats(params.companyId);
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch employee stats:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      category: '',
      salary: 0,
      status: 'active'
    });
    setEditingEmployee(null);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.category.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingEmployee) {
        setIsUpdating(true);
        const response = await apiClient.updateEmployee((editingEmployee as any).id || (editingEmployee as any)._id, {
          ...formData,
          companyId: params.companyId
        });
        
        if (response.success && response.data) {
          setEmployees(prev => prev.map(emp => 
            ((emp as any).id || (emp as any)._id) === ((editingEmployee as any).id || (editingEmployee as any)._id) ? response.data! : emp
          ));
          toast.success('Employee updated successfully!');
        }
      } else {
        setIsCreating(true);
        const response = await apiClient.createEmployee({
          ...formData,
          companyId: params.companyId
        });
        
        if (response.success && response.data) {
          setEmployees(prev => [...prev, response.data!]);
          toast.success('Employee created successfully!');
        }
      }
      
      setIsDialogOpen(false);
      resetForm();
      fetchEmployeeStats(); // Refresh stats
    } catch (error: any) {
      toast.error(error.message || `Failed to ${editingEmployee ? 'update' : 'create'} employee`);
    } finally {
      setIsCreating(false);
      setIsUpdating(false);
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      category: employee.category,
      salary: employee.salary,
      status: employee.status
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (employee: Employee) => {
    if (!confirm(`Are you sure you want to delete ${employee.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await apiClient.deleteEmployee((employee as any).id || (employee as any)._id);
      if (response.success) {
        setEmployees(prev => prev.filter(emp => ((emp as any).id || (emp as any)._id) !== ((employee as any).id || (employee as any)._id)));
        toast.success('Employee deleted successfully!');
        fetchEmployeeStats(); // Refresh stats
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete employee');
    }
  };

  // Filter employees
  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || employee.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage);

  // Get unique categories from employees
  const categories = [...new Set(employees.map(emp => emp.category))].filter(Boolean);

  if (isLoading) {
    return (
      <ProtectedRoute>
        <AnimatedPage>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-8 w-64 mb-2" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex gap-4 mb-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 py-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-48" />
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
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AnimatedPage>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Employee Management</h1>
              <p className="text-muted-foreground">
                {company ? `Managing employees for ${company.name}` : 'Manage your company\'s workforce'}
              </p>
              {user && (
                <p className="text-xs text-muted-foreground mt-1">Logged in as {user.name}</p>
              )}
            </div>
          
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Doe"
                        disabled={isCreating || isUpdating}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="john@example.com"
                        disabled={isCreating || isUpdating}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+91 9876543210"
                        disabled={isCreating || isUpdating}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select or enter category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.length > 0 ? categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          )) : null}
                          <SelectItem value="Security Guard">Security Guard</SelectItem>
                          <SelectItem value="Supervisor">Supervisor</SelectItem>
                          <SelectItem value="Manager">Manager</SelectItem>
                          <SelectItem value="Admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="salary">Salary (₹)</Label>
                      <Input
                        id="salary"
                        type="number"
                        value={formData.salary}
                        onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
                        placeholder="25000"
                        disabled={isCreating || isUpdating}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={formData.status} onValueChange={(value: 'active' | 'inactive' | 'terminated' | 'on-leave') => setFormData({ ...formData, status: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="on-leave">On Leave</SelectItem>
                          <SelectItem value="terminated">Terminated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleSubmit} 
                    className="w-full" 
                    disabled={!formData.name || !formData.email || !formData.category || isCreating || isUpdating}
                  >
                    {isCreating || isUpdating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {editingEmployee ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      editingEmployee ? 'Update Employee' : 'Add Employee'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalEmployees}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.activeEmployees}</div>
                <div className="text-xs text-muted-foreground">
                  Inactive: {stats.inactiveEmployees} • On Leave: {stats.onLeaveEmployees}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Salary Budget</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{stats.totalSalaryExpense.toLocaleString()}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg. Salary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{stats.averageSalary > 0 ? Math.round(stats.averageSalary).toLocaleString() : 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="on-leave">On Leave</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Employees Table */}
          <Card>
            <CardHeader>
              <CardTitle>Employees</CardTitle>
              <CardDescription>
                Showing {paginatedEmployees.length} of {filteredEmployees.length} employees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Salary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEmployees.map((employee, index) => (
                    <TableRow key={(employee as any).id || (employee as any)._id || `employee-${index}`}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{employee.phone}</TableCell>
                      <TableCell>{employee.category}</TableCell>
                      <TableCell>₹{employee.salary.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={
                          employee.status === 'active' ? 'default' : 
                          employee.status === 'on-leave' ? 'secondary' :
                          employee.status === 'terminated' ? 'destructive' : 'outline'
                        }>
                          {employee.status.replace('-', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(employee.dateJoined).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(employee)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleDelete(employee)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {filteredEmployees.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No employees found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' 
                    ? 'Try adjusting your search and filter criteria' 
                    : 'Add your first employee to get started'}
                </p>
                {!searchTerm && statusFilter === 'all' && categoryFilter === 'all' && (
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Employee
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </AnimatedPage>
    </ProtectedRoute>
  );
}