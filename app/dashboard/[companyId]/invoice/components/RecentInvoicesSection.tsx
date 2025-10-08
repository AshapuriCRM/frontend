"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  DollarSign,
  Eye,
  FileText,
  Loader2,
  Trash2,
  Users,
} from "lucide-react";
import { formatCurrency, formatDate, getStatusColor } from "../utils/index";
import type { RecentInvoice } from "../types";

interface Props {
  isLoading: boolean;
  invoices: RecentInvoice[];
  company?: { name?: string } | null;
  onView: (invoice: RecentInvoice) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}

export function RecentInvoicesSection({
  isLoading,
  invoices,
  company,
  onView,
  onDelete,
  deletingId,
}: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Recent Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
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
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" /> Recent Invoices
        </CardTitle>
      </CardHeader>
      <CardContent>
        {invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Invoice
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Employees
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice, index) => (
                  <tr
                    key={invoice._id || invoice.id || index}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {invoice.invoiceNumber}
                          </p>
                          <p className="text-sm text-gray-500 truncate max-w-32">
                            {typeof invoice.companyId === "object" &&
                            invoice.companyId?.name
                              ? invoice.companyId.name
                              : invoice.companyName || company?.name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {formatDate(invoice.createdAt || new Date())}
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
                      <Badge
                        className={getStatusColor(invoice.status || "draft")}
                      >
                        {(invoice.status || "draft").charAt(0).toUpperCase() +
                          (invoice.status || "draft").slice(1)}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {invoice.attendanceData?.totalEmployees ||
                            invoice.employeeCount ||
                            0}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                          onClick={() => onView(invoice)}
                        >
                          <Eye className="h-4 w-4" /> View
                        </Button>
                        <button
                          className="p-1 rounded-md hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                          onClick={() =>
                            onDelete(invoice._id || invoice.id || "")
                          }
                          disabled={deletingId === (invoice._id || invoice.id)}
                          title="Delete invoice"
                        >
                          {deletingId === (invoice._id || invoice.id) ? (
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No invoices yet
            </h3>
            <p className="text-gray-500">
              Generate your first invoice by uploading an attendance document
              above.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
