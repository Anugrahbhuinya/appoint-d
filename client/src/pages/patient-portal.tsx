import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { 
    Search, 
    Calendar, 
    FileText, 
    PillBottle, 
    User,
    Heart,
    Clock,
    Bell
} from "lucide-react";

interface Doctor {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
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
}

export default function PatientPortal() {
    const { user, logoutMutation } = useAuth();
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

    // Redirect if not patient
    if (user?.role !== "patient") {
        return <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
                <p className="text-muted-foreground">This portal is only accessible to registered patients.</p>
            </div>
        </div>;
    }

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
    const doctors: Doctor[] = doctorsRaw.map(doc => ({
        id: doc.userId || doc._id || doc.id,
        firstName: doc.firstName || "",
        lastName: doc.lastName || "",
        email: doc.email || "",
        
        profile: {
            specialization: doc.profile?.specialization || "",
            experience: doc.profile?.experience || 0,
            consultationFee: doc.profile?.consultationFee || 0,
            bio: doc.profile?.bio || "",
            rating: doc.profile?.rating || 0,
            totalReviews: doc.profile?.totalReviews || 0,
            isApproved: doc.profile?.isApproved || false,
        }
        
    }));

    // Doctor Map for quick lookup
    const doctorMap = doctors.reduce((acc, doctor) => {
        acc[doctor.id] = doctor;
        return acc;
    }, {} as Record<string, Doctor>);

    // Fetch appointments
    const { data: appointments = [] } = useQuery<Appointment[]>({
        queryKey: ["/api/appointments"],
    });

    // Handle booking appointment
    const handleBookAppointment = (doctor: Doctor) => {
        // ... (rest of existing logic)
        setSelectedDoctor(doctor);
        setIsBookingModalOpen(true);
    };

    const bookAppointmentMutation = useMutation({
        mutationFn: async (appointmentData: any) => {
            const res = await apiRequest("POST", "/api/appointments", appointmentData);
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
    
    // Cancel Appointment Mutation
    const cancelAppointmentMutation = useMutation({
        mutationFn: async (appointmentId: string) => {
            // Assuming a PATCH is used to update the status to 'cancelled'
            const res = await apiRequest("PATCH", `/api/appointments/${appointmentId}`, { status: "cancelled" });
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

    // Action Handlers for AppointmentCard
    const handleViewDetails = (appointmentId: string) => {
        // Implement logic to show a modal or navigate to a details page
        toast({ title: "View Details Clicked", description: `Viewing details for appointment ${appointmentId}` });
    };

    const handleReschedule = (appointmentId: string) => {
        // Implement logic to open a rescheduling flow (e.g., date picker modal)
        toast({ title: "Reschedule Clicked", description: `Initiating reschedule for appointment ${appointmentId}` });
    };

    const handleCancel = (appointmentId: string) => {
        if (window.confirm("Are you sure you want to cancel this appointment?")) {
            cancelAppointmentMutation.mutate(appointmentId);
        }
    };

    const upcomingAppointments = appointments.filter(apt => {
        const now = new Date();
        const aptDate = new Date(apt.appointmentDate);
        return aptDate > now && apt.status === "scheduled";
    });

    const pastAppointments = appointments.filter(apt => {
        const now = new Date();
        const aptDate = new Date(apt.appointmentDate);
        return aptDate <= now || apt.status === "completed" || apt.status === "cancelled";
    });

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
                                    <h3 className="font-semibold" data-testid="text-patient-name">
                                        {user.firstName} {user.lastName}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">Patient</p>
                                </div>
                            </div>
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                                <Heart className="w-3 h-3 mr-1" />
                                Active Patient
                            </Badge>
                        </div>

                        <nav className="space-y-2">
                            {/* NEW: Notifications Tab */}
                            <Button
                                variant={activeTab === "notifications" ? "default" : "ghost"}
                                className="w-full justify-start relative"
                                onClick={() => setActiveTab("notifications")}
                            >
                                <Bell className="w-4 h-4 mr-3" />
                                Notifications
                                {unreadCount > 0 && (
                                    <Badge 
                                        className="ml-auto bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center p-0 text-xs"
                                        variant="default"
                                    >
                                        {unreadCount}
                                    </Badge>
                                )}
                            </Button>

                            <Button
                                variant={activeTab === "profile" ? "default" : "ghost"}
                                className="w-full justify-start"
                                onClick={() => setActiveTab("profile")}
                                data-testid="button-profile"
                            >
                                <User className="w-4 h-4 mr-3" />
                                Profile
                            </Button>
                            <Button
                                variant={activeTab === "search" ? "default" : "ghost"}
                                className="w-full justify-start"
                                onClick={() => setActiveTab("search")}
                                data-testid="button-find-doctors"
                            >
                                <Search className="w-4 h-4 mr-3" />
                                Find Doctors
                            </Button>
                            <Button
                                variant={activeTab === "appointments" ? "default" : "ghost"}
                                className="w-full justify-start"
                                onClick={() => setActiveTab("appointments")}
                                data-testid="button-appointments"
                            >
                                <Calendar className="w-4 h-4 mr-3" />
                                My Appointments
                            </Button>
                            <Button
                                variant={activeTab === "records" ? "default" : "ghost"}
                                className="w-full justify-start"
                                onClick={() => setActiveTab("records")}
                                data-testid="button-records"
                            >
                                <FileText className="w-4 h-4 mr-3" />
                                Health Records
                            </Button>
                            <Button
                                variant={activeTab === "prescriptions" ? "default" : "ghost"}
                                className="w-full justify-start"
                                onClick={() => setActiveTab("prescriptions")}
                                data-testid="button-prescriptions"
                            >
                                <PillBottle className="w-4 h-4 mr-3" />
                                Prescriptions
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
                    {activeTab === "notifications" && (
                        <div data-testid="notifications-content">
                            <PatientNotificationDashboard />
                        </div>
                    )}

                    {activeTab === "search" && (
                        <div data-testid="search-content">
                            {/* ... (Search Filters and Doctor Results content) ... */}
                            <div className="mb-8">
                                <h1 className="text-3xl font-bold mb-2">Find Doctors</h1>
                                <p className="text-muted-foreground">Search and book appointments with verified doctors</p>
                            </div>

                            {/* Search Filters */}
                            <Card className="mb-8">
                                <CardContent className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Specialization</label>
                                            <Select
                                                value={searchFilters.specialization}
                                                onValueChange={(value) => setSearchFilters(prev => ({ ...prev, specialization: value }))}
                                            >
                                                <SelectTrigger data-testid="select-specialization">
                                                    <SelectValue />
                                                </SelectTrigger>
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
                                                onValueChange={(value) => setSearchFilters(prev => ({ ...prev, location: value }))}
                                            >
                                                <SelectTrigger data-testid="select-location">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="ranchi">Ranchi</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Max Fee (₹)</label>
                                            <Input
                                                type="number"
                                                placeholder="Enter max fee"
                                                value={searchFilters.maxFee}
                                                onChange={(e) => setSearchFilters(prev => ({ ...prev, maxFee: e.target.value }))}
                                                data-testid="input-max-fee"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Availability</label>
                                            <Select
                                                value={searchFilters.availability}
                                                onValueChange={(value) => setSearchFilters(prev => ({ ...prev, availability: value }))}
                                            >
                                                <SelectTrigger data-testid="select-availability">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="any">Any Time</SelectItem>
                                                    <SelectItem value="today">Today</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                            <span data-testid="text-doctor-count">Showing {doctors.length} doctors</span>
                                        </div>
                                        <Button data-testid="button-search-doctors">
                                            <Search className="w-4 h-4 mr-2" />
                                            Search Doctors
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Doctor Results */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {doctorsLoading ? (
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <Card key={`skeleton-${i}`} className="animate-pulse">
                                            <CardContent className="p-6">
                                                <div className="flex items-start space-x-4">
                                                    <div className="w-16 h-16 bg-muted rounded-full" />
                                                    <div className="flex-1 space-y-2">
                                                        <div className="h-4 bg-muted rounded w-3/4" />
                                                        <div className="h-3 bg-muted rounded w-1/2" />
                                                        <div className="h-3 bg-muted rounded w-full" />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                ) : doctors.length > 0 ? (
                                    doctors.map((doctor) => (
                                        <DoctorCard 
                                            key={doctor.id} 
                                            doctor={doctor}
                                            onBookAppointment={handleBookAppointment}
                                        />
                                    ))
                                ) : (
                                    <div className="col-span-2">
                                        <Card>
                                            <CardContent className="text-center py-12">
                                                <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                                <h3 className="text-lg font-semibold mb-2">No doctors found</h3>
                                                <p className="text-muted-foreground">Try adjusting your search filters</p>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === "appointments" && (
                        <div data-testid="appointments-content">
                            <div className="mb-8">
                                <h1 className="text-3xl font-bold mb-2">My Appointments</h1>
                                <p className="text-muted-foreground">Manage your upcoming and past appointments</p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2">
                                    <Tabs defaultValue="upcoming" className="w-full">
                                        <TabsList>
                                            <TabsTrigger value="upcoming" data-testid="tab-upcoming">
                                                Upcoming ({upcomingAppointments.length})
                                            </TabsTrigger>
                                            <TabsTrigger value="past" data-testid="tab-past">
                                                Past ({pastAppointments.length})
                                            </TabsTrigger>
                                        </TabsList>

                                        {/* FIX implemented here: added explicit 'return' */}
                                        <TabsContent value="upcoming" className="space-y-4">
                                            {upcomingAppointments.length > 0 ? (
                                                upcomingAppointments.map((appointment) => {
                                                    const doctor = doctorMap[appointment.doctorId];
                                                    const doctorName = doctor 
                                                        ? `${doctor.firstName} ${doctor.lastName}`
                                                        : "Consultation Doctor";
                                                    
                                                    // This explicit return fixes the TS1109 error
                                                    return (
                                                        <AppointmentCard 
                                                            key={appointment.id} 
                                                            appointment={appointment} 
                                                            userRole="patient"
                                                            doctorName={doctorName}
                                                            onViewDetails={handleViewDetails}
                                                            onReschedule={handleReschedule}
                                                            onCancel={handleCancel}
                                                        />
                                                    );
                                                })
                                            ) : (
                                                <Card>
                                                    <CardContent className="text-center py-8">
                                                        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                                        <p className="text-muted-foreground">No upcoming appointments</p>
                                                        <Button className="mt-4" onClick={() => setActiveTab("search")}>
                                                            Book New Appointment
                                                        </Button>
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </TabsContent>

                                        {/* FIX implemented here: added explicit 'return' */}
                                        <TabsContent value="past" data-testid="tab-past-content" className="space-y-4">
                                            {pastAppointments.length > 0 ? (
                                                pastAppointments.map((appointment) => {
                                                    const doctor = doctorMap[appointment.doctorId];
                                                    const doctorName = doctor 
                                                        ? `${doctor.firstName} ${doctor.lastName}`
                                                        : "Consultation Doctor";
                                                        
                                                    // This explicit return fixes the TS1109 error
                                                    return (
                                                        <AppointmentCard 
                                                            key={appointment.id} 
                                                            appointment={appointment} 
                                                            userRole="patient"
                                                            doctorName={doctorName}
                                                            onViewDetails={handleViewDetails}
                                                            onReschedule={handleReschedule}
                                                            onCancel={handleCancel}
                                                        />
                                                    );
                                                })
                                            ) : (
                                                <Card>
                                                    <CardContent className="text-center py-8">
                                                        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                                        <p className="text-muted-foreground">No past appointments</p>
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </TabsContent>
                                    </Tabs>
                                </div>

                                {/* Quick Actions Sidebar */}
                                <div className="space-y-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Quick Actions</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <Button 
                                                className="w-full" 
                                                onClick={() => setActiveTab("search")}
                                                data-testid="button-book-new"
                                            >
                                                <Calendar className="w-4 h-4 mr-2" />
                                                Book New Appointment
                                            </Button>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Health Summary</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Total Appointments</p>
                                                <p className="text-lg font-semibold" data-testid="text-total-appointments">
                                                    {appointments.length}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Upcoming</p>
                                                <p className="text-lg font-semibold text-primary" data-testid="text-upcoming-count">
                                                    {upcomingAppointments.length}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "records" && (
                        <div data-testid="records-content">
                            <div className="mb-8">
                                <h1 className="text-3xl font-bold mb-2">Health Records</h1>
                                <p className="text-muted-foreground">Manage your personal health documents and reports</p>
                            </div>

                            <HealthRecordsManager />
                        </div>
                    )}

                    {activeTab === "prescriptions" && (
                        <div data-testid="prescriptions-content">
                            <div className="mb-8">
                                <h1 className="text-3xl font-bold mb-2">Digital Prescriptions</h1>
                                <p className="text-muted-foreground">View and manage your prescriptions</p>
                            </div>

                            <Card>
                                <CardContent className="text-center py-12">
                                    <PillBottle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <h3 className="text-lg font-semibold mb-2">No Prescriptions Yet</h3>
                                    <p className="text-muted-foreground mb-4">
                                        Your digital prescriptions from consultations will appear here.
                                    </p>
                                    <Button className="mt-4" onClick={() => setActiveTab("search")}>
                                        Book a Consultation
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {activeTab === "profile" && (
                        <div data-testid="profile-content">
                            <div className="mb-8">
                                <h1 className="text-3xl font-bold mb-2">Patient Profile</h1>
                                <p className="text-muted-foreground">Manage your personal information</p>
                            </div>

                            <PatientProfileManager user={user} />
                        </div>
                    )}
                </div>
            </div>

            {/* Appointment Booking Modal */}
            {selectedDoctor && (
                <AppointmentBookingModal 
                    doctor={selectedDoctor} 
                    open={isBookingModalOpen}
                    onOpenChange={setIsBookingModalOpen}
                />
            )}
        </div>
    );
}