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
  // Relative path coming from API (e.g. /uploads/invoices/...) -> prefix backend origin
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

const formatCurrency = (n?: number) => {
  if (typeof n !== "number") return "";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n}`;
  }
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

const statusColor = (s?: string) => {
  switch (s) {
    case "paid":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "sent":
    case "approved":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "overdue":
    case "failed":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    case "draft":
    case "pending":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    default:
      return "bg-muted text-foreground/70";
  }
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

export default function InvoicesMediaPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiClient
      .getAllInvoices()
      .then((res) => {
        if (res.success && res.data?.invoices) {
          setInvoices(res.data.invoices);
        } else {
          setError(res.error || res.message || "Failed to fetch invoices");
        }
      })
      .catch((err) => setError(err.message || "Failed to fetch invoices"))
      .finally(() => setLoading(false));
  }, []);

  async function handleDownload(inv: any) {
    setDownloadingId(inv._id || inv.id);
    try {
      const url = resolveFileUrl(inv.fileUrl);
      if (!url) throw new Error("Empty file URL");

      // Fetch as blob (works for Cloudinary and backend static if CORS allows)
      const response = await fetch(url, {
        mode: "cors",
        // Do not send credentials to 3rd party (Cloudinary) to avoid CORS issues
        credentials: "omit",
      });
      if (!response.ok) {
        console.error("Download failed:", response.status, response.statusText);
        throw new Error("Failed to fetch file");
      }
      const blob = await response.blob();

      // Prefer provided name, otherwise try to infer
      let fileName: string = inv.fileName || "file";
      if (!inv.fileName) {
        const disposition = response.headers.get("content-disposition") || "";
        const match = /filename=\"?([^\";]+)\"?/i.exec(disposition);
        if (match?.[1]) fileName = match[1];
      }

      saveAs(blob, fileName);
    } catch (err) {
      console.error("Download error:", err);
      alert(
        "Failed to download file. This may be due to CORS, file URL, or file permissions."
      );
      // As a fallback, try opening the URL in a new tab (may not force download)
      try {
        const url = resolveFileUrl(inv.fileUrl);
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
                <BreadcrumbPage>Invoices</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <h1 className="text-3xl font-bold mb-2 mt-6">Invoices</h1>
          <p className="text-muted-foreground mb-8">
            Browse all invoice files in the &apos;Invoices&apos; folder.
          </p>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="aspect-square rounded-xl h-36 w-full"
                />
              ))}
            </div>
          ) : error ? (
            <Alert variant="destructive" className="mb-8">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : invoices.length === 0 ? (
            <div className="text-center text-muted-foreground py-16">
              No invoice files found.
            </div>
          ) : (
            <TooltipProvider>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {invoices.map((inv) => {
                  const total =
                    inv?.billDetails?.totalAmount ?? inv?.totalAmount;
                  const created = inv?.createdAt;
                  const size = inv?.fileSize;
                  return (
                    <Dialog
                      key={inv._id || inv.id}
                      open={selectedFile === inv}
                      onOpenChange={(open) => !open && setSelectedFile(null)}
                    >
                      <DialogTrigger asChild>
                        <div
                          className={cn(
                            "group block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all cursor-pointer"
                          )}
                          tabIndex={0}
                          aria-label={`Open ${
                            inv.invoiceNumber || inv.fileName
                          }`}
                          onClick={() => setSelectedFile(inv)}
                        >
                          <Card
                            className={cn(
                              "aspect-square flex flex-col items-center justify-between p-3 rounded-xl border border-border bg-card shadow-sm transition-all",
                              "hover:bg-accent hover:border-primary/60 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/70",
                              "active:scale-[0.98]",
                              "disabled:opacity-50"
                            )}
                          >
                            <div className="flex flex-col items-center gap-2 mt-2">
                              {getFileIcon(inv.fileType)}
                              <span className="text-xs text-center truncate max-w-[95%] font-medium text-foreground">
                                {inv.invoiceNumber || inv.fileName}
                              </span>
                            </div>
                            <div className="w-full mt-2 space-y-2">
                              <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                                <span>{formatBytes(size)}</span>
                                <span>{formatDate(created)}</span>
                              </div>
                              {typeof total === "number" && (
                                <div className="text-center text-sm font-semibold">
                                  {formatCurrency(total)}
                                </div>
                              )}
                            </div>
                          </Card>
                        </div>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            {inv.invoiceNumber || inv.fileName}
                          </DialogTitle>
                          <DialogDescription>
                            Click download to save this invoice file.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="space-y-2">
                            <h4 className="text-xs uppercase tracking-wide text-muted-foreground">
                              Bill Details
                            </h4>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                              <span className="text-muted-foreground">
                                Base
                              </span>
                              <span className="text-right">
                                {formatCurrency(inv?.billDetails?.baseAmount)}
                              </span>
                              <span className="text-muted-foreground">
                                Service Charge
                              </span>
                              <span className="text-right">
                                {formatCurrency(
                                  inv?.billDetails?.serviceCharge
                                )}
                              </span>
                              <span className="text-muted-foreground">PF</span>
                              <span className="text-right">
                                {formatCurrency(inv?.billDetails?.pfAmount)}
                              </span>
                              <span className="text-muted-foreground">
                                ESIC
                              </span>
                              <span className="text-right">
                                {formatCurrency(inv?.billDetails?.esicAmount)}
                              </span>
                              <span className="text-muted-foreground">GST</span>
                              <span className="text-right">
                                {formatCurrency(inv?.billDetails?.gstAmount)}
                              </span>
                              <span className="text-muted-foreground font-medium">
                                Total
                              </span>
                              <span className="text-right font-semibold">
                                {formatCurrency(
                                  inv?.billDetails?.totalAmount ??
                                    inv?.totalAmount
                                )}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-xs uppercase tracking-wide text-muted-foreground">
                              Meta
                            </h4>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                              <span className="text-muted-foreground">
                                Tax Type
                              </span>
                              <span className="text-right">
                                {inv?.taxType?.toUpperCase?.() || ""}
                              </span>
                              <span className="text-muted-foreground">
                                Payment Method
                              </span>
                              <span className="text-right">
                                {inv?.paymentMethod || ""}
                              </span>
                              <span className="text-muted-foreground">
                                GST Paid By
                              </span>
                              <span className="text-right">
                                {inv?.gstPaidBy || ""}
                              </span>
                              <span className="text-muted-foreground">
                                Svc Charge Rate
                              </span>
                              <span className="text-right">
                                {typeof inv?.serviceChargeRate === "number"
                                  ? `${inv.serviceChargeRate}%`
                                  : ""}
                              </span>
                              <span className="text-muted-foreground">
                                Status
                              </span>
                              <span className="text-right">
                                {inv?.status || ""}
                              </span>
                              <span className="text-muted-foreground">
                                Payment Status
                              </span>
                              <span className="text-right">
                                {inv?.paymentStatus || ""}
                              </span>
                              <span className="text-muted-foreground">
                                Due Date
                              </span>
                              <span className="text-right">
                                {formatDate(inv?.dueDate)}
                              </span>
                              <span className="text-muted-foreground">
                                Created
                              </span>
                              <span className="text-right">
                                {formatDate(inv?.createdAt)}
                              </span>
                              <span className="text-muted-foreground">
                                Payment Date
                              </span>
                              <span className="text-right">
                                {formatDate(inv?.paymentDate)}
                              </span>
                              <span className="text-muted-foreground">
                                File
                              </span>
                              <span className="text-right">
                                {inv?.fileType} • {formatBytes(inv?.fileSize)}
                              </span>
                            </div>
                          </div>
                          {inv?.billTo && (
                            <div className="space-y-2 md:col-span-2">
                              <h4 className="text-xs uppercase tracking-wide text-muted-foreground">
                                Bill To
                              </h4>
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                <span className="text-muted-foreground">
                                  Name
                                </span>
                                <span className="text-right">
                                  {inv?.billTo?.name || ""}
                                </span>
                                <span className="text-muted-foreground">
                                  GST No.
                                </span>
                                <span className="text-right">
                                  {inv?.billTo?.gstNumber || ""}
                                </span>
                                <span className="text-muted-foreground">
                                  Contact
                                </span>
                                <span className="text-right">
                                  {inv?.billTo?.contactInfo || ""}
                                </span>
                                <span className="text-muted-foreground">
                                  Address
                                </span>
                                <span className="text-right line-clamp-2">
                                  {inv?.billTo?.address || ""}
                                </span>
                              </div>
                            </div>
                          )}
                          {(inv?.attendanceData?.totalEmployees ||
                            inv?.attendanceData?.totalPresentDays) && (
                            <div className="space-y-2 md:col-span-2">
                              <h4 className="text-xs uppercase tracking-wide text-muted-foreground">
                                Attendance Summary
                              </h4>
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                <span className="text-muted-foreground">
                                  Employees
                                </span>
                                <span className="text-right">
                                  {inv?.attendanceData?.totalEmployees ?? ""}
                                </span>
                                <span className="text-muted-foreground">
                                  Present Days
                                </span>
                                <span className="text-right">
                                  {inv?.attendanceData?.totalPresentDays ?? ""}
                                </span>
                                <span className="text-muted-foreground">
                                  Per Day Rate
                                </span>
                                <span className="text-right">
                                  {formatCurrency(
                                    inv?.attendanceData?.perDayRate
                                  )}
                                </span>
                                <span className="text-muted-foreground">
                                  Working Days
                                </span>
                                <span className="text-right">
                                  {inv?.attendanceData?.workingDays ?? ""}
                                </span>
                              </div>
                            </div>
                          )}
                          {inv?.notes && (
                            <div className="space-y-2 md:col-span-2">
                              <h4 className="text-xs uppercase tracking-wide text-muted-foreground">
                                Notes
                              </h4>
                              <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                                {inv.notes}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                          <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                          </DialogClose>
                          <Button
                            onClick={() => handleDownload(inv)}
                            disabled={downloadingId === (inv._id || inv.id)}
                          >
                            {downloadingId === (inv._id || inv.id) ? (
                              <span>Downloading...</span>
                            ) : (
                              <>
                                <Download className="mr-2 h-4 w-4" /> Download
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
