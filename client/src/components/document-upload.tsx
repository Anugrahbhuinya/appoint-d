import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "../lib/queryClient"; 
import { Upload, FileText, Download, Trash2, CheckCircle, AlertCircle } from "lucide-react";

interface Document {
  _id: string;
  doctorId: string;
  documentType: 'license' | 'certificate' | 'experience';
  fileName: string;
  filePath: string;
  isVerified: boolean;
  uploadedAt: string;
}

const DOCUMENT_TYPES = [
  { value: 'license', label: 'Medical License' },
  { value: 'certificate', label: 'Educational Certificate' },
  { value: 'experience', label: 'Experience Certificate' },
];

const getDocumentTypeLabel = (type: string) => {
  return DOCUMENT_TYPES.find(dt => dt.value === type)?.label || type;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function DocumentUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<'license' | 'certificate' | 'experience'>('license');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch Documents for the authenticated doctor
  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ["/api/doctor/documents"],
    queryFn: async () => {
      const res = await fetch("/api/doctor/documents");
      if (!res.ok) throw new Error("Failed to fetch documents");
      return res.json();
    }
  });

  // UPLOAD MUTATION
  const uploadDocumentMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiRequest("POST", "/api/doctor/documents", formData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctor/documents"] });
      toast({ title: "Document Uploaded", description: "Your document has been uploaded successfully." });
      setSelectedFile(null);
      setDocumentType('license');
      if (fileInputRef.current) { fileInputRef.current.value = ''; }
    },
    onError: (error: Error) => {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    },
  });
  
  // DELETE MUTATION
  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      // apiRequest throws an error if response is not ok, so we just need to call it
      await apiRequest("DELETE", `/api/doctor/documents/${documentId}`);
      // If we reach here, the deletion was successful
      return { success: true, documentId };
    },
    onSuccess: async (data) => {
      // First, optimistically update the UI
      queryClient.setQueryData<Document[]>(["/api/doctor/documents"], (oldData) => {
        if (!oldData) return [];
        return oldData.filter(doc => doc._id !== data.documentId);
      });
      
      // Then invalidate and refetch to ensure consistency
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/doctor/documents"],
        refetchType: 'active' 
      });
      
      // Force refetch
      await queryClient.refetchQueries({ 
        queryKey: ["/api/doctor/documents"] 
      });
      
      toast({ title: "Document Deleted", description: "Document removed successfully." });
    },
    onError: (error: Error) => {
      // Extract meaningful error message
      const errorMessage = error.message.replace(/^\d+:\s*/, ''); // Remove status code prefix
      toast({ 
        title: "Deletion Failed", 
        description: errorMessage || "Failed to delete document", 
        variant: "destructive" 
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File Too Large", description: "Please select a file smaller than 10MB.", variant: "destructive" });
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast({ title: "Invalid File Type", description: "Please upload images (JPEG, PNG) or documents (PDF, DOC, DOCX).", variant: "destructive" });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast({ title: "No File Selected", description: "Please select a file to upload.", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append('document', selectedFile);
    formData.append('documentType', documentType);

    uploadDocumentMutation.mutate(formData);
  };

  // DOWNLOAD HANDLER - Fixed to extract filename from path properly
  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      // Extract the filename from the path (e.g., 'uploads/file.pdf' -> 'file.pdf')
      const fileNameFromPath = filePath.split('/').pop() || fileName;
      
      // Construct the download URL
      const downloadUrl = `/uploads/${fileNameFromPath}`;
      
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName; // Use the original filename for download
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({ 
        title: "Download Started", 
        description: `Downloading ${fileName}` 
      });
    } catch (error) {
      toast({ 
        title: "Download Failed", 
        description: "Could not download the document. Please try again.", 
        variant: "destructive" 
      });
    }
  };

  // DELETE HANDLER - Added confirmation
  const handleDelete = (documentId: string, fileName: string) => {
    if (window.confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
      deleteDocumentMutation.mutate(documentId);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            Upload Document
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="documentType">Document Type</Label>
              <Select value={documentType} onValueChange={(value) => setDocumentType(value as 'license' | 'certificate' | 'experience')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="file">Select File</Label>
              <Input
                id="file"
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                className="cursor-pointer"
              />
            </div>
          </div>

          {selectedFile && (
            <div className="p-4 border rounded-lg bg-muted/20 flex items-center justify-between">
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <Button
                  onClick={handleUpload}
                  disabled={uploadDocumentMutation.isPending}
                >
                  {uploadDocumentMutation.isPending ? "Uploading..." : "Upload"}
                </Button>
              </div>
          )}

          <div className="text-sm text-muted-foreground">
            <p>Supported formats: JPEG, PNG, PDF, DOC, DOCX</p>
            <p>Maximum file size: 10MB</p>
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Uploaded Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length > 0 ? (
            <div className="space-y-3">
              {documents.map((document) => (
                <div
                  key={document._id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{document.fileName}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline">
                          {getDocumentTypeLabel(document.documentType)}
                        </Badge>
                        <Badge
                          className={
                            document.isVerified
                              ? "bg-green-500/10 text-green-600 border-green-500/20"
                              : "bg-orange-500/10 text-orange-600 border-orange-500/20"
                          }
                        >
                          {document.isVerified ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Verified
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Pending
                            </>
                          )}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Uploaded: {new Date(document.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => handleDownload(document.filePath, document.fileName)}
                      title="Download document"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      onClick={() => handleDelete(document._id, document.fileName)}
                      disabled={deleteDocumentMutation.isPending}
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No documents uploaded yet.</p>
              <p className="text-sm">Upload your professional credentials to get verified.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}