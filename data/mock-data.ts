import { Company, Employee, JobCategory, Invoice, SalarySlip, Document, User } from '@/lib/types';

export const mockUser: User = {
  id: '1',
  email: 'admin@securitypro.com',
  name: 'Admin User',
  avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1'
};

export const mockCompanies: Company[] = [
  {
    id: '1',
    name: 'Nagar Nigam',
    logo: 'https://images.pexels.com/photos/416405/pexels-photo-416405.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    location: 'Indore, Madhya Pradesh',
    employeeCount: 245,
    createdAt: new Date('2023-01-15')
  },
  {
    id: '2',
    name: 'DAVV',
    logo: 'https://images.pexels.com/photos/1172253/pexels-photo-1172253.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    location: 'Palasia, Indore',
    employeeCount: 180,
    createdAt: new Date('2023-03-20')
  },
  {
    id: '3',
    name: 'Kendriya Vidyalay',
    logo: 'https://images.pexels.com/photos/430208/pexels-photo-430208.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    location: 'Indore, Madhya Pradesh',
    employeeCount: 320,
    createdAt: new Date('2022-11-10')
  }
];

export const mockEmployees: Employee[] = [
  {
    id: '1',
    name: 'Rajesh Kumar',
    email: 'rajesh@secureguard.com',
    phone: '+91 9876543210',
    category: 'Security Guard',
    dateJoined: new Date('2023-01-20'),
    salary: 25000,
    status: 'active',
    companyId: '1'
  },
  {
    id: '2',
    name: 'Priya Sharma',
    email: 'priya@secureguard.com',
    phone: '+91 9876543211',
    category: 'Supervisor',
    dateJoined: new Date('2023-02-15'),
    salary: 35000,
    status: 'active',
    companyId: '1'
  },
  {
    id: '3',
    name: 'Amit Singh',
    email: 'amit@eliteprotection.com',
    phone: '+91 9876543212',
    category: 'Security Guard',
    dateJoined: new Date('2023-03-10'),
    salary: 24000,
    status: 'active',
    companyId: '2'
  },
  {
    id: '4',
    name: 'Sunita Devi',
    email: 'sunita@metrosecurity.com',
    phone: '+91 9876543213',
    category: 'Manager',
    dateJoined: new Date('2022-12-05'),
    salary: 45000,
    status: 'active',
    companyId: '3'
  }
];

export const mockJobCategories: JobCategory[] = [  
 {
    id: '1',
    title: 'Security Guard',
    baseWage: 25000,
    wageType: 'monthly',
    companyId: '1',
    ratesApplied: true,
    gstRate: 18,
    pfRate: 12,
    esicRate: 3.25,    
  },
  {
    id: '2',
    title: 'Chief Security Officer',
    baseWage: 35000,
    wageType: 'monthly',
    companyId: '1',
    ratesApplied: true,
    gstRate: 18,
    pfRate: 10,
    esicRate: 3.25,    
  },
  {
    id: '3',
    title: 'Chief Bodyguard',
    baseWage: 20000,
    wageType: 'monthly',
    companyId: '1',
    ratesApplied: true,
    gstRate: 18,
    pfRate: 10,
    esicRate: 3.25,    
  }
];

export const mockInvoices: Invoice[] = [
  {
    id: '1',
    invoiceNumber: 'INV-2024-001',
    companyId: '1',
    category: 'Security Guard',
    wage: 25000,
    gstAmount: 4500,
    esicAmount: 812.5,
    totalAmount: 30312.5,
    createdAt: new Date('2024-01-15'),
    status: 'paid'
  },
  {
    id: '2',
    invoiceNumber: 'INV-2024-002',
    companyId: '1',
    category: 'Supervisor',
    wage: 35000,
    gstAmount: 6300,
    esicAmount: 1137.5,
    totalAmount: 42437.5,
    createdAt: new Date('2024-01-20'),
    status: 'sent'
  }
];

export const mockSalarySlips: SalarySlip[] = [
  {
    id: '1',
    employeeId: '1',
    employeeName: 'Rajesh Kumar',
    companyId: '1',
    month: 'January',
    year: 2024,
    daysPresent: 26,
    daysAbsent: 4,
    overtimeHours: 10,
    basicSalary: 25000,
    totalSalary: 27000,
    createdAt: new Date('2024-01-31')
  },
  {
    id: '2',
    employeeId: '2',
    employeeName: 'Priya Sharma',
    companyId: '1',
    month: 'January',
    year: 2024,
    daysPresent: 30,
    daysAbsent: 0,
    overtimeHours: 5,
    basicSalary: 35000,
    totalSalary: 38000,
    createdAt: new Date('2024-01-31')
  }
];

export const mockDocuments: Document[] = [
  {
    id: '1',
    name: 'Company Registration Certificate.pdf',
    type: 'application/pdf',
    size: 2048576,
    uploadedAt: new Date('2024-01-10'),
    companyId: '1',
    url: '#'
  },
  {
    id: '2',
    name: 'GST Registration.pdf',
    type: 'application/pdf',
    size: 1536000,
    uploadedAt: new Date('2024-01-12'),
    companyId: '1',
    url: '#'
  },
  {
    id: '3',
    name: 'ESIC Registration.pdf',
    type: 'application/pdf',
    size: 1024000,
    uploadedAt: new Date('2024-01-15'),
    companyId: '1',
    url: '#'
  }
];