import { ReactNode, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
// FIX: Using explicit relative path to resolve import error
import { apiRequest } from "../lib/queryClient"; 
import { Textarea } from "@/components/ui/textarea";
import { 
  Users, 
  UserCheck, 
  UserX, 
  AlertTriangle, 
  BarChart3, 
  Clock, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Activity, 
  Heart, 
  LogOut, 
  Eye, 
  Download, 
  RefreshCw, 
  User, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  ShieldCheck
} from "lucide-react";

// --- START TYPES (Must match backend schemas) ---
interface Document {
  _id: string;
  doctorId: string;
  documentType: 'license' | 'certificate' | 'experience';
  fileName: string;
  filePath: string;
  isVerified: boolean;
  uploadedAt: string;
  rejectionReason?: string;
}

interface DoctorProfile {
    specialization?: string;
    experience?: number;
    consultationFee?: number;
    licenseNumber?: string;
    isApproved?: boolean;
    dateOfBirth?: string;
    gender?: string;
    phoneNumber?: string;
    hospitalAffiliation?: string;
}

interface User {
  phone: ReactNode;
  _id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  profile?: DoctorProfile;
}

interface Appointment {
  _id: string;
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  status: string;
}

interface Analytics {
  totalUsers: number;
  totalDoctors: number;
  totalPatients: number;
  totalAppointments: number;
  totalRevenue: number;
  monthlyAppointments: number;
  pendingVerifications: number;
}
// --- END TYPES ---


// ====================================================================
// DOCTOR DETAILS MODAL COMPONENT (Handles Document Viewing & Verification)
// ====================================================================

interface DoctorDetailsModalProps {
    doctor: User;
    isOpen: boolean;
    onClose: () => void;
    verifyProfileMutation: any; 
    verifyDocumentMutation: any;
}

function DoctorDetailsModal({ doctor, isOpen, onClose, verifyProfileMutation, verifyDocumentMutation }: DoctorDetailsModalProps) {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [rejectionReason, setRejectionReason] = useState('');

    // Fetch Documents for the specific doctor
    const { data: documents = [], isLoading: documentsLoading } = useQuery<Document[]>({
        queryKey: ["/api/doctor/documents", doctor._id],
        enabled: isOpen, // Only fetch when the modal is open
        queryFn: async () => {
            // This hits the GET /api/doctor/documents route logic
            // The route should handle the doctorId query param correctly now
            const response = await apiRequest("GET", `/api/doctor/documents?doctorId=${doctor._id}`);
            return response.json();
        },
    });

    const approveDocument = (documentId: string, doctorId: string) => {
        verifyDocumentMutation.mutate({ documentId, verified: true }, {
            onSuccess: () => {
                toast({ title: "Document Approved", description: `Document ${documentId.slice(-6)} verified.` });
                // Invalidate the necessary queries to refresh the modal and dashboard list
                queryClient.invalidateQueries({ queryKey: ["/api/doctor/documents", doctorId] });
                queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
            },
            onError: (error: Error) => {
                toast({ title: "Verification Failed", description: error.message, variant: "destructive" });
            }
        });
    };

    const rejectDocument = (documentId: string, doctorId: string) => {
        if (!rejectionReason) {
            toast({ title: "Missing Reason", description: "Please enter a reason before rejecting.", variant: "destructive" });
            return;
        }

        verifyDocumentMutation.mutate({ documentId, verified: false, reason: rejectionReason }, {
            onSuccess: () => {
                toast({ title: "Document Rejected", description: `Document ${documentId.slice(-6)} rejected.` });
                queryClient.invalidateQueries({ queryKey: ["/api/doctor/documents", doctorId] });
                queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
            },
            onError: (error: Error) => {
                toast({ title: "Rejection Failed", description: error.message, variant: "destructive" });
            }
        });
    };

    const allDocumentsVerified = documents.length > 0 && documents.every(doc => doc.isVerified);
    const isPendingApproval = documents.some(doc => !doc.isVerified && !doc.rejectionReason); // True if any document is unverified AND not yet rejected
    
    // Helper to get document type string
    const getDocumentTypeLabel = (type: string) => {
        const types = { license: 'Medical License', certificate: 'Educational Certificate', experience: 'Experience Letter' };
        return types[type as keyof typeof types] || type;
    };


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                        <UserCheck className="w-6 h-6 text-primary" />
                        <span>Verify Doctor: Dr. {doctor.firstName} {doctor.lastName}</span>
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="documents" className="w-full">
                    <TabsList>
                        <TabsTrigger value="documents" className="flex items-center space-x-1">
                            <FileText className="w-4 h-4" /> <span>Documents ({documents.length})</span>
                        </TabsTrigger>
                        <TabsTrigger value="profile">
                            <User className="w-4 h-4" /> Profile Info
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile" className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Card>
                                <CardHeader><CardTitle className="text-lg">Professional Info</CardTitle></CardHeader>
                                <CardContent className="space-y-1 text-sm">
                                    <p><strong>Specialization:</strong> {doctor.profile?.specialization || 'N/A'}</p>
                                    <p><strong>License:</strong> {doctor.profile?.licenseNumber || 'N/A'}</p>
                                    <p><strong>Affiliation:</strong> {doctor.profile?.hospitalAffiliation || 'N/A'}</p>
                                    <p><strong>Fee:</strong> ₹{doctor.profile?.consultationFee || 0}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle className="text-lg">Verification Status</CardTitle></CardHeader>
                                <CardContent className="space-y-1 text-sm">
                                    <p><strong>Profile Approved:</strong> <Badge className={doctor.profile?.isApproved ? "bg-green-500/10 text-green-600" : "bg-orange-500/10 text-orange-600"}>{doctor.profile?.isApproved ? "Approved" : "Pending"}</Badge></p>
                                    <p><strong>Documents Status:</strong> <Badge className={allDocumentsVerified ? "bg-green-500/10 text-green-600" : "bg-orange-500/10 text-orange-600"}>{allDocumentsVerified ? "All Verified" : "Review Needed"}</Badge></p>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="pt-4 flex justify-end space-x-2">
                            <Button
                                onClick={() => verifyProfileMutation.mutate({ userId: doctor._id, approved: true })}
                                disabled={verifyProfileMutation.isPending || doctor.profile?.isApproved || !allDocumentsVerified}
                                title={!allDocumentsVerified ? "Verify all documents before profile approval" : ""}
                            >
                                {doctor.profile?.isApproved ? "Profile Approved" : "Approve Profile"}
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="documents" className="space-y-4 pt-4">
                        {documentsLoading ? (
                            <p className="text-center text-muted-foreground">Loading documents...</p>
                        ) : documents.length === 0 ? (
                            <p className="text-center text-muted-foreground">No documents uploaded by this doctor.</p>
                        ) : (
                            <div className="space-y-3">
                                {documents.map((doc) => (
                                    <div key={doc._id} className={`border p-3 rounded-lg flex items-center justify-between ${doc.isVerified ? 'border-green-300' : 'border-orange-300'}`}>
                                        <div className="flex flex-col">
                                            <p className="font-medium flex items-center space-x-2">
                                                <FileText className="w-4 h-4" />
                                                <span>{doc.fileName}</span>
                                            </p>
                                            <p className="text-xs text-muted-foreground ml-6">{getDocumentTypeLabel(doc.documentType)} | Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                                            {doc.rejectionReason && !doc.isVerified && (
                                                <p className="text-xs text-red-500 ml-6">Reason: {doc.rejectionReason}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <Badge className={doc.isVerified ? "bg-green-500/10 text-green-600" : "bg-orange-500/10 text-orange-600"}>
                                                {doc.isVerified ? "Verified" : "Pending"}
                                            </Badge>
                                            <a href={doc.filePath} target="_blank" rel="noopener noreferrer">
                                                <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" /> View File</Button>
                                            </a>
                                            {!doc.isVerified && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => approveDocument(doc._id, doctor._id)}
                                                    disabled={verifyDocumentMutation.isPending}
                                                >
                                                    Approve
                                                </Button>
                                            )}
                                            {/* Allow rejection or un-verification */}
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => rejectDocument(doc._id, doctor._id)}
                                                disabled={verifyDocumentMutation.isPending}
                                            >
                                                {doc.isVerified ? "Unverify" : "Reject"}
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                <div className="p-4 border rounded-lg space-y-3 mt-4">
                                    <h4 className="font-semibold text-red-600 flex items-center space-x-2">
                                        <AlertTriangle className="w-5 h-5" /> Rejection Action
                                    </h4>
                                    <Textarea
                                        placeholder="Enter reason for rejecting documents (e.g., 'License blurry,' 'Certificate expired')."
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        rows={2}
                                    />
                                    <Button 
                                        variant="destructive" 
                                        onClick={() => { 
                                            // Rejecting the first pending document for simplicity
                                            const firstPendingDoc = documents.find(d => !d.isVerified);
                                            if (firstPendingDoc) {
                                                rejectDocument(firstPendingDoc._id, doctor._id);
                                            } else {
                                                toast({ title: "No Pending Documents", description: "All documents are currently verified.", variant: "info" });
                                            }
                                        }} 
                                        disabled={!rejectionReason || verifyDocumentMutation.isPending || !isPendingApproval}
                                    >
                                        Reject First Pending Document
                                    </Button>
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

// ====================================================================
// ADMIN DASHBOARD (MAIN COMPONENT)
// ====================================================================

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedDoctor, setSelectedDoctor] = useState<User | null>(null); // State for selected doctor
  const [showDoctorModal, setShowDoctorModal] = useState(false); // State for modal visibility

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if admin is logged in (using mock check for local development state)
  const adminUser = localStorage.getItem("adminUser");
  if (!adminUser) {
    window.location.href = "/admin";
    return null;
  }

    // --- DATA FETCHING ---
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/users");
      return response.json();
    },
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<Analytics>({
    queryKey: ["/api/admin/analytics"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/analytics");
      return response.json();
    },
  });

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/admin/appointments"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/appointments");
      return response.json();
    },
  });
    // ------------------------------------

    // --- MUTATIONS ---
  const verifyUserMutation = useMutation({
    mutationFn: async ({ userId, verified }: { userId: string; verified: boolean }) => {
      const response = await apiRequest("POST", `/api/admin/verify-user/${userId}`, { verified });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
      toast({
        title: "User Status Updated",
        description: "User verification status updated successfully.",
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
const verifyProfileMutation = useMutation({
    mutationFn: async ({ userId, approved }: { userId: string; approved: boolean }) => {
        // ✅ CORRECT ENDPOINT - Admin endpoint
        const response = await apiRequest("POST", `/api/admin/verify-doctor/${userId}`, { approved });
        return response.json();
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-verifications"] });
        toast({ title: "Profile Approved", description: "Doctor profile status updated." });
        setShowDoctorModal(false);
    },
    onError: (error: Error) => {
        toast({ title: "Approval Failed", description: error.message, variant: "destructive" });
    },
});


    const verifyDocumentMutation = useMutation({
        mutationFn: async (vars: { documentId: string; verified: boolean; reason?: string }) => {
            // This hits the POST /api/admin/verify-document/:id route
            const response = await apiRequest("POST", `/api/admin/verify-document/${vars.documentId}`, { verified: vars.verified, reason: vars.reason });
            return response.json();
        },
        // onSuccess handling is managed inside the modal
    });
    // -------------------

  const handleLogout = () => {
    localStorage.removeItem("adminUser");
    window.location.href = "/";
  };

  const doctors = users.filter(user => user.role === "doctor");
  const patients = users.filter(user => user.role === "patient");
  const pendingDoctors = doctors.filter(doctor => !doctor.profile?.isApproved);
  const verifiedDoctors = doctors.filter(doctor => doctor.profile?.isApproved);
  const unverifiedPatients = patients.filter(patient => !patient.isVerified);

    // Function to open modal with selected doctor
    const openDoctorModal = (doctor: User) => {
        setSelectedDoctor(doctor);
        setShowDoctorModal(true);
    };

  if (usersLoading || analyticsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
        
        {/* === DOCTOR DETAILS MODAL RENDER === */}
        {selectedDoctor && (
            <DoctorDetailsModal
                doctor={selectedDoctor}
                isOpen={showDoctorModal}
                onClose={() => setShowDoctorModal(false)}
                verifyProfileMutation={verifyProfileMutation}
                verifyDocumentMutation={verifyDocumentMutation}
            />
        )}
        {/* ================================== */}

      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Heart className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold text-primary">appoint'd</span>
              </div>
              <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                <ShieldCheck className="w-3 h-3 mr-1" />
                Admin Dashboard
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground">
                Welcome, Admin
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  queryClient.invalidateQueries();
                }}
                className="flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh All</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-card border-r border-border min-h-screen">
          <div className="p-6">
            <nav className="space-y-2">
              <Button
                variant={activeTab === "dashboard" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("dashboard")}
              >
                <TrendingUp className="w-4 h-4 mr-3" />
                Dashboard
              </Button>
              <Button
                variant={activeTab === "doctors" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("doctors")}
              >
                <UserCheck className="w-4 h-4 mr-3" />
                Doctors ({doctors.length})
              </Button>
              <Button
                variant={activeTab === "patients" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("patients")}
              >
                <Users className="w-4 h-4 mr-3" />
                Patients ({patients.length})
              </Button>
              <Button
                variant={activeTab === "appointments" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("appointments")}
              >
                <Calendar className="w-4 h-4 mr-3" />
                Appointments
              </Button>
              <Button
                variant={activeTab === "analytics" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("analytics")}
              >
                <BarChart3 className="w-4 h-4 mr-3" />
                Analytics
              </Button>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {activeTab === "dashboard" && (
            <div>
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
                    <p className="text-muted-foreground">Real-time platform overview and management</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      queryClient.invalidateQueries();
                    }}
                    className="flex items-center space-x-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Refresh Data</span>
                  </Button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Total Users</p>
                        <p className="2xl font-bold text-primary">
                          {analytics?.totalUsers || users.length}
                        </p>
                        <p className="text-green-400 text-xs">Live data from MongoDB</p>
                      </div>
                      <Users className="w-8 h-8 text-primary/60" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Active Doctors</p>
                        <p className="2xl font-bold text-primary">
                          {analytics?.totalDoctors || doctors.length}
                        </p>
                        <p className="text-green-400 text-xs">Real-time count</p>
                      </div>
                      <UserCheck className="w-8 h-8 text-primary/60" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Total Patients</p>
                        <p className="2xl font-bold text-primary">
                          {analytics?.totalPatients || patients.length}
                        </p>
                        <p className="text-green-400 text-xs">Live data</p>
                      </div>
                      <Users className="w-8 h-8 text-primary/60" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Pending Verifications</p>
                        <p className="2xl font-bold text-primary">
                          {analytics?.pendingVerifications || pendingDoctors.length}
                        </p>
                        <p className="text-orange-400 text-xs">Needs attention</p>
                      </div>
                      <Clock className="w-8 h-8 text-primary/60" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Users */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {users.slice(0, 5).map((user) => (
                        <div key={user._id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-primary font-semibold text-sm">
                                {user.firstName[0]}{user.lastName[0]}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{user.firstName} {user.lastName}</p>
                              <p className="text-sm text-muted-foreground">{user.role}</p>
                            </div>
                          </div>
                          <Badge className={
                            user.isVerified 
                              ? "bg-green-500/10 text-green-600 border-green-500/20"
                              : "bg-orange-500/10 text-orange-600 border-orange-500/20"
                          }>
                            {user.isVerified ? "Verified" : "Pending"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start"
                        onClick={() => setActiveTab("doctors")}
                      >
                        <UserCheck className="w-6 h-6 text-primary mb-2" />
                        <p className="font-medium">Manage Doctors</p>
                        <p className="text-sm text-muted-foreground">{pendingDoctors.length} pending</p>
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start"
                        onClick={() => setActiveTab("patients")}
                      >
                        <Users className="w-6 h-6 text-chart-1 mb-2" />
                        <p className="font-medium">Manage Patients</p>
                        <p className="text-sm text-muted-foreground">{patients.length} total</p>
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start"
                        onClick={() => setActiveTab("appointments")}
                      >
                        <Calendar className="w-6 h-6 text-chart-2 mb-2" />
                        <p className="font-medium">View Appointments</p>
                        <p className="text-sm text-muted-foreground">All bookings</p>
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start"
                        onClick={() => setActiveTab("analytics")}
                      >
                        <BarChart3 className="w-6 h-6 text-chart-3 mb-2" />
                        <p className="font-medium">View Analytics</p>
                        <p className="text-sm text-muted-foreground">Platform insights</p>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "doctors" && (
            <div>
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">Doctor Management</h1>
                    <p className="text-muted-foreground">Manage doctor registrations and verifications</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      queryClient.invalidateQueries();
                    }}
                    className="flex items-center space-x-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Refresh</span>
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Clock className="w-5 h-5 text-orange-500" />
                      <span>Pending Verifications ({pendingDoctors.length})</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {pendingDoctors.length > 0 ? (
                      <div className="space-y-4">
                        {pendingDoctors.map((doctor) => (
                          <div key={doctor._id} className="border border-border rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold">Dr. {doctor.firstName} {doctor.lastName}</h3>
                                <p className="text-sm text-muted-foreground">{doctor.profile?.specialization}</p>
                                <p className="text-sm text-muted-foreground">{doctor.profile?.experience} years experience</p>
                                <p className="text-sm text-muted-foreground">License: {doctor.profile?.licenseNumber}</p>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  onClick={() => verifyUserMutation.mutate({ userId: doctor._id, verified: true })}
                                  disabled={verifyUserMutation.isPending}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => verifyUserMutation.mutate({ userId: doctor._id, verified: false })}
                                  disabled={verifyUserMutation.isPending}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openDoctorModal(doctor)}
                                >
                                    <Eye className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No pending doctor verifications</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span>Verified Doctors ({verifiedDoctors.length})</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {verifiedDoctors.length > 0 ? (
                      <div className="space-y-4">
                        {verifiedDoctors.map((doctor) => (
                          <div key={doctor._id} className="border border-border rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold">Dr. {doctor.firstName} {doctor.lastName}</h3>
                                <p className="text-sm text-muted-foreground">{doctor.profile?.specialization}</p>
                                <p className="text-sm text-muted-foreground">Fee: ₹{doctor.profile?.consultationFee}</p>
                              </div>
                              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No verified doctors yet</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "patients" && (
            <div>
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">Patient Management</h1>
                    <p className="text-muted-foreground">View and manage patient accounts</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      queryClient.invalidateQueries();
                    }}
                    className="flex items-center space-x-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Refresh</span>
                  </Button>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>All Patients ({patients.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {patients.length > 0 ? (
                    <div className="space-y-4">
                      {patients.map((patient) => (
                        <div key={patient._id} className="border border-border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-4">
                              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                                <span className="text-primary font-semibold">
                                  {patient.firstName[0]}{patient.lastName[0]}
                                </span>
                              </div>
                              <div>
                                <h3 className="font-semibold">{patient.firstName} {patient.lastName}</h3>
                                <p className="text-sm text-muted-foreground">{patient.email}</p>
                                <p className="text-sm text-muted-foreground">
                                  Joined: {new Date(patient.createdAt).toLocaleDateString()}
                                </p>
                                {patient.profile?.phoneNumber && (
                                  <p className="text-sm text-muted-foreground">Phone: {patient.profile.phoneNumber}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={
                                patient.isVerified 
                                  ? "bg-green-500/10 text-green-600 border-green-500/20"
                                  : "bg-orange-500/10 text-orange-600 border-orange-500/20"
                              }>
                                {patient.isVerified ? "Verified" : "Unverified"}
                              </Badge>
                              <div className="flex space-x-2">
                                <Button 
                                  variant={patient.isVerified ? "destructive" : "default"}
                                  size="sm"
                                  onClick={() => {
                                    verifyUserMutation.mutate({
                                      userId: patient._id,
                                      verified: !patient.isVerified
                                    });
                                  }}
                                  disabled={verifyUserMutation.isPending}
                                >
                                  {patient.isVerified ? 
                                    <><XCircle className="w-4 h-4 mr-1" />Unverify</> : 
                                    <><CheckCircle className="w-4 h-4 mr-1" />Verify</>
                                  }
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    /* Logic for viewing patient details */
                                  }}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No patients found</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "appointments" && (
            <div>
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">Appointment Management</h1>
                    <p className="text-muted-foreground">View all platform appointments</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      queryClient.invalidateQueries();
                    }}
                    className="flex items-center space-x-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Refresh</span>
                  </Button>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>All Appointments ({appointments.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {appointments.length > 0 ? (
                    <div className="space-y-4">
                      {appointments.map((appointment: any) => (
                        <div key={appointment._id} className="border border-border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold">Appointment #{appointment._id.slice(-6)}</h3>
                              <p className="text-sm text-muted-foreground">
                                Date: {new Date(appointment.appointmentDate).toLocaleDateString()}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Time: {appointment.appointmentTime}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Type: {appointment.appointmentType}
                              </p>
                            </div>
                            <Badge className={
                              appointment.status === 'completed' 
                                ? "bg-green-500/10 text-green-600 border-green-500/20"
                                : appointment.status === 'pending'
                                ? "bg-orange-500/10 text-orange-600 border-orange-500/20"
                                : "bg-red-500/10 text-red-600 border-red-500/20"
                            }>
                              {appointment.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No appointments found</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "analytics" && (
            <div>
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Platform Analytics</h1>
                <p className="text-muted-foreground">Real-time platform insights and statistics</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                  <CardHeader>
                    <CardTitle>User Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Users</span>
                        <span className="font-medium">{analytics?.totalUsers || users.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Doctors</span>
                        <span className="text-chart-1 font-medium">{analytics?.totalDoctors || doctors.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Patients</span>
                        <span className="text-chart-2 font-medium">{analytics?.totalPatients || patients.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Pending Verifications</span>
                        <span className="text-orange-400 font-medium">{analytics?.pendingVerifications || pendingDoctors.length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Appointment Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Appointments</span>
                        <span className="font-medium">{analytics?.totalAppointments || appointments.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">This Month</span>
                        <span className="text-chart-2 font-medium">{analytics?.monthlyAppointments || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Revenue</span>
                        <span className="text-chart-3 font-medium">₹{analytics?.totalRevenue?.toLocaleString() || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
