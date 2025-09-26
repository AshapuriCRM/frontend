export interface Company {
  id?: string;
  _id?: string;
  name: string;
  logo: string;
  location: string;
  employeeCount: number;
  createdAt: Date;
  email?: string;
  phone?: string;
  gstNumber?: string;
  panNumber?: string;
}

export interface Employee {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  phone: string;
  category: string;
  dateJoined: Date;
  salary: number;
  status: 'active' | 'inactive' | 'terminated' | 'on-leave';
  companyId: string;
}

export interface JobCategory {
  id: string;
  title: string;
  baseWage: number;
  wageType?: 'monthly' | 'daily';
  companyId: string;
  ratesApplied?: boolean;
  gstRate?: number;
  pfRate?: number;
  esicRate?: number;
}


export interface Invoice {
  id: string;
  invoiceNumber: string;
  companyId: string;
  category: string;
  wage: number;
  gstAmount: number;
  esicAmount: number;
  totalAmount: number;
  createdAt: Date;
  status: 'draft' | 'sent' | 'paid';
}

export interface SalarySlip {
  id: string;
  employeeId: string;
  employeeName: string;
  companyId: string;
  month: string;
  year: number;
  daysPresent: number;
  daysAbsent: number;
  bonus: number;
  basicSalary: number;
  totalSalary: number;
  createdAt: Date;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: Date;
  companyId: string;
  url: string;
  folderId?: string; 
}

export interface DocumentFolder {
  id: string;
  name: string;
  companyId: string;
  createdAt: Date;
  documentCount: number;
}


export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
}