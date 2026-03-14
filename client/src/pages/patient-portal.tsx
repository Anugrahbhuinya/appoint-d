import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Navigation from "@/components/navigation";
import DoctorCard from "@/components/doctor-card";
import AppointmentCard from "@/components/appointment-card";
import AppointmentBookingModal from "@/components/appointment-booking-modal";
import PatientProfileManager from "@/components/patient-profile-manager";
import HealthRecordsManager from "@/components/health-records-manager";
import { PatientNotificationDashboard } from "@/components/patient-notification-dashboard";
import { RescheduleAppointmentModal } from "@/components/reschedule-appointment-modal";
import { useLocation } from "wouter";
import {
  Search,
  Calendar,
  FileText,
  PillBottle,
  User,
  Heart,
  Clock,
  Bell,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// ======================================================
// INTERFACES
// ======================================================

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePicture?: string | undefined;
  profile: {
    specialization: string;
    experience: number;
    consultationFee: number;
    bio: string;
    rating: number;
    totalReviews: number;
    isApproved: boolean;
  };
}

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  duration: number;
  type: string;
  status: string;
  consultationFee: number;
  notes?: string;
  createdAt: string;
  roomName?: string;
  doctor?: {
    firstName: string;
    lastName: string;
    specialization: string;
    consultationFee: number;
    profilePicture: string | undefined;
  };
}

