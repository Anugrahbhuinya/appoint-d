import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  UserCheck, 
  UserX, 
  Eye, 
  Mail, 
  Phone, 
  Calendar,
  Activity,
  Heart,
  FileText,
  AlertTriangle,
  Search,
  Filter
} from "lucide-react";

interface Patient {
  _id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  profile?: {
    dateOfBirth: string;
    gender: string;
    phoneNumber: string;
    address: string;
    emergencyContact: {
      name: string;
      phone: string;
      relationship: string;
    };
    medicalHistory: string[];
    allergies: string[];
  };
  appointments?: {
    total: number;
    completed: number;
    pending: number;
    cancelled: number;
  };
  healthRecords?: {
    total: number;
    lastUpload: string;
  };
}

export default function AdminPatientManagement() {
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: patients = [], isLoading } = useQuery<Patient[]>({
    queryKey: ["/api/admin/patients"],
    queryFn: async () => {
      // Mock data - in real app, this would fetch from API
      return [
        {
          _id: "patient1",
          username: "john_doe",
          email: "john.doe@example.com",
          firstName: "John",
          lastName: "Doe",
          role: "patient",
          isVerified: true,
          isActive: true,
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          profile: {
            dateOfBirth: "1985-03-15",
            gender: "Male",
            phoneNumber: "+91 98765 43210",
            address: "123 Main Street, Ranchi, Jharkhand",
            emergencyContact: {
              name: "Jane Doe",
              phone: "+91 98765 43211",
              relationship: "Spouse"
            },
            medicalHistory: ["Hypertension", "Diabetes Type 2"],
            allergies: ["Penicillin", "Shellfish"]
          },
          appointments: { total: 12, completed: 10, pending: 2, cancelled: 0 },
          healthRecords: { total: 8, lastUpload: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() }
        },
        {
          _id: "patient2",
          username: "sarah_wilson",
          email: "sarah.wilson@example.com",
          firstName: "Sarah",
          lastName: "Wilson",
          role: "patient",
          isVerified: true,
          isActive: true,
          createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          profile: {
            dateOfBirth: "1990-07-22",
            gender: "Female",
            phoneNumber: "+91 98765 43212",
            address: "456 Park Avenue, Ranchi, Jharkhand",
            emergencyContact: {
              name: "Mike Wilson",
              phone: "+91 98765 43213",
              relationship: "Brother"
            },
            medicalHistory: ["Asthma"],
            allergies: ["Dust", "Pollen"]
          },
          appointments: { total: 6, completed: 5, pending: 1, cancelled: 0 },
          healthRecords: { total: 3, lastUpload: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() }
        },
        {
          _id: "patient3",
          username: "robert_smith",
          email: "robert.smith@example.com",
          firstName: "Robert",
          lastName: "Smith",
          role: "patient",
          isVerified: false,
          isActive: true,
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          profile: {
            dateOfBirth: "1978-11-08",
            gender: "Male",
            phoneNumber: "+91 98765 43214",
            address: "789 Oak Street, Ranchi, Jharkhand",
            emergencyContact: {
              name: "Lisa Smith",
              phone: "+91 98765 43215",
              relationship: "Wife"
            },
            medicalHistory: [],
            allergies: []
          },
          appointments: { total: 2, completed: 1, pending: 1, cancelled: 0 },
          healthRecords: { total: 0, lastUpload: "" }
        },
        {
          _id: "patient4",
          username: "emma_jones",
          email: "emma.jones@example.com",
          firstName: "Emma",
          lastName: "Jones",
          role: "patient",
          isVerified: true,
          isActive: false,
          createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          profile: {
            dateOfBirth: "1995-04-12",
            gender: "Female",
            phoneNumber: "+91 98765 43216",
            address: "321 Pine Street, Ranchi, Jharkhand",
            emergencyContact: {
              name: "David Jones",
              phone: "+91 98765 43217",
              relationship: "Father"
            },
            medicalHistory: ["Migraine"],
            allergies: ["Nuts"]
          },
          appointments: { total: 8, completed: 7, pending: 0, cancelled: 1 },
          healthRecords: { total: 5, lastUpload: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() }
        }
      ];
    },
  });

  const patientActionMutation = useMutation({
    mutationFn: async ({ 
      patientId, 
      action 
    }: { 
      patientId: string; 
      action: 'verify' | 'suspend' | 'activate';
    }) => {
      // Mock API call - in real app, this would call the actual API
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true, action });
        }, 1000);
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/patients"] });
      toast({
        title: getActionTitle(variables.action),
        description: getActionDescription(variables.action),
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

  const getActionTitle = (action: string) => {
    switch (action) {
      case 'verify': return "Patient Verified";
      case 'suspend': return "Patient Suspended";
      case 'activate': return "Patient Activated";
      default: return "Action Completed";
    }
  };

  const getActionDescription = (action: string) => {
    switch (action) {
      case 'verify': return "Patient account has been verified.";
      case 'suspend': return "Patient account has been suspended.";
      case 'activate': return "Patient account has been activated.";
      default: return "Action completed successfully.";
    }
  };

  const handlePatientAction = (patient: Patient, action: 'verify' | 'suspend' | 'activate') => {
    patientActionMutation.mutate({ patientId: patient._id, action });
  };

  // Filter patients based on search and status
  const filteredPatients = patients.filter(patient => {
    const matchesSearch = 
      patient.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      filterStatus === "all" ||
      (filterStatus === "verified" && patient.isVerified) ||
      (filterStatus === "unverified" && !patient.isVerified) ||
      (filterStatus === "active" && patient.isActive) ||
      (filterStatus === "suspended" && !patient.isActive);
    
    return matchesSearch && matchesStatus;
  });

  const allPatients = filteredPatients;
  const verifiedPatients = filteredPatients.filter(p => p.isVerified);
  const unverifiedPatients = filteredPatients.filter(p => !p.isVerified);
  const activePatients = filteredPatients.filter(p => p.isActive);
  const suspendedPatients = filteredPatients.filter(p => !p.isActive);

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

  const PatientCard = ({ patient }: { patient: Patient }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-primary font-semibold text-lg">
                {patient.firstName[0]}{patient.lastName[0]}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="text-lg font-semibold">
                  {patient.firstName} {patient.lastName}
                </h3>
                <Badge className={
                  patient.isVerified 
                    ? "bg-green-500/10 text-green-600 border-green-500/20"
                    : "bg-orange-500/10 text-orange-600 border-orange-500/20"
                }>
                  {patient.isVerified ? "Verified" : "Unverified"}
                </Badge>
                <Badge className={
                  patient.isActive 
                    ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                    : "bg-red-500/10 text-red-600 border-red-500/20"
                }>
                  {patient.isActive ? "Active" : "Suspended"}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-3">
                <div>
                  <p><strong>Email:</strong> {patient.email}</p>
                  <p><strong>Phone:</strong> {patient.profile?.phoneNumber || "Not provided"}</p>
                  <p><strong>Gender:</strong> {patient.profile?.gender || "Not specified"}</p>
                </div>
                <div>
                  <p><strong>Age:</strong> {patient.profile?.dateOfBirth ? 
                    Math.floor((Date.now() - new Date(patient.profile.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : "Not specified"} years</p>
                  <p><strong>Joined:</strong> {new Date(patient.createdAt).toLocaleDateString()}</p>
                  <p><strong>Username:</strong> {patient.username}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 text-xs text-muted-foreground mb-3">
                <div className="flex items-center space-x-1">
                  <Activity className="w-3 h-3" />
                  <span>Appointments: {patient.appointments?.total || 0}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <FileText className="w-3 h-3" />
                  <span>Records: {patient.healthRecords?.total || 0}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>Last Activity: {patient.healthRecords?.lastUpload ? 
                    new Date(patient.healthRecords.lastUpload).toLocaleDateString() : "Never"}</span>
                </div>
              </div>

              {patient.profile?.medicalHistory && patient.profile.medicalHistory.length > 0 && (
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-muted-foreground">Medical History:</span>
                  {patient.profile.medicalHistory.slice(0, 2).map((condition, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {condition}
                    </Badge>
                  ))}
                  {patient.profile.medicalHistory.length > 2 && (
                    <span className="text-muted-foreground">+{patient.profile.medicalHistory.length - 2} more</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSelectedPatient(patient);
                setIsDetailsDialogOpen(true);
              }}
            >
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </Button>
            
            {!patient.isVerified && (
              <Button
                size="sm"
                onClick={() => handlePatientAction(patient, 'verify')}
                disabled={patientActionMutation.isPending}
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Verify
              </Button>
            )}

            {patient.isActive && patient.isVerified && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePatientAction(patient, 'suspend')}
                disabled={patientActionMutation.isPending}
              >
                <UserX className="w-4 h-4 mr-2" />
                Suspend
              </Button>
            )}

            {!patient.isActive && (
              <Button
                size="sm"
                onClick={() => handlePatientAction(patient, 'activate')}
                disabled={patientActionMutation.isPending}
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
          <h2 className="text-2xl font-bold">Patient Management</h2>
          <p className="text-muted-foreground">Manage patient accounts and view health data</p>
        </div>
        <div className="flex space-x-2">
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <UserCheck className="w-3 h-3 mr-1" />
            {verifiedPatients.length} Verified
          </Badge>
          <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {unverifiedPatients.length} Unverified
          </Badge>
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
            <Activity className="w-3 h-3 mr-1" />
            {activePatients.length} Active
          </Badge>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search patients by name, email, or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-border rounded-md bg-background text-sm"
          >
            <option value="all">All Patients</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">
            All ({allPatients.length})
          </TabsTrigger>
          <TabsTrigger value="verified">
            Verified ({verifiedPatients.length})
          </TabsTrigger>
          <TabsTrigger value="unverified">
            Unverified ({unverifiedPatients.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Active ({activePatients.length})
          </TabsTrigger>
          <TabsTrigger value="suspended">
            Suspended ({suspendedPatients.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {allPatients.length > 0 ? (
            allPatients.map((patient) => (
              <PatientCard key={patient._id} patient={patient} />
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No patients found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="verified" className="space-y-4">
          {verifiedPatients.length > 0 ? (
            verifiedPatients.map((patient) => (
              <PatientCard key={patient._id} patient={patient} />
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No verified patients found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="unverified" className="space-y-4">
          {unverifiedPatients.length > 0 ? (
            unverifiedPatients.map((patient) => (
              <PatientCard key={patient._id} patient={patient} />
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No unverified patients found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {activePatients.length > 0 ? (
            activePatients.map((patient) => (
              <PatientCard key={patient._id} patient={patient} />
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No active patients found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="suspended" className="space-y-4">
          {suspendedPatients.length > 0 ? (
            suspendedPatients.map((patient) => (
              <PatientCard key={patient._id} patient={patient} />
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <UserX className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No suspended patients found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Patient Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Patient Details</DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Personal Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Name:</strong> {selectedPatient.firstName} {selectedPatient.lastName}</p>
                    <p><strong>Email:</strong> {selectedPatient.email}</p>
                    <p><strong>Username:</strong> {selectedPatient.username}</p>
                    <p><strong>Phone:</strong> {selectedPatient.profile?.phoneNumber || "Not provided"}</p>
                    <p><strong>Gender:</strong> {selectedPatient.profile?.gender || "Not specified"}</p>
                    <p><strong>Date of Birth:</strong> {selectedPatient.profile?.dateOfBirth || "Not provided"}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Account Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Status:</strong> 
                      <Badge className={`ml-2 ${selectedPatient.isActive ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                        {selectedPatient.isActive ? 'Active' : 'Suspended'}
                      </Badge>
                    </p>
                    <p><strong>Verification:</strong> 
                      <Badge className={`ml-2 ${selectedPatient.isVerified ? 'bg-green-500/10 text-green-600' : 'bg-orange-500/10 text-orange-600'}`}>
                        {selectedPatient.isVerified ? 'Verified' : 'Unverified'}
                      </Badge>
                    </p>
                    <p><strong>Joined:</strong> {new Date(selectedPatient.createdAt).toLocaleDateString()}</p>
                    <p><strong>Address:</strong> {selectedPatient.profile?.address || "Not provided"}</p>
                  </div>
                </div>
              </div>
              
              {selectedPatient.profile?.emergencyContact && (
                <div>
                  <h3 className="font-semibold mb-3">Emergency Contact</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <p><strong>Name:</strong> {selectedPatient.profile.emergencyContact.name}</p>
                    <p><strong>Phone:</strong> {selectedPatient.profile.emergencyContact.phone}</p>
                    <p><strong>Relationship:</strong> {selectedPatient.profile.emergencyContact.relationship}</p>
                  </div>
                </div>
              )}

              {selectedPatient.profile?.medicalHistory && selectedPatient.profile.medicalHistory.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Medical History</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPatient.profile.medicalHistory.map((condition, index) => (
                      <Badge key={index} variant="outline">{condition}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedPatient.profile?.allergies && selectedPatient.profile.allergies.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Allergies</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPatient.profile.allergies.map((allergy, index) => (
                      <Badge key={index} variant="destructive">{allergy}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Activity className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="font-semibold">{selectedPatient.appointments?.total || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Appointments</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <FileText className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="font-semibold">{selectedPatient.healthRecords?.total || 0}</p>
                  <p className="text-xs text-muted-foreground">Health Records</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Calendar className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="font-semibold">
                    {selectedPatient.healthRecords?.lastUpload ? 
                      new Date(selectedPatient.healthRecords.lastUpload).toLocaleDateString() : "Never"}
                  </p>
                  <p className="text-xs text-muted-foreground">Last Activity</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
