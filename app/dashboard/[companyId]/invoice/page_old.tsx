'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnimatedPage } from '@/components/ui/animated-page';
import { Plus, Eye, FileText, Download, Upload, File, FileSpreadsheet, Image, Bot, Zap } from 'lucide-react';
import AttendanceUpload from '@/components/attendance/AttendanceUpload';
import InvoicePDFGenerator from '@/components/invoice/InvoicePDFGenerator';

// Updated Invoice interface to match new structure
interface Invoice {
  id: string;
  invoiceNumber: string;
  companyId: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  taxType: 'gst' | 'igst';
  paymentMethod: 'paid-by-us' | 'paid-by-principal';
  totalAmount: number;
  createdAt: Date;
  status: 'draft' | 'sent' | 'paid';
}

interface AttendanceData {
  name: string;
  present_day: number;
  total_day: number;
}

interface AttendanceStats {
  totalEmployees: number;
  totalGross: number;
  totalNet: number;
  totalPresentDays: number;
}

interface InvoicePageClientProps {
  params: { companyId: string };
}

// Mock data with new structure
const mockFileBasedInvoices: Invoice[] = [
  {
    id: '1',
    invoiceNumber: 'INV-2024-001',
    companyId: 'company-1',
    fileName: 'attendance_january_2024.xlsx',
    fileType: 'excel',
    fileUrl: '/uploads/attendance_january_2024.xlsx',
    taxType: 'gst',
    paymentMethod: 'paid-by-us',
    totalAmount: 125000,
    createdAt: new Date('2024-01-15'),
    status: 'paid'
  },
  {
    id: '2',
    invoiceNumber: 'INV-2024-002',
    companyId: 'company-1',
    fileName: 'attendance_february_2024.pdf',
    fileType: 'pdf',
    fileUrl: '/uploads/attendance_february_2024.pdf',
    taxType: 'igst',
    paymentMethod: 'paid-by-principal',
    totalAmount: 98500,
    createdAt: new Date('2024-02-10'),
    status: 'sent'
  }
];

