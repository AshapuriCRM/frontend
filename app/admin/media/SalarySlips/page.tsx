"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AnimatedPage } from "@/components/ui/animated-page";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbSeparator,
  BreadcrumbPage,
  BreadcrumbLink,
} from "@/components/ui/breadcrumb";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  FileText,
  FileImage,
  FileSpreadsheet,
  File,
  Download,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { saveAs } from "file-saver";
import { Badge } from "@/components/ui/badge";

// Helper to resolve file URLs that may be stored as relative paths on the API
const API_BASE = process.env.NEXT_PUBLIC_API_URL || ""; // e.g. http://localhost:5000/api
const API_ORIGIN =
  API_BASE && /^https?:\/\//i.test(API_BASE)
    ? API_BASE.replace(/\/api\/?$/, "")
    : "";

function resolveFileUrl(fileUrl: string | undefined | null) {
  if (!fileUrl) return "";
  // Absolute URL (Cloudinary or any external host)
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  // Relative path coming from API (e.g. /uploads/salary-slips/...) -> prefix backend origin
  if (fileUrl.startsWith("/"))
    return API_ORIGIN ? `${API_ORIGIN}${fileUrl}` : fileUrl;
  return API_ORIGIN ? `${API_ORIGIN}/${fileUrl}` : fileUrl;
}

