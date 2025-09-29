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

export interface EmployeeAddress {
  street?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  country?: string;
}

export interface EmployeeBankAccount {
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
}

export interface EmployeeDocuments {
  aadhar?: string;
  pan?: string;
  bankAccount?: EmployeeBankAccount;
  photo?: string;
}

export interface EmployeeEmergencyContact {
  name?: string;
  relationship?: string;
  phone?: string;
}

export interface EmployeeWorkSchedule {
  shiftType?: 'day' | 'night' | 'rotating';
  workingDays?: number;
  workingHours?: number;
}

export interface Employee {
  id?: string;
  _id?: string;
  name: string;
  email?: string;
  phone: string;
  address?: EmployeeAddress;
  category: string;
  categoryId?: string;
  dateJoined: Date;
  salary: number;
  status: 'active' | 'inactive' | 'terminated' | 'on-leave';
  companyId: string;
  documents?: EmployeeDocuments;
  emergencyContact?: EmployeeEmergencyContact;
  workSchedule?: EmployeeWorkSchedule;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  yearsOfService?: number;
}

export interface EmployeeCreateInput {
  name: string;
  email?: string;
  phone: string;
  address?: EmployeeAddress;
  category: string;
  categoryId?: string;
  dateJoined: string | Date;
  salary: number;
  companyId: string;
  status?: 'active' | 'inactive' | 'terminated' | 'on-leave';
  documents?: EmployeeDocuments;
  emergencyContact?: EmployeeEmergencyContact;
  workSchedule?: EmployeeWorkSchedule;
}

export interface EmployeeUpdateInput extends Partial<EmployeeCreateInput> {}

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
  overtimeHours: number;
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