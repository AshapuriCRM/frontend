'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AnimatedPage } from '@/components/ui/animated-page';
import { mockDocuments } from '@/data/mock-data';
import { Document, DocumentFolder} from '@/lib/types';
import { Upload, FileText, Trash2, Eye, Search, Folder, FolderOpen, ArrowLeft, Plus, FolderPlus } from 'lucide-react';
import { motion } from 'framer-motion';



interface DocumentsPageProps {
  params: { companyId: string };
}

// Mock folders data
const mockFolders: DocumentFolder[] = [
  { id: 'site1', name: 'Site 1', companyId: 'company-1', createdAt: new Date(), documentCount: 5 },
  { id: 'site2', name: 'Site 2', companyId: 'company-1', createdAt: new Date(), documentCount: 3 },
  { id: 'site3', name: 'Site 3', companyId: 'company-1', createdAt: new Date(), documentCount: 2 },
  { id: 'notices', name: 'Notices', companyId: 'company-1', createdAt: new Date(), documentCount: 8 },
  { id: 'agreements', name: 'Agreements', companyId: 'company-1', createdAt: new Date(), documentCount: 4 },
];

export default function DocumentsPage({ params }: DocumentsPageProps) {
  const [folders, setFolders] = useState<DocumentFolder[]>(mockFolders.filter(f => f.companyId === params.companyId));
  const [documents, setDocuments] = useState<(Document & { folderId: string })[]>(
  mockDocuments.filter(d => d.companyId === params.companyId).map(doc => ({
    ...doc,
    folderId: mockFolders[Math.floor(Math.random() * mockFolders.length)]?.id || 'site1'
  }))
);

  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
  if (!currentFolder) return; // Only allow upload when inside a folder

  const newDocuments = acceptedFiles.map(file => ({
    id: Date.now().toString() + Math.random(),
    name: file.name,
    type: file.type,
    size: file.size,
    uploadedAt: new Date(),
    companyId: params.companyId,
    url: URL.createObjectURL(file),
    folderId: currentFolder
  }));

  setDocuments(prev => [...newDocuments as any, ...prev]);
  
  // Update folder document count
  setFolders(prev => prev.map(folder => 
    folder.id === currentFolder 
      ? { ...folder, documentCount: folder.documentCount + newDocuments.length }
      : folder
  ));
}, [params.companyId, currentFolder]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    disabled: !currentFolder // Disable when not in a folder
  });

  const currentFolderData = folders.find(f => f.id === currentFolder);
  const folderDocuments = documents.filter(doc => (doc as any).folderId === currentFolder);

  
  const filteredItems = currentFolder 
    ? folderDocuments.filter(doc => doc.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : folders.filter(folder => folder.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const deleteDocument = (id: string) => {
  const document = documents.find(doc => doc.id === id) as any;
  if (document) {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
    // Update folder document count
    setFolders(prev => prev.map(folder => 
      folder.id === document.folderId 
        ? { ...folder, documentCount: Math.max(0, folder.documentCount - 1) }
        : folder
    ));
  }
};


  const deleteFolder = (folderId: string) => {
    // Delete all documents in the folder
    setDocuments(prev => prev.filter(doc => doc.folderId !== folderId));
    // Delete the folder
    setFolders(prev => prev.filter(folder => folder.id !== folderId));
    // If currently viewing this folder, go back
    if (currentFolder === folderId) {
      setCurrentFolder(null);
    }
  };

  const createFolder = () => {
    if (!newFolderName.trim()) return;

    const newFolder: DocumentFolder = {
      id: Date.now().toString(),
      name: newFolderName.trim(),
      companyId: params.companyId,
      createdAt: new Date(),
      documentCount: 0
    };

    setFolders(prev => [newFolder, ...prev]);
    setNewFolderName('');
    setIsCreateFolderOpen(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    return <FileText className="h-8 w-8" />;
  };

  return (
    <AnimatedPage>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {currentFolder && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentFolder(null)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                
              </Button>
            )}
            <div>
              <h1 className="text-3xl font-bold">
                {currentFolder ? currentFolderData?.name : 'Documents'}
              </h1>
              <p className="text-muted-foreground">
                {currentFolder 
                  ? 'Manage documents in this folder' 
                  : 'Upload and manage your company documents'
                }
              </p>
            </div>
          </div>

          {/* Create Folder Button - Only show when not in a folder */}
          {!currentFolder && (
            <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
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
                      onKeyPress={(e) => e.key === 'Enter' && createFolder()}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateFolderOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createFolder} disabled={!newFolderName.trim()}>
                      Create Folder
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Upload Area - Only show when inside a folder */}
        {currentFolder && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Documents to {currentFolderData?.name}</CardTitle>
              <CardDescription>Drag and drop files or click to browse</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                {isDragActive ? (
                  <p className="text-lg">Drop the files here...</p>
                ) : (
                  <div>
                    <p className="text-lg mb-2">Drag & drop files here, or click to select</p>
                    <p className="text-sm text-muted-foreground">Supports: PDF, DOC, DOCX, Images</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={currentFolder ? "Search documents..." : "Search folders..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Badge variant="secondary">
            {filteredItems.length} {currentFolder ? 'document' : 'folder'}{filteredItems.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Content Grid */}
        {/* Content Grid */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {currentFolder ? (
    // Show documents in current folder
    (filteredItems as (Document & { folderId: string })[]).map((document, index) => (
      <motion.div
        key={document.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
      >
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-primary/10 rounded-full">
                {getFileIcon(document.type)}
              </div>
              
              <div className="space-y-1 w-full">
                <h3 className="font-medium text-sm leading-tight line-clamp-2" title={document.name}>
                  {document.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(document.size)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {document.uploadedAt.toLocaleDateString()}
                </p>
              </div>

              <div className="flex space-x-2 w-full">
                <Button size="sm" variant="outline" className="flex-1">
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => deleteDocument(document.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    ))
  ) : (
    // Show folders
    (filteredItems as DocumentFolder[]).map((folder, index) => (
      <motion.div
        key={folder.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
      >
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center space-y-3">
              <div 
                className="p-3 bg-primary/10 rounded-full"
                onClick={() => setCurrentFolder(folder.id)}
              >
                <Folder className="h-8 w-8 text-primary" />
              </div>
              
              <div className="space-y-1 w-full" onClick={() => setCurrentFolder(folder.id)}>
                <h3 className="font-medium text-sm leading-tight" title={folder.name}>
                  {folder.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {folder.documentCount} document{folder.documentCount !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  {folder.createdAt.toLocaleDateString()}
                </p>
              </div>

              <div className="flex space-x-2 w-full">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setCurrentFolder(folder.id)}
                >
                  <FolderOpen className="h-3 w-3 mr-1" />
                  Open
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteFolder(folder.id);
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    ))
  )}
</div>


        {/* Empty State */}
        {filteredItems.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              {currentFolder ? (
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              ) : (
                <Folder className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              )}
              <h3 className="text-lg font-semibold mb-2">
                {currentFolder ? 'No documents found' : 'No folders found'}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? 'Try adjusting your search terms' 
                  : currentFolder 
                    ? 'Upload your first document to this folder' 
                    : 'Create your first folder to get started'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AnimatedPage>
  );
}