// Formatting helpers
const formatBytes = (bytes?: number) => {
  if (!bytes && bytes !== 0) return "";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"] as const;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

const formatDate = (d?: string | Date) => {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

function getFileIcon(type: string) {
  switch (type) {
    case "pdf":
      return <FileText className="h-8 w-8 text-red-500 dark:text-red-400" />;
    case "excel":
      return (
        <FileSpreadsheet className="h-8 w-8 text-green-500 dark:text-green-400" />
      );
    case "image":
      return <FileImage className="h-8 w-8 text-blue-500 dark:text-blue-400" />;
    default:
      return <File className="h-8 w-8 text-muted-foreground" />;
  }
}

function detectTypeFromName(name?: string) {
  if (!name) return "file";
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (
    lower.endsWith(".xls") ||
    lower.endsWith(".xlsx") ||
    lower.endsWith(".csv")
  )
    return "excel";
  if (
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg")
  )
    return "image";
  return "file";
}

function toNum(v: any): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export default function SalarySlipsMediaPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salarySlips, setSalarySlips] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Get companies (first 100)
        const companiesRes = await apiClient.getCompanies({
          page: 1,
          limit: 100,
          sortBy: "createdAt",
          sortOrder: "desc",
        } as any);
        const companies = companiesRes.success
          ? companiesRes.data?.companies ?? []
          : [];

        // For each company, fetch recent salary slips
        const allItems: any[] = [];
        for (const c of companies) {
          const cid = String((c as any).id || (c as any)._id);
          if (!cid) continue;
          try {
            const slipsRes = await apiClient.getCompanySalarySlips(cid, {
              limit: 20,
            });
            const slips = slipsRes.success
              ? slipsRes.data?.salarySlips ?? []
              : [];
            for (const s of slips) {
              const x = s as any;
              const fileMeta: any = x.xlsxFile || {};
              const url: string | undefined =
                fileMeta.secure_url || fileMeta.url;
              const name: string =
                fileMeta.original_filename ||
                `${x.employeeName || "employee"}-${x.month || ""}-${
                  x.year || ""
                }.xlsx`;

              // Robust totals
              const gross = toNum(x.salary?.grossSalary);
              const bonus = toNum(x.bonus) ?? 0;
              const totalDed = toNum(x.deductions?.totalDeductions) ?? 0;
              const computedTotal =
                toNum(x.totalSalary) ??
                (gross !== undefined
                  ? Math.max(0, gross - totalDed + bonus)
                  : undefined);

              allItems.push({
                _id: String(x._id || x.id),
                fileType: detectTypeFromName(name),
                fileName: name,
                fileUrl: url,
                createdAt: x.createdAt,
                fileSize: fileMeta.bytes || x.fileSize,
                month: x.month,
                year: x.year,
                employeeName: x.employeeName,
                companyId: String(
                  typeof x.companyId === "object" && x.companyId !== null
                    ? x.companyId._id || x.companyId.id
                    : x.companyId
                ),
                // salary & attendance details for modal
                totalSalary: computedTotal ?? 0,
                basicSalary: toNum(x.salary?.basicSalary),
                salaryGross: gross,
                bonus: bonus,
                deductionsTotal: totalDed,
                pfEmployee: toNum(x.deductions?.pf?.employeeContribution),
                pfEmployer: toNum(x.deductions?.pf?.employerContribution),
                esicEmployee: toNum(x.deductions?.esic?.employeeContribution),
                esicEmployer: toNum(x.deductions?.esic?.employerContribution),
                taxTds: toNum(x.deductions?.tax?.tds),
                taxProfessionalTax: toNum(x.deductions?.tax?.professionalTax),
                otherAdvance: toNum(x.deductions?.other?.advance),
                otherLoan: toNum(x.deductions?.other?.loan),
                otherPenalty: toNum(x.deductions?.other?.penalty),
                attTotalWorkingDays: toNum(x.attendance?.totalWorkingDays),
                attDaysPresent: toNum(x.attendance?.daysPresent),
                attDaysAbsent: toNum(x.attendance?.daysAbsent),
                overtimeHours: toNum(x.attendance?.overtimeHours),
                status: x.status,
                paymentMethod: x.paymentInfo?.paymentMethod,
                paymentDate: x.paymentInfo?.paymentDate,
                transactionId: x.paymentInfo?.transactionId,
                bankName: x.paymentInfo?.bankDetails?.bankName,
              });
            }
          } catch (e) {
            // Ignore per-company errors to allow partial results
            console.warn("Failed to fetch salary slips for company", c, e);
          }
        }

        // Sort by createdAt desc
        allItems.sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        });

        setSalarySlips(allItems);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to fetch salary slips");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleDownload(item: any) {
    setDownloadingId(item._id || item.id);
    try {
      const url = resolveFileUrl(item.fileUrl);
      if (!url) throw new Error("Empty file URL");

      const response = await fetch(url, {
        mode: "cors",
        credentials: "omit",
      });
      if (!response.ok) throw new Error("Failed to fetch file");
      const blob = await response.blob();

      let fileName: string = item.fileName || "salary-slip";
      const disposition = response.headers.get("content-disposition") || "";
      const match = /filename=\"?([^\";]+)\"?/i.exec(disposition);
      if (match?.[1]) fileName = match[1];

      saveAs(blob, fileName);
    } catch (err) {
      console.error("Download error:", err);
      alert(
        "Failed to download file. This may be due to CORS, file URL, or file permissions."
      );
      try {
        const url = resolveFileUrl(item.fileUrl);
        if (url) window.open(url, "_blank", "noopener,noreferrer");
      } catch {}
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <ProtectedRoute>
      <AnimatedPage className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin/media">Media</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Salary Slips</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <h1 className="text-3xl font-bold mb-2 mt-6">Salary Slips</h1>
          <p className="text-muted-foreground mb-8">
            Browse all salary slip files in the 'Salary Slips' folder.
          </p>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl w-full" />
              ))}
            </div>
          ) : error ? (
            <Alert variant="destructive" className="mb-8">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : salarySlips.length === 0 ? (
            <div className="text-center text-muted-foreground py-16">
              No salary slip files found.
            </div>
          ) : (
            <TooltipProvider>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {salarySlips.map((item) => {
                  const hasFile = Boolean(item.fileUrl);
                  return (
                    <Dialog
                      key={item._id || item.id}
                      open={selectedItem === item}
                      onOpenChange={(open) => !open && setSelectedItem(null)}
                    >
                      <DialogTrigger asChild>
                        <div
                          className={cn(
                            "group block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all cursor-pointer"
                          )}
                          tabIndex={0}
                          aria-label={`Open ${item.fileName}`}
                          onClick={() => setSelectedItem(item)}
                        >
                          <Card
                            className={cn(
                              "relative flex flex-col gap-2 p-3 rounded-xl border border-border bg-card shadow-sm transition-all",
                              "hover:bg-accent hover:border-primary/60 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/70",
                              "active:scale-[0.99]"
                            )}
                          >
                            {/* Header: Icon + Name */}
                            <div className="flex items-start gap-3">
                              <div className="shrink-0 mt-0.5">
                                {getFileIcon(item.fileType)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-base font-semibold text-foreground truncate">
                                  {`₹${Number(
                                    item.totalSalary ?? 0
                                  ).toLocaleString()}`}
                                </div>
                              </div>
                            </div>

                            {/* Meta Row */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {(item.month || item.year) && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px]"
                                >
                                  {item.month ? `${item.month}` : ""}
                                  {item.month && item.year ? " " : ""}
                                  {item.year ? `${item.year}` : ""}
                                </Badge>
                              )}
                              {typeof item.fileSize === "number" &&
                                item.fileSize > 0 && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px]"
                                  >
                                    {formatBytes(item.fileSize)}
                                  </Badge>
                                )}
                              {item.createdAt && (
                                <span className="ml-auto text-[11px] text-muted-foreground">
                                  {formatDate(item.createdAt)}
                                </span>
                              )}
                            </div>
                          </Card>
                        </div>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{item.fileName}</DialogTitle>
                          <DialogDescription>
                            {hasFile
                              ? "Click download to save this salary slip file."
                              : "This entry has no attached file. You can still view its details below."}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {(item.month || item.year) && (
                            <div className="space-y-2">
                              <h4 className="text-xs uppercase tracking-wide text-muted-foreground">
                                Period
                              </h4>
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                {item.month && (
                                  <>
                                    <span className="text-muted-foreground">
                                      Month
                                    </span>
                                    <span className="text-right">
                                      {item.month}
                                    </span>
                                  </>
                                )}
                                {item.year && (
                                  <>
                                    <span className="text-muted-foreground">
                                      Year
                                    </span>
                                    <span className="text-right">
                                      {item.year}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                          <div className="space-y-2">
                            <h4 className="text-xs uppercase tracking-wide text-muted-foreground">
                              Salary Summary
                            </h4>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                              {typeof item.totalSalary === "number" && (
                                <>
                                  <span className="text-muted-foreground">
                                    Total Salary
                                  </span>
                                  <span className="text-right font-semibold">
                                    ₹{item.totalSalary.toLocaleString()}
                                  </span>
                                </>
                              )}
                              {typeof item.salaryGross === "number" && (
                                <>
                                  <span className="text-muted-foreground">
                                    Gross Salary
                                  </span>
                                  <span className="text-right">
                                    ₹{item.salaryGross.toLocaleString()}
                                  </span>
                                </>
                              )}
                              {typeof item.basicSalary === "number" && (
                                <>
                                  <span className="text-muted-foreground">
                                    Basic Salary
                                  </span>
                                  <span className="text-right">
                                    ₹{item.basicSalary.toLocaleString()}
                                  </span>
                                </>
                              )}
                              {typeof item.bonus === "number" &&
                                item.bonus > 0 && (
                                  <>
                                    <span className="text-muted-foreground">
                                      Bonus
                                    </span>
                                    <span className="text-right">
                                      ₹{item.bonus.toLocaleString()}
                                    </span>
                                  </>
                                )}
                              {typeof item.deductionsTotal === "number" && (
                                <>
                                  <span className="text-muted-foreground">
                                    Total Deductions
                                  </span>
                                  <span className="text-right">
                                    ₹{item.deductionsTotal.toLocaleString()}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          {(typeof item.attDaysPresent === "number" ||
                            typeof item.overtimeHours === "number") && (
                            <div className="space-y-2 md:col-span-2">
                              <h4 className="text-xs uppercase tracking-wide text-muted-foreground">
                                Attendance
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-1">
                                {typeof item.attTotalWorkingDays ===
                                  "number" && (
                                  <>
                                    <span className="text-muted-foreground">
                                      Working Days
                                    </span>
                                    <span className="text-right">
                                      {item.attTotalWorkingDays}
                                    </span>
                                  </>
                                )}
                                {typeof item.attDaysPresent === "number" && (
                                  <>
                                    <span className="text-muted-foreground">
                                      Present
                                    </span>
                                    <span className="text-right">
                                      {item.attDaysPresent}
                                    </span>
                                  </>
                                )}
                                {typeof item.attDaysAbsent === "number" && (
                                  <>
                                    <span className="text-muted-foreground">
                                      Absent
                                    </span>
                                    <span className="text-right">
                                      {item.attDaysAbsent}
                                    </span>
                                  </>
                                )}
                                {typeof item.overtimeHours === "number" && (
                                  <>
                                    <span className="text-muted-foreground">
                                      Overtime (hrs)
                                    </span>
                                    <span className="text-right">
                                      {item.overtimeHours}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                          {(item.status ||
                            item.paymentMethod ||
                            item.paymentDate) && (
                            <div className="space-y-2 md:col-span-2">
                              <h4 className="text-xs uppercase tracking-wide text-muted-foreground">
                                Status & Payment
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-1">
                                {item.status && (
                                  <>
                                    <span className="text-muted-foreground">
                                      Status
                                    </span>
                                    <span className="text-right">
                                      {item.status}
                                    </span>
                                  </>
                                )}
                                {item.paymentMethod && (
                                  <>
                                    <span className="text-muted-foreground">
                                      Method
                                    </span>
                                    <span className="text-right">
                                      {item.paymentMethod}
                                    </span>
                                  </>
                                )}
                                {item.paymentDate && (
                                  <>
                                    <span className="text-muted-foreground">
                                      Payment Date
                                    </span>
                                    <span className="text-right">
                                      {formatDate(item.paymentDate)}
                                    </span>
                                  </>
                                )}
                                {item.transactionId && (
                                  <>
                                    <span className="text-muted-foreground">
                                      Txn ID
                                    </span>
                                    <span className="text-right truncate">
                                      {item.transactionId}
                                    </span>
                                  </>
                                )}
                                {item.bankName && (
                                  <>
                                    <span className="text-muted-foreground">
                                      Bank
                                    </span>
                                    <span className="text-right">
                                      {item.bankName}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                          <div className="space-y-2">
                            <h4 className="text-xs uppercase tracking-wide text-muted-foreground">
                              File Info
                            </h4>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                              {item.fileName && (
                                <>
                                  <span className="text-muted-foreground">
                                    Filename
                                  </span>
                                  <span className="text-right truncate">
                                    {item.fileName}
                                  </span>
                                </>
                              )}
                              {item.fileType && (
                                <>
                                  <span className="text-muted-foreground">
                                    Type
                                  </span>
                                  <span className="text-right">
                                    {item.fileType}
                                  </span>
                                </>
                              )}
                              {typeof item.fileSize === "number" &&
                                item.fileSize > 0 && (
                                  <>
                                    <span className="text-muted-foreground">
                                      Size
                                    </span>
                                    <span className="text-right">
                                      {formatBytes(item.fileSize)}
                                    </span>
                                  </>
                                )}
                              {item.createdAt && (
                                <>
                                  <span className="text-muted-foreground">
                                    Created
                                  </span>
                                  <span className="text-right">
                                    {formatDate(item.createdAt)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          {item.employeeName && (
                            <div className="space-y-2">
                              <h4 className="text-xs uppercase tracking-wide text-muted-foreground">
                                Employee
                              </h4>
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                <span className="text-muted-foreground">
                                  Name
                                </span>
                                <span className="text-right">
                                  {item.employeeName}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                          <DialogClose asChild>
                            <Button variant="outline">Close</Button>
                          </DialogClose>
                          <Button
                            onClick={() => handleDownload(item)}
                            disabled={
                              !hasFile ||
                              downloadingId === (item._id || item.id)
                            }
                          >
                            {downloadingId === (item._id || item.id) ? (
                              <span>Downloading...</span>
                            ) : (
                              <>
                                <Download className="mr-2 h-4 w-4" />{" "}
                                {hasFile ? "Download" : "No file"}
                              </>
                            )}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  );
                })}
              </div>
            </TooltipProvider>
          )}
        </div>
      </AnimatedPage>
    </ProtectedRoute>
  );
}
