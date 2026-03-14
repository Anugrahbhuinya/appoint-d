import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Upload, FileText, Download, Trash2, Eye, Calendar } from "lucide-react";

interface HealthRecord {
  _id: string;
  patientId: string;
  recordType: 'lab_report' | 'prescription' | 'x_ray' | 'other';
  fileName: string;
  filePath: string;
  doctorId?: string;
  appointmentId?: string;
  uploadedAt: string;
}

const RECORD_TYPES = [
  { value: 'lab_report', label: 'Lab Report' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'x_ray', label: 'X-Ray/Scan' },
  { value: 'other', label: 'Other' },
];

export default function HealthRecordsManager() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recordType, setRecordType] = useState<string>('lab_report');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: records = [], isLoading, refetch, error } = useQuery<HealthRecord[]>({
    queryKey: ["/api/patient/records"],
  });

  // Debug: Log records and errors
  console.log("Records:", records);
  console.log("Query Error:", error);

  const uploadRecordMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiRequest("POST", "/api/patient/records", formData);
      return res.json();
    },
    onSuccess: (data) => {
      console.log("Upload successful:", data);
      toast({
        title: "Record Uploaded",
        description: "Your health record has been uploaded successfully.",
      });
      setSelectedFile(null);
      setRecordType('lab_report');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Invalidate and refetch records after successful upload
      queryClient.invalidateQueries({ queryKey: ["/api/patient/records"] });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteRecordMutation = useMutation({
    mutationFn: async (recordId: string) => {
      const res = await apiRequest("DELETE", `/api/patient/records/${recordId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Record Deleted",
        description: "Health record has been deleted successfully.",
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select a file smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please upload images (JPEG, PNG) or documents (PDF, DOC, DOCX).",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('record', selectedFile);
    formData.append('recordType', recordType as 'lab_report' | 'prescription' | 'x_ray' | 'other');

    uploadRecordMutation.mutate(formData);
  };

  const handleDownload = (record: HealthRecord) => {
    const link = document.createElement('a');
    link.href = record.filePath;
    link.download = record.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleView = (record: HealthRecord) => {
    window.open(record.filePath, '_blank');
  };

  const handleDelete = (recordId: string) => {
    if (confirm('Are you sure you want to delete this record?')) {
      deleteRecordMutation.mutate(recordId);
    }
  };

  const getRecordTypeLabel = (type: string) => {
    return RECORD_TYPES.find(rt => rt.value === type)?.label || type;
  };

  const getRecordTypeColor = (type: string) => {
    switch (type) {
      case 'lab_report':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'prescription':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'x_ray':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'other':
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      default:
        return 'bg-muted/10 text-muted-foreground';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            Upload Health Record
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="recordType">Record Type</Label>
              <Select value={recordType} onValueChange={setRecordType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECORD_TYPES.map((type) => (
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
            <div className="p-4 border rounded-lg bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <Button
                  onClick={handleUpload}
                  disabled={uploadRecordMutation.isPending}
                >
                  {uploadRecordMutation.isPending ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            <p>Supported formats: JPEG, PNG, PDF, DOC, DOCX</p>
            <p>Maximum file size: 10MB</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Your Health Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {records.length > 0 ? (
            <div className="space-y-3">
              {records.map((record) => (
                <div
                  key={record._id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{record.fileName}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getRecordTypeColor(record.recordType)}>
                          {getRecordTypeLabel(record.recordType)}
                        </Badge>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(record.uploadedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleView(record)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownload(record)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDelete(record._id)}
                      disabled={deleteRecordMutation.isPending}
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
              <p>No health records uploaded yet.</p>
              <p className="text-sm">Upload your medical reports, prescriptions, and test results.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}