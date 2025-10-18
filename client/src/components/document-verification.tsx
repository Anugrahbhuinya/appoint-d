import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FileText, Download, CheckCircle, XCircle, Eye, Clock, AlertTriangle } from "lucide-react";

interface Document {
  _id: string;
  doctorId: string;
  documentType: 'license' | 'certificate' | 'experience';
  fileName: string;
  filePath: string;
  isVerified: boolean;
  uploadedAt: string;
  doctor?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

const DOCUMENT_TYPES = {
  license: 'Medical License',
  certificate: 'Educational Certificate',
  experience: 'Experience Certificate',
};

export default function DocumentVerification() {
  const [selectedTab, setSelectedTab] = useState("pending");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ["/api/admin/documents"],
    queryFn: async () => {
      // Mock data for now - in real app, this would fetch from API
      return [
        {
          _id: "1",
          doctorId: "doc1",
          documentType: "license",
          fileName: "medical_license.pdf",
          filePath: "/uploads/medical_license.pdf",
          isVerified: false,
          uploadedAt: new Date().toISOString(),
          doctor: {
            firstName: "Rajesh",
            lastName: "Kumar",
            email: "rajesh@example.com"
          }
        },
        {
          _id: "2",
          doctorId: "doc2",
          documentType: "certificate",
          fileName: "mbbs_certificate.pdf",
          filePath: "/uploads/mbbs_certificate.pdf",
          isVerified: false,
          uploadedAt: new Date().toISOString(),
          doctor: {
            firstName: "Priya",
            lastName: "Sharma",
            email: "priya@example.com"
          }
        }
      ];
    },
  });

  const verifyDocumentMutation = useMutation({
    mutationFn: async ({ documentId, verified }: { documentId: string; verified: boolean }) => {
      // Mock API call - in real app, this would call the actual API
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true });
        }, 1000);
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/documents"] });
      toast({
        title: variables.verified ? "Document Verified" : "Document Rejected",
        description: `Document ${variables.verified ? "verified" : "rejected"} successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleVerifyDocument = (documentId: string, verified: boolean) => {
    verifyDocumentMutation.mutate({ documentId, verified });
  };

  const pendingDocuments = documents.filter(doc => !doc.isVerified);
  const verifiedDocuments = documents.filter(doc => doc.isVerified);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Document Verification</h2>
          <p className="text-muted-foreground">Review and verify doctor documents</p>
        </div>
        <div className="flex space-x-2">
          <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">
            <Clock className="w-3 h-3 mr-1" />
            {pendingDocuments.length} Pending
          </Badge>
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            {verifiedDocuments.length} Verified
          </Badge>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="verified">
            Verified ({verifiedDocuments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingDocuments.length > 0 ? (
            pendingDocuments.map((document) => (
              <Card key={document._id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{document.fileName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {DOCUMENT_TYPES[document.documentType]}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Dr. {document.doctor?.firstName} {document.doctor?.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded: {new Date(document.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleVerifyDocument(document._id, true)}
                        disabled={verifyDocumentMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Verify
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleVerifyDocument(document._id, false)}
                        disabled={verifyDocumentMutation.isPending}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No pending documents to verify</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="verified" className="space-y-4">
          {verifiedDocuments.length > 0 ? (
            verifiedDocuments.map((document) => (
              <Card key={document._id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{document.fileName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {DOCUMENT_TYPES[document.documentType]}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Dr. {document.doctor?.firstName} {document.doctor?.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Verified: {new Date(document.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No verified documents yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