export default function PatientPortal() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("appointments");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    specialization: "all",
    location: "ranchi",
    maxFee: "",
    availability: "any",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [rescheduleModal, setRescheduleModal] = useState<{
    open: boolean;
    appointmentId: string;
    currentDate: string;
  }>({
    open: false,
    appointmentId: "",
    currentDate: "",
  });

  // ===============================================
  // FETCH HOOKS
  // ===============================================

  const { data: freshUser } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const res = await fetch("/api/user");
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
    initialData: user,
    enabled: !!user?._id,
    staleTime: 0,
    refetchInterval: 1000,
  });

  const currentUser = freshUser || user;

  // Fetch unread notifications count
  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });

  const unreadCount = notifications.filter((n: any) => !n.read).length;

  // Fetch doctors
  const { data: doctorsRaw = [], isLoading: doctorsLoading } = useQuery<any[]>({
    queryKey: ["/api/doctors", searchFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchFilters.specialization !== "all") {
        params.append("specialization", searchFilters.specialization);
      }
      if (searchFilters.maxFee) {
        params.append("maxFee", searchFilters.maxFee);
      }

      const res = await fetch(`/api/doctors?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch doctors");
      return res.json();
    },
  });

  // Map MongoDB _id to id field
  const doctors: Doctor[] = doctorsRaw.map((doc) => ({
    id: doc.userId || doc._id || doc.id,
    firstName: doc.firstName || "",
    lastName: doc.lastName || "",
    email: doc.email || "",
    profilePicture: doc.profile?.profilePicture,
    profile: {
      specialization: doc.profile?.specialization || "",
      experience: doc.profile?.experience || 0,
      consultationFee: doc.profile?.consultationFee || 0,
      bio: doc.profile?.bio || "",
      rating: doc.profile?.rating || 0,
      totalReviews: doc.profile?.totalReviews || 0,
      isApproved: doc.profile?.isApproved || false,
    },
  }));

  // Fetch appointments
  const { data: appointmentsRaw = [] } = useQuery<any[]>({
    queryKey: ["/api/appointments"],
    queryFn: async () => {
      const res = await fetch("/api/appointments");
      if (!res.ok) throw new Error("Failed to fetch appointments");
      return res.json();
    },
  });

  // Map MongoDB _id to id field
  const appointments: Appointment[] = appointmentsRaw.map((apt) => ({
    id: apt._id || apt.id,
    patientId: apt.patientId,
    doctorId: apt.doctorId,
    appointmentDate: apt.appointmentDate,
    duration: apt.duration,
    type: apt.type,
    status: apt.status,
    consultationFee: apt.consultationFee,
    notes: apt.notes,
    createdAt: apt.createdAt,
    roomName: apt.roomName,
    doctor: apt.doctor
      ? {
          firstName: apt.doctor.firstName,
          lastName: apt.doctor.lastName,
          specialization: apt.doctor.specialization,
          consultationFee: apt.doctor.consultationFee,
          profilePicture: apt.doctor.profilePicture,
        }
      : undefined,
  }));

  // ===============================================
  // MUTATIONS AND HANDLERS
  // ===============================================

  const handleBookAppointment = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setIsBookingModalOpen(true);
  };

  const bookAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      const res = await apiRequest(
        "POST",
        "/api/appointments",
        appointmentData
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Appointment Booked",
        description: "Your appointment has been scheduled successfully.",
      });
      setIsBookingModalOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Booking Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const res = await apiRequest(
        "POST",
        `/api/appointments/${appointmentId}/cancel`,
        {
          reason: "Cancelled by patient",
        }
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to cancel");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Appointment Cancelled",
        description: "Your appointment has been successfully cancelled.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Cancellation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleJoinCall = (appointment: Appointment) => {
    if (appointment.type !== "video") {
      toast({
        title: "Invalid Appointment Type",
        description: "Only video appointments support live calls",
        variant: "destructive",
      });
      return;
    }

    if (!appointment.roomName) {
      apiRequest(
        "POST",
        `/api/appointments/${appointment.id}/create-video-session`,
        {}
      )
        .then((res) => res.json())
        .then((data) => {
          const roomName = data.roomName;
          if (!roomName) throw new Error("No room name returned from server");
          setLocation(`/consultation/${appointment.id}?roomName=${encodeURIComponent(roomName)}`);
        })
        .catch((error) => {
          toast({
            title: "Video Call Error",
            description: error.message || "Failed to initialize video session",
            variant: "destructive",
          });
        });
    } else {
      setLocation(`/consultation/${appointment.id}?roomName=${encodeURIComponent(appointment.roomName)}`);
    }
  };

  const handleViewDetails = (appointmentId: string) => {
    toast({
      title: "View Details",
      description: `Viewing details for appointment ${appointmentId}`,
    });
  };

  const handleReschedule = (appointmentId: string, currentDate: string) => {
    setRescheduleModal({
      open: true,
      appointmentId,
      currentDate,
    });
  };

  const handleCancel = (appointmentId: string) => {
    if (window.confirm("Are you sure you want to cancel this appointment?")) {
      cancelAppointmentMutation.mutate(appointmentId);
    }
  };

  // ===============================================
  // DATA FILTERING
  // ===============================================

  const upcomingAppointments = appointments.filter((apt) => {
    const now = new Date();
    const aptDate = new Date(apt.appointmentDate);
    return (
      aptDate > now &&
      (apt.status === "scheduled" ||
        apt.status === "confirmed" ||
        apt.status === "awaiting_payment")
    );
  });

  const pastAppointments = appointments.filter((apt) => {
    const now = new Date();
    const aptDate = new Date(apt.appointmentDate);
    return (
      aptDate <= now || apt.status === "completed" || apt.status === "cancelled"
    );
  });

  // ===============================================
  // JSX RETURN
  // ===============================================

  if (currentUser?.role !== "patient") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
          <p className="text-muted-foreground">This portal is only accessible to registered patients.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-card border-r border-border min-h-screen">
          <div className="p-6">
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-2">
                <Avatar className="w-12 h-12">
                  {currentUser.profilePicture ? (
                    <AvatarImage
                      src={currentUser.profilePicture}
                      alt={`${currentUser.firstName} ${currentUser.lastName}`}
                    />
                  ) : (
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {currentUser.firstName?.[0]}{currentUser.lastName?.[0]}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <h3 className="font-semibold">{currentUser.firstName} {currentUser.lastName}</h3>
                  <p className="text-sm text-muted-foreground">Patient</p>
                </div>
              </div>
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                <Heart className="w-3 h-3 mr-1" /> Active Patient
              </Badge>
            </div>

            <nav className="space-y-2">
              <Button
                variant={activeTab === "notifications" ? "default" : "ghost"}
                className="w-full justify-start relative"
                onClick={() => setActiveTab("notifications")}
              >
                <Bell className="w-4 h-4 mr-3" />
                Notifications
                {unreadCount > 0 && (
                  <Badge className="ml-auto bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center p-0 text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </Button>

              <Button
                variant={activeTab === "profile" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("profile")}
              >
                <User className="w-4 h-4 mr-3" /> Profile
              </Button>
              <Button
                variant={activeTab === "search" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("search")}
              >
                <Search className="w-4 h-4 mr-3" /> Find Doctors
              </Button>
              <Button
                variant={activeTab === "appointments" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("appointments")}
              >
                <Calendar className="w-4 h-4 mr-3" /> My Appointments
              </Button>
              <Button
                variant={activeTab === "records" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("records")}
              >
                <FileText className="w-4 h-4 mr-3" /> Health Records
              </Button>
              <Button
                variant={activeTab === "prescriptions" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("prescriptions")}
              >
                <PillBottle className="w-4 h-4 mr-3" /> Prescriptions
              </Button>
            </nav>

            <div className="mt-8 pt-8 border-t border-border">
              <Button variant="outline" className="w-full" onClick={() => logoutMutation.mutate()}>
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {activeTab === "notifications" && <PatientNotificationDashboard />}

          {activeTab === "search" && (
            <div>
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Find Doctors</h1>
                <p className="text-muted-foreground">Search and book appointments with verified doctors</p>
              </div>

              <Card className="mb-8">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Specialization</label>
                      <Select
                        value={searchFilters.specialization}
                        onValueChange={(v) => setSearchFilters((p) => ({ ...p, specialization: v }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Specializations</SelectItem>
                          <SelectItem value="general">General Medicine</SelectItem>
                          <SelectItem value="cardiology">Cardiology</SelectItem>
                          <SelectItem value="dermatology">Dermatology</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Location</label>
                      <Select
                        value={searchFilters.location}
                        onValueChange={(v) => setSearchFilters((p) => ({ ...p, location: v }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="ranchi">Ranchi</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Max Fee (₹)</label>
                      <Input
                        type="number"
                        placeholder="Enter max fee"
                        value={searchFilters.maxFee}
                        onChange={(e) => setSearchFilters((p) => ({ ...p, maxFee: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Availability</label>
                      <Select
                        value={searchFilters.availability}
                        onValueChange={(v) => setSearchFilters((p) => ({ ...p, availability: v }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any Time</SelectItem>
                          <SelectItem value="today">Today</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Showing {doctors.length} doctors</span>
                    <Button><Search className="w-4 h-4 mr-2" /> Search Doctors</Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {doctorsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="animate-pulse h-32 bg-muted/50" />
                  ))
                ) : doctors.length > 0 ? (
                  doctors.map((doc) => (
                    <DoctorCard key={doc.id} doctor={doc} onBookAppointment={handleBookAppointment} />
                  ))
                ) : (
                  <div className="col-span-2 text-center py-12">
                    <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold">No doctors found</h3>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "appointments" && (
            <div>
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">My Appointments</h1>
                <p className="text-muted-foreground">Manage your upcoming and past appointments</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <Tabs defaultValue="upcoming" className="w-full">
                    <TabsList>
                      <TabsTrigger value="upcoming">Upcoming ({upcomingAppointments.length})</TabsTrigger>
                      <TabsTrigger value="past">Past ({pastAppointments.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="upcoming" className="space-y-4">
                      {upcomingAppointments.length > 0 ? (
                        upcomingAppointments.map((apt) => (
                          <AppointmentCard
                            key={apt.id}
                            appointment={apt}
                            userRole="patient"
                            doctorName={apt.doctor ? `Dr. ${apt.doctor.firstName} ${apt.doctor.lastName}` : "Doctor"}
                            doctorDetails={apt.doctor}
                            onViewDetails={handleViewDetails}
                            onReschedule={() => handleReschedule(apt.id, apt.appointmentDate)}
                            onCancel={handleCancel}
                            onJoinCall={() => handleJoinCall(apt)}
                          />
                        ))
                      ) : (
                        <Card className="text-center py-8">
                          <CardContent>
                            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p className="text-muted-foreground">No upcoming appointments</p>
                            <Button className="mt-4" onClick={() => setActiveTab("search")}>Book New Appointment</Button>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>

                    <TabsContent value="past" className="space-y-4">
                      {pastAppointments.length > 0 ? (
                        pastAppointments.map((apt) => (
                          <AppointmentCard
                            key={apt.id}
                            appointment={apt}
                            userRole="patient"
                            doctorName={apt.doctor ? `Dr. ${apt.doctor.firstName} ${apt.doctor.lastName}` : "Doctor"}
                            doctorDetails={apt.doctor}
                            onViewDetails={handleViewDetails}
                            onReschedule={() => handleReschedule(apt.id, apt.appointmentDate)}
                            onCancel={handleCancel}
                            onJoinCall={() => handleJoinCall(apt)}
                          />
                        ))
                      ) : (
                        <Card className="text-center py-8">
                          <CardContent>
                            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p className="text-muted-foreground">No past appointments</p>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="space-y-6">
                  <Card>
                    <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
                    <CardContent>
                      <Button className="w-full" onClick={() => setActiveTab("search")}>
                        <Calendar className="w-4 h-4 mr-2" /> Book New Appointment
                      </Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Health Summary</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div><p className="text-sm text-muted-foreground">Total Appointments</p><p className="text-lg font-semibold">{appointments.length}</p></div>
                      <div><p className="text-sm text-muted-foreground">Upcoming</p><p className="text-lg font-semibold text-primary">{upcomingAppointments.length}</p></div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {activeTab === "records" && <HealthRecordsManager />}

          {activeTab === "prescriptions" && (
            <div>
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Digital Prescriptions</h1>
                <p className="text-muted-foreground">View and manage your prescriptions</p>
              </div>
              <Card>
                <CardContent className="text-center py-12">
                  <PillBottle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Prescriptions Yet</h3>
                  <p className="text-muted-foreground mb-4">Your digital prescriptions will appear here.</p>
                  <Button onClick={() => setActiveTab("search")}>Book a Consultation</Button>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "profile" && (
            <div>
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Patient Profile</h1>
                <p className="text-muted-foreground">Manage your personal information</p>
              </div>
              <PatientProfileManager user={currentUser} />
            </div>
          )}
        </div>
      </div>

      {selectedDoctor && (
        <AppointmentBookingModal
          doctor={selectedDoctor}
          open={isBookingModalOpen}
          onOpenChange={setIsBookingModalOpen}
        />
      )}

      <RescheduleAppointmentModal
        open={rescheduleModal.open}
        onOpenChange={(open) => setRescheduleModal((prev) => ({ ...prev, open }))}
        appointmentId={rescheduleModal.appointmentId}
        currentDate={rescheduleModal.currentDate}
      />
    </div>
  );
}