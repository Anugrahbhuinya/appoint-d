import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/navigation";
import DoctorCard from "@/components/doctor-card";
import AppointmentCard from "@/components/appointment-card";
import AppointmentBookingModal from "@/components/appointment-booking-modal";
import PatientProfileManager from "@/components/patient-profile-manager";
import HealthRecordsManager from "@/components/health-records-manager";
import { PatientNotificationDashboard } from "@/components/patient-notification-dashboard";
import { Calendar as DayPickerCalendar } from "@/components/ui/calendar";
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
import { format } from "date-fns";

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
    const [activeTab, setActiveTab] = useState("search");
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [searchFilters, setSearchFilters] = useState({
        specialization: "all",
        location: "ranchi",
        maxFee: "",
        availability: "any",
    });
    const { toast } = useToast();

    // ✅ Fetch unread notifications count
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

    // 🛑 FIX: Fetch raw data and map _id to id
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

    // 🛑 FIX: Map MongoDB _id to id field
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

    useEffect(() => {
        console.log("📥 FETCHED DOCTOR COUNT:", doctorsRaw.length);
        console.log("➡️ MAPPED DOCTOR DATA (first 2):", doctors.slice(0, 2));
    }, [doctorsRaw.length, doctors.length]);

    const { data: appointments = [] } = useQuery<Appointment[]>({
        queryKey: ["/api/appointments"],
    });

    // 🛑 FIX: Handle booking appointment - now receives doctor object
    const handleBookAppointment = (doctor: Doctor) => {
        console.log("🏥 [HANDLE BOOK APPOINTMENT CALLED]");
        console.log("   Received doctor:", doctor);
        console.log("   Doctor ID:", doctor?.id);
        console.log("   Doctor name:", doctor?.firstName, doctor?.lastName);
        console.log("   Has profile?", !!doctor?.profile);
        console.log("   Profile:", doctor?.profile);
        
        if (!doctor || !doctor.id) {
            console.error("❌ Invalid doctor object");
            toast({
                title: "Error",
                description: "Invalid doctor information",
                variant: "destructive",
            });
            return;
        }
        
        setSelectedDoctor(doctor);
        setIsBookingModalOpen(true);
        
        console.log("✅ Modal opened with doctor:", doctor.id);
    };

    // Debug selected doctor changes
    useEffect(() => {
        console.log("📋 [SELECTED DOCTOR CHANGED]");
        console.log("   selectedDoctor:", selectedDoctor);
        console.log("   isBookingModalOpen:", isBookingModalOpen);
    }, [selectedDoctor, isBookingModalOpen]);

    const upcomingAppointments = useMemo(() => {
        const now = new Date();
        return appointments
            .filter(apt => {
                const aptDate = new Date(apt.appointmentDate);
                return aptDate > now && apt.status === "scheduled";
            })
            .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());
    }, [appointments]);

    const pastAppointments = useMemo(() => {
        const now = new Date();
        return appointments
            .filter(apt => {
                const aptDate = new Date(apt.appointmentDate);
                return aptDate <= now || apt.status === "completed";
            })
            .sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());
    }, [appointments]);

    const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(() => new Date());

    const appointmentMap = useMemo(() => {
        const map = new Map<string, Appointment[]>();
        upcomingAppointments.forEach((appointment) => {
            const key = format(new Date(appointment.appointmentDate), "yyyy-MM-dd");
            const existing = map.get(key) ?? [];
            existing.push(appointment);
            map.set(key, existing);
        });
        return map;
    }, [upcomingAppointments]);

    const bookedDates = useMemo(() => {
        return Array.from(appointmentMap.keys()).map((key) => new Date(`${key}T00:00:00`));
    }, [appointmentMap]);

    const selectedDayAppointments = useMemo(() => {
        if (!selectedCalendarDate) return [];
        const key = format(selectedCalendarDate, "yyyy-MM-dd");
        return appointmentMap.get(key) ?? [];
    }, [selectedCalendarDate, appointmentMap]);

    useEffect(() => {
        if (upcomingAppointments.length === 0) {
            return;
        }
        setSelectedCalendarDate((current) => {
            if (!current) {
                return new Date(upcomingAppointments[0].appointmentDate);
            }

            const currentKey = format(current, "yyyy-MM-dd");
            if (appointmentMap.has(currentKey)) {
                return current;
            }

            return new Date(upcomingAppointments[0].appointmentDate);
        });
    }, [upcomingAppointments, appointmentMap]);

    const nextAppointment = useMemo(() => upcomingAppointments[0] ?? null, [upcomingAppointments]);

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
                            {/* ✅ NEW: Notifications Tab */}
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
                    {/* ✅ NEW: Notifications Tab Content */}
                    {activeTab === "notifications" && (
                        <div data-testid="notifications-content">
                            <PatientNotificationDashboard />
                        </div>
                    )}

                    {activeTab === "search" && (
                        <div data-testid="search-content">
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

                            {/* Doctor Results & Calendar */}
                            <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                                <div>
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
                                            <div className="col-span-1 lg:col-span-2">
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

                                <div className="space-y-6">
                                    <Card className="bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/70 border-border/60">
                                        <CardHeader className="pb-4">
                                            <CardTitle className="text-xl">Appointment Calendar</CardTitle>
                                            <CardDescription>
                                                View your scheduled consultations and pick a date before booking.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <DayPickerCalendar
                                                mode="single"
                                                selected={selectedCalendarDate}
                                                onSelect={setSelectedCalendarDate}
                                                defaultMonth={selectedCalendarDate ?? new Date()}
                                                modifiers={{ booked: bookedDates }}
                                                modifiersClassNames={{
                                                    booked: "relative after:absolute after:left-1/2 after:top-[70%] after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-primary",
                                                }}
                                                className="rounded-lg border border-border/60"
                                            />

                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-2">
                                                    <span className="h-2 w-2 rounded-full bg-primary" />
                                                    Scheduled visit
                                                </span>
                                                <span className="flex items-center gap-2">
                                                    <span className="h-2 w-2 rounded-full bg-muted" />
                                                    Available day
                                                </span>
                                            </div>

                                            <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-semibold">
                                                            {selectedCalendarDate ? format(selectedCalendarDate, "PPP") : "Select a day"}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {selectedDayAppointments.length} {selectedDayAppointments.length === 1 ? "appointment" : "appointments"}
                                                        </p>
                                                    </div>
                                                    <Badge variant="outline" className="text-xs">
                                                        Upcoming
                                                    </Badge>
                                                </div>

                                                {selectedDayAppointments.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {selectedDayAppointments.map((appointment) => {
                                                            const appointmentDate = new Date(appointment.appointmentDate);
                                                            const key = appointment.id ?? appointment.appointmentDate;

                                                            return (
                                                                <div
                                                                    key={key}
                                                                    className="flex items-center justify-between rounded-md bg-background/80 px-3 py-2 shadow-sm"
                                                                >
                                                                    <div>
                                                                        <p className="text-sm font-semibold">{format(appointmentDate, "p")}</p>
                                                                        <p className="text-xs text-muted-foreground capitalize">
                                                                            {appointment.type} · {appointment.status}
                                                                        </p>
                                                                    </div>
                                                                    <span className="text-xs font-semibold text-primary">₹{appointment.consultationFee}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">
                                                        No appointments scheduled for this day. Select a slot from the doctors list to book.
                                                    </p>
                                                )}
                                            </div>

                                            <Button
                                                variant="outline"
                                                className="w-full"
                                                onClick={() => setActiveTab("appointments")}
                                            >
                                                <Calendar className="w-4 h-4 mr-2" />
                                                Go to My Appointments
                                            </Button>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-border/60 bg-primary/5">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-lg">Next Upcoming Appointment</CardTitle>
                                            <CardDescription>
                                                {nextAppointment
                                                    ? `${format(new Date(nextAppointment.appointmentDate), "PPP • p")}`
                                                    : "You don't have any upcoming appointments yet."}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-3 text-sm">
                                            {nextAppointment ? (
                                                <>
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <Calendar className="w-4 h-4" />
                                                        <span>{format(new Date(nextAppointment.appointmentDate), "PPP")}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <Clock className="w-4 h-4" />
                                                        <span>{format(new Date(nextAppointment.appointmentDate), "p")} · {nextAppointment.type}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <Heart className="w-4 h-4" />
                                                        <span>Status: {nextAppointment.status}</span>
                                                    </div>
                                                    <Button
                                                        className="w-full"
                                                        variant="secondary"
                                                        onClick={() => setActiveTab("appointments")}
                                                    >
                                                        Manage Appointment
                                                    </Button>
                                                </>
                                            ) : (
                                                <div className="text-muted-foreground">
                                                    Book an appointment to see it appear here.
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
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

                                        <TabsContent value="upcoming" className="space-y-4">
                                            {upcomingAppointments.length > 0 ? (
                                                upcomingAppointments.map((appointment) => (
                                                    <AppointmentCard 
                                                        key={appointment.id} 
                                                        appointment={appointment} 
                                                        userRole="patient"
                                                    />
                                                ))
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

                                        <TabsContent value="past" data-testid="tab-past-content" className="space-y-4">
                                            {pastAppointments.length > 0 ? (
                                                pastAppointments.map((appointment) => (
                                                    <AppointmentCard 
                                                        key={appointment.id} 
                                                        appointment={appointment} 
                                                        userRole="patient"
                                                    />
                                                ))
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

            {/* Appointment Booking Modal - NOW CONDITIONAL */}
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