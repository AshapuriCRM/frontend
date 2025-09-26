# AI-Powered Invoice Generation Feature

## Overview
The AI Invoice Generation feature has been successfully integrated into the Ashapuri CRM project. This feature allows users to upload attendance files (PDF, Excel, Images) and automatically generate professional invoices using AI-powered data extraction.

## Features Implemented

### Frontend Components
1. **AttendanceUpload.tsx** - AI-powered file upload and data extraction
   - Supports PDF, Excel (.xlsx, .xls), and Image files
   - Real-time processing progress with visual feedback
   - Automatic salary calculations with EPF/ESIC deductions
   - Attendance data validation and error handling

2. **InvoicePDFGenerator.tsx** - Professional PDF invoice generation
   - Uses @react-pdf/renderer for high-quality PDF generation
   - Matches original Ashapuri Security Services invoice format
   - Automatic calculations with GST, service charges, and statutory deductions
   - Customizable bill-to information

3. **Enhanced Invoice Page** - Tabbed interface with three modes:
   - **AI Invoice Generation**: Upload and process attendance files
   - **Generate PDF**: Create professional invoices from processed data
   - **Manual Invoice**: Traditional file-based invoice creation

### Backend API
1. **Invoice Controller** (`invoiceController.js`)
   - AI-powered attendance file processing
   - Integration with external AI service
   - Automatic salary and tax calculations
   - File upload handling with validation
   - Invoice CRUD operations with statistics

2. **Invoice Routes** (`invoiceRoutes.js`)
   - POST `/api/invoices/process-attendance` - Process attendance files
   - GET `/api/invoices/company/:companyId` - Get company invoices
   - GET `/api/invoices/stats/:companyId` - Invoice statistics
   - PUT/DELETE operations for invoice management

3. **Enhanced Invoice Model** - Already supports:
   - Attendance data storage
   - Processed employee data
   - Bill details with tax calculations
   - File metadata and processing status

## How to Use

### 1. Start the Application
```bash
# Frontend
cd Ashapuri_CRM
npm run dev

# Backend
cd backend
npm run dev
```

### 2. Access Invoice Generation
1. Login to the CRM dashboard
2. Navigate to any company dashboard
3. Go to the "Invoice" section
4. Select the "AI Invoice Generation" tab

### 3. Upload Attendance File
1. Click "Select File" and choose a PDF, Excel, or image file
2. Adjust the daily wage rate if needed (default: ₹466)
3. Click "Upload & Extract Data"
4. Wait for AI processing to complete

### 4. Review Extracted Data
- View employee-wise attendance data
- Check salary calculations (Gross, EPF, ESIC, Net)
- Verify total statistics
- If data looks correct, proceed to PDF generation

### 5. Generate Professional Invoice
1. Switch to "Generate PDF" tab (auto-activated after successful processing)
2. Enter client name in "Bill To" field
3. Review invoice preview with all calculations
4. Click "Download Invoice PDF"

## Technical Details

### Dependencies Added
- `@react-pdf/renderer`: Professional PDF generation
- `axios`: API calls to AI service
- `form-data`: File upload handling
- `multer`: Backend file processing

### AI Service Integration
- Uses external API: `https://ai-invoice-generator-python.onrender.com/upload/`
- Supports multiple file formats
- Robust error handling and timeout management
- Automatic data validation and cleanup

### Calculations Implemented
- **Base Amount**: Present Days × Daily Rate
- **PF**: 13% of base amount
- **ESIC**: 3.25% of base amount
- **Service Charge**: 7% of base amount
- **CGST/SGST**: 9% each of taxable amount
- **Grand Total**: All inclusive with proper rounding

### File Storage
- Uploaded files stored in `/backend/uploads/attendance/`
- File metadata stored in database
- Automatic cleanup on errors
- Size limit: 10MB per file

## Testing the Feature

### Sample Test Flow
1. Prepare a test attendance file (PDF/Excel with employee names and attendance data)
2. Upload through the AI Invoice Generation interface
3. Verify extracted data matches the original file
4. Generate and download the professional invoice PDF
5. Check that all calculations are correct

### Error Handling
- Invalid file types are rejected
- Large files (>10MB) are blocked
- AI service timeouts are handled gracefully
- Database errors are logged and reported
- File cleanup on processing failures

## API Endpoints

### Process Attendance File
```
POST /api/invoices/process-attendance
Content-Type: multipart/form-data

Body:
- attendanceFile: File
- companyId: String
- perDayRate: Number (optional, default: 466)
```

### Get Company Invoices
```
GET /api/invoices/company/:companyId?page=1&limit=10&status=paid
```

### Invoice Statistics
```
GET /api/invoices/stats/:companyId
```

## Next Steps
1. Test with various file formats and data structures
2. Add more customization options for invoice templates
3. Implement email sending functionality
4. Add invoice history and tracking features
5. Consider adding OCR improvements for better accuracy

## Security Considerations
- All file uploads are validated for type and size
- Uploaded files are stored securely with unique names
- API endpoints are protected with authentication
- Input validation on all user data
- Proper error handling without exposing internal details

The AI Invoice Generation feature is now fully integrated and ready for testing!