export default function InvoicePage({ params }: InvoicePageClientProps) {
  const [invoices, setInvoices] = useState<Invoice[]>(
    mockFileBasedInvoices.filter(i => i.companyId === params.companyId)
  );
  const [attendanceFile, setAttendanceFile] = useState<File | null>(null);
  const [taxType, setTaxType] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [customAmount, setCustomAmount] = useState<number>(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  
  // AI Invoice Generation States
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [perDay, setPerDay] = useState<number>(466);
  const [activeTab, setActiveTab] = useState<string>('ai-invoice');

  const getFileType = (fileName: string): string => {
    const extension = fileName.toLowerCase().split('.').pop();
    switch (extension) {
      case 'pdf':
        return 'pdf';
      case 'xlsx':
      case 'xls':
        return 'excel';
      case 'jpg':
      case 'jpeg':
      case 'png':
        return 'image';
      default:
        return 'unknown';
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'excel':
        return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
      case 'image':
        return <Image className="h-5 w-5 text-blue-500" />;
      default:
        return <File className="h-5 w-5" />;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setAttendanceFile(file);
  };

  const generateInvoice = () => {
    if (!attendanceFile || !taxType || !paymentMethod) return;

    const fileUrl = `/uploads/${attendanceFile.name}`;
    const fileType = getFileType(attendanceFile.name);

    const newInvoice: Invoice = {
      id: Date.now().toString(),
      invoiceNumber: `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`,
      companyId: params.companyId,
      fileName: attendanceFile.name,
      fileType,
      fileUrl,
      taxType: taxType as 'gst' | 'igst',
      paymentMethod: paymentMethod as 'paid-by-us' | 'paid-by-principal',
      totalAmount: customAmount || Math.floor(Math.random() * 100000) + 50000,
      createdAt: new Date(),
      status: 'draft'
    };

    setInvoices([newInvoice, ...invoices]);
    
    // Reset form
    setAttendanceFile(null);
    setTaxType('');
    setPaymentMethod('');
    setCustomAmount(0);
    
    // Reset file input
    const fileInput = document.getElementById('attendance-file') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handlePreview = (invoice: Invoice) => {
    setPreviewInvoice(invoice);
    setIsPreviewOpen(true);
  };

  const handleFileDownload = (invoice: Invoice) => {
    console.log(`Downloading file: ${invoice.fileName}`);
    alert(`Would download: ${invoice.fileName}`);
  };

  const handleFileView = (invoice: Invoice) => {
    console.log(`Viewing file: ${invoice.fileName}`);
    alert(`Would open file viewer for: ${invoice.fileName}`);
  };

  const handleAttendanceDataProcessed = (data: AttendanceData[], stats: AttendanceStats, dailyRate: number) => {
    setAttendanceData(data);
    setAttendanceStats(stats);
    setPerDay(dailyRate);
    setActiveTab('generate-pdf');
  };

  return (
    <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Invoice Generator</h1>
          <p className="text-muted-foreground text-base">AI-powered attendance processing and professional invoice generation</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ai-invoice" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              AI Invoice Generation
            </TabsTrigger>
            <TabsTrigger value="generate-pdf" disabled={!attendanceStats} className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Generate PDF
            </TabsTrigger>
            <TabsTrigger value="manual-invoice" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Manual Invoice
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai-invoice" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-6 w-6 text-blue-500" />
                  AI-Powered Invoice Generation
                </CardTitle>
                <CardDescription>
                  Upload attendance files, extract data using AI, and generate professional invoices automatically
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AttendanceUpload onDataProcessed={handleAttendanceDataProcessed} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="generate-pdf" className="space-y-6 mt-6">
            {attendanceStats && (
              <InvoicePDFGenerator
                attendanceData={attendanceData}
                stats={attendanceStats}
                perDay={perDay}
                companyId={params.companyId}
              />
            )}
          </TabsContent>

          <TabsContent value="manual-invoice" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Invoice Generator - Takes more space */}
          <div className="xl:col-span-2">
            <Card className="h-fit">
              <CardHeader className="!pb-0">
                <CardTitle className="text-2xl">Generate New Invoice</CardTitle>
                <CardDescription className="text-base">Upload attendance file and configure invoice settings</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6 p-6">
                {/* File Upload Section */}
              <div className="space-y-2">
                <Label htmlFor="attendance-file" className="text-lg font-semibold">Upload Attendance File</Label>
                {attendanceFile ? (
                  <div className="flex items-center justify-between p-4 bg-muted rounded-xl border">
                    <div className="flex items-center gap-4">
                      {getFileIcon(getFileType(attendanceFile.name))}
                      <div>
                        <p className="font-medium truncate">{attendanceFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(attendanceFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAttendanceFile(null);
                          const fileInput = document.getElementById('attendance-file') as HTMLInputElement;
                          if (fileInput) fileInput.value = '';
                        }}
                      >
                        Remove
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const fileInput = document.getElementById('attendance-file') as HTMLInputElement;
                          if (fileInput) fileInput.click();
                        }}
                      >
                        Replace
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label 
                    htmlFor="attendance-file" 
                    className="flex flex-col items-center justify-center w-full h-64 px-6 py-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:border-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                  >
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <Upload className="w-12 h-12 text-gray-400" />
                      <div className="text-center">
                        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                          <span className="text-primary">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                          PDF, Excel (.xlsx, .xls), Images (.jpg, .jpeg, .png)
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Maximum file size: 10MB</p>
                      </div>
                    </div>
                  </label>
                )}
                <input 
                  id="attendance-file" 
                  type="file" 
                  accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png" 
                  onChange={handleFileChange}
                  className="hidden" 
                />
              </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="tax-type" className="text-lg font-semibold">Tax Type</Label>
                    <Select value={taxType} onValueChange={setTaxType}>
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue placeholder="Select tax type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gst" className="text-base">GST (Goods and Services Tax)</SelectItem>
                        <SelectItem value="igst" className="text-base">IGST (Integrated GST)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="payment-method" className="text-lg font-semibold">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid-by-us" className="text-base">Paid by Us</SelectItem>
                        <SelectItem value="paid-by-principal" className="text-base">Paid by Principal Employer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="custom-amount" className="text-lg font-semibold">Invoice Amount (Optional)</Label>
                  <Input
                    id="custom-amount"
                    type="number"
                    placeholder="Enter invoice amount (₹)"
                    value={customAmount || ''}
                    onChange={(e) => setCustomAmount(Number(e.target.value))}
                    className="h-12 text-base"
                  />
                  <p className="text-sm text-muted-foreground">
                    Leave empty to auto-calculate from attendance data
                  </p>
                </div>

                {/* File Information Preview */}
                {attendanceFile && (
                  <div className="bg-muted/50 border rounded-xl p-6 space-y-4">
                    <h4 className="text-lg font-semibold flex items-center gap-2">
                      <File className="h-5 w-5" />
                      File Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">File:</span>
                          <div className="flex items-center gap-2">
                            {getFileIcon(getFileType(attendanceFile.name))}
                            <span className="truncate font-medium">{attendanceFile.name}</span>
                          </div>
                        </div>
                        <div>
                          <span className="font-medium">Size:</span> {(attendanceFile.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium">Tax Type:</span> {taxType ? taxType.toUpperCase() : 'Not selected'}
                        </div>
                        <div>
                          <span className="font-medium">Payment:</span> {paymentMethod ? (paymentMethod === 'paid-by-us' ? 'Paid by Us' : 'Paid by Principal Employer') : 'Not selected'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}


                {/* Generate Button */}
                <Button 
                  onClick={generateInvoice} 
                  className="w-full h-14 text-lg font-semibold rounded-xl" 
                  disabled={!attendanceFile || !taxType || !paymentMethod}
                >
                  <Plus className="h-6 w-6 mr-3" />
                  Generate Invoice
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Invoices - Sidebar */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Recent Invoices</CardTitle>
                <CardDescription>Your latest generated invoices</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {invoices.slice(0, 5).map((invoice) => (
                  <div key={invoice.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{invoice.invoiceNumber}</p>
                        <Badge variant={invoice.status === 'paid' ? 'default' : invoice.status === 'sent' ? 'secondary' : 'outline'}>
                          {invoice.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {getFileIcon(invoice.fileType)}
                        <span className="truncate">{invoice.fileName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-lg">₹{invoice.totalAmount.toLocaleString()}</p>
                        <Button size="sm" variant="ghost" onClick={() => handlePreview(invoice)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-xs">
                          {invoice.taxType.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {invoice.paymentMethod === 'paid-by-us' ? 'By Us' : 'By Principal'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* All Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">All Invoices</CardTitle>
            <CardDescription>Complete list of generated invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-base">Invoice #</TableHead>
                  <TableHead className="text-base">File</TableHead>
                  <TableHead className="text-base">Tax Type</TableHead>
                  <TableHead className="text-base">Payment Method</TableHead>
                  <TableHead className="text-base">Amount</TableHead>
                  <TableHead className="text-base">Status</TableHead>
                  <TableHead className="text-base">Date</TableHead>
                  <TableHead className="text-base">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id} className="text-base">
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getFileIcon(invoice.fileType)}
                        <span className="truncate max-w-32">{invoice.fileName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{invoice.taxType.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {invoice.paymentMethod === 'paid-by-us' ? 'By Us' : 'By Principal'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">₹{invoice.totalAmount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={invoice.status === 'paid' ? 'default' : invoice.status === 'sent' ? 'secondary' : 'outline'}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{invoice.createdAt.toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handlePreview(invoice)} title="Preview Invoice">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleFileView(invoice)} title="View File">
                          <Upload className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleFileDownload(invoice)} title="Download File">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Invoice Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <FileText className="h-6 w-6" />
                Invoice Preview
              </DialogTitle>
            </DialogHeader>
            {previewInvoice && (
              <div className="space-y-8 p-2">
                <div className="text-center border-b pb-6">
                  <h2 className="text-3xl font-bold">INVOICE</h2>
                  <p className="text-muted-foreground text-lg">#{previewInvoice.invoiceNumber}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Bill To:</h3>
                    <div className="text-muted-foreground">
                      <p>Client Company</p>
                      <p>Address Line 1</p>
                      <p>City, State, PIN</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="space-y-1">
                      <p><strong>Date:</strong> {previewInvoice.createdAt.toLocaleDateString()}</p>
                      <p><strong>Status:</strong> <Badge>{previewInvoice.status}</Badge></p>
                      <p><strong>Tax Type:</strong> {previewInvoice.taxType.toUpperCase()}</p>
                      <p><strong>Payment:</strong> {previewInvoice.paymentMethod === 'paid-by-us' ? 'Paid by Us' : 'Paid by Principal Employer'}</p>
                    </div>
                  </div>
                </div>

                {/* Attachment Section */}
                <div className="border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Attached Files</h3>
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-4">
                      {getFileIcon(previewInvoice.fileType)}
                      <div>
                        <p className="font-medium text-lg">{previewInvoice.fileName}</p>
                        <p className="text-sm text-muted-foreground">
                          {previewInvoice.fileType.toUpperCase()} File
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => handleFileView(previewInvoice)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button variant="outline" onClick={() => handleFileDownload(previewInvoice)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Invoice Details */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-base">Description</TableHead>
                      <TableHead className="text-right text-base">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="text-base">Attendance-based Services</TableCell>
                      <TableCell className="text-right text-base">₹{(previewInvoice.totalAmount * 0.85).toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-base">{previewInvoice.taxType.toUpperCase()} (18%)</TableCell>
                      <TableCell className="text-right text-base">₹{(previewInvoice.totalAmount * 0.15).toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow className="border-t-2">
                      <TableCell className="font-semibold text-lg">Total Amount</TableCell>
                      <TableCell className="text-right font-semibold text-lg">₹{previewInvoice.totalAmount.toLocaleString()}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <div className="text-muted-foreground bg-muted/50 p-4 rounded-lg">
                  <p><strong>Payment Method:</strong> {previewInvoice.paymentMethod === 'paid-by-us' ? 'Amount will be paid by us' : 'Amount will be paid by Principal Employer'}</p>
                  <p><strong>Attendance File:</strong> {previewInvoice.fileName}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
            </div>
          </TabsContent>
        </Tabs>
      </div>
  );
}
