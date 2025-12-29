"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2, Upload } from "lucide-react";
import { getSupportedFormats } from "../utils/index";

interface Props {
  file: File | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
  isProcessing: boolean;
}

export function FileUploadSection({
  file,
  onFileChange,
  onUpload,
  isProcessing,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Attendance Document
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file-upload">Select File</Label>
          <Input
            id="file-upload"
            type="file"
            onChange={onFileChange}
            accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png"
            className="cursor-pointer"
          />
          <div className="text-sm text-muted-foreground">
            Supported formats: {getSupportedFormats().join(", ")}
          </div>
        </div>
        {file && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <FileText className="h-4 w-4" />
            <span className="text-sm font-medium">{file.name}</span>
            <Badge variant="secondary">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </Badge>
          </div>
        )}
        <Button
          onClick={onUpload}
          disabled={!file || isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing with
              AI...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" /> Process Document
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
