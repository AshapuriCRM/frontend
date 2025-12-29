import {
  User,
  Company,
  Employee,
  Invoice,
  EmployeeCreateInput,
  EmployeeUpdateInput,
  CompanyFolder,
  CompanyFolderFile,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Array<{ msg: string; param: string; value: any }>;
  message?: string;
}

interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface CompanyFilters extends PaginationParams {
  search?: string;
  status?: "active" | "inactive" | "suspended";
  location?: string;
}

interface EmployeeFilters extends PaginationParams {
  companyId?: string;
  status?: "active" | "inactive" | "terminated" | "on-leave";
  category?: string;
  search?: string;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const config: RequestInit = {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      };

      const response = await fetch(url, config);
      const data: ApiResponse<T> = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "API request failed");
      }

      return data;
    } catch (error) {
      console.error("API Request Error:", error);
      throw error;
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("token", token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
  }

  // Auth API methods
  async register(userData: {
    name: string;
    email: string;
    password: string;
  }): Promise<ApiResponse<{ user: User; token: string }>> {
    return this.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async login(credentials: {
    email: string;
    password: string;
  }): Promise<ApiResponse<{ user: User; token: string }>> {
    return this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request("/api/auth/me");
  }

  async updateProfile(userData: Partial<User>): Promise<ApiResponse<User>> {
    return this.request("/api/auth/profile", {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  }

  async changePassword(passwordData: {
    currentPassword: string;
    newPassword: string;
  }): Promise<ApiResponse<{ message: string }>> {
    return this.request("/api/auth/password", {
      method: "PUT",
      body: JSON.stringify(passwordData),
    });
  }

  async logout(): Promise<ApiResponse<{ message: string }>> {
    const result = await this.request("/api/auth/logout", {
      method: "POST",
    });
    this.clearToken();
    return result;
  }

  // Company API methods
  async createCompany(
    companyData: Omit<Company, "id" | "createdAt">
  ): Promise<ApiResponse<Company>> {
    return this.request("/api/companies", {
      method: "POST",
      body: JSON.stringify(companyData),
    });
  }

  async getCompanies(filters?: CompanyFilters): Promise<
    ApiResponse<{
      companies: Company[];
      pagination: {
        total: number;
        pages: number;
        page: number;
        limit: number;
      };
    }>
  > {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          params.append(key, String(value));
        }
      });
    }

    const query = params.toString();
    return this.request(`/api/companies${query ? `?${query}` : ""}`);
  }

  async getCompany(id: string): Promise<ApiResponse<Company>> {
    return this.request(`/api/companies/${id}`);
  }

  async updateCompany(
    id: string,
    companyData: Partial<Company>
  ): Promise<ApiResponse<Company>> {
    return this.request(`/api/companies/${id}`, {
      method: "PUT",
      body: JSON.stringify(companyData),
    });
  }

  async deleteCompany(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/api/companies/${id}`, {
      method: "DELETE",
    });
  }

  async searchCompanies(
    query: string,
    limit?: number
  ): Promise<ApiResponse<Company[]>> {
    const params = new URLSearchParams({ q: query });
    if (limit) params.append("limit", String(limit));
    return this.request(`/api/companies/search?${params.toString()}`);
  }

  async getCompanyStats(): Promise<
    ApiResponse<{
      totalCompanies: number;
      activeCompanies: number;
      inactiveCompanies: number;
      suspendedCompanies: number;
      averageEmployeeCount: number;
      totalEmployees: number;
    }>
  > {
    return this.request("/api/companies/stats");
  }

  // Employee API methods
  async createEmployee(
    employeeData: EmployeeCreateInput
  ): Promise<ApiResponse<Employee>> {
    return this.request("/api/employees", {
      method: "POST",
      body: JSON.stringify(employeeData),
    });
  }

  /**
   * Create employee with optional photo file via multipart/form-data.
   * Nested objects are JSON.stringified on the form data to match backend parsing.
   */
  async createEmployeeMultipart(
    employeeData: EmployeeCreateInput,
    photoFile?: File
  ): Promise<ApiResponse<Employee>> {
    const form = new FormData();
    // primitives
    if (employeeData.name) form.append("name", employeeData.name);
    if (employeeData.email) form.append("email", employeeData.email);
    if (employeeData.phone) form.append("phone", employeeData.phone);
    if (employeeData.category) form.append("category", employeeData.category);
    if (typeof employeeData.salary !== "undefined")
      form.append("salary", String(employeeData.salary));
    if (employeeData.companyId)
      form.append("companyId", String(employeeData.companyId));
    if (employeeData.status) form.append("status", String(employeeData.status));
    if (employeeData.dateJoined)
      form.append(
        "dateJoined",
        typeof employeeData.dateJoined === "string"
          ? employeeData.dateJoined
          : new Date(employeeData.dateJoined).toISOString()
      );
    // nested JSON fields (omit documents.photo; backend will use uploaded file)
    if (employeeData.address)
      form.append("address", JSON.stringify(employeeData.address));
    if (employeeData.documents) {
      const { photo, aadhar, pan, bankAccount, ...restDocs } =
        employeeData.documents;
      const docsPayload: Record<string, any> = { ...restDocs };
      if (aadhar) docsPayload.aadhar = aadhar;
      if (pan) docsPayload.pan = pan;
      if (bankAccount) docsPayload.bankAccount = bankAccount;
      // keep full JSON (without photo) for controller parsing
      form.append("documents", JSON.stringify(docsPayload));
      // duplicate critical fields in flattened form for validator to see
      if (aadhar) form.append("documents.aadhar", String(aadhar));
      if (pan) form.append("documents.pan", String(pan));
      if (bankAccount) {
        if (bankAccount.accountNumber)
          form.append(
            "documents.bankAccount.accountNumber",
            String(bankAccount.accountNumber)
          );
        if (bankAccount.ifscCode)
          form.append(
            "documents.bankAccount.ifscCode",
            String(bankAccount.ifscCode)
          );
        if (bankAccount.bankName)
          form.append(
            "documents.bankAccount.bankName",
            String(bankAccount.bankName)
          );
      }
    }
    if (employeeData.emergencyContact)
      form.append(
        "emergencyContact",
        JSON.stringify(employeeData.emergencyContact)
      );
    if (employeeData.workSchedule)
      form.append("workSchedule", JSON.stringify(employeeData.workSchedule));

    if (photoFile) form.append("photo", photoFile);

    const url = `${this.baseURL}/api/employees`;
    return fetch(url, {
      method: "POST",
      headers: {
        Authorization: this.token ? `Bearer ${this.token}` : "",
      },
      body: form,
    }).then((res) => res.json());
  }

  async getEmployees(filters?: EmployeeFilters): Promise<
    ApiResponse<{
      employees: Employee[];
      pagination: {
        total: number;
        pages: number;
        page: number;
        limit: number;
      };
    }>
  > {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          params.append(key, String(value));
        }
      });
    }

    const query = params.toString();
    return this.request(`/api/employees${query ? `?${query}` : ""}`);
  }

  async getEmployee(id: string): Promise<ApiResponse<Employee>> {
    return this.request(`/api/employees/${id}`);
  }

  async updateEmployee(
    id: string,
    employeeData: EmployeeUpdateInput
  ): Promise<ApiResponse<Employee>> {
    return this.request(`/api/employees/${id}`, {
      method: "PUT",
      body: JSON.stringify(employeeData),
    });
  }

  /**
   * Update employee with optional photo via multipart/form-data.
   */
  async updateEmployeeMultipart(
    id: string,
    employeeData: EmployeeUpdateInput,
    photoFile?: File
  ): Promise<ApiResponse<Employee>> {
    const form = new FormData();
    // primitives (send only when defined)
    if (typeof employeeData.name !== "undefined")
      form.append("name", String(employeeData.name));
    if (typeof employeeData.email !== "undefined")
      form.append("email", String(employeeData.email));
    if (typeof employeeData.phone !== "undefined")
      form.append("phone", String(employeeData.phone));
    if (typeof employeeData.category !== "undefined")
      form.append("category", String(employeeData.category));
    if (typeof employeeData.salary !== "undefined")
      form.append("salary", String(employeeData.salary));
    if (typeof employeeData.companyId !== "undefined")
      form.append("companyId", String(employeeData.companyId));
    if (typeof employeeData.status !== "undefined")
      form.append("status", String(employeeData.status));
    if (typeof employeeData.dateJoined !== "undefined")
      form.append(
        "dateJoined",
        typeof employeeData.dateJoined === "string"
          ? employeeData.dateJoined
          : new Date(employeeData.dateJoined).toISOString()
      );

    // nested JSON
    if (typeof employeeData.address !== "undefined")
      form.append("address", JSON.stringify(employeeData.address));
    if (typeof employeeData.documents !== "undefined") {
      const { photo, aadhar, pan, bankAccount, ...restDocs } =
        employeeData.documents || {};
      const docsPayload: Record<string, any> = { ...restDocs };
      if (aadhar) docsPayload.aadhar = aadhar;
      if (pan) docsPayload.pan = pan;
      if (bankAccount) docsPayload.bankAccount = bankAccount;
      form.append("documents", JSON.stringify(docsPayload));
      // flattened copies for validator (non-empty only)
      if (aadhar) form.append("documents.aadhar", String(aadhar));
      if (pan) form.append("documents.pan", String(pan));
      if (bankAccount) {
        if (bankAccount.accountNumber)
          form.append(
            "documents.bankAccount.accountNumber",
            String(bankAccount.accountNumber)
          );
        if (bankAccount.ifscCode)
          form.append(
            "documents.bankAccount.ifscCode",
            String(bankAccount.ifscCode)
          );
        if (bankAccount.bankName)
          form.append(
            "documents.bankAccount.bankName",
            String(bankAccount.bankName)
          );
      }
    }
    if (typeof employeeData.emergencyContact !== "undefined")
      form.append(
        "emergencyContact",
        JSON.stringify(employeeData.emergencyContact)
      );
    if (typeof employeeData.workSchedule !== "undefined")
      form.append("workSchedule", JSON.stringify(employeeData.workSchedule));

    if (photoFile) form.append("photo", photoFile);

    const url = `${this.baseURL}/api/employees/${id}`;
    return fetch(url, {
      method: "PUT",
      headers: {
        Authorization: this.token ? `Bearer ${this.token}` : "",
      },
      body: form,
    }).then((res) => res.json());
  }

  async deleteEmployee(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/api/employees/${id}`, {
      method: "DELETE",
    });
  }

  async getEmployeesByCompany(
    companyId: string,
    status?: string,
    limit?: number
  ): Promise<
    ApiResponse<{
      company: { name: string; location: string };
      employees: Employee[];
      count: number;
    }>
  > {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (limit) params.append("limit", String(limit));

    const query = params.toString();
    return this.request(
      `/api/employees/company/${companyId}${query ? `?${query}` : ""}`
    );
  }

  async updateEmployeeStatus(
    id: string,
    status: "active" | "inactive" | "terminated" | "on-leave"
  ): Promise<ApiResponse<Employee>> {
    return this.request(`/api/employees/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  }

  async searchEmployees(
    query: string,
    companyId?: string,
    limit?: number
  ): Promise<ApiResponse<Employee[]>> {
    const params = new URLSearchParams({ q: query });
    if (companyId) params.append("companyId", companyId);
    if (limit) params.append("limit", String(limit));
    return this.request(`/api/employees/search?${params.toString()}`);
  }

  async getEmployeeStats(companyId?: string): Promise<
    ApiResponse<{
      totalEmployees: number;
      activeEmployees: number;
      inactiveEmployees: number;
      terminatedEmployees: number;
      onLeaveEmployees: number;
      averageSalary: number;
      totalSalaryExpense: number;
    }>
  > {
    const params = companyId ? `?companyId=${companyId}` : "";
    return this.request(`/api/employees/stats${params}`);
  }

  // Invoice API methods
  async processAttendanceFile(formData: FormData): Promise<
    ApiResponse<{
      attendanceData: any[];
    }>
  > {
    const url = `${this.baseURL}/api/invoices/process-attendance`;
    console.log("API Client calling URL:", url);
    return fetch(url, {
      method: "POST",
      headers: {
        Authorization: this.token ? `Bearer ${this.token}` : "",
      },
      body: formData,
    }).then((res) => res.json());
  }

  /**
   * Upload invoice file to Cloudinary
   */
  async uploadInvoiceFile(
    file: File,
    invoiceNumber?: string
  ): Promise<
    ApiResponse<{
      fileUrl: string;
      publicId: string;
      fileName: string;
      fileType: string;
      fileSize: number;
    }>
  > {
    const formData = new FormData();
    formData.append("invoiceFile", file);
    if (invoiceNumber) {
      formData.append("invoiceNumber", invoiceNumber);
    }

    const url = `${this.baseURL}/api/invoices/upload-file`;
    return fetch(url, {
      method: "POST",
      headers: {
        Authorization: this.token ? `Bearer ${this.token}` : "",
      },
      body: formData,
    }).then((res) => res.json());
  }

  async getCompanyInvoices(
    companyId: string,
    filters?: {
      status?: "draft" | "sent" | "paid";
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<
    ApiResponse<{
      invoices: Invoice[];
      pagination: {
        total: number;
        pages: number;
        page: number;
        limit: number;
      };
    }>
  > {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          params.append(key, String(value));
        }
      });
    }

    const query = params.toString();
    return this.request(
      `/api/invoices/company/${companyId}${query ? `?${query}` : ""}`
    );
  }

  async getInvoiceStats(companyId: string): Promise<
    ApiResponse<{
      totalInvoices: number;
      totalAmount: number;
      paidAmount: number;
      pendingAmount: number;
      draftInvoices: number;
      sentInvoices: number;
      paidInvoices: number;
    }>
  > {
    return this.request(`/api/invoices/stats/${companyId}`);
  }

  async getInvoice(id: string): Promise<ApiResponse<Invoice>> {
    return this.request(`/api/invoices/${id}`);
  }

  async updateInvoice(
    id: string,
    invoiceData: Partial<Invoice>
  ): Promise<ApiResponse<Invoice>> {
    return this.request(`/api/invoices/${id}`, {
      method: "PUT",
      body: JSON.stringify(invoiceData),
    });
  }

  async deleteInvoice(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/api/invoices/${id}`, {
      method: "DELETE",
    });
  }

  async createInvoice(invoiceData: {
    companyId: string;
    attendanceData: any[];
    fileUrl?: string;
    cloudinaryPublicId?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    gstPaidBy: string;
    serviceChargeRate: number;
    bonusRate?: number;
    overtimeRate?: number;
    calculatedValues?: {
      totalEmployees: number;
      totalPresentDays: number;
      perDayRate: number;
      baseTotal: number;
      overtimeAmount?: number;
      totalOvertimeDays?: number;
      serviceCharge: number;
      pfAmount: number;
      esicAmount: number;
      bonusAmount?: number;
      subTotal: number;
      totalBeforeTax: number;
      cgst: number;
      sgst: number;
      grandTotal: number;
    };
  }): Promise<ApiResponse<any>> {
    return this.request("/api/invoices/create", {
      method: "POST",
      body: JSON.stringify(invoiceData),
    });
  }

  async getAllInvoices() {
    return this.request("/api/invoices", { method: "GET" });
  }

  // Admin Invoice API methods
  async getAdminInvoices(filters?: {
    status?: string;
    paymentStatus?: string;
    companyId?: string;
    isMerged?: boolean;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }): Promise<
    ApiResponse<{
      invoices: any[];
      pagination: {
        total: number;
        pages: number;
        page: number;
        limit: number;
      };
    }>
  > {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString();
    return this.request(`/api/admin/invoices${query ? `?${query}` : ""}`);
  }

  async getAdminInvoiceStats(): Promise<
    ApiResponse<{
      overall: {
        totalInvoices: number;
        totalAmount: number;
        mergedCount: number;
        regularCount: number;
      };
      byStatus: Array<{ _id: string; count: number; amount: number }>;
      byPaymentStatus: Array<{ _id: string; count: number; amount: number }>;
      byCompany: Array<{
        company: string;
        companyId: string;
        count: number;
        amount: number;
      }>;
      recentMerged: any[];
    }>
  > {
    return this.request("/api/admin/invoices/stats");
  }

  async getInvoicesAvailableForMerge(filters?: {
    companyId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<
    ApiResponse<{
      invoices: any[];
      pagination: {
        total: number;
        pages: number;
        page: number;
        limit: number;
      };
    }>
  > {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString();
    return this.request(
      `/api/admin/invoices/available-for-merge${query ? `?${query}` : ""}`
    );
  }

  async mergeInvoices(
    invoiceIds: string[],
    notes?: string
  ): Promise<
    ApiResponse<{
      mergedInvoice: any;
      sourceInvoiceSummary: Array<{
        id: string;
        invoiceNumber: string;
        company: string;
        totalAmount: number;
      }>;
    }>
  > {
    return this.request("/api/admin/invoices/merge", {
      method: "POST",
      body: JSON.stringify({ invoiceIds, notes }),
    });
  }

  async getMergedInvoices(filters?: {
    status?: string;
    paymentStatus?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }): Promise<
    ApiResponse<{
      invoices: any[];
      pagination: {
        total: number;
        pages: number;
        page: number;
        limit: number;
      };
    }>
  > {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString();
    return this.request(`/api/admin/invoices/merged${query ? `?${query}` : ""}`);
  }

  async getMergedInvoiceDetails(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/admin/invoices/merged/${id}`);
  }

  async deleteMergedInvoice(
    id: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/api/admin/invoices/merged/${id}`, {
      method: "DELETE",
    });
  }

  async downloadAdminInvoice(
    id: string
  ): Promise<
    ApiResponse<{ downloadUrl: string; fileName: string; fileType: string }>
  > {
    return this.request(`/api/admin/invoices/${id}/download`);
  }

  // AI API methods
  async getAiStatus(): Promise<
    ApiResponse<{
      status: string;
      geminiConfigured: boolean;
      supportedFormats: string[];
    }>
  > {
    return this.request("/api/ai/status");
  }

  async uploadFile(formData: FormData): Promise<ApiResponse<any>> {
    return fetch(`${this.baseURL}/api/ai/upload`, {
      method: "POST",
      headers: {
        Authorization: this.token ? `Bearer ${this.token}` : "",
      },
      body: formData,
    }).then((res) => res.json());
  }

  // Salary API methods
  async createBulkSalarySlips(salaryData: {
    companyId: string;
    month: string;
    year: number;
    employees: Array<{
      employeeId: string;
      employeeName?: string;
      basicSalary?: number;
      daysPresent: number;
      totalWorkingDays: number;
      daysAbsent?: number;
      pfPercentage?: number;
      esicPercentage?: number;
      totalSalary?: number;
      overtimeHours?: number;
      hra?: number;
      transport?: number;
      medical?: number;
      special?: number;
      overtime?: number;
      tds?: number;
      professionalTax?: number;
      advance?: number;
      loan?: number;
      penalty?: number;
    }>;
    payPeriod?: {
      startDate: string;
      endDate: string;
    };
  }): Promise<
    ApiResponse<{
      created: number;
      salarySlips: any[];
      errors: string[] | null;
    }>
  > {
    console.log("salaryData");

    console.table(salaryData);
    return this.request("/api/salary/create-bulk", {
      method: "POST",
      body: JSON.stringify(salaryData),
    });
  }

  async getCompanySalarySlips(
    companyId: string,
    filters?: {
      month?: string;
      year?: number;
      status?: "draft" | "approved" | "paid" | "cancelled";
      employeeId?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<
    ApiResponse<{
      salarySlips: any[];
      pagination: {
        total: number;
        pages: number;
        page: number;
        limit: number;
      };
    }>
  > {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          params.append(key, String(value));
        }
      });
    }

    const query = params.toString();
    return this.request(
      `/api/salary/company/${companyId}${query ? `?${query}` : ""}`
    );
  }

  async getSalarySlip(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/salary/${id}`);
  }

  async updateSalarySlip(
    id: string,
    updateData: {
      attendance?: any;
      salary?: any;
      deductions?: any;
      overtimeHours?: number;
      paymentInfo?: any;
      notes?: string;
    }
  ): Promise<ApiResponse<any>> {
    return this.request(`/api/salary/${id}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });
  }

  async approveSalarySlip(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/salary/${id}/approve`, {
      method: "PUT",
    });
  }

  async markSalarySlipPaid(
    id: string,
    paymentData: {
      paymentDate?: string;
      paymentMethod?: "bank-transfer" | "cash" | "cheque" | "upi";
      transactionId?: string;
      bankDetails?: {
        accountNumber?: string;
        ifscCode?: string;
        bankName?: string;
      };
    }
  ): Promise<ApiResponse<any>> {
    return this.request(`/api/salary/${id}/pay`, {
      method: "PUT",
      body: JSON.stringify(paymentData),
    });
  }

  async deleteSalarySlip(
    id: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/api/salary/${id}`, {
      method: "DELETE",
    });
  }

  async getSalaryStats(
    companyId: string,
    filters?: {
      month?: string;
      year?: number;
    }
  ): Promise<
    ApiResponse<{
      totalSlips: number;
      totalPayroll: number;
      totalDeductions: number;
      totalBonus: number;
      averageSalary: number;
      draftCount: number;
      approvedCount: number;
      paidCount: number;
    }>
  > {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          params.append(key, String(value));
        }
      });
    }

    const query = params.toString();
    return this.request(
      `/api/salary/stats/${companyId}${query ? `?${query}` : ""}`
    );
  }

  // Company Folders API methods
  async createCompanyFolder(
    companyId: string,
    folder_name: string
  ): Promise<ApiResponse<CompanyFolder>> {
    return this.request(`/api/company-folders/${companyId}/folders`, {
      method: "POST",
      body: JSON.stringify({ folder_name }),
    });
  }

  async getCompanyFolders(
    companyId: string,
    params?: { page?: number; limit?: number }
  ): Promise<
    ApiResponse<
      { folders: CompanyFolder[]; pagination?: any } | CompanyFolder[]
    >
  > {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (typeof v !== "undefined") qs.append(k, String(v));
      });
    }
    const query = qs.toString();
    return this.request(
      `/api/company-folders/${companyId}/folders${query ? `?${query}` : ""}`
    );
  }

  async getCompanyFolderById(
    companyId: string,
    folderId: string
  ): Promise<ApiResponse<CompanyFolder>> {
    return this.request(
      `/api/company-folders/${companyId}/folders/${folderId}`
    );
  }

  async uploadCompanyFolderFiles(
    companyId: string,
    folderId: string,
    files: File[]
  ): Promise<ApiResponse<CompanyFolder | { files: CompanyFolderFile[] }>> {
    const form = new FormData();
    files.forEach((file) => form.append("files", file));

    const url = `${this.baseURL}/api/company-folders/${companyId}/folders/${folderId}/files`;
    return fetch(url, {
      method: "POST",
      headers: {
        Authorization: this.token ? `Bearer ${this.token}` : "",
      },
      body: form,
    }).then((res) => res.json());
  }

  async renameCompanyFolder(
    companyId: string,
    folderId: string,
    folder_name: string
  ): Promise<ApiResponse<CompanyFolder>> {
    return this.request(
      `/api/company-folders/${companyId}/folders/${folderId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ folder_name }),
      }
    );
  }

  async renameCompanyFolderFile(
    companyId: string,
    folderId: string,
    fileId: string,
    name: string
  ): Promise<ApiResponse<CompanyFolderFile>> {
    return this.request(
      `/api/company-folders/${companyId}/folders/${folderId}/files/${fileId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ name }),
      }
    );
  }

  async deleteCompanyFolder(
    companyId: string,
    folderId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request(
      `/api/company-folders/${companyId}/folders/${folderId}`,
      { method: "DELETE" }
    );
  }

  async deleteCompanyFolderFile(
    companyId: string,
    folderId: string,
    fileId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request(
      `/api/company-folders/${companyId}/folders/${folderId}/files/${fileId}`,
      { method: "DELETE" }
    );
  }

  async downloadCompanyFolderFile(
    companyId: string,
    folderId: string,
    fileId: string
  ): Promise<{ blob: Blob; filename?: string }> {
    const url = `${this.baseURL}/api/company-folders/${companyId}/folders/${folderId}/files/${fileId}/download`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: this.token ? `Bearer ${this.token}` : "",
      },
      redirect: "follow",
    });
    const blob = await res.blob();
    const disposition = res.headers.get("content-disposition") || "";
    const match = /filename=\"?([^\";]+)\"?/i.exec(disposition);
    const filename = match?.[1];
    return { blob, filename };
  }

  // Health check
  async healthCheck(): Promise<
    ApiResponse<{
      status: string;
      message: string;
      timestamp: string;
      environment: string;
    }>
  > {
    return fetch(`${this.baseURL.replace("/api", "")}/health`).then((res) =>
      res.json()
    );
  }
}

export const apiClient = new ApiClient();
export default apiClient;
