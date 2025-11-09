import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppointdPlusDoctor } from "@/components/AppointdPlusDoctor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import AppointmentStatusManager from "@/components/appointment-status-manager";
import AvailabilityManager from "@/components/availability-manager";
import DocumentUpload from "@/components/document-upload";
import { DoctorNotificationDashboard } from "@/components/doctor-notification-dashboard";
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
    TrendingUp,
    Camera,
    X,
    Bell,
    MapPin,
    Loader2,
    Plus,
    Zap
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
    profilePicture?: string;
    gender?: 'male' | 'female' | 'other';
    clinicAddress?: {
        fullAddress: string;
        city: string;
        state: string;
        pincode: string;
        lat: string;
        lon: string;
    };
}

// Includes all possible statuses for type safety across components
interface Appointment {
    _id: string;
    id: string;
    patientId: string;
    doctorId: string;
    patientName?: string;
    appointmentDate: string;
    duration: number;
    type: "video" | "in-person";
    status: "scheduled" | "completed" | "cancelled" | "no-show" | "awaiting_payment" | "confirmed" | "pending"; 
    consultationFee: number;
    notes?: string;
    prescription?: string;
    createdAt: string;
}

const DoctorProfileFormSchema = insertDoctorProfileSchema.omit({ userId: true }).extend({
    profilePicture: z.string().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    clinicAddress: z.object({
        fullAddress: z.string().min(1, "Address is required"),
        city: z.string().optional(),
        state: z.string().optional(),
        pincode: z.string().optional(),
        lat: z.string().optional(),
        lon: z.string().optional(),
    }).optional(),
});

type ProfileFormData = z.infer<typeof DoctorProfileFormSchema>;

interface AddressSuggestion {
    place_id: string;
    display_name: string;
    lat: string;
    lon: string;
    address: {
        city?: string;
        town?: string;
        village?: string;
        state?: string;
        postcode?: string;
    };
}


