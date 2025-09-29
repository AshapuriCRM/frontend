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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimatedPage } from '@/components/ui/animated-page';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Employee, Company } from '@/lib/types';
import Link from 'next/link';
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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewEmployee, setPreviewEmployee] = useState<Employee | null>(null);
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
    address: {
      street: '',
      city: '',
      state: '',
      pinCode: '',
      country: 'India'
    },
    category: '',
    categoryId: '',
    dateJoined: new Date().toISOString().substring(0,10),
    salary: 0,
    status: 'active' as 'active' | 'inactive' | 'terminated' | 'on-leave',
    documents: {
      aadhar: '',
      pan: '',
      bankAccount: {
        accountNumber: '',
        ifscCode: '',
        bankName: ''
      },
      photo: ''
    },
    emergencyContact: {
      name: '',
      relationship: '',
      phone: ''
    },
    workSchedule: {
      shiftType: 'day' as 'day' | 'night' | 'rotating',
      workingDays: 26,
      workingHours: 8
    }
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
      address: { street: '', city: '', state: '', pinCode: '', country: 'India' },
      category: '',
      categoryId: '',
      dateJoined: new Date().toISOString().substring(0,10),
      salary: 0,
      status: 'active',
      documents: {
        aadhar: '',
        pan: '',
        bankAccount: { accountNumber: '', ifscCode: '', bankName: '' },
        photo: ''
      },
      emergencyContact: { name: '', relationship: '', phone: '' },
      workSchedule: { shiftType: 'day', workingDays: 26, workingHours: 8 }
    });
    setEditingEmployee(null);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.phone.trim() || !formData.category.trim() || !formData.salary ||
      !formData.documents.bankAccount.accountNumber?.trim() ||
      !formData.documents.bankAccount.ifscCode?.trim() ||
      !formData.documents.bankAccount.bankName?.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingEmployee) {
        setIsUpdating(true);
        const response = await apiClient.updateEmployee((editingEmployee as any).id || (editingEmployee as any)._id, {
          ...formData,
          companyId: params.companyId
        } as any);
        
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
          dateJoined: formData.dateJoined,
          companyId: params.companyId
        } as any);
        
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
      email: employee.email || '',
      phone: employee.phone,
      address: {
        street: employee.address?.street || '',
        city: employee.address?.city || '',
        state: employee.address?.state || '',
        pinCode: employee.address?.pinCode || '',
        country: employee.address?.country || 'India'
      },
      category: employee.category,
      categoryId: (employee as any).categoryId || '',
      dateJoined: employee.dateJoined ? new Date(employee.dateJoined as any).toISOString().substring(0,10) : new Date().toISOString().substring(0,10),
      salary: employee.salary,
      status: employee.status,
      documents: {
        aadhar: employee.documents?.aadhar || '',
        pan: employee.documents?.pan || '',
        bankAccount: {
          accountNumber: employee.documents?.bankAccount?.accountNumber || '',
          ifscCode: employee.documents?.bankAccount?.ifscCode || '',
          bankName: employee.documents?.bankAccount?.bankName || ''
        },
        photo: employee.documents?.photo || ''
      },
      emergencyContact: {
        name: employee.emergencyContact?.name || '',
        relationship: employee.emergencyContact?.relationship || '',
        phone: employee.emergencyContact?.phone || ''
      },
      workSchedule: {
        shiftType: (employee.workSchedule?.shiftType as any) || 'day',
        workingDays: employee.workSchedule?.workingDays || 26,
        workingHours: employee.workSchedule?.workingHours || 8
      }
    });
    setIsDialogOpen(true);
  };

  const openPreview = (employee: Employee) => {
    setPreviewEmployee(employee);
    setIsPreviewOpen(true);
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
                         (employee.email ? employee.email.toLowerCase().includes(searchTerm.toLowerCase()) : false) ||
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
  const categories = employees
    .map(emp => emp.category)
    .filter((c): c is string => Boolean(c))
    .filter((value, index, self) => self.indexOf(value) === index);

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
              <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <Label htmlFor="dateJoined">Date Joined</Label>
                      <Input
                        id="dateJoined"
                        type="date"
                        value={formData.dateJoined}
                        onChange={(e) => setFormData({ ...formData, dateJoined: e.target.value })}
                        disabled={isCreating || isUpdating}
                      />
                    </div>
                  </div>

                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="street">Street</Label>
                      <Input
                        id="street"
                        value={formData.address.street}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                        placeholder="123 Main St"
                        disabled={isCreating || isUpdating}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.address.city}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                        placeholder="Ahmedabad"
                        disabled={isCreating || isUpdating}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={formData.address.state}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                        placeholder="Gujarat"
                        disabled={isCreating || isUpdating}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pinCode">PIN Code</Label>
                      <Input
                        id="pinCode"
                        value={formData.address.pinCode}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, pinCode: e.target.value } })}
                        placeholder="380001"
                        disabled={isCreating || isUpdating}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={formData.address.country}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, country: e.target.value } })}
                        placeholder="India"
                        disabled={isCreating || isUpdating}
                      />
                    </div>
                  </div>

                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="categoryId">Category ID</Label>
                      <Input
                        id="categoryId"
                        value={formData.categoryId}
                        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                        placeholder="Optional category ID"
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
                  
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="aadhar">Aadhar</Label>
                      <Input
                        id="aadhar"
                        value={formData.documents.aadhar}
                        onChange={(e) => setFormData({ ...formData, documents: { ...formData.documents, aadhar: e.target.value } })}
                        placeholder="XXXX-XXXX-XXXX"
                        disabled={isCreating || isUpdating}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pan">PAN</Label>
                      <Input
                        id="pan"
                        value={formData.documents.pan}
                        onChange={(e) => setFormData({ ...formData, documents: { ...formData.documents, pan: e.target.value.toUpperCase() } })}
                        placeholder="ABCDE1234F"
                        disabled={isCreating || isUpdating}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="photo">Photo URL</Label>
                      <Input
                        id="photo"
                        value={formData.documents.photo}
                        onChange={(e) => setFormData({ ...formData, documents: { ...formData.documents, photo: e.target.value } })}
                        placeholder="https://..."
                        disabled={isCreating || isUpdating}
                      />
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Bank Account Number</Label>
                      <Input
                        id="accountNumber"
                        value={formData.documents.bankAccount.accountNumber}
                        onChange={(e) => setFormData({ ...formData, documents: { ...formData.documents, bankAccount: { ...formData.documents.bankAccount, accountNumber: e.target.value } } })}
                        placeholder="1234567890"
                        disabled={isCreating || isUpdating}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ifscCode">IFSC Code</Label>
                      <Input
                        id="ifscCode"
                        value={formData.documents.bankAccount.ifscCode}
                        onChange={(e) => setFormData({ ...formData, documents: { ...formData.documents, bankAccount: { ...formData.documents.bankAccount, ifscCode: e.target.value.toUpperCase() } } })}
                        placeholder="HDFC0001234"
                        disabled={isCreating || isUpdating}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bankName">Bank Name</Label>
                      <Input
                        id="bankName"
                        value={formData.documents.bankAccount.bankName}
                        onChange={(e) => setFormData({ ...formData, documents: { ...formData.documents, bankAccount: { ...formData.documents.bankAccount, bankName: e.target.value } } })}
                        placeholder="HDFC Bank"
                        disabled={isCreating || isUpdating}
                      />
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="emgName">Emergency Contact Name</Label>
                      <Input
                        id="emgName"
                        value={formData.emergencyContact.name}
                        onChange={(e) => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, name: e.target.value } })}
                        placeholder="Jane Doe"
                        disabled={isCreating || isUpdating}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="relationship">Relationship</Label>
                      <Input
                        id="relationship"
                        value={formData.emergencyContact.relationship}
                        onChange={(e) => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, relationship: e.target.value } })}
                        placeholder="Spouse"
                        disabled={isCreating || isUpdating}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emgPhone">Emergency Phone</Label>
                      <Input
                        id="emgPhone"
                        value={formData.emergencyContact.phone}
                        onChange={(e) => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, phone: e.target.value } })}
                        placeholder="+91 98765 43210"
                        disabled={isCreating || isUpdating}
                      />
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="shiftType">Shift Type</Label>
                      <Select value={formData.workSchedule.shiftType} onValueChange={(value: 'day' | 'night' | 'rotating') => setFormData({ ...formData, workSchedule: { ...formData.workSchedule, shiftType: value } })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="day">Day</SelectItem>
                          <SelectItem value="night">Night</SelectItem>
                          <SelectItem value="rotating">Rotating</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="workingDays">Working Days</Label>
                      <Input
                        id="workingDays"
                        type="number"
                        value={formData.workSchedule.workingDays}
                        onChange={(e) => setFormData({ ...formData, workSchedule: { ...formData.workSchedule, workingDays: Number(e.target.value) } })}
                        placeholder="26"
                        disabled={isCreating || isUpdating}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="workingHours">Working Hours</Label>
                      <Input
                        id="workingHours"
                        type="number"
                        value={formData.workSchedule.workingHours}
                        onChange={(e) => setFormData({ ...formData, workSchedule: { ...formData.workSchedule, workingHours: Number(e.target.value) } })}
                        placeholder="8"
                        disabled={isCreating || isUpdating}
                      />
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleSubmit} 
                    className="w-full" 
                    disabled={!formData.name || !formData.phone || !formData.category || !formData.salary || !formData.documents.bankAccount.accountNumber || !formData.documents.bankAccount.ifscCode || !formData.documents.bankAccount.bankName || isCreating || isUpdating}
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
                    <TableRow key={(employee as any).id || (employee as any)._id || `employee-${index}`} className="cursor-pointer hover:bg-muted/50" onClick={() => openPreview(employee)}>
                      <TableCell className="font-medium">
                        <Link className="underline-offset-2 hover:underline" href={`/dashboard/${params.companyId}/employees/${(employee as any).id || (employee as any)._id}`} onClick={(e) => e.stopPropagation()}>
                          {employee.name}
                        </Link>
                      </TableCell>
                      <TableCell>{employee.email || '-'}</TableCell>
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
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleEdit(employee); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={(e) => { e.stopPropagation(); handleDelete(employee); }}
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

        {/* Preview Drawer */}
        <Sheet open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{previewEmployee?.name || 'Employee'}</SheetTitle>
              <SheetDescription>Employee details preview</SheetDescription>
            </SheetHeader>
            {previewEmployee && (
              <div className="space-y-6 mt-4">
                <div className="flex items-center justify-between">
                  <Badge variant={previewEmployee.status === 'active' ? 'default' : previewEmployee.status === 'on-leave' ? 'secondary' : previewEmployee.status === 'terminated' ? 'destructive' : 'outline'}>
                    {previewEmployee.status.replace('-', ' ')}
                  </Badge>
                  <div className="text-sm text-muted-foreground">Joined {previewEmployee.dateJoined ? new Date(previewEmployee.dateJoined as any).toLocaleDateString() : '-'}</div>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Personal</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div><span className="text-muted-foreground text-sm">Email: </span>{previewEmployee.email || '-'}</div>
                    <div><span className="text-muted-foreground text-sm">Phone: </span>{previewEmployee.phone}</div>
                    <div><span className="text-muted-foreground text-sm">Category: </span>{previewEmployee.category}</div>
                    <div><span className="text-muted-foreground text-sm">Salary: </span>₹{previewEmployee.salary.toLocaleString()}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Address</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div><span className="text-muted-foreground text-sm">Street: </span>{previewEmployee.address?.street || '-'}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-muted-foreground text-sm">City: </span>{previewEmployee.address?.city || '-'}</div>
                      <div><span className="text-muted-foreground text-sm">State: </span>{previewEmployee.address?.state || '-'}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-muted-foreground text-sm">PIN: </span>{previewEmployee.address?.pinCode || '-'}</div>
                      <div><span className="text-muted-foreground text-sm">Country: </span>{previewEmployee.address?.country || '-'}</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Documents</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div><span className="text-muted-foreground text-sm">Aadhar: </span>{previewEmployee.documents?.aadhar || '-'}</div>
                    <div><span className="text-muted-foreground text-sm">PAN: </span>{previewEmployee.documents?.pan || '-'}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-muted-foreground text-sm">Account #: </span>{previewEmployee.documents?.bankAccount?.accountNumber || '-'}</div>
                      <div><span className="text-muted-foreground text-sm">IFSC: </span>{previewEmployee.documents?.bankAccount?.ifscCode || '-'}</div>
                    </div>
                    <div><span className="text-muted-foreground text-sm">Bank: </span>{previewEmployee.documents?.bankAccount?.bankName || '-'}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Emergency Contact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div><span className="text-muted-foreground text-sm">Name: </span>{previewEmployee.emergencyContact?.name || '-'}</div>
                    <div><span className="text-muted-foreground text-sm">Relationship: </span>{previewEmployee.emergencyContact?.relationship || '-'}</div>
                    <div><span className="text-muted-foreground text-sm">Phone: </span>{previewEmployee.emergencyContact?.phone || '-'}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Work Schedule</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div><span className="text-muted-foreground text-sm">Shift: </span>{previewEmployee.workSchedule?.shiftType || '-'}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-muted-foreground text-sm">Working Days: </span>{previewEmployee.workSchedule?.workingDays ?? '-'}</div>
                      <div><span className="text-muted-foreground text-sm">Working Hours: </span>{previewEmployee.workSchedule?.workingHours ?? '-'}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </AnimatedPage>
    </ProtectedRoute>
  );
}