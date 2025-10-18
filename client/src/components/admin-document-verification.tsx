import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  FileText, 
  Download, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Clock, 
  AlertTriangle, 
  Upload,
  RefreshCw,
  MessageSquare,
  User,
  Calendar,
  Shield
} from "lucide-react";

interface Document {
  _id: string;
  doctorId: string;
  documentType: 'license' | 'certificate' | 'experience' | 'identity';
  fileName: string;
  filePath: string;
  isVerified: boolean;
  verificationStatus: 'pending' | 'approved' | 'rejected' | 'resubmission_required';
  rejectionReason?: string;
  uploadedAt: string;
  verifiedAt?: string;
  doctor?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    profile?: {
      specialization: string;
      experience: number;
      licenseNumber: string;
    };
  };
}

const DOCUMENT_TYPES = {
  license: 'Medical License',
  certificate: 'Educational Certificate', 
  experience: 'Experience Certificate',
  identity: 'Identity Proof'
};

const STATUS_COLORS = {
  pending: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  approved: 'bg-green-500/10 text-green-600 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
  resubmission_required: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
};

export default function AdminDocumentVerification() {
  const [selectedTab, setSelectedTab] = useState("pending");
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ["/api/admin/documents"],
    queryFn: async () => {
      // Mock data - in real app, this would fetch from API
      return [
        {
          _id: "1",
          doctorId: "doc1",
          documentType: "license",
          fileName: "medical_license_dr_rajesh.pdf",
          filePath: "/uploads/medical_license_dr_rajesh.pdf",
          isVerified: false,
          verificationStatus: "pending",
          uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          doctor: {
            _id: "doc1",
            firstName: "Rajesh",
            lastName: "Kumar",
            email: "rajesh.kumar@example.com",
            profile: {
              specialization: "Cardiology",
              experience: 8,
              licenseNumber: "MED123456"
            }
          }
        },
        {
          _id: "2", 
          doctorId: "doc2",
          documentType: "certificate",
          fileName: "mbbs_certificate_dr_priya.pdf",
          filePath: "/uploads/mbbs_certificate_dr_priya.pdf",
          isVerified: false,
          verificationStatus: "resubmission_required",
          rejectionReason: "Document quality is poor, please upload a clearer version",
          uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          doctor: {
            _id: "doc2",
            firstName: "Priya",
            lastName: "Sharma",
            email: "priya.sharma@example.com",
            profile: {
              specialization: "Dermatology",
              experience: 5,
              licenseNumber: "MED789012"
            }
          }
        },
        {
          _id: "3",
          doctorId: "doc3", 
          documentType: "experience",
          fileName: "experience_certificate_dr_amit.pdf",
          filePath: "/uploads/experience_certificate_dr_amit.pdf",
          isVerified: true,
          verificationStatus: "approved",
          uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          verifiedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          doctor: {
            _id: "doc3",
            firstName: "Amit",
            lastName: "Singh",
            email: "amit.singh@example.com",
            profile: {
              specialization: "Pediatrics",
              experience: 12,
              licenseNumber: "MED345678"
            }
          }
        }
      ];
    },
  });

  const verifyDocumentMutation = useMutation({
    mutationFn: async ({ 
      documentId, 
      action, 
      reason 
    }: { 
      documentId: string; 
      action: 'approve' | 'reject' | 'request_resubmission';
      reason?: string;
    }) => {
      // Mock API call - in real app, this would call the actual API
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true, action, reason });
        }, 1000);
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/documents"] });
      toast({
        title: getActionTitle(variables.action),
        description: getActionDescription(variables.action),
      });
      setIsRejectionDialogOpen(false);
      setRejectionReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getActionTitle = (action: string) => {
    switch (action) {
      case 'approve': return "Document Approved";
      case 'reject': return "Document Rejected";
      case 'request_resubmission': return "Resubmission Requested";
      default: return "Action Completed";
    }
  };

  const getActionDescription = (action: string) => {
    switch (action) {
      case 'approve': return "Document has been verified and approved.";
      case 'reject': return "Document has been rejected with reason provided.";
      case 'request_resubmission': return "Doctor has been requested to resubmit the document.";
      default: return "Action completed successfully.";
    }
  };

  const handleDocumentAction = (document: Document, action: 'approve' | 'reject' | 'request_resubmission') => {
    setSelectedDocument(document);
    if (action === 'reject' || action === 'request_resubmission') {
      setIsRejectionDialogOpen(true);
    } else {
      verifyDocumentMutation.mutate({ documentId: document._id, action });
    }
  };

  const handleRejectionSubmit = () => {
    if (!selectedDocument) return;
    if (!rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection/resubmission request.",
        variant: "destructive",
      });
      return;
    }
    
    const action = selectedDocument.verificationStatus === 'resubmission_required' ? 'request_resubmission' : 'reject';
    verifyDocumentMutation.mutate({ 
      documentId: selectedDocument._id, 
      action, 
      reason: rejectionReason 
    });
  };

  const pendingDocuments = documents.filter(doc => doc.verificationStatus === 'pending');
  const approvedDocuments = documents.filter(doc => doc.verificationStatus === 'approved');
  const rejectedDocuments = documents.filter(doc => doc.verificationStatus === 'rejected');
  const resubmissionRequired = documents.filter(doc => doc.verificationStatus === 'resubmission_required');

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

  const DocumentCard = ({ document }: { document: Document }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="font-semibold">{document.fileName}</h3>
                <Badge className={STATUS_COLORS[document.verificationStatus]}>
                  {document.verificationStatus.replace('_', ' ')}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-3">
                <div>
                  <p><strong>Document Type:</strong> {DOCUMENT_TYPES[document.documentType]}</p>
                  <p><strong>Doctor:</strong> Dr. {document.doctor?.firstName} {document.doctor?.lastName}</p>
                </div>
                <div>
                  <p><strong>Specialization:</strong> {document.doctor?.profile?.specialization}</p>
                  <p><strong>Experience:</strong> {document.doctor?.profile?.experience} years</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>Uploaded: {new Date(document.uploadedAt).toLocaleDateString()}</span>
                </div>
                {document.verifiedAt && (
                  <div className="flex items-center space-x-1">
                    <Shield className="w-3 h-3" />
                    <span>Verified: {new Date(document.verifiedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {document.rejectionReason && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">
                    <strong>Reason:</strong> {document.rejectionReason}
                  </p>
                </div>
              )}
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
            
            {document.verificationStatus === 'pending' && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleDocumentAction(document, 'approve')}
                  disabled={verifyDocumentMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDocumentAction(document, 'reject')}
                  disabled={verifyDocumentMutation.isPending}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDocumentAction(document, 'request_resubmission')}
                  disabled={verifyDocumentMutation.isPending}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Request Resubmission
                </Button>
              </>
            )}

            {document.verificationStatus === 'resubmission_required' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDocumentAction(document, 'request_resubmission')}
                disabled={verifyDocumentMutation.isPending}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Update Request
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

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
            {approvedDocuments.length} Approved
          </Badge>
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
            <XCircle className="w-3 h-3 mr-1" />
            {rejectedDocuments.length} Rejected
          </Badge>
          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            <RefreshCw className="w-3 h-3 mr-1" />
            {resubmissionRequired.length} Resubmission Required
          </Badge>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">
            Pending ({pendingDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="resubmission">
            Resubmission ({resubmissionRequired.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingDocuments.length > 0 ? (
            pendingDocuments.map((document) => (
              <DocumentCard key={document._id} document={document} />
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

        <TabsContent value="approved" className="space-y-4">
          {approvedDocuments.length > 0 ? (
            approvedDocuments.map((document) => (
              <DocumentCard key={document._id} document={document} />
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No approved documents yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {rejectedDocuments.length > 0 ? (
            rejectedDocuments.map((document) => (
              <DocumentCard key={document._id} document={document} />
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No rejected documents</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="resubmission" className="space-y-4">
          {resubmissionRequired.length > 0 ? (
            resubmissionRequired.map((document) => (
              <DocumentCard key={document._id} document={document} />
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No documents requiring resubmission</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Rejection/Resubmission Dialog */}
      <Dialog open={isRejectionDialogOpen} onOpenChange={setIsRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDocument?.verificationStatus === 'resubmission_required' 
                ? 'Update Resubmission Request' 
                : 'Reject Document'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                placeholder={
                  selectedDocument?.verificationStatus === 'resubmission_required'
                    ? "Provide updated instructions for resubmission..."
                    : "Provide reason for rejection..."
                }
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-2"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsRejectionDialogOpen(false);
                  setRejectionReason("");
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleRejectionSubmit}
                disabled={verifyDocumentMutation.isPending}
              >
                {selectedDocument?.verificationStatus === 'resubmission_required' 
                  ? 'Update Request' 
                  : 'Reject Document'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
