'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import { Employee, Company } from '@/lib/types';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AnimatedPage } from '@/components/ui/animated-page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft } from 'lucide-react';

interface EmployeeViewPageProps {
  params: { companyId: string; employeeId: string };
}

export default function EmployeeViewPage({ params }: EmployeeViewPageProps) {
  const { user } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [empRes, compRes] = await Promise.all([
          apiClient.getEmployee(params.employeeId),
          apiClient.getCompany(params.companyId)
        ]);
        if (empRes.success && empRes.data) setEmployee(empRes.data);
        if (compRes.success && compRes.data) setCompany(compRes.data);
      } catch (e: any) {
        setError(e.message || 'Failed to load employee');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [params.employeeId, params.companyId]);

  if (isLoading) {
    return (
      <ProtectedRoute>
        <AnimatedPage>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-10 w-24" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-32" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-4 w-1/3" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </AnimatedPage>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <AnimatedPage>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </AnimatedPage>
      </ProtectedRoute>
    );
  }

  if (!employee) {
    return null;
  }

  return (
    <ProtectedRoute>
      <AnimatedPage>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{employee.name}</h1>
              <p className="text-muted-foreground">
                {company ? `Employee at ${company.name}` : 'Employee details'}
              </p>
              {user && (
                <p className="text-xs text-muted-foreground mt-1">Viewed by {user.name}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={employee.status === 'active' ? 'default' : employee.status === 'on-leave' ? 'secondary' : employee.status === 'terminated' ? 'destructive' : 'outline'}>
                {employee.status.replace('-', ' ')}
              </Badge>
              <Link href={`/dashboard/${params.companyId}/employees`}>
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Personal</CardTitle>
                <CardDescription>Basic information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><span className="text-muted-foreground text-sm">Email: </span>{employee.email || '-'}</div>
                <div><span className="text-muted-foreground text-sm">Phone: </span>{employee.phone}</div>
                <div><span className="text-muted-foreground text-sm">Category: </span>{employee.category}</div>
                <div><span className="text-muted-foreground text-sm">Salary: </span>₹{employee.salary.toLocaleString()}</div>
                <div><span className="text-muted-foreground text-sm">Joined: </span>{employee.dateJoined ? new Date(employee.dateJoined as any).toLocaleDateString() : '-'}</div>
                <div><span className="text-muted-foreground text-sm">Years of Service: </span>{(employee as any).yearsOfService ?? '-'}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Address</CardTitle>
                <CardDescription>Residential details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><span className="text-muted-foreground text-sm">Street: </span>{employee.address?.street || '-'}</div>
                <div><span className="text-muted-foreground text-sm">City: </span>{employee.address?.city || '-'}</div>
                <div className="grid grid-cols-3 gap-2">
                  <div><span className="text-muted-foreground text-sm">State: </span>{employee.address?.state || '-'}</div>
                  <div><span className="text-muted-foreground text-sm">PIN: </span>{employee.address?.pinCode || '-'}</div>
                  <div><span className="text-muted-foreground text-sm">Country: </span>{employee.address?.country || '-'}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Documents</CardTitle>
                <CardDescription>Identity and bank details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><span className="text-muted-foreground text-sm">Aadhar: </span>{employee.documents?.aadhar || '-'}</div>
                <div><span className="text-muted-foreground text-sm">PAN: </span>{employee.documents?.pan || '-'}</div>
                <div className="grid grid-cols-3 gap-2">
                  <div><span className="text-muted-foreground text-sm">Account #: </span>{employee.documents?.bankAccount?.accountNumber || '-'}</div>
                  <div><span className="text-muted-foreground text-sm">IFSC: </span>{employee.documents?.bankAccount?.ifscCode || '-'}</div>
                  <div><span className="text-muted-foreground text-sm">Bank: </span>{employee.documents?.bankAccount?.bankName || '-'}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Emergency Contact</CardTitle>
                <CardDescription>In case of emergencies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><span className="text-muted-foreground text-sm">Name: </span>{employee.emergencyContact?.name || '-'}</div>
                <div><span className="text-muted-foreground text-sm">Relationship: </span>{employee.emergencyContact?.relationship || '-'}</div>
                <div><span className="text-muted-foreground text-sm">Phone: </span>{employee.emergencyContact?.phone || '-'}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Work Schedule</CardTitle>
                <CardDescription>Shift and working time</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><span className="text-muted-foreground text-sm">Shift: </span>{employee.workSchedule?.shiftType || '-'}</div>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground text-sm">Working Days: </span>{employee.workSchedule?.workingDays ?? '-'}</div>
                  <div><span className="text-muted-foreground text-sm">Working Hours: </span>{employee.workSchedule?.workingHours ?? '-'}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AnimatedPage>
    </ProtectedRoute>
  );
}


