"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, Loader2, Users, DollarSign } from "lucide-react";
import { pdf } from "@react-pdf/renderer";

import { InvoiceDetailsSection } from "./components/InvoiceDetailsSection";
import { FileUploadSection } from "./components/FileUploadSection";
import { ResultsDisplay } from "./components/ResultsDisplay";
import { RecentInvoicesSection } from "./components/RecentInvoicesSection";
import { InvoicePDF } from "./components/InvoicePDF";
import { formatCurrency, formatDate, normalizeName, getStatusColor } from "./utils/index";
import type { ProcessedResult, RecentInvoice } from "./types";

interface InvoicePageProps {
  params: { companyId: string };
}

export default function InvoicePage({ params }: InvoicePageProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [billTo, setBillTo] = useState("");
  const [company, setCompany] = useState<any>(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState(true);
  const [gstPaidBy, setGstPaidBy] = useState("principal-employer");
  const [serviceChargeRate, setServiceChargeRate] = useState(7);
  const [bonusRate, setBonusRate] = useState(0);
  const [overtimeRate, setOvertimeRate] = useState(699);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<RecentInvoice | null>(
    null
  );
  const [fullInvoiceData, setFullInvoiceData] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isLoadingInvoiceDetails, setIsLoadingInvoiceDetails] = useState(false);
  const [isDeletingInvoice, setIsDeletingInvoice] = useState<string | null>(
    null
  );
  const [existingEmployeeNames, setExistingEmployeeNames] = useState<
    Set<string>
  >(new Set());
  const [isCheckingEmployees, setIsCheckingEmployees] = useState(false);

  // Fetch company data
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const response = await apiClient.getCompany(params.companyId);
        if (response.success && response.data) {
          setCompany(response.data);
          setBillTo(response.data.name); // Auto-set the bill to company name
        }
      } catch (error) {
        console.error("Failed to fetch company:", error);
      } finally {
        setIsLoadingCompany(false);
      }
    };

    fetchCompany();
  }, [params.companyId]);

  // Fetch recent invoices
  useEffect(() => {
    const fetchRecentInvoices = async () => {
      try {
        setIsLoadingInvoices(true);
        const response = await apiClient.getCompanyInvoices(params.companyId, {
          limit: 5,
        });
        if (response.success && response.data?.invoices) {
          setRecentInvoices(response.data.invoices);
        }
      } catch (error) {
        console.error("Failed to fetch recent invoices:", error);
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
      // Calculate regular and overtime days from manual inputs
      const totalRegularDays = result.extracted_data.reduce((sum, emp) => sum + emp.present_day, 0);
      const totalOvertimeDays = result.extracted_data.reduce((sum, emp) => sum + (emp.overtime_days || 0), 0);

      const perDay = 466;
      const baseTotal = totalRegularDays * perDay;
      const overtimeAmount = totalOvertimeDays * overtimeRate;
      const totalWithOvertime = baseTotal + overtimeAmount;

      // Apply PF, ESIC, and Bonus on the total (base + overtime)
      const pf = totalWithOvertime * 0.13;
      const esic = totalWithOvertime * 0.0325;
      const bonus = totalWithOvertime * (bonusRate / 100);
      const subTotal = totalWithOvertime + pf + esic + bonus;
      const roundOffSubTotal = Math.round(subTotal);
      const serviceCharge = roundOffSubTotal * (serviceChargeRate / 100);
      const serviceChargeTotal = serviceCharge;
      const totalBeforeTax = roundOffSubTotal + serviceChargeTotal;
      const cgst = totalBeforeTax * 0.09;
      const sgst = totalBeforeTax * 0.09;
      const grandTotal =
        gstPaidBy === "ashapuri"
          ? Math.round(totalBeforeTax + cgst + sgst)
          : Math.round(totalBeforeTax);

      // Generate a temporary invoice number for the PDF file
      const year = new Date().getFullYear();
      const tempInvoiceNumber = `INV-${year}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`;

      // Generate PDF as Blob
      const headerImageUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/images/invoice_header.jpeg`
        : '/images/invoice_header.jpeg';

      const pdfDoc = (
        <InvoicePDF
          totalEmployees={result.extracted_data.length}
          totalPresentDays={result.extracted_data.reduce((sum, emp) => sum + emp.present_day, 0)}
          perDay={perDay}
          billTo={billTo || company?.name || "Company"}
          extractedData={result.extracted_data}
          gstPaidBy={gstPaidBy}
          serviceChargeRate={serviceChargeRate}
          bonusRate={bonusRate}
          overtimeRate={overtimeRate}
          headerImageUrl={headerImageUrl}
        />
      );

      const blob = await pdf(pdfDoc).toBlob();
      const pdfFile = new File([blob], `${tempInvoiceNumber}.pdf`, { type: "application/pdf" });

      // Upload PDF to Cloudinary
      const uploadResponse = await apiClient.uploadInvoiceFile(pdfFile, tempInvoiceNumber);

      if (!uploadResponse.success || !uploadResponse.data) {
        throw new Error("Failed to upload invoice file to Cloudinary");
      }

      // Create the exact payload with calculated values and Cloudinary file data
      const invoicePayload = {
        companyId: params.companyId,
        attendanceData: result.extracted_data,
        fileUrl: uploadResponse.data.fileUrl,
        cloudinaryPublicId: uploadResponse.data.publicId,
        fileName: uploadResponse.data.fileName,
        fileType: uploadResponse.data.fileType,
        fileSize: uploadResponse.data.fileSize,
        gstPaidBy: gstPaidBy,
        serviceChargeRate: serviceChargeRate,
        bonusRate: bonusRate,
        overtimeRate: overtimeRate,
        calculatedValues: {
          totalEmployees: result.extracted_data.length,
          totalPresentDays: totalRegularDays + totalOvertimeDays,
          perDayRate: perDay,
          baseTotal: baseTotal,
          overtimeAmount: overtimeAmount,
          totalOvertimeDays: totalOvertimeDays,
          serviceCharge: serviceChargeTotal,
          pfAmount: pf,
          esicAmount: esic,
          bonusAmount: bonus,
          subTotal: roundOffSubTotal,
          totalBeforeTax: totalBeforeTax,
          cgst: cgst,
          sgst: sgst,
          grandTotal: grandTotal,
        },
      };

      const response = await apiClient.createInvoice(invoicePayload);

      if (response.success) {
        // Refresh recent invoices after creating invoice
        try {
          const invoicesResponse = await apiClient.getCompanyInvoices(
            params.companyId,
            { limit: 5 }
          );
          if (invoicesResponse.success && invoicesResponse.data?.invoices) {
            setRecentInvoices(invoicesResponse.data.invoices);
          }
        } catch (error) {
          console.error("Failed to refresh recent invoices:", error);
        }
        // Note: PDF download is handled by PDFDownloadLink component
      }
    } catch (error) {
      console.error("Failed to create invoice:", error);
      alert("Failed to create invoice. Please try again.");
    }
  };

  // Delete invoice
  const handleDeleteInvoice = async (invoiceId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this invoice? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setIsDeletingInvoice(invoiceId);
      const response = await apiClient.deleteInvoice(invoiceId);

      if (response.success) {
        // Remove the invoice from the local state
        setRecentInvoices((prev) =>
          prev.filter((invoice) => (invoice._id || invoice.id) !== invoiceId)
        );
      } else {
        throw new Error(response.error || "Failed to delete invoice");
      }
    } catch (error) {
      console.error("Error deleting invoice:", error);
      alert("Failed to delete invoice. Please try again.");
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
      setError("Please select a file first");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("attendanceFile", file);
      formData.append("companyId", params.companyId);

      const response = await apiClient.processAttendanceFile(formData);

      if (response.success) {
        setResult({ extracted_data: response.data.attendanceData });
      } else {
        throw new Error(response.error || "Processing failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle edits to attendance data
  const handleDataChange = (index: number, field: "present_day" | "overtime_days", value: number) => {
    if (!result) return;

    setResult(prev => {
      if (!prev) return prev;
      const newData = [...prev.extracted_data];
      newData[index] = {
        ...newData[index],
        [field]: value,
      };
      return { ...prev, extracted_data: newData };
    });
  };

  // After results load, fetch company employees once and build a fast lookup set
  useEffect(() => {
    const fetchEmployeesForCheck = async () => {
      if (!result?.extracted_data?.length) {
        setExistingEmployeeNames(new Set());
        return;
      }
      try {
        setIsCheckingEmployees(true);
        const response = await apiClient.getEmployeesByCompany(
          params.companyId,
          "active",
          5000
        );
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
        console.error("Failed to fetch employees for existence check:", err);
      } finally {
        setIsCheckingEmployees(false);
      }
    };

    fetchEmployeesForCheck();
  }, [params.companyId, result?.extracted_data]);

  // Loading state
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
        <InvoiceDetailsSection
          billTo={billTo}
          setBillTo={setBillTo}
          isLoadingCompany={isLoadingCompany}
          company={company}
          gstPaidBy={gstPaidBy}
          setGstPaidBy={setGstPaidBy}
          serviceChargeRate={serviceChargeRate}
          setServiceChargeRate={setServiceChargeRate}
          bonusRate={bonusRate}
          setBonusRate={setBonusRate}
          overtimeRate={overtimeRate}
          setOvertimeRate={setOvertimeRate}
        />

        <FileUploadSection
          file={file}
          onFileChange={handleFileChange}
          onUpload={handleUpload}
          isProcessing={isProcessing}
        />
      </div>

      {/* Results Display */}
      <ResultsDisplay
        result={result}
        error={error}
        billTo={billTo}
        company={company}
        gstPaidBy={gstPaidBy}
        serviceChargeRate={serviceChargeRate}
        bonusRate={bonusRate}
        overtimeRate={overtimeRate}
        existingEmployeeNames={existingEmployeeNames}
        onCreateInvoice={handleCreateInvoice}
        onDataChange={handleDataChange}
      />

      {/* Recent Invoices */}
      <RecentInvoicesSection
        isLoading={isLoadingInvoices}
        invoices={recentInvoices}
        company={company}
        onView={async (invoice) => {
          setIsLoadingInvoiceDetails(true);
          setIsViewModalOpen(true);
          try {
            const response = await apiClient.getInvoice(invoice._id || invoice.id || "");
            if (response.success && response.data) {
              setFullInvoiceData(response.data);
              setSelectedInvoice(invoice);
            }
          } catch (error) {
            console.error("❌ Failed to fetch invoice:", error);
            setSelectedInvoice(invoice);
          } finally {
            setIsLoadingInvoiceDetails(false);
          }
        }}
        onDelete={(id) => handleDeleteInvoice(id)}
        deletingId={isDeletingInvoice}
      />

      {/* Quick Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Quick Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600 bg-blue-100 rounded-full w-6 h-6 flex items-center justify-center text-xs">
                1
              </span>
              <span>Upload attendance document</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-green-600 bg-green-100 rounded-full w-6 h-6 flex items-center justify-center text-xs">
                2
              </span>
              <span>AI extracts employee data</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-purple-600 bg-purple-100 rounded-full w-6 h-6 flex items-center justify-center text-xs">
                3
              </span>
              <span>Review extracted data</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-orange-600 bg-orange-100 rounded-full w-6 h-6 flex items-center justify-center text-xs">
                4
              </span>
              <span>Download invoice PDF</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice View Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Invoice Details
            </DialogTitle>
          </DialogHeader>
          {isLoadingInvoiceDetails ? (
            <div className="space-y-4 py-8">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <p className="text-center text-muted-foreground">
                Loading invoice details...
              </p>
            </div>
          ) : fullInvoiceData ? (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b">
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Invoice Number
                  </Label>
                  <p className="text-lg font-semibold">
                    {fullInvoiceData.invoiceNumber || "—"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Status
                  </Label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(fullInvoiceData.status || "draft")}>
                      {(fullInvoiceData.status || "draft")
                        .charAt(0)
                        .toUpperCase() +
                        (fullInvoiceData.status || "draft").slice(1)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Company
                  </Label>
                  <p className="text-base font-medium">
                    {typeof fullInvoiceData.companyId === "object" &&
                    fullInvoiceData.companyId?.name
                      ? fullInvoiceData.companyId.name
                      : company?.name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Date Created
                  </Label>
                  <p className="text-base">
                    {formatDate(fullInvoiceData.createdAt || new Date())}
                  </p>
                </div>
              </div>

              {/* Employee Attendance Table */}
              {fullInvoiceData.processedData?.extractedEmployees && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Employee Attendance Breakdown
                  </h3>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium">
                              Employee Name
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-medium">
                              Present Days
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-medium">
                              Regular Days
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-medium">
                              Overtime Days
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium">
                              Total Salary
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {fullInvoiceData.processedData.extractedEmployees.map(
                            (emp: any, idx: number) => (
                              <tr
                                key={emp._id || idx}
                                className="hover:bg-muted/50 transition-colors"
                              >
                                <td className="px-4 py-3 font-medium">
                                  {emp.name}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <Badge variant="outline">{emp.presentDays}</Badge>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {emp.regularDays}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {emp.overtimeDays > 0 ? (
                                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                                      {emp.overtimeDays}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">0</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right font-medium">
                                  {formatCurrency(emp.salary)}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Invoice Breakdown */}
              {fullInvoiceData.billDetails && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Invoice Breakdown
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Calculations */}
                    <div className="border rounded-lg p-4 space-y-3">
                      <h4 className="font-medium text-sm text-muted-foreground mb-3">
                        Basic Calculation
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Base Amount</span>
                          <span className="font-medium">
                            {formatCurrency(fullInvoiceData.billDetails.baseAmount)}
                          </span>
                        </div>
                        {fullInvoiceData.billDetails.overtimeAmount > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Overtime Amount</span>
                            <span className="font-medium">
                              {formatCurrency(fullInvoiceData.billDetails.overtimeAmount)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>PF Amount (13%)</span>
                          <span className="font-medium">
                            {formatCurrency(fullInvoiceData.billDetails.pfAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>ESIC Amount (3.25%)</span>
                          <span className="font-medium">
                            {formatCurrency(fullInvoiceData.billDetails.esicAmount)}
                          </span>
                        </div>
                        {fullInvoiceData.billDetails.bonusAmount > 0 && (
                          <div className="flex justify-between">
                            <span>Bonus Amount</span>
                            <span className="font-medium">
                              {formatCurrency(fullInvoiceData.billDetails.bonusAmount)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Service & Tax */}
                    <div className="border rounded-lg p-4 space-y-3">
                      <h4 className="font-medium text-sm text-muted-foreground mb-3">
                        Service & Tax
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Service Charge ({fullInvoiceData.serviceChargeRate}%)</span>
                          <span className="font-medium">
                            {formatCurrency(fullInvoiceData.billDetails.serviceCharge)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>GST Amount (18%)</span>
                          <span className="font-medium">
                            {formatCurrency(fullInvoiceData.billDetails.gstAmount)}
                          </span>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex justify-between text-base">
                            <span className="font-semibold">Total Amount</span>
                            <span className="font-bold text-green-600 text-lg">
                              {formatCurrency(fullInvoiceData.billDetails.totalAmount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Employees</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {fullInvoiceData.attendanceData?.totalEmployees || 0}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Present Days</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {fullInvoiceData.attendanceData?.totalPresentDays || 0}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">Overtime Days</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {fullInvoiceData.attendanceData?.totalOvertimeDays || 0}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">Per Day Rate</p>
                      <p className="text-2xl font-bold text-green-600">
                        ₹{fullInvoiceData.attendanceData?.perDayRate || 0}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setFullInvoiceData(null);
                  }}
                >
                  Close
                </Button>
                <Button
                  className="flex items-center gap-2"
                  onClick={() => {
                    if (fullInvoiceData.fileUrl) {
                      // Check if it's a full URL (Cloudinary) or relative path
                      const downloadUrl = fullInvoiceData.fileUrl.startsWith('http')
                        ? fullInvoiceData.fileUrl
                        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${fullInvoiceData.fileUrl}`;
                      window.open(downloadUrl, "_blank");
                    } else {
                      alert("PDF file not available for this invoice");
                    }
                  }}
                >
                  <Download className="h-4 w-4" /> Download PDF
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No invoice data available</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
