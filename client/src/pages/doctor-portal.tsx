import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Navigation from "@/components/navigation";
import AppointmentCard from "@/components/appointment-card";
import AvailabilityManager from "@/components/availability-manager";
import DocumentUpload from "@/components/document-upload";
import { 
  Users, 
  Calendar, 
  Clock, 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertCircle,
  DollarSign,
  Star,
  TrendingUp
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDoctorProfileSchema } from "@shared/mongodb-schema";
import { z } from "zod";

interface DoctorProfile {
  id: string;
  userId: string;
  specialization: string;
  experience: number;
  consultationFee: number;
  bio: string;
  qualifications: string[];
  hospitalAffiliation: string;
  licenseNumber: string;
  isApproved: boolean;
  rating: number;
  totalReviews: number;
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
}

type ProfileFormData = z.infer<typeof insertDoctorProfileSchema>;

export default function DoctorPortal() {
  const { user, logoutMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect if not doctor
  if (user?.role !== "doctor") {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
        <p className="text-muted-foreground">This portal is only accessible to registered doctors.</p>
      </div>
    </div>;
  }

  const { data: profile, isLoading: profileLoading } = useQuery<DoctorProfile>({
    queryKey: ["/api/doctor/profile"],
  });

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(insertDoctorProfileSchema.omit({ userId: true })),
    defaultValues: profile ? {
      ...profile,
      qualifications: profile.qualifications || [],
    } : {
      specialization: "",
      experience: 0,
      consultationFee: 500,
      bio: "",
      qualifications: [],
      hospitalAffiliation: "",
      licenseNumber: "",
    },
  });

  const createProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const res = await apiRequest("POST", "/api/doctor/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctor/profile"] });
      toast({
        title: "Profile Created",
        description: "Your doctor profile has been created successfully.",
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

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<ProfileFormData>) => {
      const res = await apiRequest("PUT", "/api/doctor/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctor/profile"] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
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

  const onProfileSubmit = (data: ProfileFormData) => {
    if (profile) {
      updateProfileMutation.mutate(data);
    } else {
      createProfileMutation.mutate(data);
    }
  };

  const todayAppointments = appointments.filter(apt => {
    const today = new Date().toDateString();
    const aptDate = new Date(apt.appointmentDate).toDateString();
    return aptDate === today && apt.status === "scheduled";
  });

  const upcomingAppointments = appointments.filter(apt => {
    const now = new Date();
    const aptDate = new Date(apt.appointmentDate);
    return aptDate > now && apt.status === "scheduled";
  }).slice(0, 5);

  const totalPatients = new Set(appointments.map(apt => apt.patientId)).size;
  const completedAppointments = appointments.filter(apt => apt.status === "completed");
  const monthlyRevenue = completedAppointments
    .filter(apt => {
      const aptDate = new Date(apt.appointmentDate);
      const now = new Date();
      return aptDate.getMonth() === now.getMonth() && aptDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, apt) => sum + apt.consultationFee, 0);

  if (profileLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p>Loading doctor portal...</p>
      </div>
    </div>;
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
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-primary font-semibold">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold" data-testid="text-doctor-name">
                    Dr. {user.firstName} {user.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground" data-testid="text-specialization">
                    {profile?.specialization || "Complete your profile"}
                  </p>
                </div>
              </div>
              {profile?.isApproved ? (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="border-orange-500/20 text-orange-600">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Pending Verification
                </Badge>
              )}
            </div>

            <nav className="space-y-2">
              <Button
                variant={activeTab === "dashboard" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("dashboard")}
                data-testid="button-dashboard"
              >
                <TrendingUp className="w-4 h-4 mr-3" />
                Dashboard
              </Button>
              <Button
                variant={activeTab === "profile" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("profile")}
                data-testid="button-profile"
              >
                <Users className="w-4 h-4 mr-3" />
                Profile
              </Button>
              <Button
                variant={activeTab === "appointments" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("appointments")}
                data-testid="button-appointments"
              >
                <Calendar className="w-4 h-4 mr-3" />
                Appointments
              </Button>
              <Button
                variant={activeTab === "availability" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("availability")}
                data-testid="button-availability"
              >
                <Clock className="w-4 h-4 mr-3" />
                Availability
              </Button>
              <Button
                variant={activeTab === "documents" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("documents")}
                data-testid="button-documents"
              >
                <FileText className="w-4 h-4 mr-3" />
                Documents
              </Button>
            </nav>

            <div className="mt-8 pt-8 border-t border-border">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => logoutMutation.mutate()}
                data-testid="button-logout"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {activeTab === "dashboard" && (
            <div data-testid="dashboard-content">
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Welcome back, Dr. {user.firstName}</h1>
                <p className="text-muted-foreground">Here's what's happening with your practice today</p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Today's Appointments</p>
                        <p className="text-2xl font-bold text-primary" data-testid="stat-today-appointments">
                          {todayAppointments.length}
                        </p>
                      </div>
                      <Calendar className="w-8 h-8 text-primary/60" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Total Patients</p>
                        <p className="text-2xl font-bold text-primary" data-testid="stat-total-patients">
                          {totalPatients}
                        </p>
                      </div>
                      <Users className="w-8 h-8 text-primary/60" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Monthly Revenue</p>
                        <p className="text-2xl font-bold text-primary" data-testid="stat-monthly-revenue">
                          ₹{monthlyRevenue.toLocaleString()}
                        </p>
                      </div>
                      <DollarSign className="w-8 h-8 text-primary/60" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Rating</p>
                        <p className="text-2xl font-bold text-primary" data-testid="stat-rating">
                          {profile?.rating ? (profile.rating / 10).toFixed(1) : "N/A"}
                        </p>
                      </div>
                      <Star className="w-8 h-8 text-primary/60" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Upcoming Appointments */}
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Appointments</CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingAppointments.length > 0 ? (
                    <div className="space-y-4">
                      {upcomingAppointments.map((appointment) => (
                        <AppointmentCard 
                          key={appointment.id} 
                          appointment={appointment} 
                          userRole="doctor"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No upcoming appointments</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "profile" && (
            <div data-testid="profile-content">
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Doctor Profile</h1>
                <p className="text-muted-foreground">Manage your professional information</p>
              </div>

              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Professional Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="specialization">Specialization</Label>
                        <Select
                          value={profileForm.watch("specialization")}
                          onValueChange={(value) => profileForm.setValue("specialization", value)}
                        >
                          <SelectTrigger data-testid="select-specialization">
                            <SelectValue placeholder="Select specialization" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cardiology">Cardiology</SelectItem>
                            <SelectItem value="neurology">Neurology</SelectItem>
                            <SelectItem value="dermatology">Dermatology</SelectItem>
                            <SelectItem value="pediatrics">Pediatrics</SelectItem>
                            <SelectItem value="orthopedics">Orthopedics</SelectItem>
                            <SelectItem value="general">General Medicine</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="experience">Experience (Years)</Label>
                        <Input
                          id="experience"
                          type="number"
                          min="0"
                          data-testid="input-experience"
                          {...profileForm.register("experience", { valueAsNumber: true })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="consultationFee">Consultation Fee (₹)</Label>
                        <Input
                          id="consultationFee"
                          type="number"
                          min="0"
                          data-testid="input-consultation-fee"
                          {...profileForm.register("consultationFee", { valueAsNumber: true })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="licenseNumber">License Number</Label>
                        <Input
                          id="licenseNumber"
                          type="text"
                          data-testid="input-license-number"
                          {...profileForm.register("licenseNumber")}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="hospitalAffiliation">Hospital Affiliation</Label>
                      <Input
                        id="hospitalAffiliation"
                        type="text"
                        data-testid="input-hospital"
                        {...profileForm.register("hospitalAffiliation")}
                      />
                    </div>

                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        rows={4}
                        placeholder="Tell patients about yourself, your approach to medicine, and your specialties..."
                        data-testid="textarea-bio"
                        {...profileForm.register("bio")}
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={createProfileMutation.isPending || updateProfileMutation.isPending}
                      data-testid="button-save-profile"
                    >
                      {createProfileMutation.isPending || updateProfileMutation.isPending
                        ? "Saving..." 
                        : profile ? "Update Profile" : "Create Profile"
                      }
                    </Button>
                  </CardContent>
                </Card>
              </form>
            </div>
          )}

          {activeTab === "appointments" && (
            <div data-testid="appointments-content">
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Appointments</h1>
                <p className="text-muted-foreground">Manage your patient appointments</p>
              </div>

              <Tabs defaultValue="upcoming" className="w-full">
                <TabsList>
                  <TabsTrigger value="upcoming" data-testid="tab-upcoming">Upcoming</TabsTrigger>
                  <TabsTrigger value="completed" data-testid="tab-completed">Completed</TabsTrigger>
                  <TabsTrigger value="cancelled" data-testid="tab-cancelled">Cancelled</TabsTrigger>
                </TabsList>

                <TabsContent value="upcoming" className="space-y-4">
                  {appointments.filter(apt => apt.status === "scheduled").length > 0 ? (
                    appointments
                      .filter(apt => apt.status === "scheduled")
                      .map((appointment) => (
                        <AppointmentCard 
                          key={appointment.id} 
                          appointment={appointment} 
                          userRole="doctor"
                        />
                      ))
                  ) : (
                    <Card>
                      <CardContent className="text-center py-8">
                        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-muted-foreground">No upcoming appointments</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="completed" className="space-y-4">
                  {appointments.filter(apt => apt.status === "completed").length > 0 ? (
                    appointments
                      .filter(apt => apt.status === "completed")
                      .map((appointment) => (
                        <AppointmentCard 
                          key={appointment.id} 
                          appointment={appointment} 
                          userRole="doctor"
                        />
                      ))
                  ) : (
                    <Card>
                      <CardContent className="text-center py-8">
                        <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-muted-foreground">No completed appointments</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="cancelled" className="space-y-4">
                  {appointments.filter(apt => apt.status === "cancelled").length > 0 ? (
                    appointments
                      .filter(apt => apt.status === "cancelled")
                      .map((appointment) => (
                        <AppointmentCard 
                          key={appointment.id} 
                          appointment={appointment} 
                          userRole="doctor"
                        />
                      ))
                  ) : (
                    <Card>
                      <CardContent className="text-center py-8">
                        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-muted-foreground">No cancelled appointments</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}

          {activeTab === "availability" && (
            <div data-testid="availability-content">
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Availability Calendar</h1>
                <p className="text-muted-foreground">Set your appointment slots and working hours</p>
              </div>

              <AvailabilityManager />
            </div>
          )}

          {activeTab === "documents" && (
            <div data-testid="documents-content">
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Verification Documents</h1>
                <p className="text-muted-foreground">Upload and manage your professional credentials</p>
              </div>

              <DocumentUpload />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
