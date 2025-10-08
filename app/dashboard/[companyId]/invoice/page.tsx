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
import { FileText, Download } from "lucide-react";

import { InvoiceDetailsSection } from "./components/InvoiceDetailsSection";
import { FileUploadSection } from "./components/FileUploadSection";
import { ResultsDisplay } from "./components/ResultsDisplay";
import { RecentInvoicesSection } from "./components/RecentInvoicesSection";
import { formatCurrency, formatDate, normalizeName } from "./utils/index";
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
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<RecentInvoice | null>(
    null
  );
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
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
      // Calculate the same values as shown in the frontend tables
      const totalPresentDays = result.extracted_data.reduce(
        (sum, emp) => sum + emp.present_day,
        0
      );
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
      const grandTotal =
        gstPaidBy === "ashapuri"
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
      }
    } catch (error) {
      console.error("Failed to create invoice:", error);
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
        existingEmployeeNames={existingEmployeeNames}
        onCreateInvoice={handleCreateInvoice}
      />

      {/* Recent Invoices */}
      <RecentInvoicesSection
        isLoading={isLoadingInvoices}
        invoices={recentInvoices}
        company={company}
        onView={(invoice) => {
          setSelectedInvoice(invoice);
          setIsViewModalOpen(true);
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Invoice Details
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Invoice Number
                  </Label>
                  <p className="text-lg font-semibold">
                    {selectedInvoice.invoiceNumber || "—"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Status
                  </Label>
                  <div className="mt-1">
                    <Badge className={`${/* reuse class builder */ ""}`}>
                      {(selectedInvoice.status || "draft")
                        .charAt(0)
                        .toUpperCase() +
                        (selectedInvoice.status || "draft").slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Company
                  </Label>
                  <p className="text-base">
                    {typeof selectedInvoice.companyId === "object" &&
                    selectedInvoice.companyId?.name
                      ? selectedInvoice.companyId.name
                      : selectedInvoice.companyName || company?.name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Date Created
                  </Label>
                  <p className="text-base">
                    {formatDate(selectedInvoice.createdAt || new Date())}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Total Amount
                  </Label>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(selectedInvoice.billDetails?.totalAmount)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Employees
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-base">
                      {selectedInvoice.attendanceData?.totalEmployees ||
                        selectedInvoice.employeeCount ||
                        0}{" "}
                      employees
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsViewModalOpen(false)}
                >
                  Close
                </Button>
                <Button
                  className="flex items-center gap-2"
                  onClick={() => {
                    alert(
                      "PDF download functionality will be implemented for individual invoices"
                    );
                  }}
                >
                  <Download className="h-4 w-4" /> Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
