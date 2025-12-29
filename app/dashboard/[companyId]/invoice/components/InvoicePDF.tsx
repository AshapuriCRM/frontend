"use client";

import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { numberToWords } from "../utils/index";
import type { AttendanceRecord } from "../types";

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

export interface InvoicePDFProps {
  totalEmployees: number;
  totalPresentDays: number;
  perDay: number;
  billTo: string;
  extractedData: AttendanceRecord[];
  gstPaidBy: string;
  serviceChargeRate: number;
  bonusRate: number;
  overtimeRate: number;
}

export function InvoicePDF({
  totalEmployees,
  totalPresentDays,
  perDay,
  billTo,
  extractedData,
  gstPaidBy,
  serviceChargeRate,
  bonusRate,
  overtimeRate,
}: InvoicePDFProps) {
  const SERVICE_CHARGE_RATE = serviceChargeRate / 100;
  const PF_RATE = 0.13;
  const ESIC_RATE = 0.0325;
  const BONUS_RATE = bonusRate / 100;
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

  // Determine month type from total_day field (typically the max value)
  const workingDaysInMonth = Math.max(...extractedData.map(emp => emp.total_day || 0));
  // Calculate overtime threshold: month days - 4 (30-4=26, 31-4=27, etc.)
  const overtimeThreshold = workingDaysInMonth - 4;

  // Calculate regular and overtime days for each employee
  let totalRegularDays = 0;
  let totalOvertimeDays = 0;

  extractedData.forEach(emp => {
    const presentDays = emp.present_day;
    if (presentDays > overtimeThreshold) {
      totalRegularDays += overtimeThreshold;
      totalOvertimeDays += (presentDays - overtimeThreshold);
    } else {
      totalRegularDays += presentDays;
    }
  });

  const baseTotal = totalRegularDays * Number(perDay);
  const overtimeAmount = totalOvertimeDays * Number(perDay) * overtimeRate;
  const totalWithOvertime = baseTotal + overtimeAmount;

  // Apply PF, ESIC, and Bonus on the total (base + overtime)
  const pf = totalWithOvertime * PF_RATE;
  const esic = totalWithOvertime * ESIC_RATE;
  const bonus = totalWithOvertime * BONUS_RATE;
  const subTotal = totalWithOvertime + pf + esic + bonus;
  const roundOffSubTotal = Math.round(subTotal);
  const serviceCharge = roundOffSubTotal * SERVICE_CHARGE_RATE;
  const serviceChargeTotal = serviceCharge;
  const totalBeforeTax = roundOffSubTotal + serviceChargeTotal;
  const cgst = totalBeforeTax * CGST_RATE;
  const sgst = totalBeforeTax * SGST_RATE;

  const grandTotal =
    gstPaidBy === "ashapuri"
      ? Math.round(totalBeforeTax + cgst + sgst)
      : Math.round(totalBeforeTax);

  const grandTotalInWords = numberToWords(grandTotal);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.companyName}>ASHAPURI SECURITY SERVICES</Text>
          </View>
          <View style={styles.invoiceTitle}>
            <Text>INVOICE</Text>
          </View>
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
                SECURITY SERVICES (Regular)
              </Text>
              <Text style={styles.tableCell}>998514</Text>
              <Text style={styles.tableCell}>{totalRegularDays}</Text>
              <Text style={styles.tableCell}>{Number(perDay).toFixed(2)}</Text>
              <Text style={styles.tableCell}>{baseTotal.toFixed(2)}</Text>
            </View>
            {totalOvertimeDays > 0 && (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 0.5 }]}>2</Text>
                <Text
                  style={[styles.tableCell, styles.tableCellLeft, { flex: 2 }]}
                >
                  OVERTIME ({overtimeRate}x rate)
                </Text>
                <Text style={styles.tableCell}>998514</Text>
                <Text style={styles.tableCell}>{totalOvertimeDays}</Text>
                <Text style={styles.tableCell}>{(Number(perDay) * overtimeRate).toFixed(2)}</Text>
                <Text style={styles.tableCell}>{overtimeAmount.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.tableRow}>
              <Text
                style={[
                  styles.tableCell,
                  { flex: 5, textAlign: "right", fontWeight: "bold" },
                ]}
              >
                TOTAL
              </Text>
              <Text style={styles.tableCell}>{totalWithOvertime.toFixed(2)}</Text>
            </View>
          </View>
          <View style={styles.totalsSection}>
            <View style={styles.calculations}>
              <Text>PF @13%</Text>
              <Text>ESIC @3.25%</Text>
              {bonusRate > 0 && <Text>Bonus @{bonusRate}%</Text>}
              <Text style={{ marginTop: 5, fontWeight: "bold" }}>
                SUB TOTAL
              </Text>
              <Text style={{ marginTop: 5 }}>
                Service charge @{serviceChargeRate}%
              </Text>
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
              {bonusRate > 0 && (
                <View style={styles.totalRow}>
                  <Text></Text>
                  <Text>{bonus.toFixed(2)}</Text>
                </View>
              )}
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
          <View style={styles.gstSection}>
            <Text style={{ fontWeight: "bold" }}>
              Note:- As per Notification no. 29/2018 dated 31.12.2018
            </Text>
            <Text style={{ fontWeight: "bold" }}>
              {gstPaidBy === "principal-employer"
                ? "100% GST paid directly by you"
                : "100% GST paid by Ashapuri Security Services"}
            </Text>
            <View style={styles.bankDetails}>
              <Text style={{ fontWeight: "bold" }}>PUNJAB NATIONAL BANK</Text>
              <Text>Pls Transfer Payment C/A 0788101000960</Text>
              <Text>IFSC CODE : PUNB0078810</Text>
              <Text>SCH. NO. 54, VIJAY NAGAR, INDORE</Text>
            </View>
          </View>
          <View style={styles.grandTotalSection}>
            <Text style={{ fontSize: 16, marginBottom: 5 }}>
              GRAND TOTAL {grandTotal}
            </Text>
            <Text style={styles.amountWords}>{grandTotalInWords}</Text>
          </View>
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
}
