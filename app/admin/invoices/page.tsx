"use client";

import { useEffect, useState, useMemo } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  FileText,
  Merge,
  Loader2,
  Trash2,
  Eye,
  Building2,
  Calendar,
  IndianRupee,
  Users,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  X,
  Download,
} from "lucide-react";
import { saveAs } from "file-saver";
import apiClient from "@/lib/api-client";
import { cn, formatIndianCurrency } from "@/lib/utils";

// Format date helper
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

// Status badge color helper
const getStatusColor = (status?: string) => {
  switch (status) {
    case "paid":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "sent":
    case "approved":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "overdue":
    case "failed":
    case "cancelled":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    case "draft":
    case "pending":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    default:
      return "bg-muted text-foreground/70";
  }
};

interface Stats {
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
}

interface InvoiceItem {
  _id: string;
  invoiceNumber: string;
  companyId: { _id: string; name: string; location?: string } | string;
  billDetails?: {
    totalAmount: number;
    baseAmount?: number;
    serviceCharge?: number;
    pfAmount?: number;
    esicAmount?: number;
    gstAmount?: number;
  };
  status?: string;
  paymentStatus?: string;
  createdAt?: string;
  dueDate?: string;
  isMerged?: boolean;
  sourceInvoices?: any[];
  mergedCompanies?: any[];
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  taxType?: string;
  paymentMethod?: string;
  gstPaidBy?: string;
  serviceChargeRate?: number;
  billTo?: {
    name?: string;
    gstNumber?: string;
    contactInfo?: string;
    address?: string;
  };
  attendanceData?: {
    totalEmployees?: number;
    totalPresentDays?: number;
    perDayRate?: number;
    workingDays?: number;
  };
  processedData?: {
    extractedEmployees?: any[];
  };
  notes?: string;
}

// Helper to resolve file URLs
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const API_ORIGIN =
  API_BASE && /^https?:\/\//i.test(API_BASE)
    ? API_BASE.replace(/\/api\/?$/, "")
    : "";

function resolveFileUrl(fileUrl: string | undefined | null) {
  if (!fileUrl) return "";
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  if (fileUrl.startsWith("/"))
    return API_ORIGIN ? `${API_ORIGIN}${fileUrl}` : fileUrl;
  return API_ORIGIN ? `${API_ORIGIN}/${fileUrl}` : fileUrl;
}