export default function DoctorPortal() {
    const { user, logoutMutation } = useAuth();
    const [activeTab, setActiveTab] = useState("dashboard");
    const [profilePicPreview, setProfilePicPreview] = useState<string | null>(
        null
    );
    const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
    const [isUploadingPic, setIsUploadingPic] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [addressSearch, setAddressSearch] = useState("");
    const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
    const [isAddressLoading, setIsAddressLoading] = useState(false);
    const [isAddressMenuOpen, setIsAddressMenuOpen] = useState(false);

    // Redirect if not doctor
    if (user?.role !== "doctor") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-destructive mb-2">
                        Access Denied
                    </h1>
                    <p className="text-muted-foreground">
                        This portal is only accessible to registered doctors.
                    </p>
                </div>
            </div>
        );
    }

    // ------------------------------------------------------------------
    // 1. FETCH NOTIFICATIONS (For Badge Count)
    // ------------------------------------------------------------------
    const { data: notifications = [] } = useQuery<any[]>({
        queryKey: ["/api/doctor/notifications"],
        queryFn: async () => {
            const res = await fetch("/api/doctor/notifications");
            if (!res.ok) throw new Error("Failed to fetch doctor notifications");
            return res.json();
        },
        refetchInterval: 5000,
        refetchIntervalInBackground: true,
    });

    const appointmentsRequiringAction = notifications.filter((a: any) => 
        a.status === "pending" || a.status === "awaiting_payment"
    ).length;
    
    // Using the count of appointments that need doctor attention for the badge
    const unreadCount = appointmentsRequiringAction; 
    // ------------------------------------------------------------------

    const {
        data: profile,
        isLoading: profileLoading,
        refetch: refetchProfile,
    } = useQuery<DoctorProfile>({
        queryKey: ["/api/doctor/profile"],
        staleTime: 10000,
        refetchOnWindowFocus: true,
        refetchInterval: 30000,
    });

    const { data: allAppointments = [], refetch: refetchAppointments } = useQuery<
        Appointment[]
    >({
        queryKey: ["/api/appointments"],
        staleTime: 5000,
        refetchOnWindowFocus: true,
    });

    const userIdStr = typeof user?.id === 'string' ? user.id : user?._id?.toString?.() || '';

    // Simplified filter to only match the logged-in doctor's ID
    const appointments = allAppointments.filter((apt) => {
        return apt.doctorId === userIdStr;
    });

    console.log(`📋 [Doctor Portal] Appointments Filter:`, {
        total: allAppointments.length,
        filtered: appointments.length,
        userId: userIdStr || user?.id || user?._id,
        sampleAppointment: allAppointments[0]?.doctorId,
    });

    // Include scheduled and confirmed for today
    const todayAppointments = appointments.filter((apt) => {
        const today = new Date().toDateString();
        const aptDate = new Date(apt.appointmentDate).toDateString();
        return aptDate === today && (apt.status === "scheduled" || apt.status === "confirmed");
    });

    // 1. FIX: Upcoming Appointments (Dashboard Summary) - ONLY show Finalized statuses
    const upcomingAppointments = appointments
        .filter((apt) => {
            const now = new Date();
            const aptDate = new Date(apt.appointmentDate);

            // Filter: Must be in the future AND have a finalized status
            const isFinalized = apt.status === "scheduled" || apt.status === "confirmed"; 
            
            return aptDate > now && isFinalized;
        })
        .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())
        .slice(0, 5);

    // FIX: Included all required profile fields in values
    const profileForm = useForm<ProfileFormData>({
        resolver: zodResolver(DoctorProfileFormSchema),
        defaultValues: {
            specialization: "",
            experience: 0,
            consultationFee: 500,
            bio: "",
            qualifications: [],
            hospitalAffiliation: "",
            licenseNumber: "",
            profilePicture: undefined,
            gender: undefined,
            clinicAddress: undefined,
        },
        values: profile ? {
            specialization: profile.specialization,
            experience: profile.experience,
            consultationFee: profile.consultationFee,
            bio: profile.bio,
            qualifications: profile.qualifications || [],
            hospitalAffiliation: profile.hospitalAffiliation,
            licenseNumber: profile.licenseNumber,
            isApproved: profile.isApproved,
            rating: profile.rating,
            totalReviews: profile.totalReviews,
            profilePicture: profile.profilePicture || undefined,
            gender: profile.gender || undefined,
            clinicAddress: profile.clinicAddress || undefined,
        } : undefined,
    });

    const watchedGender = profileForm.watch("gender");

    useEffect(() => {
        if (profile?.clinicAddress?.fullAddress && !addressSearch) {
            setAddressSearch(profile.clinicAddress.fullAddress);
        }
    }, [profile, addressSearch]);

    useEffect(() => {
        if (!addressSearch || addressSearch.trim().length < 3 || !isAddressMenuOpen) {
            setAddressSuggestions([]);
            setIsAddressLoading(false);
            return;
        }

        if (addressSearch === profile?.clinicAddress?.fullAddress) {
            setAddressSuggestions([]);
            return;
        }

        setIsAddressLoading(true);
        const id = setTimeout(async () => {
            try {
                const q = encodeURIComponent(addressSearch);
                const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${q}&countrycodes=in&addressdetails=1&limit=5`;

                const res = await fetch(url, { headers: { "User-Agent": "appointd-app/1.0" } });
                if (!res.ok) throw new Error("Nominatim API failed");

                const data = await res.json();
                setAddressSuggestions(data as AddressSuggestion[]);
            } catch (err) {
                console.error("Failed to fetch address suggestions:", err);
                setAddressSuggestions([]);
            } finally {
                setIsAddressLoading(false);
            }
        }, 400);

        return () => clearTimeout(id);
    }, [addressSearch, profile?.clinicAddress?.fullAddress, isAddressMenuOpen]);

    const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            console.log("📸 File selected:", {
                name: file.name,
                type: file.type,
                size: file.size,
            });

            if (!file.type.startsWith("image/")) {
                toast({
                    title: "Invalid file type",
                    description: "Please select an image file",
                    variant: "destructive",
                });
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                toast({
                    title: "File too large",
                    description: "Please select an image under 5MB",
                    variant: "destructive",
                });
                return;
            }

            setProfilePicFile(file);

            const reader = new FileReader();
            reader.onload = (event) => {
                const result = event.target?.result as string;
                console.log("✅ Preview generated, size:", result.length);
                setProfilePicPreview(result);
            };
            reader.onerror = () => {
                console.error("❌ Failed to read file");
                toast({
                    title: "Error",
                    description: "Failed to read file",
                    variant: "destructive",
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const removeProfilePic = async () => {
        try {
            setProfilePicFile(null);
            setProfilePicPreview(null);
            profileForm.setValue("profilePicture", "");

            const res = await fetch("/api/doctor/profile/picture/remove", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!res.ok) {
                throw new Error("Failed to remove picture");
            }

            const updated = await res.json();
            queryClient.invalidateQueries({ queryKey: ["/api/doctor/profile"] });

            toast({
                title: "Picture Removed",
                description: "Your profile picture has been removed.",
            });
        } catch (error: any) {
            console.error("Error removing picture:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to remove picture",
                variant: "destructive",
            });
        }
    };

    const createProfileMutation = useMutation({
        mutationFn: async (data: ProfileFormData) => {
            const payload = {
                ...data,
                profilePicture: data.profilePicture || null,
            };

            const res = await fetch("/api/doctor/profile", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const error = await res.text();
                throw new Error(error || "Failed to create profile");
            }

            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/doctor/profile"] });
            setProfilePicFile(null);
            setProfilePicPreview(null);
            toast({
                title: "Profile Created",
                description: "Your doctor profile has been created successfully.",
            });
        },
        onError: (error: Error) => {
            console.error("Profile creation error:", error);
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const updateProfileMutation = useMutation({
        mutationFn: async (data: Partial<ProfileFormData>) => {
            const payload = {
                ...data,
                profilePicture: data.profilePicture || null,
            };

            setIsUploadingPic(true);
            try {
                const res = await fetch("/api/doctor/profile", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                });

                if (!res.ok) {
                    const error = await res.text();
                    throw new Error(error || "Failed to update profile");
                }

                return res.json();
            } finally {
                setIsUploadingPic(false);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/doctor/profile"] });
            setProfilePicFile(null);
            setProfilePicPreview(null);
            toast({
                title: "Profile Updated",
                description: "Your profile has been updated successfully.",
            });
        },
        onError: (error: Error) => {
            console.error("Profile update error:", error);
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const onProfileSubmit = (data: ProfileFormData) => {
        const dataWithPicture = {
            ...data,
            profilePicture: profilePicPreview || data.profilePicture,
        };

        if (profile) {
            updateProfileMutation.mutate(dataWithPicture);
        } else {
            createProfileMutation.mutate(dataWithPicture);
        }
    };


    const totalPatients = new Set(appointments.map((apt) => apt.patientId)).size;
    const completedAppointments = appointments.filter(
        (apt) => apt.status === "completed"
    );
    const monthlyRevenue = completedAppointments
        .filter((apt) => {
            const aptDate = new Date(apt.appointmentDate);
            const now = new Date();
            return (
                aptDate.getMonth() === now.getMonth() &&
                aptDate.getFullYear() === now.getFullYear()
            );
        })
        .reduce((sum, apt) => sum + apt.consultationFee, 0);

    if (profileLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                    <p>Loading doctor portal...</p>
                </div>
            </div>
        );
    }

    const displayPictureUrl = profilePicPreview || profile?.profilePicture;

    return (
        <div className="min-h-screen bg-background">
            <Navigation />

            <div className="flex">
                {/* Sidebar */}
                <div className="w-64 bg-card border-r border-border min-h-screen">
                    <div className="p-6">
                        <div className="mb-8">
                            <div className="flex items-center space-x-3 mb-2">
                                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {profile?.profilePicture ? (
                                        <img
                                            src={profile.profilePicture}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                            onError={() => {
                                                console.warn(
                                                    "Failed to load profile picture from database"
                                                );
                                            }}
                                        />
                                    ) : (
                                        <span className="text-primary font-semibold text-sm">
                                            {user.firstName?.[0]}
                                            {user.lastName?.[0]}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3
                                        className="font-semibold truncate"
                                        data-testid="text-doctor-name"
                                    >
                                        Dr. {user.firstName} {user.lastName}
                                    </h3>
                                    <p
                                        className="text-sm text-muted-foreground truncate"
                                        data-testid="text-specialization"
                                    >
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
                                <Badge
                                    variant="outline"
                                    className="border-orange-500/20 text-orange-600"
                                >
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Pending Verification
                                </Badge>
                            )}
                        </div>

                        <nav className="space-y-2">
                            <Button
                                variant={activeTab === "profile" ? "default" : "ghost"}
                                className="w-full justify-start"
                                onClick={() => setActiveTab("profile")}
                                data-testid="button-profile"
                            >
                                <Users className="w-4 h-4 mr-3" />
                                Profile
                            </Button>
                            {/* --- NOTIFICATIONS BUTTON --- */}
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
                            {/* --- DASHBOARD BUTTON --- */}
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
                            <Button
                                variant={activeTab === "plus" ? "default" : "ghost"}
                                className="w-full justify-start"
                                onClick={() => setActiveTab("plus")}
                                data-testid="button-plus"
                            >
                                <Zap className="w-4 h-4 mr-3" />
                                Appoint'd Plus
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
                    {/* --- NOTIFICATIONS TAB CONTENT --- */}
                    {activeTab === "notifications" && (
                        <div data-testid="notifications-content">
                            <div className="mb-8">
                                <h1 className="text-3xl font-bold mb-2">My Notifications</h1>
                                <p className="text-muted-foreground">
                                    View and manage updates about your practice
                                </p>
                            </div>
                            <DoctorNotificationDashboard />
                        </div>
                    )}
                    {/* --- DASHBOARD TAB CONTENT --- */}
                    {activeTab === "dashboard" && (
                        <div data-testid="dashboard-content">
                            <div className="mb-8">
                                <h1 className="text-3xl font-bold mb-2">
                                    Welcome back, Dr. {user.firstName}
                                </h1>
                                <p className="text-muted-foreground">
                                    Here's what's happening with your practice today
                                </p>
                            </div>

                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-muted-foreground text-sm">
                                                    Today's Appointments
                                                </p>
                                                <p
                                                    className="text-2xl font-bold text-primary"
                                                    data-testid="stat-today-appointments"
                                                >
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
                                                <p className="text-muted-foreground text-sm">
                                                    Total Patients
                                                </p>
                                                <p
                                                    className="text-2xl font-bold text-primary"
                                                    data-testid="stat-total-patients"
                                                >
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
                                                <p className="text-muted-foreground text-sm">
                                                    Monthly Revenue
                                                </p>
                                                <p
                                                    className="text-2xl font-bold text-primary"
                                                    data-testid="stat-monthly-revenue"
                                                >
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
                                                <p
                                                    className="text-2xl font-bold text-primary"
                                                    data-testid="stat-rating"
                                                >
                                                    {profile?.rating
                                                        ? (profile.rating / 10).toFixed(1)
                                                        : "N/A"}
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
                                                <AppointmentStatusManager
                                                    key={appointment._id}
                                                    appointment={appointment}
                                                    userRole="doctor"
                                                    onStatusChange={() => refetchAppointments()}
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
                                <p className="text-muted-foreground">
                                    Manage your professional information
                                </p>
                            </div>

                            <div className="space-y-6">
                                {/* Profile Picture Upload */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Profile Picture</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="flex items-center space-x-6">
                                            <div className="w-32 h-32 bg-primary/10 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                                                {displayPictureUrl ? (
                                                    <img
                                                        src={displayPictureUrl}
                                                        alt="Profile preview"
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            console.error("Failed to load preview image");
                                                            e.currentTarget.style.display = "none";
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="text-center">
                                                        <Camera className="w-8 h-8 text-primary/60 mx-auto mb-2" />
                                                        <p className="text-sm text-muted-foreground">
                                                            No image
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1">
                                                <div className="space-y-3">
                                                    <div>
                                                        <Label
                                                            htmlFor="profilePic"
                                                            className="cursor-pointer"
                                                        >
                                                            <div className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-primary/30 rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors">
                                                                <Upload className="w-4 h-4 mr-2" />
                                                                <span className="text-sm font-medium">
                                                                    Click to upload
                                                                </span>
                                                            </div>
                                                            <input
                                                                id="profilePic"
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={handleProfilePicChange}
                                                                className="hidden"
                                                                data-testid="input-profile-pic"
                                                                disabled={isUploadingPic}
                                                            />
                                                        </Label>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        PNG, JPG, GIF up to 5MB
                                                    </p>
                                                    {displayPictureUrl && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={removeProfilePic}
                                                            data-testid="button-remove-pic"
                                                            disabled={isUploadingPic}
                                                        >
                                                            <X className="w-4 h-4 mr-2" />
                                                            Remove Image
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Professional Information */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Professional Information</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {/* --- Clinic Address Input --- */}
                                        <div className="relative space-y-1">
                                            <Label htmlFor="clinicAddress">Clinic Address</Label>
                                            <div className="relative">
                                                <MapPin className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                                                <Input
                                                    id="clinicAddress"
                                                    type="text"
                                                    placeholder="Start typing your clinic address..."
                                                    className="pl-10"
                                                    value={addressSearch}
                                                    onChange={(e) => {
                                                        setAddressSearch(e.target.value);
                                                        setIsAddressMenuOpen(true);
                                                        if (profileForm.getValues("clinicAddress")) {
                                                            profileForm.setValue("clinicAddress", undefined, { shouldValidate: true });
                                                        }
                                                    }}
                                                    onFocus={() => setIsAddressMenuOpen(true)}
                                                    onBlur={() => {
                                                        setTimeout(() => setIsAddressMenuOpen(false), 150);
                                                    }}
                                                />
                                                {isAddressLoading && (
                                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                                                )}
                                            </div>

                                            {/* Suggestions Dropdown */}
                                            {isAddressMenuOpen && (addressSuggestions.length > 0 || isAddressLoading) && (
                                                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                    {isAddressLoading && !addressSuggestions.length && (
                                                        <div className="p-3 text-sm text-muted-foreground text-center">Loading...</div>
                                                    )}
                                                    {addressSuggestions.map((suggestion) => (
                                                        <button
                                                            key={suggestion.place_id}
                                                            type="button"
                                                            className="w-full text-left p-3 text-sm hover:bg-muted"
                                                            onMouseDown={() => {
                                                                const newAddress = {
                                                                    fullAddress: suggestion.display_name,
                                                                    city: suggestion.address.city || suggestion.address.town || suggestion.address.village || "",
                                                                    state: suggestion.address.state || "",
                                                                    pincode: suggestion.address.postcode || "",
                                                                    lat: suggestion.lat,
                                                                    lon: suggestion.lon,
                                                                };

                                                                profileForm.setValue("clinicAddress", newAddress, { shouldValidate: true, shouldDirty: true });
                                                                setAddressSearch(suggestion.display_name);
                                                                setIsAddressMenuOpen(false);
                                                                setAddressSuggestions([]);
                                                            }}
                                                        >
                                                            {suggestion.display_name}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                            {/* --- GENDER SELECTOR --- */}
                                            <div>
                                                <Label htmlFor="gender">Gender</Label>
                                                <Select
                                                    value={profileForm.watch("gender")}
                                                    onValueChange={(value: 'male' | 'female' | 'other') => {
                                                        profileForm.setValue("gender", value, { shouldDirty: true });
                                                        if (value !== 'female' && profileForm.getValues("specialization") === "Female Health Specialist") {
                                                            profileForm.setValue("specialization", "", { shouldDirty: true });
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger data-testid="select-gender">
                                                        <SelectValue placeholder="Select your gender" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="male">Male</SelectItem>
                                                        <SelectItem value="female">Female</SelectItem>
                                                        <SelectItem value="other">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div>
                                                <Label htmlFor="specialization">Specialization</Label>
                                                <Select
                                                    value={profileForm.watch("specialization")}
                                                    onValueChange={(value) =>
                                                        profileForm.setValue("specialization", value, { shouldDirty: true })
                                                    }
                                                >
                                                    <SelectTrigger data-testid="select-specialization">
                                                        <SelectValue placeholder="Select specialization" />
                                                    </SelectTrigger>

                                                    <SelectContent>
                                                        <SelectItem value="General Medicine">
                                                            General Medicine
                                                        </SelectItem>
                                                        <SelectItem value="Dentist">Dentist</SelectItem>
                                                        <SelectItem value="Dermatologist">
                                                            Dermatologist
                                                        </SelectItem>
                                                        <SelectItem value="Pediatrician">
                                                            Pediatrician
                                                        </SelectItem>
                                                        <SelectItem value="Orthopedics">
                                                            Orthopedics
                                                        </SelectItem>
                                                        <SelectItem value="Psychiatirst">
                                                            Psychiatrist
                                                        </SelectItem>
                                                        <SelectItem value="Gynecologist">
                                                            Gynecologist
                                                        </SelectItem>

                                                        {watchedGender === 'female' && (
                                                            <SelectItem value="Female Health Specialist">
                                                                Female Health Specialist
                                                            </SelectItem>
                                                        )}
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
                                                    {...profileForm.register("experience", {
                                                        valueAsNumber: true,
                                                    })}
                                                />
                                            </div>

                                            <div>
                                                <Label htmlFor="consultationFee">
                                                    Consultation Fee (₹)
                                                </Label>
                                                <Input
                                                    id="consultationFee"
                                                    type="number"
                                                    min="0"
                                                    data-testid="input-consultation-fee"
                                                    {...profileForm.register("consultationFee", {
                                                        valueAsNumber: true,
                                                    })}
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

                                            <div>
                                                <Label htmlFor="hospitalAffiliation">
                                                    Hospital Affiliation
                                                </Label>
                                                <Input
                                                    id="hospitalAffiliation"
                                                    type="text"
                                                    data-testid="input-hospital"
                                                    {...profileForm.register("hospitalAffiliation")}
                                                />
                                            </div>
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
                                            type="button"
                                            onClick={profileForm.handleSubmit(onProfileSubmit)}
                                            disabled={
                                                createProfileMutation.isPending ||
                                                updateProfileMutation.isPending ||
                                                isUploadingPic
                                            }
                                            data-testid="button-save-profile"
                                        >
                                            {createProfileMutation.isPending ||
                                                updateProfileMutation.isPending ||
                                                isUploadingPic
                                                ? "Saving..."
                                                : profile
                                                ? "Update Profile"
                                                : "Create Profile"}
                                        </Button>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}

                    {activeTab === "appointments" && (
                        <div data-testid="appointments-content">
                            <div className="mb-8">
                                <h1 className="text-3xl font-bold mb-2">Appointments</h1>
                                <p className="text-muted-foreground">
                                    Manage your patient appointments
                                </p>
                            </div>

                            <Tabs defaultValue="upcoming" className="w-full">
                                <TabsList>
                                    <TabsTrigger value="upcoming" data-testid="tab-upcoming">
                                        Upcoming
                                    </TabsTrigger>
                                    <TabsTrigger value="completed" data-testid="tab-completed">
                                        Completed
                                    </TabsTrigger>
                                    <TabsTrigger value="cancelled" data-testid="tab-cancelled">
                                        Cancelled
                                    </TabsTrigger>
                                    <TabsTrigger value="no-show" data-testid="tab-no-show">
                                        No Show
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="upcoming" className="space-y-4">
                                    {appointments.filter((apt) => 
                                        // 2. FINAL FIX: Only show confirmed/scheduled appointments in the upcoming list
                                        apt.status === "scheduled" || 
                                        apt.status === "confirmed" 
                                    )
                                        .length > 0 ? (
                                        appointments
                                            .filter((apt) => 
                                                // FILTER AGAIN
                                                apt.status === "scheduled" || 
                                                apt.status === "confirmed"
                                            )
                                            .map((appointment) => (
                                                <AppointmentStatusManager
                                                    key={appointment._id}
                                                    appointment={appointment}
                                                    userRole="doctor"
                                                    onStatusChange={() => refetchAppointments()}
                                                />
                                            ))
                                    ) : (
                                        <Card>
                                            <CardContent className="text-center py-8">
                                                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                                <p className="text-muted-foreground">
                                                    No upcoming appointments
                                                </p>
                                            </CardContent>
                                        </Card>
                                    )}
                                </TabsContent>

                                <TabsContent value="completed" className="space-y-4">
                                    {appointments.filter((apt) => apt.status === "completed")
                                        .length > 0 ? (
                                        appointments
                                            .filter((apt) => apt.status === "completed")
                                            .map((appointment) => (
                                                <AppointmentStatusManager
                                                    key={appointment._id}
                                                    appointment={appointment}
                                                    userRole="doctor"
                                                    onStatusChange={() => refetchAppointments()}
                                                />
                                            ))
                                    ) : (
                                        <Card>
                                            <CardContent className="text-center py-8">
                                                <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                                <p className="text-muted-foreground">
                                                    No completed appointments
                                                </p>
                                            </CardContent>
                                        </Card>
                                    )}
                                </TabsContent>

                                <TabsContent value="cancelled" className="space-y-4">
                                    {appointments.filter((apt) => apt.status === "cancelled")
                                        .length > 0 ? (
                                        appointments
                                            .filter((apt) => apt.status === "cancelled")
                                            .map((appointment) => (
                                                <AppointmentStatusManager
                                                    key={appointment._id}
                                                    appointment={appointment}
                                                    userRole="doctor"
                                                    onStatusChange={() => refetchAppointments()}
                                                />
                                            ))
                                    ) : (
                                        <Card>
                                            <CardContent className="text-center py-8">
                                                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                                <p className="text-muted-foreground">
                                                    No cancelled appointments
                                                </p>
                                            </CardContent>
                                        </Card>
                                    )}
                                </TabsContent>

                                <TabsContent value="no-show" className="space-y-4">
                                    {appointments.filter((apt) => apt.status === "no-show")
                                        .length > 0 ? (
                                        appointments
                                            .filter((apt) => apt.status === "no-show")
                                            .map((appointment) => (
                                                <AppointmentStatusManager
                                                    key={appointment._id}
                                                    appointment={appointment}
                                                    userRole="doctor"
                                                    onStatusChange={() => refetchAppointments()}
                                                />
                                            ))
                                    ) : (
                                        <Card>
                                            <CardContent className="text-center py-8">
                                                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                                <p className="text-muted-foreground">
                                                    No no-show appointments
                                                </p>
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
                                <h1 className="text-3xl font-bold mb-2">
                                    Availability Calendar
                                </h1>
                                <p className="text-muted-foreground">
                                    Set your appointment slots and working hours
                                </p>
                            </div>

                            <AvailabilityManager />
                        </div>
                    )}

                    {activeTab === "documents" && (
                        <div data-testid="documents-content">
                            <div className="mb-8">
                                <h1 className="text-3xl font-bold mb-2">
                                    Verification Documents
                                </h1>
                                <p className="text-muted-foreground">
                                    Upload and manage your professional credentials
                                </p>
                            </div>

                            <DocumentUpload />
                        </div>
                    )}
                    {activeTab === "plus" && (
                        <div data-testid="plus-content">
                            <AppointdPlusDoctor />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}