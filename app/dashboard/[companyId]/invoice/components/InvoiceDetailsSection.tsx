"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  billTo: string;
  setBillTo: (v: string) => void;
  isLoadingCompany: boolean;
  company?: { name?: string } | null;
  gstPaidBy: string;
  setGstPaidBy: (v: string) => void;
  serviceChargeRate: number;
  setServiceChargeRate: (v: number) => void;
  bonusRate: number;
  setBonusRate: (v: number) => void;
  overtimeRate: number;
  setOvertimeRate: (v: number) => void;
}

export function InvoiceDetailsSection({
  billTo,
  setBillTo,
  isLoadingCompany,
  company,
  gstPaidBy,
  setGstPaidBy,
  serviceChargeRate,
  setServiceChargeRate,
  bonusRate,
  setBonusRate,
  overtimeRate,
  setOvertimeRate,
}: Props) {
  return (
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
                : "This will appear on the generated invoice"}
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
                  <SelectItem value="principal-employer">
                    Principal Employer
                  </SelectItem>
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
                min={0}
                max={100}
                step={0.1}
              />
              <p className="text-sm text-gray-600 mt-1">
                Service charge percentage to be applied on the base amount
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bonus-rate">Bonus (% of Base) *</Label>
              <Input
                id="bonus-rate"
                type="number"
                value={bonusRate}
                onChange={(e) => setBonusRate(Number(e.target.value))}
                placeholder="Enter bonus percentage"
                className="mt-1"
                min={0}
                max={100}
                step={0.1}
              />
              <p className="text-sm text-gray-600 mt-1">
                Bonus percentage to be applied on the base amount
              </p>
            </div>

            <div>
              <Label htmlFor="overtime-rate">Overtime Rate (Multiplier) *</Label>
              <Input
                id="overtime-rate"
                type="number"
                value={overtimeRate}
                onChange={(e) => setOvertimeRate(Number(e.target.value))}
                placeholder="Enter overtime multiplier (e.g., 1.5)"
                className="mt-1"
                min={1}
                max={3}
                step={0.1}
              />
              <p className="text-sm text-gray-600 mt-1">
                Overtime pay multiplier (1.5x means 150% of normal rate)
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