// Format file size
const formatBytes = (bytes?: number) => {
  if (!bytes && bytes !== 0) return "";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"] as const;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

export default function InvoiceMergePage() {
  // Stats state
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Available invoices state (for merge tab)
  const [availableInvoices, setAvailableInvoices] = useState<InvoiceItem[]>([]);
  const [availableLoading, setAvailableLoading] = useState(true);
  const [availablePagination, setAvailablePagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filters for available invoices
  const [filters, setFilters] = useState({
    companyId: "",
    startDate: "",
    endDate: "",
  });

  // Merge state
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeNotes, setMergeNotes] = useState("");
  const [merging, setMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [mergeSuccess, setMergeSuccess] = useState(false);

  // Merged invoices state (for merged tab)
  const [mergedInvoices, setMergedInvoices] = useState<InvoiceItem[]>([]);
  const [mergedLoading, setMergedLoading] = useState(true);
  const [mergedPagination, setMergedPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  // Merged invoice details state
  const [selectedMerged, setSelectedMerged] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Individual invoice details state
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);
  const [invoiceDetailsOpen, setInvoiceDetailsOpen] = useState(false);
  const [invoiceDetailsLoading, setInvoiceDetailsLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState("merge");

  // Companies list for filter
  const companies = useMemo(() => {
    return stats?.byCompany || [];
  }, [stats]);

  // Calculate selected invoices summary
  const selectedSummary = useMemo(() => {
    const selected = availableInvoices.filter((inv) =>
      selectedIds.has(inv._id)
    );
    const totalAmount = selected.reduce(
      (sum, inv) => sum + (inv.billDetails?.totalAmount || 0),
      0
    );
    return { count: selected.length, totalAmount, invoices: selected };
  }, [availableInvoices, selectedIds]);

  // Fetch stats
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await apiClient.getAdminInvoiceStats();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch available invoices for merging
  const fetchAvailableInvoices = async (page = 1) => {
    setAvailableLoading(true);
    try {
      const res = await apiClient.getInvoicesAvailableForMerge({
        ...filters,
        page,
        limit: availablePagination.limit,
      });
      if (res.success && res.data) {
        setAvailableInvoices(res.data.invoices || []);
        setAvailablePagination((prev) => ({
          ...prev,
          ...res.data.pagination,
        }));
      }
    } catch (err) {
      console.error("Failed to fetch available invoices:", err);
    } finally {
      setAvailableLoading(false);
    }
  };

  // Fetch merged invoices
  const fetchMergedInvoices = async (page = 1) => {
    setMergedLoading(true);
    try {
      const res = await apiClient.getMergedInvoices({
        page,
        limit: mergedPagination.limit,
      });
      if (res.success && res.data) {
        setMergedInvoices(res.data.invoices || []);
        setMergedPagination((prev) => ({
          ...prev,
          ...res.data.pagination,
        }));
      }
    } catch (err) {
      console.error("Failed to fetch merged invoices:", err);
    } finally {
      setMergedLoading(false);
    }
  };

  // Fetch merged invoice details
  const fetchMergedDetails = async (id: string) => {
    setDetailsLoading(true);
    try {
      const res = await apiClient.getMergedInvoiceDetails(id);
      if (res.success && res.data) {
        setSelectedMerged(res.data);
        setDetailsOpen(true);
      }
    } catch (err) {
      console.error("Failed to fetch merged invoice details:", err);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Handle merge
  const handleMerge = async () => {
    if (selectedIds.size < 2) return;

    setMerging(true);
    setMergeError(null);
    try {
      const res = await apiClient.mergeInvoices(
        Array.from(selectedIds),
        mergeNotes || undefined
      );
      if (res.success) {
        setMergeSuccess(true);
        setSelectedIds(new Set());
        setMergeNotes("");
        // Refresh data
        fetchStats();
        fetchAvailableInvoices(1);
        fetchMergedInvoices(1);
        setTimeout(() => {
          setMergeDialogOpen(false);
          setMergeSuccess(false);
        }, 1500);
      } else {
        setMergeError(res.error || "Failed to merge invoices");
      }
    } catch (err: any) {
      setMergeError(err.message || "Failed to merge invoices");
    } finally {
      setMerging(false);
    }
  };

  // Handle delete merged invoice
  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const res = await apiClient.deleteMergedInvoice(deleteTarget);
      if (res.success) {
        fetchStats();
        fetchMergedInvoices(mergedPagination.page);
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
      }
    } catch (err) {
      console.error("Failed to delete merged invoice:", err);
    } finally {
      setDeleting(false);
    }
  };

  // Toggle selection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Toggle all selection
  const toggleAll = () => {
    if (selectedIds.size === availableInvoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(availableInvoices.map((inv) => inv._id)));
    }
  };

  // Get company name helper
  const getCompanyName = (companyId: any) => {
    if (typeof companyId === "object" && companyId?.name) {
      return companyId.name;
    }
    return "Unknown";
  };

  // Fetch individual invoice details
  const fetchInvoiceDetails = async (id: string) => {
    setInvoiceDetailsLoading(true);
    try {
      const res = await apiClient.getInvoice(id);
      if (res.success && res.data) {
        // Map the response to InvoiceItem format (handle both id and _id)
        const data = res.data as any;
        const invoiceItem: InvoiceItem = {
          ...data,
          _id: data._id || data.id || id,
        };
        setSelectedInvoice(invoiceItem);
        setInvoiceDetailsOpen(true);
      }
    } catch (err) {
      console.error("Failed to fetch invoice details:", err);
    } finally {
      setInvoiceDetailsLoading(false);
    }
  };

  // Handle download invoice
  const handleDownload = async (invoice: InvoiceItem) => {
    const id = invoice._id;
    setDownloadingId(id);

    try {
      const downloadRes = await apiClient.downloadAdminInvoice(id);

      if (!downloadRes.success) {
        throw new Error(downloadRes.error || "Failed to get download URL");
      }

      const { downloadUrl, proxyUrl, fileName } = downloadRes.data as {
        downloadUrl: string;
        proxyUrl?: string;
        fileName: string;
      };

      // Try direct download first (signed URL)
      try {
        const response = await fetch(downloadUrl, { mode: "cors", credentials: "omit" });
        if (response.ok) {
          const blob = await response.blob();
          saveAs(blob, fileName || `${invoice.invoiceNumber}.pdf`);
          return;
        }
      } catch (e) {
        // Direct download failed, will try proxy
      }

      // Fallback: Use proxy download (streams through backend)
      if (proxyUrl) {
        const baseUrl = API_BASE.replace(/\/api\/?$/, "");
        window.location.href = `${baseUrl}${proxyUrl}`;
        return;
      }

      alert("Failed to download file");
    } catch (err) {
      console.error("Download error:", err);
      alert("Failed to download file. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchStats();
    fetchAvailableInvoices(1);
    fetchMergedInvoices(1);
  }, []);

  // Refetch when filters change
  useEffect(() => {
    fetchAvailableInvoices(1);
    setSelectedIds(new Set());
  }, [filters]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin/super">Admin</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Invoice Management</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <h1 className="text-3xl font-bold mb-2">Invoice Management</h1>
          <p className="text-muted-foreground mb-8">
            Merge multiple invoices and manage merged documents
          </p>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Invoices
                    </p>
                    {statsLoading ? (
                      <Skeleton className="h-7 w-16" />
                    ) : (
                      <p className="text-2xl font-bold">
                        {stats?.overall?.totalInvoices || 0}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <IndianRupee className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Amount
                    </p>
                    {statsLoading ? (
                      <Skeleton className="h-7 w-24" />
                    ) : (
                      <p className="text-2xl font-bold">
                        {formatIndianCurrency(stats?.overall?.totalAmount || 0)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Merge className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Merged Invoices
                    </p>
                    {statsLoading ? (
                      <Skeleton className="h-7 w-12" />
                    ) : (
                      <p className="text-2xl font-bold">
                        {stats?.overall?.mergedCount || 0}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Companies</p>
                    {statsLoading ? (
                      <Skeleton className="h-7 w-12" />
                    ) : (
                      <p className="text-2xl font-bold">
                        {stats?.byCompany?.length || 0}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="merge" className="gap-2">
                <Merge className="h-4 w-4" />
                Merge Invoices
              </TabsTrigger>
              <TabsTrigger value="merged" className="gap-2">
                <FileText className="h-4 w-4" />
                Merged Invoices
              </TabsTrigger>
            </TabsList>

            {/* Merge Invoices Tab */}
            <TabsContent value="merge">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Select Invoices to Merge</span>
                    {selectedIds.size >= 2 && (
                      <Button
                        onClick={() => setMergeDialogOpen(true)}
                        className="gap-2"
                      >
                        <Merge className="h-4 w-4" />
                        Merge {selectedIds.size} Invoices
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Filters */}
                  <div className="flex flex-wrap gap-4 mb-6">
                    <Select
                      value={filters.companyId}
                      onValueChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          companyId: value === "all" ? "" : value,
                        }))
                      }
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="All Companies" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Companies</SelectItem>
                        {companies.map((company) => (
                          <SelectItem
                            key={company.companyId}
                            value={company.companyId}
                          >
                            {company.company}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            startDate: e.target.value,
                          }))
                        }
                        className="w-[150px]"
                        placeholder="Start Date"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            endDate: e.target.value,
                          }))
                        }
                        className="w-[150px]"
                        placeholder="End Date"
                      />
                    </div>

                    {(filters.companyId ||
                      filters.startDate ||
                      filters.endDate) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setFilters({
                            companyId: "",
                            startDate: "",
                            endDate: "",
                          })
                        }
                      >
                        <X className="h-4 w-4 mr-1" />
                        Clear Filters
                      </Button>
                    )}
                  </div>

                  {/* Selected Summary */}
                  {selectedIds.size > 0 && (
                    <div className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Badge variant="secondary" className="text-sm">
                            {selectedSummary.count} selected
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Total Amount:{" "}
                            <span className="font-semibold text-foreground">
                              {formatIndianCurrency(selectedSummary.totalAmount)}
                            </span>
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedIds(new Set())}
                        >
                          Clear Selection
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Invoices Table */}
                  {availableLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full" />
                      ))}
                    </div>
                  ) : availableInvoices.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No invoices available for merging</p>
                    </div>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">
                              <Checkbox
                                checked={
                                  selectedIds.size === availableInvoices.length
                                }
                                onCheckedChange={toggleAll}
                              />
                            </TableHead>
                            <TableHead>Invoice</TableHead>
                            <TableHead>Company</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {availableInvoices.map((invoice) => (
                            <TableRow
                              key={invoice._id}
                              className={cn(
                                "cursor-pointer",
                                selectedIds.has(invoice._id) && "bg-primary/5"
                              )}
                              onClick={() => toggleSelection(invoice._id)}
                            >
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={selectedIds.has(invoice._id)}
                                  onCheckedChange={() =>
                                    toggleSelection(invoice._id)
                                  }
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                {invoice.invoiceNumber}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                  {getCompanyName(invoice.companyId)}
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatIndianCurrency(
                                  invoice.billDetails?.totalAmount || 0
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Calendar className="h-4 w-4" />
                                  {formatDate(invoice.createdAt)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(invoice.status)}>
                                  {invoice.status || "draft"}
                                </Badge>
                              </TableCell>
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => fetchInvoiceDetails(invoice._id)}
                                    disabled={invoiceDetailsLoading}
                                    title="View Details"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDownload(invoice)}
                                    disabled={downloadingId === invoice._id}
                                    title="Download"
                                  >
                                    {downloadingId === invoice._id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Download className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      {/* Pagination */}
                      {availablePagination.pages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                          <p className="text-sm text-muted-foreground">
                            Page {availablePagination.page} of{" "}
                            {availablePagination.pages} ({availablePagination.total}{" "}
                            total)
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={availablePagination.page <= 1}
                              onClick={() =>
                                fetchAvailableInvoices(
                                  availablePagination.page - 1
                                )
                              }
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={
                                availablePagination.page >=
                                availablePagination.pages
                              }
                              onClick={() =>
                                fetchAvailableInvoices(
                                  availablePagination.page + 1
                                )
                              }
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Merged Invoices Tab */}
            <TabsContent value="merged">
              <Card>
                <CardHeader>
                  <CardTitle>Merged Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                  {mergedLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full" />
                      ))}
                    </div>
                  ) : mergedInvoices.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Merge className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No merged invoices yet</p>
                    </div>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Merged Invoice</TableHead>
                            <TableHead>Source Invoices</TableHead>
                            <TableHead>Companies</TableHead>
                            <TableHead>Total Amount</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mergedInvoices.map((invoice) => (
                            <TableRow key={invoice._id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <Merge className="h-4 w-4 text-purple-500" />
                                  {invoice.invoiceNumber}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">
                                  {invoice.sourceInvoices?.length || 0} invoices
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {invoice.mergedCompanies
                                    ?.slice(0, 2)
                                    .map((company: any, idx: number) => (
                                      <Badge
                                        key={idx}
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {company.name}
                                      </Badge>
                                    ))}
                                  {(invoice.mergedCompanies?.length || 0) > 2 && (
                                    <Badge variant="outline" className="text-xs">
                                      +
                                      {(invoice.mergedCompanies?.length || 0) - 2}{" "}
                                      more
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatIndianCurrency(
                                  invoice.billDetails?.totalAmount || 0
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Calendar className="h-4 w-4" />
                                  {formatDate(invoice.createdAt)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => fetchMergedDetails(invoice._id)}
                                    disabled={detailsLoading}
                                    title="View Details"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDownload(invoice)}
                                    disabled={downloadingId === invoice._id}
                                    title="Download PDF"
                                  >
                                    {downloadingId === invoice._id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Download className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => {
                                      setDeleteTarget(invoice._id);
                                      setDeleteDialogOpen(true);
                                    }}
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      {/* Pagination */}
                      {mergedPagination.pages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                          <p className="text-sm text-muted-foreground">
                            Page {mergedPagination.page} of {mergedPagination.pages}{" "}
                            ({mergedPagination.total} total)
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={mergedPagination.page <= 1}
                              onClick={() =>
                                fetchMergedInvoices(mergedPagination.page - 1)
                              }
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={
                                mergedPagination.page >= mergedPagination.pages
                              }
                              onClick={() =>
                                fetchMergedInvoices(mergedPagination.page + 1)
                              }
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Merge Confirmation Dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Merge className="h-5 w-5" />
              Merge Invoices
            </DialogTitle>
            <DialogDescription>
              You are about to merge {selectedSummary.count} invoices into one.
              This action cannot be undone, but original invoices will remain
              intact.
            </DialogDescription>
          </DialogHeader>

          {mergeSuccess ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <p className="text-lg font-medium">Invoices Merged Successfully!</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Selected Invoices:</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedSummary.invoices.map((inv) => (
                      <div
                        key={inv._id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>{inv.invoiceNumber}</span>
                        <span className="text-muted-foreground">
                          {formatIndianCurrency(inv.billDetails?.totalAmount || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t flex justify-between font-medium">
                    <span>Total Amount:</span>
                    <span>{formatIndianCurrency(selectedSummary.totalAmount)}</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Notes (optional)
                  </label>
                  <Textarea
                    value={mergeNotes}
                    onChange={(e) => setMergeNotes(e.target.value)}
                    placeholder="Add a note about this merge..."
                    className="mt-1"
                    rows={3}
                  />
                </div>

                {mergeError && (
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {mergeError}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setMergeDialogOpen(false)}
                  disabled={merging}
                >
                  Cancel
                </Button>
                <Button onClick={handleMerge} disabled={merging}>
                  {merging ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Merging...
                    </>
                  ) : (
                    <>
                      <Merge className="h-4 w-4 mr-2" />
                      Merge Invoices
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Merged Invoice Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Merge className="h-5 w-5 text-purple-500" />
              {selectedMerged?.invoiceNumber || "Merged Invoice Details"}
            </DialogTitle>
            <DialogDescription>
              Created on {formatDate(selectedMerged?.createdAt)}
            </DialogDescription>
          </DialogHeader>

          {selectedMerged && (
            <div className="space-y-6">
              {/* Bill Details */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Base Amount</p>
                    <p className="text-lg font-semibold">
                      {formatIndianCurrency(
                        selectedMerged.billDetails?.baseAmount || 0
                      )}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">
                      Service Charge
                    </p>
                    <p className="text-lg font-semibold">
                      {formatIndianCurrency(
                        selectedMerged.billDetails?.serviceCharge || 0
                      )}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">PF Amount</p>
                    <p className="text-lg font-semibold">
                      {formatIndianCurrency(
                        selectedMerged.billDetails?.pfAmount || 0
                      )}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">ESIC Amount</p>
                    <p className="text-lg font-semibold">
                      {formatIndianCurrency(
                        selectedMerged.billDetails?.esicAmount || 0
                      )}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">GST Amount</p>
                    <p className="text-lg font-semibold">
                      {formatIndianCurrency(
                        selectedMerged.billDetails?.gstAmount || 0
                      )}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-lg font-bold text-primary">
                      {formatIndianCurrency(
                        selectedMerged.billDetails?.totalAmount || 0
                      )}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Merged Companies */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Merged Companies
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedMerged.mergedCompanies?.map(
                    (company: any, idx: number) => (
                      <Badge key={idx} variant="secondary">
                        {company.name}
                        {company.location && ` (${company.location})`}
                      </Badge>
                    )
                  )}
                </div>
              </div>

              {/* Source Invoices */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Source Invoices
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedMerged.sourceInvoices?.map((inv: any) => (
                      <TableRow key={inv._id}>
                        <TableCell className="font-medium">
                          {inv.invoiceNumber}
                        </TableCell>
                        <TableCell>
                          {typeof inv.companyId === "object"
                            ? inv.companyId?.name
                            : "Unknown"}
                        </TableCell>
                        <TableCell>
                          {formatIndianCurrency(
                            inv.billDetails?.totalAmount || 0
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Employees */}
              {selectedMerged.processedData?.extractedEmployees?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Employees (
                    {selectedMerged.processedData.extractedEmployees.length})
                  </h4>
                  <div className="max-h-60 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Present Days</TableHead>
                          <TableHead>Salary</TableHead>
                          <TableHead>Source</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedMerged.processedData.extractedEmployees.map(
                          (emp: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell>{emp.name}</TableCell>
                              <TableCell>{emp.presentDays}</TableCell>
                              <TableCell>
                                {formatIndianCurrency(emp.salary || 0)}
                              </TableCell>
                              <TableCell>
                                <div className="text-xs text-muted-foreground">
                                  {emp.sourceCompany}
                                  <br />
                                  {emp.sourceInvoice}
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedMerged.notes && (
                <div>
                  <h4 className="font-medium mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    {selectedMerged.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
            {selectedMerged?.fileUrl && (
              <Button
                onClick={() =>
                  selectedMerged &&
                  handleDownload({
                    _id: selectedMerged._id,
                    invoiceNumber: selectedMerged.invoiceNumber,
                  } as InvoiceItem)
                }
                disabled={downloadingId === selectedMerged?._id}
              >
                {downloadingId === selectedMerged?._id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Individual Invoice Details Dialog */}
      <Dialog open={invoiceDetailsOpen} onOpenChange={setInvoiceDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              {selectedInvoice?.invoiceNumber || "Invoice Details"}
            </DialogTitle>
            <DialogDescription>
              Created on {formatDate(selectedInvoice?.createdAt)}
              {selectedInvoice?.dueDate && ` | Due: ${formatDate(selectedInvoice.dueDate)}`}
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6">
              {/* Status & Company Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={getStatusColor(selectedInvoice.status)}>
                    {selectedInvoice.status || "draft"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Status</p>
                  <Badge className={getStatusColor(selectedInvoice.paymentStatus)}>
                    {selectedInvoice.paymentStatus || "pending"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Company</p>
                  <p className="font-medium">{getCompanyName(selectedInvoice.companyId)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">File</p>
                  <p className="font-medium">
                    {selectedInvoice.fileType?.toUpperCase() || "N/A"}
                    {selectedInvoice.fileSize && ` (${formatBytes(selectedInvoice.fileSize)})`}
                  </p>
                </div>
              </div>

              {/* Bill Details */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Base Amount</p>
                    <p className="text-lg font-semibold">
                      {formatIndianCurrency(selectedInvoice.billDetails?.baseAmount || 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Service Charge</p>
                    <p className="text-lg font-semibold">
                      {formatIndianCurrency(selectedInvoice.billDetails?.serviceCharge || 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">PF Amount</p>
                    <p className="text-lg font-semibold">
                      {formatIndianCurrency(selectedInvoice.billDetails?.pfAmount || 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">ESIC Amount</p>
                    <p className="text-lg font-semibold">
                      {formatIndianCurrency(selectedInvoice.billDetails?.esicAmount || 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">GST Amount</p>
                    <p className="text-lg font-semibold">
                      {formatIndianCurrency(selectedInvoice.billDetails?.gstAmount || 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-lg font-bold text-primary">
                      {formatIndianCurrency(selectedInvoice.billDetails?.totalAmount || 0)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Meta Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {selectedInvoice.taxType && (
                  <div>
                    <p className="text-muted-foreground">Tax Type</p>
                    <p className="font-medium">{selectedInvoice.taxType.toUpperCase()}</p>
                  </div>
                )}
                {selectedInvoice.paymentMethod && (
                  <div>
                    <p className="text-muted-foreground">Payment Method</p>
                    <p className="font-medium">{selectedInvoice.paymentMethod}</p>
                  </div>
                )}
                {selectedInvoice.gstPaidBy && (
                  <div>
                    <p className="text-muted-foreground">GST Paid By</p>
                    <p className="font-medium">{selectedInvoice.gstPaidBy}</p>
                  </div>
                )}
                {selectedInvoice.serviceChargeRate !== undefined && (
                  <div>
                    <p className="text-muted-foreground">Service Charge Rate</p>
                    <p className="font-medium">{selectedInvoice.serviceChargeRate}%</p>
                  </div>
                )}
              </div>

              {/* Bill To */}
              {selectedInvoice.billTo && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Bill To
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm bg-muted p-4 rounded-lg">
                    {selectedInvoice.billTo.name && (
                      <div>
                        <p className="text-muted-foreground">Name</p>
                        <p className="font-medium">{selectedInvoice.billTo.name}</p>
                      </div>
                    )}
                    {selectedInvoice.billTo.gstNumber && (
                      <div>
                        <p className="text-muted-foreground">GST Number</p>
                        <p className="font-medium">{selectedInvoice.billTo.gstNumber}</p>
                      </div>
                    )}
                    {selectedInvoice.billTo.contactInfo && (
                      <div>
                        <p className="text-muted-foreground">Contact</p>
                        <p className="font-medium">{selectedInvoice.billTo.contactInfo}</p>
                      </div>
                    )}
                    {selectedInvoice.billTo.address && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Address</p>
                        <p className="font-medium">{selectedInvoice.billTo.address}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Attendance Summary */}
              {selectedInvoice.attendanceData && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Attendance Summary
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-muted p-4 rounded-lg">
                    <div>
                      <p className="text-muted-foreground">Total Employees</p>
                      <p className="font-medium">{selectedInvoice.attendanceData.totalEmployees || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Present Days</p>
                      <p className="font-medium">{selectedInvoice.attendanceData.totalPresentDays || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Per Day Rate</p>
                      <p className="font-medium">
                        {formatIndianCurrency(selectedInvoice.attendanceData.perDayRate || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Working Days</p>
                      <p className="font-medium">{selectedInvoice.attendanceData.workingDays || 0}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Employees List */}
              {selectedInvoice.processedData?.extractedEmployees &&
                selectedInvoice.processedData.extractedEmployees.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Employees ({selectedInvoice.processedData.extractedEmployees.length})
                    </h4>
                    <div className="max-h-60 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Present Days</TableHead>
                            <TableHead>Salary</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedInvoice.processedData.extractedEmployees.map(
                            (emp: any, idx: number) => (
                              <TableRow key={idx}>
                                <TableCell>{emp.name}</TableCell>
                                <TableCell>{emp.presentDays || emp.present_day || 0}</TableCell>
                                <TableCell>
                                  {formatIndianCurrency(emp.salary || 0)}
                                </TableCell>
                              </TableRow>
                            )
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

              {/* Notes */}
              {selectedInvoice.notes && (
                <div>
                  <h4 className="font-medium mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    {selectedInvoice.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setInvoiceDetailsOpen(false)}>
              Close
            </Button>
            {selectedInvoice?.fileUrl && (
              <Button
                onClick={() => selectedInvoice && handleDownload(selectedInvoice)}
                disabled={downloadingId === selectedInvoice?._id}
              >
                {downloadingId === selectedInvoice?._id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Merged Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the merged invoice. The original source invoices
              will remain intact and can be merged again if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProtectedRoute>
  );
}
