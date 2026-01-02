"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  DollarSign,
  FileText,
  Loader2,
  Users,
} from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InvoicePDF } from "./InvoicePDF";
import type { AttendanceRecord, ProcessedResult } from "../types";

interface Props {
  result: ProcessedResult | null;
  error: string | null;
  billTo: string;
  company?: { name?: string } | null;
  gstPaidBy: string;
  serviceChargeRate: number;
  bonusRate: number;
  overtimeRate: number;
  existingEmployeeNames: Set<string>;
  onCreateInvoice: () => Promise<void>;
  onDataChange?: (index: number, field: "present_day" | "overtime_days", value: number) => void;
}

export function ResultsDisplay({
  result,
  error,
  billTo,
  company,
  gstPaidBy,
  serviceChargeRate,
  bonusRate,
  overtimeRate,
  existingEmployeeNames,
  onCreateInvoice,
  onDataChange,
}: Props) {
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!result) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" /> Extracted
          Attendance Data
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
                document={
                  <InvoicePDF
                    totalEmployees={result.extracted_data.length}
                    totalPresentDays={result.extracted_data.reduce(
                      (sum, emp) => sum + emp.present_day,
                      0
                    )}
                    perDay={466}
                    billTo={billTo || company?.name || "Company"}
                    extractedData={result.extracted_data}
                    gstPaidBy={gstPaidBy}
                    serviceChargeRate={serviceChargeRate}
                    bonusRate={bonusRate}
                    overtimeRate={overtimeRate}
                    headerImageUrl={typeof window !== 'undefined' ? `${window.location.origin}/images/invoice_header.jpeg` : undefined}
                  />
                }
                fileName={`${
                  billTo || company?.name || "invoice"
                }-${new Date().getFullYear()}-${String(
                  Math.floor(Math.random() * 1000)
                ).padStart(3, "0")}.pdf`}
                onClick={onCreateInvoice}
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md"
              >
                Download Invoice PDF
              </PDFDownloadLink>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EmployeeAttendanceTable
                data={result.extracted_data}
                existingEmployeeNames={existingEmployeeNames}
                onDataChange={onDataChange}
              />
              <InvoiceBreakdown
                data={result.extracted_data}
                gstPaidBy={gstPaidBy}
                serviceChargeRate={serviceChargeRate}
                bonusRate={bonusRate}
                overtimeRate={overtimeRate}
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Data Found</h3>
            <p className="text-muted-foreground">
              Could not extract attendance data from the uploaded document.
              Please ensure the document contains attendance information in a
              recognizable format.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmployeeAttendanceTable({
  data,
  existingEmployeeNames,
  onDataChange,
}: {
  data: AttendanceRecord[];
  existingEmployeeNames: Set<string>;
  onDataChange?: (index: number, field: "present_day" | "overtime_days", value: number) => void;
}) {
  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

  return (
    <Card className="lg:col-span-1">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-5 w-5" /> Employee Attendance ({data.length}{" "}
          employees)
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="overflow-x-auto -mx-3">
          <table className="w-full border-collapse min-w-[400px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-2 py-2 text-left text-xs font-medium">
                  Employee
                </th>
                <th className="px-2 py-2 text-center text-xs font-medium w-16">
                  Present
                </th>
                <th className="px-2 py-2 text-center text-xs font-medium w-16">
                  OT
                </th>
                <th className="px-2 py-2 text-center text-xs font-medium w-16">
                  Rate
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((record, index) => {
                const totalDays = record.total_day || record.absent_day || 0;
                const attendanceRate =
                  totalDays > 0
                    ? ((record.present_day / totalDays) * 100).toFixed(1)
                    : "N/A";
                const nameExists = existingEmployeeNames.has(
                  normalize(record.name || "")
                );
                return (
                  <tr
                    key={index}
                    className="border-b hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1.5">
                        {!nameExists && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center justify-center flex-shrink-0">
                                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-sm">
                                  Employee "{record.name}" not found in database
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{record.name}</p>
                          {(record.total_day || record.absent_day) && (
                            <div className="flex gap-1 mt-0.5 flex-wrap">
                              {record.total_day && (
                                <span className="text-[10px] text-muted-foreground">
                                  T:{record.total_day}
                                </span>
                              )}
                              {record.absent_day && (
                                <span className="text-[10px] text-red-500">
                                  A:{record.absent_day}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-1 py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max="31"
                        value={record.present_day}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          onDataChange?.(index, "present_day", value);
                        }}
                        className="w-12 px-1 py-1 text-center border rounded text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-1 py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max="31"
                        value={record.overtime_days || 0}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          onDataChange?.(index, "overtime_days", value);
                        }}
                        className="w-12 px-1 py-1 text-center border rounded text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </td>
                    <td className="px-1 py-2 text-center">
                      {attendanceRate !== "N/A" && (
                        <Badge
                          variant={
                            parseFloat(attendanceRate) >= 80
                              ? "default"
                              : "destructive"
                          }
                          className="text-[10px] px-1.5 py-0.5"
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
  );
}

function InvoiceBreakdown({
  data,
  gstPaidBy,
  serviceChargeRate,
  bonusRate,
  overtimeRate,
}: {
  data: AttendanceRecord[];
  gstPaidBy: string;
  serviceChargeRate: number;
  bonusRate: number;
  overtimeRate: number;
}) {
  // Calculate regular and overtime days from manual inputs
  const totalRegularDays = data.reduce((sum, emp) => sum + emp.present_day, 0);
  const totalOvertimeDays = data.reduce((sum, emp) => sum + (emp.overtime_days || 0), 0);

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

  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" /> Invoice Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border dark:border-blue-800 backdrop-blur-sm">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3">
              Basic Calculation
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>
                  Regular Days ({totalRegularDays} days × ₹{perDay})
                </span>
                <span className="font-medium">
                  ₹{baseTotal.toLocaleString("en-IN")}
                </span>
              </div>
              {totalOvertimeDays > 0 && (
                <div className="flex justify-between">
                  <span>
                    Overtime ({totalOvertimeDays} days × ₹{overtimeRate})
                  </span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    ₹{overtimeAmount.toLocaleString("en-IN")}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2">
                <span>Total Before Statutory</span>
                <span className="font-medium">
                  ₹{totalWithOvertime.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between">
                <span>PF @ 13%</span>
                <span>
                  ₹{pf.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>ESIC @ 3.25%</span>
                <span>
                  ₹{esic.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </span>
              </div>
              {bonusRate > 0 && (
                <div className="flex justify-between">
                  <span>Bonus @ {bonusRate}%</span>
                  <span>
                    ₹{bonus.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 font-medium">
                <span>Sub Total</span>
                <span>₹{roundOffSubTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg border dark:border-purple-800 backdrop-blur-sm">
            <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-3">
              Service & Tax
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Service Charge @ {serviceChargeRate}%</span>
                <span>
                  ₹
                  {serviceChargeTotal.toLocaleString("en-IN", {
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 font-medium">
                <span>Total Before Tax</span>
                <span>
                  ₹
                  {totalBeforeTax.toLocaleString("en-IN", {
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>
          <div
            className={`p-4 rounded-lg border ${
              gstPaidBy === "principal-employer"
                ? "bg-orange-50 dark:bg-orange-900/30 dark:border-orange-800"
                : "bg-green-50 dark:bg-green-900/30 dark:border-green-800"
            }`}
          >
            <h4
              className={`font-medium mb-3 ${
                gstPaidBy === "principal-employer"
                  ? "text-orange-900 dark:text-orange-100"
                  : "text-green-900 dark:text-green-100"
              }`}
            >
              GST (
              {gstPaidBy === "principal-employer"
                ? "Paid by PE"
                : "Paid by Ashapuri"}
              )
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>CGST @ 9%</span>
                <span
                  className={
                    gstPaidBy === "principal-employer"
                      ? "text-orange-600 dark:text-orange-300"
                      : "dark:text-green-200"
                  }
                >
                  {gstPaidBy === "ashapuri"
                    ? `₹${cgst.toLocaleString("en-IN", {
                        maximumFractionDigits: 2,
                      })}`
                    : "— (PE pays)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>SGST @ 9%</span>
                <span
                  className={
                    gstPaidBy === "principal-employer"
                      ? "text-orange-600 dark:text-orange-300"
                      : "dark:text-green-200"
                  }
                >
                  {gstPaidBy === "ashapuri"
                    ? `₹${sgst.toLocaleString("en-IN", {
                        maximumFractionDigits: 2,
                      })}`
                    : "— (PE pays)"}
                </span>
              </div>
              {gstPaidBy === "principal-employer" && (
                <div className="flex justify-between text-orange-700 dark:text-orange-300 text-xs italic pt-1">
                  <span>GST Amount (for PE)</span>
                  <span>
                    ₹
                    {(cgst + sgst).toLocaleString("en-IN", {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-emerald-900/40 dark:to-green-900/40 p-4 rounded-lg border-2 border-green-300 dark:border-emerald-800">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-green-800 dark:text-emerald-200">
                GRAND TOTAL
              </span>
              <span className="text-2xl font-bold text-green-700 dark:text-emerald-100">
                ₹{grandTotal.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
