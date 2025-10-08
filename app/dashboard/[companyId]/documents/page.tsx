"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AnimatedPage } from "@/components/ui/animated-page";
import { CompanyFolder } from "@/lib/types";
import { Folder, Search, FolderPlus, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface DocumentsPageProps {
  params: { companyId: string };
}

export default function DocumentsPage({ params }: DocumentsPageProps) {
  const router = useRouter();
  const [folders, setFolders] = useState<CompanyFolder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<
    "created_desc" | "created_asc" | "name_asc" | "name_desc"
  >("created_desc");

  useEffect(() => {
    fetchFolders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.companyId]);

  const fetchFolders = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.getCompanyFolders(params.companyId, {
        limit: 100,
      });
      if (res.success && res.data) {
        const data = Array.isArray(res.data)
          ? res.data
          : (res.data as any).folders;
        setFolders(data || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch folders", err);
      toast.error(err?.message || "Failed to fetch folders");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const res = await apiClient.createCompanyFolder(
        params.companyId,
        newFolderName.trim()
      );
      if (res.success && res.data) {
        const created = res.data as CompanyFolder;
        setFolders((prev) => [created, ...prev]);
        toast.success("Folder created");
        setNewFolderName("");
        setIsCreateFolderOpen(false);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to create folder");
    }
  };

  const filteredSortedFolders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let list = folders.filter((f) =>
      f.folder_name.toLowerCase().includes(term)
    );

    switch (sortBy) {
      case "name_asc":
        list = list.sort((a, b) => a.folder_name.localeCompare(b.folder_name));
        break;
      case "name_desc":
        list = list.sort((a, b) => b.folder_name.localeCompare(a.folder_name));
        break;
      case "created_asc":
        list = list.sort(
          (a, b) =>
            new Date(a.createdAt || "").getTime() -
            new Date(b.createdAt || "").getTime()
        );
        break;
      case "created_desc":
      default:
        list = list.sort(
          (a, b) =>
            new Date(b.createdAt || "").getTime() -
            new Date(a.createdAt || "").getTime()
        );
        break;
    }
    return list;
  }, [folders, searchTerm, sortBy]);

  const formatDate = (d?: string) => {
    if (!d) return "";
    try {
      return new Date(d).toLocaleDateString();
    } catch {
      return "";
    }
  };

  return (
    <AnimatedPage>
      <div className="space-y-6">
        {/* Header / Menu bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Documents</h1>
            <p className="text-muted-foreground">
              Browse and manage company folders
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={fetchFolders}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Dialog
              open={isCreateFolderOpen}
              onOpenChange={setIsCreateFolderOpen}
            >
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <FolderPlus className="h-4 w-4" />
                  Create Folder
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Folder</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="folder-name">Folder Name</Label>
                    <Input
                      id="folder-name"
                      placeholder="Enter folder name"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleCreateFolder()
                      }
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateFolderOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateFolder}
                      disabled={!newFolderName.trim()}
                    >
                      Create Folder
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search folders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-3">
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
            <Badge variant="secondary">
              {filteredSortedFolders.length} folder
              {filteredSortedFolders.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="h-36 animate-pulse bg-muted/40" />
            ))
          ) : filteredSortedFolders.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="text-center py-12">
                <Folder className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No folders found</h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "Try adjusting your search terms"
                    : "Create your first folder to get started"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredSortedFolders.map((folder, idx) => (
              <motion.div
                key={folder._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.03 }}
              >
                <Card
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() =>
                    router.push(
                      `/dashboard/${params.companyId}/documents/${folder._id}`
                    )
                  }
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="p-3 bg-primary/10 rounded-full">
                        <Folder className="h-8 w-8 text-primary" />
                      </div>
                      <div className="space-y-1 w-full">
                        <h3
                          className="font-medium text-sm leading-tight truncate"
                          title={folder.folder_name}
                        >
                          {folder.folder_name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(folder.createdAt)}
                        </p>
                        {typeof (folder as any).filesCount === "number" && (
                          <p className="text-xs text-muted-foreground">
                            {(folder as any).filesCount} file
                            {(folder as any).filesCount !== 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </AnimatedPage>
  );
}
