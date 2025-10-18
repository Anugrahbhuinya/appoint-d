import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  UserCheck, 
  UserX, 
  Eye, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Shield,
  Star,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MessageSquare,
  FileText,
  Activity
} from "lucide-react";

interface Doctor {
  _id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isVerified: boolean;
  isActive: boolean; // User account active status
  createdAt: string;
  profile: {
    specialization: string;
    experience: number;
    consultationFee: number;
    bio: string;
    qualifications: string[];
    hospitalAffiliation: string;
    licenseNumber: string;
    rating: number;
    totalReviews: number;
    isApproved: boolean;
  };
  documents?: {
    _id: string;
    documentType: string;
    fileName: string;
    isVerified: boolean;
    verificationStatus: string;
  }[];
  appointments?: {
    total: number;
    completed: number;
    pending: number;
  };
}

const SPECIALIZATIONS = [
  "General Medicine", "Cardiology", "Dermatology", "Pediatrics", 
  "Orthopedics", "Neurology", "Psychiatry", "Gynecology", "Ophthalmology"
];

export default function AdminDoctorManagement() {
  const [selectedTab, setSelectedTab] = useState("pending");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadDoctorId, setUploadDoctorId] = useState<string>("");
  const [documentType, setDocumentType] = useState<string>("medical_license");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'suspend' | 'activate'>('approve');
  const [actionReason, setActionReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: doctors = [], isLoading } = useQuery<Doctor[]>({
    queryKey: ["/api/admin/doctors"],
    queryFn: async () => {
      // Fetch all doctors with their profiles
      const res = await fetch("/api/admin/doctors");
      if (!res.ok) throw new Error("Failed to fetch doctors");
      return res.json();
    },
  });

  const doctorActionMutation = useMutation({
    mutationFn: async ({ 
      doctorId, 
      action, 
      reason 
    }: { 
      doctorId: string; 
      action: 'approve' | 'reject' | 'suspend' | 'activate';
      reason?: string;
    }) => {
      // Call the actual API endpoint based on the action
      let endpoint = '';
      let payload: { approved?: boolean; reason?: string; active?: boolean } = {};
      
      switch(action) {
        case 'approve':
          endpoint = `/api/admin/verify-doctor/${doctorId}`;
          payload = { approved: true };
          break;
        case 'reject':
          endpoint = `/api/admin/verify-doctor/${doctorId}`;
          payload = { approved: false, reason };
          break;
        case 'suspend':
          endpoint = `/api/admin/update-user-status/${doctorId}`;
          payload = { isActive: false, reason };
          break;
        case 'activate':
          endpoint = `/api/admin/update-user-status/${doctorId}`;
          payload = { isActive: true };
          break;
      }
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to perform action');
      }
      
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/doctors"] });
      toast({
        title: getActionTitle(variables.action),
        description: getActionDescription(variables.action),
      });
      setIsActionDialogOpen(false);
      setActionReason("");
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
      case 'approve': return "Doctor Approved";
      case 'reject': return "Doctor Rejected";
      case 'suspend': return "Doctor Suspended";
      case 'activate': return "Doctor Activated";
      default: return "Action Completed";
    }
  };

  const getActionDescription = (action: string) => {
    switch (action) {
      case 'approve': return "Doctor has been approved and can now accept patients.";
      case 'reject': return "Doctor application has been rejected.";
      case 'suspend': return "Doctor account has been suspended.";
      case 'activate': return "Doctor account has been activated.";
      default: return "Action completed successfully.";
    }
  };

  const handleDoctorAction = (doctor: Doctor, action: 'approve' | 'reject' | 'suspend' | 'activate') => {
    setSelectedDoctor(doctor);
    setActionType(action);
    setIsActionDialogOpen(true);
  };

  const handleActionSubmit = () => {
    if (!selectedDoctor) return;
    if ((actionType === 'reject' || actionType === 'suspend') && !actionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for this action.",
        variant: "destructive",
      });
      return;
    }
    
    doctorActionMutation.mutate({ 
      doctorId: selectedDoctor._id, 
      action: actionType, 
      reason: actionReason 
    });
  };
  
  const handleUploadDocument = (doctorId: string) => {
    setUploadDoctorId(doctorId);
    setSelectedFile(null);
    setDocumentType("medical_license");
    setIsUploadDialogOpen(true);
  };
  
  const documentUploadMutation = useMutation({
    mutationFn: async ({ doctorId, file, documentType }: { doctorId: string; file: File; documentType: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      
      const res = await fetch(`/api/admin/upload-doctor-document/${doctorId}`, {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to upload document');
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/doctors"] });
      toast({
        title: "Document Uploaded",
        description: "The document has been uploaded successfully.",
      });
      setIsUploadDialogOpen(false);
      setSelectedFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const verifyDocument = (documentId: string, status: 'approved' | 'rejected') => {
    if (!documentId) return;
    
    const verifyDocumentMutation = async () => {
      try {
        const res = await fetch(`/api/admin/verify-document/${documentId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Failed to verify document');
        }
        
        queryClient.invalidateQueries({ queryKey: ["/api/admin/doctors"] });
        toast({
          title: "Document Verified",
          description: `The document has been ${status}.`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : 'An error occurred',
          variant: "destructive",
        });
      }
    };
    
    verifyDocumentMutation();
  };
  
  const handleUploadSubmit = () => {
    if (!selectedFile || !uploadDoctorId) {
      toast({
        title: "Error",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }
    
    documentUploadMutation.mutate({
      doctorId: uploadDoctorId,
      file: selectedFile,
      documentType,
    });
  };

  const pendingDoctors = doctors.filter(doc => !doc.profile.isApproved && doc.isActive);
  const approvedDoctors = doctors.filter(doc => doc.profile.isApproved && doc.isActive);
  const suspendedDoctors = doctors.filter(doc => !doc.isActive);
  const rejectedDoctors = doctors.filter(doc => !doc.profile.isApproved && !doc.isActive);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const DoctorCard = ({ doctor }: { doctor: Doctor }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-primary font-semibold text-lg">
                {doctor.firstName[0]}{doctor.lastName[0]}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="text-lg font-semibold">
                  Dr. {doctor.firstName} {doctor.lastName}
                </h3>
                <Badge className={
                  doctor.profile.isApproved 
                    ? "bg-green-500/10 text-green-600 border-green-500/20"
                    : doctor.isActive
                    ? "bg-orange-500/10 text-orange-600 border-orange-500/20"
                    : "bg-red-500/10 text-red-600 border-red-500/20"
                }>
                  {doctor.profile.isApproved ? "Approved" : doctor.isActive ? "Pending" : "Suspended"}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-3">
                <div>
                  <p><strong>Specialization:</strong> {doctor.profile.specialization}</p>
                  <p><strong>Experience:</strong> {doctor.profile.experience} years</p>
                  <p><strong>License:</strong> {doctor.profile.licenseNumber}</p>
                </div>
                <div>
                  <p><strong>Consultation Fee:</strong> ₹{doctor.profile.consultationFee}</p>
                  <p><strong>Rating:</strong> {doctor.profile.rating} ⭐ ({doctor.profile.totalReviews} reviews)</p>
                  <p><strong>Hospital:</strong> {doctor.profile.hospitalAffiliation}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 text-xs text-muted-foreground mb-3">
                <div className="flex items-center space-x-1">
                  <Mail className="w-3 h-3" />
                  <span>{doctor.email}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>Joined: {new Date(doctor.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Activity className="w-3 h-3" />
                  <span>Appointments: {doctor.appointments?.total || 0}</span>
                </div>
              </div>

              {doctor.documents && (
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-muted-foreground">Documents:</span>
                  {doctor.documents.map((doc, index) => (
                    <Badge 
                      key={index}
                      variant="outline"
                      className={
                        doc.verificationStatus === 'approved' 
                          ? "bg-green-500/10 text-green-600 border-green-500/20"
                          : doc.verificationStatus === 'rejected'
                          ? "bg-red-500/10 text-red-600 border-red-500/20"
                          : "bg-orange-500/10 text-orange-600 border-orange-500/20"
                      }
                    >
                      {doc.documentType}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSelectedDoctor(doctor);
                setIsDetailsDialogOpen(true);
              }}
            >
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </Button>
            
            {!doctor.profile.isApproved && doctor.isActive && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleDoctorAction(doctor, 'approve')}
                  disabled={doctorActionMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDoctorAction(doctor, 'reject')}
                  disabled={doctorActionMutation.isPending}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </>
            )}

            {doctor.profile.isApproved && doctor.isActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDoctorAction(doctor, 'suspend')}
                disabled={doctorActionMutation.isPending}
              >
                <UserX className="w-4 h-4 mr-2" />
                Suspend
              </Button>
            )}

            {!doctor.isActive && (
              <Button
                size="sm"
                onClick={() => handleDoctorAction(doctor, 'activate')}
                disabled={doctorActionMutation.isPending}
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Activate
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
          <h2 className="text-2xl font-bold">Doctor Management</h2>
          <p className="text-muted-foreground">Manage doctor registrations and approvals</p>
        </div>
        <div className="flex space-x-2">
          <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">
            <Clock className="w-3 h-3 mr-1" />
            {pendingDoctors.length} Pending
          </Badge>
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            {approvedDoctors.length} Approved
          </Badge>
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
            <UserX className="w-3 h-3 mr-1" />
            {suspendedDoctors.length} Suspended
          </Badge>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">
            Pending ({pendingDoctors.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedDoctors.length})
          </TabsTrigger>
          <TabsTrigger value="suspended">
            Suspended ({suspendedDoctors.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedDoctors.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingDoctors.length > 0 ? (
            pendingDoctors.map((doctor) => (
              <DoctorCard key={doctor._id} doctor={doctor} />
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No pending doctor applications</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {approvedDoctors.length > 0 ? (
            approvedDoctors.map((doctor) => (
              <DoctorCard key={doctor._id} doctor={doctor} />
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No approved doctors yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="suspended" className="space-y-4">
          {suspendedDoctors.length > 0 ? (
            suspendedDoctors.map((doctor) => (
              <DoctorCard key={doctor._id} doctor={doctor} />
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No suspended doctors</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {rejectedDoctors.length > 0 ? (
            rejectedDoctors.map((doctor) => (
              <DoctorCard key={doctor._id} doctor={doctor} />
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No rejected doctors</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Doctor Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Doctor Details</DialogTitle>
          </DialogHeader>
          {selectedDoctor && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Personal Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Name:</strong> Dr. {selectedDoctor.firstName} {selectedDoctor.lastName}</p>
                    <p><strong>Email:</strong> {selectedDoctor.email}</p>
                    <p><strong>Username:</strong> {selectedDoctor.username}</p>
                    <p><strong>Joined:</strong> {new Date(selectedDoctor.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Professional Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Specialization:</strong> {selectedDoctor.profile.specialization}</p>
                    <p><strong>Experience:</strong> {selectedDoctor.profile.experience} years</p>
                    <p><strong>License Number:</strong> {selectedDoctor.profile.licenseNumber}</p>
                    <p><strong>Hospital:</strong> {selectedDoctor.profile.hospitalAffiliation}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3">Qualifications</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedDoctor.profile.qualifications.map((qual, index) => (
                    <Badge key={index} variant="outline">{qual}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Bio</h3>
                <p className="text-sm text-muted-foreground">{selectedDoctor.profile.bio}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <DollarSign className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="font-semibold">₹{selectedDoctor.profile.consultationFee}</p>
                  <p className="text-xs text-muted-foreground">Consultation Fee</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Star className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="font-semibold">{selectedDoctor.profile.rating}</p>
                  <p className="text-xs text-muted-foreground">Rating ({selectedDoctor.profile.totalReviews} reviews)</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Activity className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="font-semibold">{selectedDoctor.appointments?.total || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Appointments</p>
                </div>
              </div>

              {selectedDoctor.documents && (
                <div>
                  <h3 className="font-semibold mb-3">Documents</h3>
                  <div className="space-y-2">
                    {selectedDoctor.documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-4 h-4" />
                          <span className="text-sm">{doc.fileName}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <a 
                            href={`/api/documents/${doc._id}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline"
                          >
                            View Document
                          </a>
                          <Badge className={
                            doc.verificationStatus === 'approved' 
                              ? "bg-green-500/10 text-green-600 border-green-500/20"
                              : doc.verificationStatus === 'rejected'
                              ? "bg-red-500/10 text-red-600 border-red-500/20"
                              : "bg-orange-500/10 text-orange-600 border-orange-500/20"
                          }>
                            {doc.verificationStatus}
                          </Badge>
                          {doc.verificationStatus === 'pending' && (
                            <div className="flex space-x-1">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-6 px-2 text-xs bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20"
                                onClick={() => verifyDocument(doc._id, 'approved')}
                              >
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-6 px-2 text-xs bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20"
                                onClick={() => verifyDocument(doc._id, 'rejected')}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleUploadDocument(selectedDoctor._id)}
                      className="text-xs"
                    >
                      Upload New Document
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'Approve Doctor'}
              {actionType === 'reject' && 'Reject Doctor Application'}
              {actionType === 'suspend' && 'Suspend Doctor'}
              {actionType === 'activate' && 'Activate Doctor'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDoctor && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">Dr. {selectedDoctor.firstName} {selectedDoctor.lastName}</p>
                <p className="text-sm text-muted-foreground">{selectedDoctor.profile.specialization}</p>
              </div>
            )}
            
            {(actionType === 'reject' || actionType === 'suspend') && (
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  placeholder={`Provide reason for ${actionType}...`}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="mt-2"
                />
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsActionDialogOpen(false);
                  setActionReason("");
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleActionSubmit}
                disabled={doctorActionMutation.isPending}
                variant={actionType === 'reject' || actionType === 'suspend' ? 'destructive' : 'default'}
              >
                {actionType === 'approve' && 'Approve Doctor'}
                {actionType === 'reject' && 'Reject Application'}
                {actionType === 'suspend' && 'Suspend Doctor'}
                {actionType === 'activate' && 'Activate Doctor'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Doctor Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="documentType">Document Type</Label>
              <select
                id="documentType"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-2"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
              >
                <option value="medical_license">Medical License</option>
                <option value="medical_certificate">Medical Certificate</option>
                <option value="identity_proof">Identity Proof</option>
                <option value="qualification_certificate">Qualification Certificate</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="document">Document</Label>
              <Input
                id="document"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Accepted formats: PDF, JPG, JPEG, PNG. Max size: 5MB
              </p>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsUploadDialogOpen(false);
                  setSelectedFile(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUploadSubmit}
                disabled={documentUploadMutation.isPending || !selectedFile}
              >
                Upload Document
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
