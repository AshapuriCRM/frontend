"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AnimatedPage } from "@/components/ui/animated-page";
import { CompanyFolder, CompanyFolderFile } from "@/lib/types";
import { useDropzone } from "react-dropzone";
import {
  Folder,
  ArrowLeft,
  Upload,
  Search,
  List,
  LayoutGrid,
  Trash2,
  Pencil,
  Download,
  Eye,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface FolderPageProps {
  params: { companyId: string; folderId: string };
}

export default function FolderPage({ params }: FolderPageProps) {
  const router = useRouter();
  const [folder, setFolder] = useState<CompanyFolder | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<
    "created_desc" | "created_asc" | "name_asc" | "name_desc"
  >("created_desc");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [isRenaming, setIsRenaming] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [fileForRename, setFileForRename] = useState<CompanyFolderFile | null>(
    null
  );
  const [newFileName, setNewFileName] = useState("");
  const [previewFile, setPreviewFile] = useState<CompanyFolderFile | null>(
    null
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetchFolder = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.getCompanyFolderById(
        params.companyId,
        params.folderId
      );
      if (res.success && res.data) {
        setFolder(res.data);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to fetch folder");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFolder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.companyId, params.folderId]);

  const files = useMemo(() => folder?.files || [], [folder]);

  const filteredSortedFiles = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let list = files.filter((f) => f.name.toLowerCase().includes(term));
    switch (sortBy) {
      case "name_asc":
        list = list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name_desc":
        list = list.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "created_asc":
        list = list.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        break;
      case "created_desc":
      default:
        list = list.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
    }
    return list;
  }, [files, searchTerm, sortBy]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      try {
        if (!acceptedFiles?.length) return;
        await apiClient.uploadCompanyFolderFiles(
          params.companyId,
          params.folderId,
          acceptedFiles
        );
        toast.success("Files uploaded");
        fetchFolder();
      } catch (err: any) {
        toast.error(err?.message || "Failed to upload");
      }
    },
    [params.companyId, params.folderId]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
      "image/jpeg": [".jpeg", ".jpg"],
      "image/png": [".png"],
      "text/csv": [".csv"],
    },
  });

  const handleDeleteFile = async (file: CompanyFolderFile) => {
    try {
      await apiClient.deleteCompanyFolderFile(
        params.companyId,
        params.folderId,
        file._id
      );
      toast.success("File deleted");
      fetchFolder();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete");
    }
  };

  const handleDownload = async (file: CompanyFolderFile) => {
    try {
      const { blob, filename } = await apiClient.downloadCompanyFolderFile(
        params.companyId,
        params.folderId,
        file._id
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err?.message || "Failed to download");
    }
  };

  const handleRenameFolder = async () => {
    try {
      if (!newFolderName.trim() || !folder) return;
      const res = await apiClient.renameCompanyFolder(
        params.companyId,
        folder._id,
        newFolderName.trim()
      );
      if (res.success) {
        toast.success("Folder renamed");
        setIsRenaming(false);
        setNewFolderName("");
        fetchFolder();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to rename folder");
    }
  };

  const handleRenameFile = async () => {
    try {
      if (!fileForRename || !newFileName.trim()) return;
      const res = await apiClient.renameCompanyFolderFile(
        params.companyId,
        params.folderId,
        fileForRename._id,
        newFileName.trim()
      );
      if (res.success) {
        toast.success("File renamed");
        setFileForRename(null);
        setNewFileName("");
        fetchFolder();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to rename file");
    }
  };

  const handleDeleteFolder = async () => {
    try {
      if (!folder) return;
      await apiClient.deleteCompanyFolder(params.companyId, folder._id);
      toast.success("Folder deleted");
      router.push(`/dashboard/${params.companyId}/documents`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete folder");
    }
  };

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleString() : "");

  return (
    <AnimatedPage>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                router.push(`/dashboard/${params.companyId}/documents`)
              }
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {folder?.folder_name || "Folder"}
              </h1>
              <p className="text-muted-foreground">
                {folder?.files?.length || 0} file
                {(folder?.files?.length || 0) !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsRenaming(true);
                setNewFolderName(folder?.folder_name || "");
              }}
            >
              Rename
            </Button>
            <Button
              variant="outline"
              className="text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
          </div>
        </div>

        {/* Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" /> Upload Files
            </CardTitle>
            <CardDescription>
              Drag and drop files or click to browse
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg mb-2">
                Drag & drop files here, or click to select
              </p>
              <p className="text-sm text-muted-foreground">
                Supports: PDF, Excel, Images, CSV
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_desc">Newest first</SelectItem>
                <SelectItem value="created_asc">Oldest first</SelectItem>
                <SelectItem value="name_asc">Name A-Z</SelectItem>
                <SelectItem value="name_desc">Name Z-A</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={layout === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setLayout("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={layout === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setLayout("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Badge variant="secondary">
              {filteredSortedFiles.length} file
              {filteredSortedFiles.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </div>

        {/* Files */}
        {layout === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="h-36 animate-pulse bg-muted/40" />
              ))
            ) : filteredSortedFiles.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="text-center py-12">
                  <Folder className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No files found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm
                      ? "Try adjusting your search terms"
                      : "Upload your first file to this folder"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredSortedFiles.map((file, idx) => (
                <motion.div
                  key={file._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.03 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 overflow-hidden">
                      <div className="space-y-3">
                        <div
                          className="p-3 bg-primary/10 rounded-md text-center cursor-pointer"
                          onClick={() => setPreviewFile(file)}
                        >
                          <Eye className="h-6 w-6 sm:h-8 sm:w-8 text-primary mx-auto" />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <h3
                            className="font-medium text-sm leading-tight truncate"
                            title={file.name}
                          >
                            {file.name}
                          </h3>
                          <p className="text-xs text-muted-foreground break-words">
                            {file.file_type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(file.created_at)}
                          </p>
                        </div>
                        <div className="space-y-2 w-full">
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              onClick={() => {
                                setFileForRename(file);
                                setNewFileName(file.name);
                              }}
                            >
                              <Pencil className="h-3 w-3 mr-1" /> Rename
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full text-destructive"
                              onClick={() => handleDeleteFile(file)}
                            >
                              <Trash2 className="h-3 w-3" /> Delete
                            </Button>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => handleDownload(file)}
                          >
                            <Download className="h-3 w-3 mr-1" /> Download
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredSortedFiles.map((file) => (
                  <div
                    key={file._id}
                    className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div
                        className="font-medium truncate cursor-pointer"
                        title={file.name}
                        onClick={() => setPreviewFile(file)}
                      >
                        {file.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {file.file_type} • {formatDate(file.created_at)}
                      </div>
                    </div>
                    <div className="w-full sm:w-auto min-w-[220px]">
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setFileForRename(file);
                            setNewFileName(file.name);
                          }}
                        >
                          <Pencil className="h-3 w-3 mr-1" /> Rename
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-destructive"
                          onClick={() => handleDeleteFile(file)}
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => handleDownload(file)}
                      >
                        <Download className="h-3 w-3 mr-1" /> Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rename Folder Modal */}
        <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Folder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="new-folder-name">New name</Label>
                <Input
                  id="new-folder-name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRenameFolder()}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsRenaming(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleRenameFolder}
                  disabled={!newFolderName.trim()}
                >
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Rename File Modal */}
        <Dialog
          open={!!fileForRename}
          onOpenChange={(open) => {
            if (!open) {
              setFileForRename(null);
              setNewFileName("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename File</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="new-file-name">New name</Label>
                <Input
                  id="new-file-name"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRenameFile()}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFileForRename(null);
                    setNewFileName("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRenameFile}
                  disabled={!newFileName.trim()}
                >
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* File Details Modal */}
        <Dialog
          open={!!previewFile}
          onOpenChange={(open) => {
            if (!open) setPreviewFile(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>File Details</DialogTitle>
            </DialogHeader>
            {previewFile && (
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">Name</div>
                  <div className="font-medium break-all">
                    {previewFile.name}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-sm text-muted-foreground">Type</div>
                    <div className="font-medium">{previewFile.file_type}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Size</div>
                    <div className="font-medium">{previewFile.size || "-"}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Created</div>
                    <div className="font-medium">
                      {formatDate(previewFile.created_at)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Updated</div>
                    <div className="font-medium">
                      {formatDate(previewFile.updated_at)}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => previewFile && handleDownload(previewFile)}
                  >
                    <Download className="h-4 w-4 mr-2" /> Download
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Folder Confirm */}
        <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete folder?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              This will delete the folder and all its files. This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button
                className="text-destructive"
                variant="outline"
                onClick={() => {
                  setConfirmDelete(false);
                  handleDeleteFolder();
                }}
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AnimatedPage>
  );
}
