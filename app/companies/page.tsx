'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AnimatedPage } from '@/components/ui/animated-page';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Company } from '@/lib/types';
import { Plus, Search, Users, MapPin, LogOut, AlertCircle, Building2, LayoutDashboard, Folder, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ProtectedRoute } from '@/components/auth/protected-route';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCompany, setNewCompany] = useState({
    name: '',
    location: '',
    email: '',
    phone: '',
    gstNumber: '',
    panNumber: ''
  });
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.getCompanies({ limit: 50 });
      if (response.success && response.data) {
        setCompanies(response.data.companies);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to fetch companies');
      toast.error('Failed to load companies');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddCompany = async () => {
    if (!newCompany.name.trim() || !newCompany.location.trim()) {
      toast.error('Company name and location are required');
      return;
    }

    try {
      setIsCreating(true);
      const response = await apiClient.createCompany({
        name: newCompany.name.trim(),
        location: newCompany.location.trim(),
        email: newCompany.email.trim() || undefined,
        phone: newCompany.phone.trim() || undefined,
        gstNumber: newCompany.gstNumber.trim() || undefined,
        panNumber: newCompany.panNumber.trim() || undefined,
        logo: 'https://images.pexels.com/photos/416405/pexels-photo-416405.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
        employeeCount: 0
      });
      
      if (response.success && response.data) {
        setCompanies([...companies, response.data]);
        setNewCompany({ name: '', location: '', email: '', phone: '', gstNumber: '', panNumber: '' });
        setIsDialogOpen(false);
        toast.success('Company created successfully!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create company');
    } finally {
      setIsCreating(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleCompanyClick = (companyId: string) => {
    console.log('Navigating to company:', companyId);
    localStorage.setItem('selectedCompanyId', companyId);
    router.push(`/dashboard/${companyId}`);
  };

  const handleAdminDashboardClick = () => {
    console.log('Admin Dashboard Button clicked!');
  };

  const handleFilesAssetsClick = () => {
    router.push('/admin/files-and-assets');
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Ashapuri CRM</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="default" className='gradient-button' onClick={handleAdminDashboardClick}>
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Admin Dashboard
              </Button>
              <Button variant="outline" className='gradient-button' onClick={handleFilesAssetsClick}>
                <Folder className="h-4 w-4 mr-2" />
                Files & Assets
              </Button>
              <Button variant="outline" className='text-destructive border-destructive hover:text-destructive hover:border-destructive' onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
            <div className="sm:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className='gradient-button'>
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 sm:w-80">
                  <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 grid gap-3">
                    <SheetClose asChild>
                      <Button variant="default" className='w-full' onClick={handleAdminDashboardClick}>
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Admin Dashboard
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button variant="outline" className='w-full' onClick={handleFilesAssetsClick}>
                        <Folder className="h-4 w-4 mr-2" />
                        Files & Assets
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button variant="outline" className='w-full text-destructive border-destructive hover:text-destructive hover:border-destructive' onClick={handleLogout}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </Button>
                    </SheetClose>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>

      <AnimatedPage className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Select Company</h2>
          <p className="text-muted-foreground">Choose a company to manage or create a new one</p>
          {user && (
            <p className="text-sm text-muted-foreground mt-1">Welcome back, {user.name}</p>
          )}
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <Card key={`skeleton-${index}`}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-12 h-12 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            filteredCompanies.map((company, index) => (
              <motion.div
                key={(company as any).id || (company as any)._id || `company-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <img
                        src={company.logo}
                        alt={company.name}
                        className="w-12 h-12 rounded-lg object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(company.name)}&background=random`;
                        }}
                      />
                      <div>
                        <CardTitle className="text-lg">{company.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {company.location}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {company.employeeCount || 0} employees
                      </Badge>
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => handleCompanyClick((company as any).id || (company as any)._id)}
                    >
                      Open Dashboard
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer border-dashed border-2 hover:border-primary/50 transition-colors">
                <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px]">
                  <Plus className="h-12 w-12 text-muted-foreground mb-4" />
                  <CardTitle className="text-lg text-center">Add New Company</CardTitle>
                  <CardDescription className="text-center">
                    Create a new company profile
                  </CardDescription>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Company</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                <div>
                  <Label htmlFor="name">Company Name *</Label>
                  <Input
                    id="name"
                    value={newCompany.name}
                    onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                    placeholder="Enter company name"
                    disabled={isCreating}
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={newCompany.location}
                    onChange={(e) => setNewCompany({ ...newCompany, location: e.target.value })}
                    placeholder="Enter location"
                    disabled={isCreating}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newCompany.email}
                    onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })}
                    placeholder="company@example.com"
                    disabled={isCreating}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newCompany.phone}
                    onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
                    placeholder="Enter phone number"
                    disabled={isCreating}
                  />
                </div>
                <div>
                  <Label htmlFor="gstNumber">GST Number</Label>
                  <Input
                    id="gstNumber"
                    value={newCompany.gstNumber}
                    onChange={(e) => setNewCompany({ ...newCompany, gstNumber: e.target.value })}
                    placeholder="15-character GST number"
                    disabled={isCreating}
                  />
                </div>
                <div>
                  <Label htmlFor="panNumber">PAN Number</Label>
                  <Input
                    id="panNumber"
                    value={newCompany.panNumber}
                    onChange={(e) => setNewCompany({ ...newCompany, panNumber: e.target.value })}
                    placeholder="10-character PAN number"
                    disabled={isCreating}
                  />
                </div>
                <Button onClick={handleAddCompany} className="w-full" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Company'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </AnimatedPage>
    </div>
    </ProtectedRoute>
  );
}