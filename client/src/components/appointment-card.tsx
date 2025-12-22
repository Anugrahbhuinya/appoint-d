// src/components/appointment-card.tsx

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Video,
  Phone,
  FileText,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"; // 🖼️ Added Avatar Imports

// ⭐ NEW INTERFACE: Structure for the enriched doctor data passed from the API
interface DoctorDetails {
  firstName: string;
  lastName: string;
  profilePicture: string | undefined;
  specialization: string;
  consultationFee: number;
}

interface AppointmentCardProps {
  appointment: {
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
  };
  userRole: "patient" | "doctor" | "admin";
  doctorName: string;
  // ⭐ ADDED PROP: This carries the picture URL
  doctorDetails: DoctorDetails | undefined | null;
  onViewDetails: (appointmentId: string) => void;
  onReschedule: (appointmentId: string) => void;
  onCancel: (appointmentId: string) => void;
  onJoinCall?: (appointmentId: string) => void;
}

export default function AppointmentCard({
  appointment,
  userRole,
  doctorName,
  // ⭐ ACCEPTED NEW PROP
  doctorDetails,
  onViewDetails,
  onReschedule,
  onCancel,
  onJoinCall, 
}: AppointmentCardProps) {
  const appointmentId = appointment.id || (appointment as any)._id;
  const appointmentDate = new Date(appointment.appointmentDate);
  const now = new Date();
  const timeDiffMinutes =
    (appointmentDate.getTime() - now.getTime()) / (1000 * 60);
    
  // ⭐ NEW LOGIC: Safely get the picture URL and initials
  const profilePictureUrl = doctorDetails?.profilePicture;
  const avatarInitials = doctorDetails 
    ? `${doctorDetails.firstName?.[0] || 'D'}${doctorDetails.lastName?.[0] || ''}` 
    : (userRole === "doctor" ? "P" : "D"); // Fallback for safety
    
  // Logic to determine if the call button should be active
  const isReadyToJoin =
    appointment.type === "video" &&
    (appointment.status === "scheduled" ||
      appointment.status === "confirmed") &&
    timeDiffMinutes <= 15 &&
    timeDiffMinutes >= -(appointment.duration || 30);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
      case "confirmed":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "completed":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "cancelled":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "no-show":
        return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      case "awaiting_payment":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      default:
        return "bg-muted/10 text-muted-foreground";
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleViewDetails = () => {
    onViewDetails(appointmentId);
  };

  const handleReschedule = () => {
    onReschedule(appointmentId);
  };

  const handleCancel = () => {
    onCancel(appointmentId);
  };

  const handleJoinCall = () => {
    if (onJoinCall) {
      onJoinCall(appointmentId);
    }
  };

  const isCancelable =
    appointment.status === "scheduled" ||
    appointment.status === "confirmed" ||
    appointment.status === "awaiting_payment";
  const isReschedulable =
    appointment.status === "scheduled" || appointment.status === "confirmed";

  return (
    <Card data-testid={`appointment-card-${appointment.id}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            
            {/* ⭐ FIX: AVATAR RENDERING LOGIC ⭐ */}
            <Avatar className="w-12 h-12 flex-shrink-0">
              {profilePictureUrl ? (
                <AvatarImage 
                  src={profilePictureUrl} 
                  alt={`Dr. ${doctorDetails?.lastName} Profile`} 
                />
              ) : (
                <AvatarFallback className="bg-primary/20 text-primary font-semibold text-sm">
                  {avatarInitials}
                </AvatarFallback>
              )}
            </Avatar>
            {/* ----------------------------------- */}
            
            <div>
              <h3
                className="font-semibold"
                data-testid={`appointment-title-${appointment.id}`}
              >
                {userRole === "doctor"
                  ? "Patient Consultation"
                  : `Dr. ${doctorName}`}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span data-testid={`appointment-date-${appointment.id}`}>
                    {formatDate(appointmentDate)}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span data-testid={`appointment-time-${appointment.id}`}>
                    {formatTime(appointmentDate)}
                  </span>
                </div>
                <Badge className={getStatusColor(appointment.status)}>
                  {appointment.status}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-right mr-4">
              <p
                className="text-sm font-medium"
                data-testid={`appointment-fee-${appointment.id}`}
              >
                ₹{appointment.consultationFee}
              </p>
              <p className="text-xs text-muted-foreground">
                {appointment.type === "video" ? "Video Call" : "In-person"}
              </p>
            </div>

            {isReadyToJoin && (
              <>
                <Button
                  size="sm"
                  onClick={handleJoinCall}
                  data-testid={`button-join-call-${appointment.id}`}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Video className="w-4 h-4 mr-2" />
                  Join Call
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  data-testid={`button-contact-${appointment.id}`}
                >
                  <Phone className="w-4 h-4" />
                </Button>
              </>
            )}
            {appointment.status === "completed" && (
              <Button
                variant="outline"
                size="sm"
                data-testid={`button-view-report-${appointment.id}`}
              >
                <FileText className="w-4 h-4 mr-2" />
                Report
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid={`button-more-${appointment.id}`}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  data-testid={`menu-view-details-${appointment.id}`}
                  onSelect={handleViewDetails}
                >
                  View Details
                </DropdownMenuItem>
                
                {isReschedulable && (
                  <>
                    <DropdownMenuItem
                      data-testid={`menu-reschedule-${appointment.id}`}
                      onSelect={handleReschedule}
                    >
                      Reschedule
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem
                      className="text-destructive"
                      data-testid={`menu-cancel-${appointment.id}`}
                      onSelect={handleCancel}
                    >
                      Cancel
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {appointment.notes && (
          <div className="mt-4 p-3 bg-muted/20 rounded-lg">
            <p
              className="text-sm text-muted-foreground"
              data-testid={`appointment-notes-${appointment.id}`}
            >
              <strong>Notes:</strong> {appointment.notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}