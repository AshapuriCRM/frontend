'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Upload, Loader2, CheckCircle, AlertCircle, Users, Download, Eye, Calendar, DollarSign, Trash2, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PDFDownloadLink, Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

interface InvoicePageProps {
  params: { companyId: string };
}

interface AttendanceRecord {
  name: string;
  present_day: number;
  total_day?: number;
  absent_day?: number;
}

interface ProcessedResult {
  extracted_data: AttendanceRecord[];
}

interface RecentInvoice {
  _id?: string;
  id?: string;
  invoiceNumber: string;
  companyId?: {
    name: string;
    _id: string;
  };
  companyName?: string;
  totalAmount?: number;
  billDetails?: {
    totalAmount: number;
  };
  attendanceData?: {
    totalEmployees: number;
    totalPresentDays: number;
    perDayRate: number;
  };
  gstPaidBy?: 'principal-employer' | 'ashapuri';
  serviceChargeRate?: number;
  status: 'draft' | 'sent' | 'paid';
  createdAt: string;
  employeeCount?: number;
}

export default function InvoicePage({ params }: InvoicePageProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [billTo, setBillTo] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [company, setCompany] = useState<any>(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState(true);
  const [gstPaidBy, setGstPaidBy] = useState('principal-employer');
  const [serviceChargeRate, setServiceChargeRate] = useState(7);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<RecentInvoice | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeletingInvoice, setIsDeletingInvoice] = useState<string | null>(null);
  const [existingEmployeeNames, setExistingEmployeeNames] = useState<Set<string>>(new Set());
  const [isCheckingEmployees, setIsCheckingEmployees] = useState(false);

  // Fetch company data when component mounts
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const response = await apiClient.getCompany(params.companyId);
        if (response.success && response.data) {
          setCompany(response.data);
          setBillTo(response.data.name); // Auto-set the bill to company name
        }
      } catch (error) {
        console.error('Failed to fetch company:', error);
      } finally {
        setIsLoadingCompany(false);
      }
    };

    fetchCompany();
  }, [params.companyId]);

  // Fetch recent invoices when component mounts
  useEffect(() => {
    const fetchRecentInvoices = async () => {
      try {
        setIsLoadingInvoices(true);
        const response = await apiClient.getCompanyInvoices(params.companyId, { limit: 5 });
        console.log('API Response:', response);
        if (response.success && response.data?.invoices) {
          console.log('Invoices received:', response.data.invoices);
          setRecentInvoices(response.data.invoices);
        }
      } catch (error) {
        console.error('Failed to fetch recent invoices:', error);
        // Don't show error to user, just log it
      } finally {
        setIsLoadingInvoices(false);
      }
    };

    fetchRecentInvoices();
  }, [params.companyId]);

  // Create invoice when PDF is downloaded
  const handleCreateInvoice = async () => {
    if (!result?.extracted_data) return;

    try {
      // Calculate the same values as shown in the frontend tables
      const totalPresentDays = result.extracted_data.reduce((sum, emp) => sum + emp.present_day, 0);
      const perDay = 466;
      const baseTotal = totalPresentDays * perDay;
      const serviceCharge = baseTotal * (serviceChargeRate / 100);
      const pf = baseTotal * 0.13;
      const esic = baseTotal * 0.0325;
      const subTotal = baseTotal + pf + esic;
      const roundOffSubTotal = Math.round(subTotal);
      const serviceChargeTotal = serviceCharge;
      const totalBeforeTax = roundOffSubTotal + serviceChargeTotal;
      const cgst = totalBeforeTax * 0.09;
      const sgst = totalBeforeTax * 0.09;
      const grandTotal = gstPaidBy === 'ashapuri' 
        ? Math.round(totalBeforeTax + cgst + sgst)
        : Math.round(totalBeforeTax);

      // Create the exact payload with calculated values
      const invoicePayload = {
        companyId: params.companyId,
        attendanceData: result.extracted_data,
        gstPaidBy: gstPaidBy,
        serviceChargeRate: serviceChargeRate,
        calculatedValues: {
          totalEmployees: result.extracted_data.length,
          totalPresentDays: totalPresentDays,
          perDayRate: perDay,
          baseTotal: baseTotal,
          serviceCharge: serviceChargeTotal,
          pfAmount: pf,
          esicAmount: esic,
          subTotal: roundOffSubTotal,
          totalBeforeTax: totalBeforeTax,
          cgst: cgst,
          sgst: sgst,
          grandTotal: grandTotal
        }
      };

      const response = await apiClient.createInvoice(invoicePayload);

      if (response.success) {
        // Refresh recent invoices after creating invoice
        try {
          const invoicesResponse = await apiClient.getCompanyInvoices(params.companyId, { limit: 5 });
          if (invoicesResponse.success && invoicesResponse.data?.invoices) {
            setRecentInvoices(invoicesResponse.data.invoices);
          }
        } catch (error) {
          console.error('Failed to refresh recent invoices:', error);
        }
      }
    } catch (error) {
      console.error('Failed to create invoice:', error);
    }
  };

  // Delete invoice function
  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeletingInvoice(invoiceId);
      const response = await apiClient.deleteInvoice(invoiceId);
      
      if (response.success) {
        // Remove the invoice from the local state
        setRecentInvoices(prev => prev.filter(invoice => 
          (invoice._id || invoice.id) !== invoiceId
        ));
        
        // Show success message could be added here
      } else {
        throw new Error(response.error || 'Failed to delete invoice');
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Failed to delete invoice. Please try again.');
    } finally {
      setIsDeletingInvoice(null);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('attendanceFile', file);
      formData.append('companyId', params.companyId);

      const response = await apiClient.processAttendanceFile(formData);
      console.log('API Response:', response);
      
      if (response.success) {
        setResult({ extracted_data: response.data.attendanceData });
      } else {
        throw new Error(response.error || 'Processing failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  // Normalize name for comparison
  const normalizeName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

  // After results load, fetch company employees once and build a fast lookup set
  useEffect(() => {
    const fetchEmployeesForCheck = async () => {
      if (!result?.extracted_data?.length) {
        setExistingEmployeeNames(new Set());
        return;
      }
      try {
        setIsCheckingEmployees(true);
        const response = await apiClient.getEmployeesByCompany(params.companyId, 'active', 5000);
        if (response.success && response.data?.employees) {
          const nameSet = new Set<string>();
          response.data.employees.forEach((emp: any) => {
            if (emp?.name) {
              nameSet.add(normalizeName(emp.name));
            }
          });
          setExistingEmployeeNames(nameSet);
        }
      } catch (err) {
        console.error('Failed to fetch employees for existence check:', err);
      } finally {
        setIsCheckingEmployees(false);
      }
    };

    fetchEmployeesForCheck();
  }, [params.companyId, result?.extracted_data]);

  // Convert grand total to words
  const numberToWords = (num: number) => {
    const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const thousands = ["", "Thousand", "Lakh", "Crore"];

    if (num === 0) return "Zero";

    const convertLessThanThousand = (n: number): string => {
      if (n === 0) return "";
      if (n < 10) return units[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return `${tens[Math.floor(n / 10)]} ${units[n % 10]}`.trim();
      return `${units[Math.floor(n / 100)]} Hundred ${convertLessThanThousand(n % 100)}`.trim();
    };

    let result = "";
    let place = 0;
    while (num > 0) {
      if (num % 1000 !== 0) {
        let part = convertLessThanThousand(num % 1000);
        if (place > 0) part += ` ${thousands[place]}`;
        result = `${part} ${result}`.trim();
      }
      num = Math.floor(num / 1000);
      place++;
    }
    return `${result} Rupees Only`.toUpperCase();
  };

  // Professional PDF Styles (matching original invoice generator)
  const styles = StyleSheet.create({
    page: {
      padding: 0,
      fontSize: 10,
      fontFamily: "Helvetica",
      backgroundColor: "#fff",
    },
    container: {
      maxWidth: 800,
      margin: 10,
      borderWidth: 2,
      borderColor: "#000",
    },
    header: {
      flexDirection: "column",
      padding: 5,
      borderBottomWidth: 2,
      borderColor: "#000",
    },
    companyName: {
      fontSize: 18,
      fontWeight: "bold",
      textAlign: "center",
      letterSpacing: 2,
      marginBottom: 5,
    },
    invoiceTitle: {
      backgroundColor: "#000",
      color: "#fff",
      textAlign: "center",
      padding: 5,
      fontSize: 14,
      fontWeight: "bold",
      letterSpacing: 3,
    },
    invoiceDetails: {
      flexDirection: "row",
      borderBottomWidth: 2,
      borderColor: "#000",
    },
    clientInfo: {
      flex: 2,
      padding: 5,
      borderRightWidth: 2,
      borderColor: "#000",
    },
    invoiceMeta: {
      flex: 1,
      padding: 5,
    },
    metaRow: {
      flexDirection: "row",
    },
    metaCell: {
      borderWidth: 1,
      borderColor: "#000",
      padding: 4,
      fontSize: 10,
      width: "50%",
    },
    metaCellHeader: {
      fontWeight: "bold",
      backgroundColor: "#f0f0f0",
    },
    itemsTable: {
      width: "100%",
      borderCollapse: "collapse",
      marginBottom: 0,
    },
    tableRow: {
      flexDirection: "row",
    },
    tableCell: {
      borderWidth: 1,
      borderColor: "#000",
      padding: 4,
      textAlign: "center",
      fontSize: 10,
      flex: 1,
    },
    tableCellLeft: {
      textAlign: "left",
    },
    tableHeader: {
      backgroundColor: "#f0f0f0",
      fontWeight: "bold",
    },
    totalsSection: {
      flexDirection: "row",
      borderTopWidth: 2,
      borderColor: "#000",
    },
    calculations: {
      flex: 1,
      padding: 5,
      borderRightWidth: 2,
      borderColor: "#000",
    },
    totals: {
      flex: 1,
      padding: 5,
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 3,
      fontSize: 10,
    },
    totalRowGrand: {
      fontWeight: "bold",
      fontSize: 12,
      borderTopWidth: 2,
      borderColor: "#000",
      paddingTop: 3,
    },
    gstSection: {
      marginTop: 8,
      padding: 5,
      borderWidth: 1,
      borderColor: "#000",
      fontSize: 9,
    },
    bankDetails: {
      marginTop: 5,
      fontSize: 9,
      lineHeight: 1.2,
    },
    grandTotalSection: {
      backgroundColor: "#f0f0f0",
      padding: 5,
      borderWidth: 2,
      borderColor: "#000",
      textAlign: "center",
      fontWeight: "bold",
      fontSize: 14,
      marginBottom: 5,
    },
    amountWords: {
      marginTop: 5,
      fontSize: 10,
      fontWeight: "bold",
    },
    footerInfo: {
      marginTop: 5,
      padding: 5,
      fontSize: 8,
      lineHeight: 1.2,
    },
    signatureSection: {
      textAlign: "right",
      marginTop: 10,
      paddingRight: 5,
      fontSize: 10,
      fontWeight: "bold",
    },
  });

  // Professional Invoice PDF Component
  const InvoicePDF = ({ totalEmployees, totalPresentDays, perDay, billTo, extractedData, gstPaidBy, serviceChargeRate }: {
    totalEmployees: number;
    totalPresentDays: number;
    perDay: number;
    billTo: string;
    extractedData: AttendanceRecord[];
    gstPaidBy: string;
    serviceChargeRate: number;
  }) => {
    // Calculate values (using dynamic service charge rate)
    const SERVICE_CHARGE_RATE = serviceChargeRate / 100;
    const PF_RATE = 0.13;
    const ESIC_RATE = 0.0325;
    const CGST_RATE = 0.09;
    const SGST_RATE = 0.09;

    const today = new Date();
    const dateStr = today
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .split("/")
      .join("/");
    const invoiceNumber = `INV${today.getFullYear()}${String(
      today.getMonth() + 1
    ).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}${Math.floor(
      100 + Math.random() * 900
    )}`;
    const monthOf = today
      .toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      })
      .toUpperCase();

    const baseTotal = Number(totalPresentDays) * Number(perDay);
    const serviceCharge = baseTotal * SERVICE_CHARGE_RATE;
    const pf = baseTotal * PF_RATE;
    const esic = baseTotal * ESIC_RATE;
    const subTotal = baseTotal + pf + esic;
    const roundOffSubTotal = Math.round(subTotal);
    const serviceChargeTotal = serviceCharge;
    const totalBeforeTax = roundOffSubTotal + serviceChargeTotal;
    const cgst = totalBeforeTax * CGST_RATE;
    const sgst = totalBeforeTax * SGST_RATE;
    
    // Only add GST to total if Ashapuri pays GST
    const grandTotal = gstPaidBy === 'ashapuri' 
      ? Math.round(totalBeforeTax + cgst + sgst)
      : Math.round(totalBeforeTax);

    const grandTotalInWords = numberToWords(grandTotal);

    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.companyName}>ASHAPURI SECURITY SERVICES</Text>
            </View>
            {/* Invoice Title */}
            <View style={styles.invoiceTitle}>
              <Text>INVOICE</Text>
            </View>
            {/* Invoice Details */}
            <View style={styles.invoiceDetails}>
              <View style={styles.clientInfo}>
                <Text style={{ fontWeight: "bold" }}>
                  {billTo || "M/S EXECUTIVE ENGINEER"}
                </Text>
                <Text>MPPICL 400 KV TESTING DIVISION</Text>
                <Text>PITHAMPUR ORDER No.</Text>
                <Text>2307000 ACL W&W/TS-45/2023/3786</Text>
                <Text>GSTIN NO 23AADCM4432C1Z3</Text>
              </View>
              <View style={styles.invoiceMeta}>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaCell, styles.metaCellHeader]}>
                    INVOICE NO.
                  </Text>
                  <Text style={styles.metaCell}>{invoiceNumber}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaCell, styles.metaCellHeader]}>
                    DATE
                  </Text>
                  <Text style={styles.metaCell}>{dateStr}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaCell, styles.metaCellHeader]}>
                    MONTH OF
                  </Text>
                  <Text style={styles.metaCell}>{monthOf}</Text>
                </View>
              </View>
            </View>
            {/* Items Table */}
            <View style={styles.itemsTable}>
              <View style={styles.tableRow}>
                <Text
                  style={[styles.tableCell, styles.tableHeader, { flex: 0.5 }]}
                >
                  S. NO.
                </Text>
                <Text style={[styles.tableCell, styles.tableHeader, { flex: 2 }]}>
                  DESCRIPTION
                </Text>
                <Text style={[styles.tableCell, styles.tableHeader]}>SAC</Text>
                <Text style={[styles.tableCell, styles.tableHeader]}>
                  NO. OF MAN DAYS/MONTH
                </Text>
                <Text style={[styles.tableCell, styles.tableHeader]}>RATE</Text>
                <Text style={[styles.tableCell, styles.tableHeader]}>AMOUNT</Text>
              </View>
              <View style={styles.tableRow}>
                <Text
                  style={[
                    styles.tableCell,
                    { flex: 6, textAlign: "left", fontWeight: "bold" },
                  ]}
                >
                  UNARMED GUARD (unskilled)
                </Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 0.5 }]}>1</Text>
                <Text
                  style={[styles.tableCell, styles.tableCellLeft, { flex: 2 }]}
                >
                  SECURITY SERVICES
                </Text>
                <Text style={styles.tableCell}>998514</Text>
                <Text style={styles.tableCell}>{totalPresentDays}</Text>
                <Text style={styles.tableCell}>{Number(perDay).toFixed(2)}</Text>
                <Text style={styles.tableCell}>{baseTotal.toFixed(2)}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text
                  style={[
                    styles.tableCell,
                    { flex: 5, textAlign: "right", fontWeight: "bold" },
                  ]}
                >
                  TOTAL
                </Text>
                <Text style={styles.tableCell}>{baseTotal.toFixed(2)}</Text>
              </View>
            </View>
            {/* Totals Section */}
            <View style={styles.totalsSection}>
              <View style={styles.calculations}>
                <Text>PF @13%</Text>
                <Text>ESIC @3.25%</Text>
                <Text style={{ marginTop: 5, fontWeight: "bold" }}>
                  SUB TOTAL
                </Text>
                <Text style={{ marginTop: 5 }}>Service charge @{serviceChargeRate}%</Text>
              </View>
              <View style={styles.totals}>
                <View style={styles.totalRow}>
                  <Text></Text>
                  <Text>{pf.toFixed(2)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text></Text>
                  <Text>{esic.toFixed(2)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text>TOTAL</Text>
                  <Text>{subTotal.toFixed(2)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text></Text>
                  <Text>{serviceChargeTotal.toFixed(2)}</Text>
                </View>
                <View style={[styles.totalRow, styles.totalRowGrand]}>
                  <Text>TOTAL</Text>
                  <Text>{totalBeforeTax.toFixed(2)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text>CGST @9%</Text>
                  <Text>{cgst.toFixed(2)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text>SGST @9%</Text>
                  <Text>{sgst.toFixed(2)}</Text>
                </View>
              </View>
            </View>
            {/* GST Section */}
            <View style={styles.gstSection}>
              <Text style={{ fontWeight: "bold" }}>
                Note:- As per Notification no. 29/2018 dated 31.12.2018
              </Text>
              <Text style={{ fontWeight: "bold" }}>
                {gstPaidBy === 'principal-employer' 
                  ? '100% GST paid directly by you' 
                  : '100% GST paid by Ashapuri Security Services'
                }
              </Text>
              <View style={styles.bankDetails}>
                <Text style={{ fontWeight: "bold" }}>PUNJAB NATIONAL BANK</Text>
                <Text>Pls Transfer Payment C/A 0788101000960</Text>
                <Text>IFSC CODE : PUNB0078810</Text>
                <Text>SCH. NO. 54, VIJAY NAGAR, INDORE</Text>
              </View>
            </View>
            {/* Grand Total */}
            <View style={styles.grandTotalSection}>
              <Text style={{ fontSize: 16, marginBottom: 5 }}>
                GRAND TOTAL {grandTotal}
              </Text>
              <Text style={styles.amountWords}>{grandTotalInWords}</Text>
            </View>
            {/* Footer */}
            <View style={styles.footerInfo}>
              <Text>
                <Text style={{ fontWeight: "bold" }}>
                  GSTIN. NO. :23ADCPC7046H1ZZ PAN NO. : ADCPC7046H
                </Text>
              </Text>
              <Text style={{ marginTop: 5 }}>
                *Monthly Includes Reliever engaged for providing weekly off and
                leaves allowed for .... Nos. Mandays during the period. It is to
                be certified under oath that I have completed the above mentioned
                work as per terms & conditions given in the order. I have
                completed the statutory requirements viz.payments of minimum wages
                deposit of EPF and ESIC as mandated in transport rules under ACL
                payment sheet.the payment of wages made to employees,deposit of
                employees contribution deducted from salary and deposit of
                contribution of employer (both)for EPF and ESIC as given in the
                payment sheet enclosed for M/o ..... has been deposited in the
                account of employees. I have not claimed above bill previously. In
                case any information given above is found false/ incorrect the
                MPPTCL may take any action as deem fit and may also recover any
                excess amount so paid from me with interest and/or otherwise
                adjust from any amount due to me
              </Text>
            </View>
            <View style={styles.signatureSection}>
              <Text>FOR ASHAPURI SECURITY SERVICES</Text>
            </View>
          </View>
        </Page>
      </Document>
    );
  };

  const getSupportedFormats = () => [
    'PDF files (.pdf)',
    'Excel files (.xlsx, .xls)', 
    'Image files (.jpg, .jpeg, .png)'
  ];

  const formatCurrency = (amount: number | string | null | undefined) => {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || amount === null || amount === undefined) {
      return '₹0';
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };


  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'sent':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Show loading state when initial data is loading
  if (isLoadingCompany && isLoadingInvoices) {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <div className="flex gap-4">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">AI Invoice Generator</h1>
        <p className="text-muted-foreground text-base">
          Upload attendance documents to extract employee data automatically
        </p>
      </div>

      {/* Top Row - Invoice Details and File Upload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice Details */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="bill-to">Bill To (Company Name) *</Label>
                {isLoadingCompany ? (
                  <div className="mt-1 h-10 bg-gray-100 animate-pulse rounded-md"></div>
                ) : (
                  <Input
                    id="bill-to"
                    type="text"
                    value={billTo}
                    onChange={(e) => setBillTo(e.target.value)}
                    placeholder="Enter client company name"
                    className="mt-1"
                  />
                )}
                <p className="text-sm text-gray-600 mt-1">
                  {isLoadingCompany 
                    ? "Loading company information..." 
                    : company 
                      ? `Auto-filled with "${company.name}". You can edit if needed.`
                      : "This will appear on the generated invoice"
                  }
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gst-paid-by">GST Paid by *</Label>
                  <Select value={gstPaidBy} onValueChange={setGstPaidBy}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select who pays GST" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="principal-employer">Principal Employer</SelectItem>
                      <SelectItem value="ashapuri">Ashapuri</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-600 mt-1">
                    This will determine GST calculation and display on the invoice
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="service-charge">Service Charge (%) *</Label>
                  <Input
                    id="service-charge"
                    type="number"
                    value={serviceChargeRate}
                    onChange={(e) => setServiceChargeRate(Number(e.target.value))}
                    placeholder="Enter service charge percentage"
                    className="mt-1"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Service charge percentage to be applied on the base amount
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Upload Section */}
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Attendance Document
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload">Select File</Label>
            <Input
              id="file-upload"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png"
              className="cursor-pointer"
            />
            <div className="text-sm text-muted-foreground">
              Supported formats: {getSupportedFormats().join(', ')}
            </div>
          </div>

          {file && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">{file.name}</span>
              <Badge variant="secondary">{(file.size / 1024 / 1024).toFixed(2)} MB</Badge>
            </div>
          )}

          <Button 
            onClick={handleUpload} 
            disabled={!file || isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing with AI...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Process Document
              </>
            )}
          </Button>
        </CardContent>
      </Card>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results Display */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Extracted Attendance Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.extracted_data && result.extracted_data.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Found {result.extracted_data.length} employee records
                    </span>
                  </div>
                  <PDFDownloadLink
                    document={<InvoicePDF 
                      totalEmployees={result.extracted_data.length}
                      totalPresentDays={result.extracted_data.reduce((sum, emp) => sum + emp.present_day, 0)}
                      perDay={466}
                      billTo={billTo || company?.name || 'Company'}
                      extractedData={result.extracted_data}
                      gstPaidBy={gstPaidBy}
                      serviceChargeRate={serviceChargeRate}
                    />}
                    fileName={`${billTo || company?.name || "invoice"}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}.pdf`}
                    className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md"
                    onClick={handleCreateInvoice}
                  >
                    {({ loading }) => (
                      loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Preparing PDF...
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 mr-2" />
                          Download Invoice PDF
                        </>
                      )
                    )}
                  </PDFDownloadLink>
                </div>

                {/* Results Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Employee Attendance Data */}
                  <Card className="lg:col-span-1">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Employee Attendance ({result.extracted_data.length} employees)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="px-3 py-2 text-left text-sm font-medium">Employee</th>
                              <th className="px-3 py-2 text-center text-sm font-medium">Present</th>
                              <th className="px-3 py-2 text-center text-sm font-medium">Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.extracted_data.map((record, index) => {
                              const totalDays = record.total_day || record.absent_day || 0;
                              const attendanceRate = totalDays > 0 ? 
                                ((record.present_day / totalDays) * 100).toFixed(1) : 'N/A';
                              
                              const nameExists = existingEmployeeNames.has(normalizeName(record.name || ''));
                              return (
                                <tr key={index} className="border-b hover:bg-muted/30 transition-colors">
                                  <td className="px-3 py-3">
                                    <div className="flex items-start gap-2">
                                      {!nameExists && (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className="inline-flex items-center justify-center mt-0.5">
                                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p className="text-sm">Employee "{record.name}" not found in database</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      )}
                                      <p className="font-medium text-sm">{record.name}</p>
                                      <div className="flex gap-1 mt-1">
                                        {record.total_day && (
                                          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                            Total: {record.total_day}
                                          </Badge>
                                        )}
                                        {record.absent_day && (
                                          <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                                            Absent: {record.absent_day}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    <Badge variant="outline" className="font-semibold">
                                      {record.present_day}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    {attendanceRate !== 'N/A' && (
                                      <Badge 
                                        variant={parseFloat(attendanceRate) >= 80 ? "default" : "destructive"}
                                        className="text-xs"
                                      >
                                        {attendanceRate}%
                                      </Badge>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Invoice Calculations */}
                  <Card className="lg:col-span-1">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Invoice Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {(() => {
                          const totalPresentDays = result.extracted_data.reduce((sum, emp) => sum + emp.present_day, 0);
                          const perDay = 466;
                          const baseTotal = totalPresentDays * perDay;
                          const serviceCharge = baseTotal * (serviceChargeRate / 100);
                          const pf = baseTotal * 0.13;
                          const esic = baseTotal * 0.0325;
                          const subTotal = baseTotal + pf + esic;
                          const roundOffSubTotal = Math.round(subTotal);
                          const serviceChargeTotal = serviceCharge;
                          const totalBeforeTax = roundOffSubTotal + serviceChargeTotal;
                          const cgst = totalBeforeTax * 0.09;
                          const sgst = totalBeforeTax * 0.09;
                          const grandTotal = gstPaidBy === 'ashapuri' 
                            ? Math.round(totalBeforeTax + cgst + sgst)
                            : Math.round(totalBeforeTax);

                          return (
                            <>
                              {/* Basic Calculations */}
                              <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border dark:border-blue-800 backdrop-blur-sm">
                                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3">Basic Calculation</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span>Base Amount ({totalPresentDays} days × ₹{perDay})</span>
                                    <span className="font-medium">₹{baseTotal.toLocaleString('en-IN')}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>PF @ 13%</span>
                                    <span>₹{pf.toLocaleString('en-IN', {maximumFractionDigits: 2})}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>ESIC @ 3.25%</span>
                                    <span>₹{esic.toLocaleString('en-IN', {maximumFractionDigits: 2})}</span>
                                  </div>
                                  <div className="flex justify-between border-t pt-2 font-medium">
                                    <span>Sub Total</span>
                                    <span>₹{roundOffSubTotal.toLocaleString('en-IN')}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Service & Tax */}
                              <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg border dark:border-purple-800 backdrop-blur-sm">
                                <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-3">Service & Tax</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span>Service Charge @ {serviceChargeRate}%</span>
                                    <span>₹{serviceChargeTotal.toLocaleString('en-IN', {maximumFractionDigits: 2})}</span>
                                  </div>
                                  <div className="flex justify-between border-t pt-2 font-medium">
                                    <span>Total Before Tax</span>
                                    <span>₹{totalBeforeTax.toLocaleString('en-IN', {maximumFractionDigits: 2})}</span>
                                  </div>
                                </div>
                              </div>

                              {/* GST Section */}
                              <div className={`p-4 rounded-lg border ${gstPaidBy === 'principal-employer' ? 'bg-orange-50 dark:bg-orange-900/30 dark:border-orange-800' : 'bg-green-50 dark:bg-green-900/30 dark:border-green-800'}`}>
                                <h4 className={`font-medium mb-3 ${gstPaidBy === 'principal-employer' ? 'text-orange-900 dark:text-orange-100' : 'text-green-900 dark:text-green-100'}`}>
                                  GST ({gstPaidBy === 'principal-employer' ? 'Paid by PE' : 'Paid by Ashapuri'})
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span>CGST @ 9%</span>
                                    <span className={gstPaidBy === 'principal-employer' ? 'text-orange-600 dark:text-orange-300' : 'dark:text-green-200'}>
                                      {gstPaidBy === 'ashapuri' ? `₹${cgst.toLocaleString('en-IN', {maximumFractionDigits: 2})}` : '— (PE pays)'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>SGST @ 9%</span>
                                    <span className={gstPaidBy === 'principal-employer' ? 'text-orange-600 dark:text-orange-300' : 'dark:text-green-200'}>
                                      {gstPaidBy === 'ashapuri' ? `₹${sgst.toLocaleString('en-IN', {maximumFractionDigits: 2})}` : '— (PE pays)'}
                                    </span>
                                  </div>
                                  {gstPaidBy === 'principal-employer' && (
                                    <div className="flex justify-between text-orange-700 dark:text-orange-300 text-xs italic pt-1">
                                      <span>GST Amount (for PE)</span>
                                      <span>₹{(cgst + sgst).toLocaleString('en-IN', {maximumFractionDigits: 2})}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Grand Total */}
                              <div className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-emerald-900/40 dark:to-green-900/40 p-4 rounded-lg border-2 border-green-300 dark:border-emerald-800">
                                <div className="flex justify-between items-center">
                                  <span className="text-lg font-bold text-green-800 dark:text-emerald-200">GRAND TOTAL</span>
                                  <span className="text-2xl font-bold text-green-700 dark:text-emerald-100">
                                    ₹{grandTotal.toLocaleString('en-IN')}
                                  </span>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Data Found</h3>
                <p className="text-muted-foreground">
                  Could not extract attendance data from the uploaded document.
                  Please ensure the document contains attendance information in a recognizable format.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Invoices Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingInvoices ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
                    <div className="space-y-2">
                      <div className="w-32 h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="w-24 h-3 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                  <div className="w-20 h-6 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          ) : recentInvoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Invoice</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Employees</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((invoice, index) => (
                    <tr key={invoice._id || invoice.id || index} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{invoice.invoiceNumber}</p>
                            <p className="text-sm text-gray-500 truncate max-w-32">
                              {invoice.companyId?.name || invoice.companyName || company?.name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {formatDate(invoice.createdAt)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            {formatCurrency(invoice.billDetails?.totalAmount)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge className={getStatusColor(invoice.status)}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {invoice.attendanceData?.totalEmployees || invoice.employeeCount || 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setIsViewModalOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                          <button
                            className="p-1 rounded-md hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                            onClick={() => handleDeleteInvoice(invoice._id || invoice.id || '')}
                            disabled={isDeletingInvoice === (invoice._id || invoice.id)}
                            title="Delete invoice"
                          >
                            {isDeletingInvoice === (invoice._id || invoice.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices yet</h3>
              <p className="text-gray-500">
                Generate your first invoice by uploading an attendance document above.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions - Compact Layout */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Quick Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600 bg-blue-100 rounded-full w-6 h-6 flex items-center justify-center text-xs">1</span>
              <span>Upload attendance document</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-green-600 bg-green-100 rounded-full w-6 h-6 flex items-center justify-center text-xs">2</span>
              <span>AI extracts employee data</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-purple-600 bg-purple-100 rounded-full w-6 h-6 flex items-center justify-center text-xs">3</span>
              <span>Review extracted data</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-orange-600 bg-orange-100 rounded-full w-6 h-6 flex items-center justify-center text-xs">4</span>
              <span>Download invoice PDF</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice View Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice Details
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Invoice Number</Label>
                  <p className="text-lg font-semibold">{selectedInvoice.invoiceNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(selectedInvoice.status)}>
                      {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Company</Label>
                  <p className="text-base">{selectedInvoice.companyId?.name || selectedInvoice.companyName || company?.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Date Created</Label>
                  <p className="text-base">{formatDate(selectedInvoice.createdAt)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Total Amount</Label>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedInvoice.billDetails?.totalAmount)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Employees</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-base">{selectedInvoice.attendanceData?.totalEmployees || selectedInvoice.employeeCount || 0} employees</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                  Close
                </Button>
                <Button 
                  className="flex items-center gap-2"
                  onClick={() => {
                    // Future enhancement: Generate and download PDF for this specific invoice
                    alert('PDF download functionality will be implemented for individual invoices');
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}