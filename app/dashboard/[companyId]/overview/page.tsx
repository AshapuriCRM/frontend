'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  FileText, 
  DollarSign, 
  TrendingUp, 
  Building2, 
  UserCheck, 
  UserX, 
  Calendar,
  AlertCircle,
  Plus,
  Eye,
  FolderOpen,
  RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ProtectedRoute } from '@/components/auth/protected-route';
import type { Company } from '@/lib/types';

interface DashboardPageProps {
  params: { companyId: string };
}

interface CompanyStats {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  onLeaveEmployees: number;
  terminatedEmployees: number;
  totalSalary: number;
  averageSalary: number;
  recentEmployees: Array<{
    id: string;
    name: string;
    email: string;
    status: string;
    createdAt: string;
  }>;
}

// interface Company {
//   id: string;
//   name: string;
//   location: string;
//   logo: string;
//   employeeCount: number;
// }

export default function DashboardOverviewPage({ params }: DashboardPageProps) {
  const [company, setCompany] = useState<Company | null>(null);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    console.log('Dashboard loading for company ID:', params.companyId);
    fetchData();
  }, [params.companyId]);

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      // Validate company ID
      if (!params.companyId || params.companyId === 'undefined') {
        setError('Invalid company ID');
        return;
      }

      // Fetch company details and employee statistics
      try {
        const companyResponse = await apiClient.getCompany(params.companyId);
        if (companyResponse.success && companyResponse.data) {
          setCompany(companyResponse.data);
        } else {
          console.warn('Company fetch failed:', companyResponse);
          // Show warning but don't stop completely
        }
      } catch (companyError: any) {
        console.error('Company fetch error:', companyError);
        if (companyError.message?.includes('404') || companyError.message?.includes('not found')) {
          setError('Company not found. Please check the company ID.');
          return;
        }
        // Don't fail completely if company fetch fails for other reasons
      }

      try {
        const statsResponse = await apiClient.getEmployeeStats(params.companyId);
        if (statsResponse.success && statsResponse.data) {
          // Map API response to dashboard expected format with data validation
          const mappedStats = {
            totalEmployees: Number(statsResponse.data.totalEmployees) || 0,
            activeEmployees: Number(statsResponse.data.activeEmployees) || 0,
            inactiveEmployees: Number(statsResponse.data.inactiveEmployees) || 0,
            onLeaveEmployees: Number(statsResponse.data.onLeaveEmployees) || 0,
            terminatedEmployees: Number(statsResponse.data.terminatedEmployees) || 0,
            totalSalary: Number(statsResponse.data.totalSalaryExpense) || 0, // Fix field mapping
            averageSalary: Number(statsResponse.data.averageSalary) || 0,
            recentEmployees: [] // Will be populated by separate API call
          };
          setStats(mappedStats);
          
          // Fetch recent employees separately
          try {
            const employeesResponse = await apiClient.getEmployeesByCompany(params.companyId, undefined, 10);
            if (employeesResponse.success && employeesResponse.data?.employees && Array.isArray(employeesResponse.data.employees)) {
              // Sort by date and take most recent 5, with proper validation
              const recentEmployees = employeesResponse.data.employees
                .filter((emp) => emp && emp.name && emp.email) // Filter out invalid entries
                .sort((a, b) => {
                  const dateA = new Date(
                    a.dateJoined || a.createdAt || 0
                  ).getTime();
                  const dateB = new Date(
                    b.dateJoined || b.createdAt || 0
                  ).getTime();
                  return dateB - dateA; // Most recent first
                })
                .slice(0, 5)
                .map((emp) => ({
                  id: String(emp.id || emp._id || ""),
                  name: String(emp.name || "Unknown"),
                  email: String(emp.email || ""),
                  status: String(emp.status || "active"),
                  // createdAt: emp.dateJoined || emp.createdAt || new Date().toISOString()
                  createdAt: new Date(
                    emp.dateJoined || emp.createdAt || Date.now()
                  ).toISOString(),
                }));
                
              setStats(prevStats => prevStats ? {
                ...prevStats,
                recentEmployees
              } : {
                ...mappedStats,
                recentEmployees
              });
            } else {
              console.warn('No employees data in response:', employeesResponse);
            }
          } catch (employeesError: any) {
            console.warn('Recent employees fetch failed:', employeesError.message || employeesError);
            // Keep empty array for recent employees - don't break the dashboard
          }
        } else {
          console.warn('Stats fetch failed:', statsResponse);
        }
      } catch (statsError) {
        console.error('Stats fetch error:', statsError);
        // Set default empty stats
        setStats({
          totalEmployees: 0,
          activeEmployees: 0,
          inactiveEmployees: 0,
          onLeaveEmployees: 0,
          terminatedEmployees: 0,
          totalSalary: 0,
          averageSalary: 0,
          recentEmployees: []
        });
      }

    } catch (error: any) {
      const errorMessage = error.message || 'Failed to fetch dashboard data';
      setError(errorMessage);
      console.error('Dashboard fetch error:', error);
      if (isRefresh) {
        toast.error('Failed to refresh dashboard data');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    await fetchData(true);
    toast.success('Dashboard refreshed successfully!');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'on-leave':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'terminated':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const StatCard = ({ title, value, icon: Icon, description, trend }: {
    title: string;
    value: string | number;
    icon: any;
    description?: string;
    trend?: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <div className="flex items-center text-xs text-green-600 mt-1">
            <TrendingUp className="h-3 w-3 mr-1" />
            {trend}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-1 flex-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
    );
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              {company?.logo && (
                <img
                  src={company.logo}
                  alt={company.name}
                  className="w-12 h-12 rounded-lg object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(company?.name || 'Company')}&background=random`;
                  }}
                />
              )}
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {company?.name || 'Company Dashboard'}
                </h1>
                <p className="text-muted-foreground">
                  {company?.location && `${company.location} • `}
                  Overview of your company's key metrics
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="ml-4"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </motion.div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Key Statistics */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          <StatCard
            title="Total Employees"
            value={stats?.totalEmployees || 0}
            icon={Users}
            description="All registered employees"
          />
          <StatCard
            title="Active Employees"
            value={stats?.activeEmployees || 0}
            icon={UserCheck}
            description={`${stats?.activeEmployees || 0} currently working`}
          />
          <StatCard
            title="Total Salary Budget"
            value={stats?.totalSalary ? formatCurrency(stats.totalSalary) : '₹0'}
            icon={DollarSign}
            description="Monthly salary expenses"
          />
          <StatCard
            title="Average Salary"
            value={stats?.averageSalary ? formatCurrency(stats.averageSalary) : '₹0'}
            icon={TrendingUp}
            description="Per employee average"
          />
        </motion.div>

        {/* Employee Status Breakdown */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats?.activeEmployees || 0}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive</CardTitle>
              <UserX className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">
                {stats?.inactiveEmployees || 0}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On Leave</CardTitle>
              <Calendar className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats?.onLeaveEmployees || 0}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Terminated</CardTitle>
              <UserX className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats?.terminatedEmployees || 0}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Recent Employees */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Employees</CardTitle>
                  <CardDescription>Latest additions to your team</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/dashboard/${params.companyId}/employees`)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                {stats?.recentEmployees && stats.recentEmployees.length > 0 ? (
                  <div className="space-y-4">
                    {stats.recentEmployees.slice(0, 5).map((employee) => (
                      <div key={employee.id} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{employee.name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {employee.email}
                          </p>
                        </div>
                        <Badge className={getStatusColor(employee.status)}>
                          {employee.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No employees found</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => router.push(`/dashboard/${params.companyId}/employees`)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Employee
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push(`/dashboard/${params.companyId}/employees`)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage Employees
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push(`/dashboard/${params.companyId}/invoice`)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push(`/dashboard/${params.companyId}/salary`)}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Generate Salary Slip
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push(`/dashboard/${params.companyId}/documents`)}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Manage Documents
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
  );
}