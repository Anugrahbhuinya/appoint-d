import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Video, Phone, FileText, MoreHorizontal } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

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
  onViewDetails: (appointmentId: string) => void;
  onReschedule: (appointmentId: string) => void;
  onCancel: (appointmentId: string) => void;
}

export default function AppointmentCard({ 
  appointment, 
  userRole, 
  doctorName,
  onViewDetails, 
  onReschedule, 
  onCancel 
}: AppointmentCardProps) {
  // FIX: Handle both 'id' and '_id' fields from MongoDB
  const appointmentId = appointment.id || (appointment as any)._id;
  
  const appointmentDate = new Date(appointment.appointmentDate);
  const isUpcoming = appointmentDate > new Date();
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "completed":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "cancelled":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "no-show":
        return "bg-orange-500/10 text-orange-400 border-orange-500/20";
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

  // FIX: Wrap handler calls to ensure they execute properly
  const handleViewDetails = () => {
    console.log('View Details - appointmentId:', appointmentId);
    onViewDetails(appointmentId);
  };

  const handleReschedule = () => {
    console.log('Reschedule - appointmentId:', appointmentId);
    onReschedule(appointmentId);
  };

  const handleCancel = () => {
    console.log('Cancel - appointmentId:', appointmentId);
    onCancel(appointmentId);
  };

  return (
    <Card data-testid={`appointment-card-${appointment.id}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
              <span className="text-primary font-semibold text-sm">
                {userRole === "doctor" ? "P" : "D"}
              </span>
            </div>
            
            <div>
              <h3 className="font-semibold" data-testid={`appointment-title-${appointment.id}`}>
                {userRole === "doctor" ? "Patient Consultation" : `Dr. ${doctorName}`}
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
              <p className="text-sm font-medium" data-testid={`appointment-fee-${appointment.id}`}>
                ₹{appointment.consultationFee}
              </p>
              <p className="text-xs text-muted-foreground">
                {appointment.type === "video" ? "Video Call" : "In-person"}
              </p>
            </div>

            {appointment.status === "scheduled" && isUpcoming && (
              <>
                {appointment.type === "video" && (
                  <Button size="sm" data-testid={`button-join-call-${appointment.id}`}>
                    <Video className="w-4 h-4 mr-2" />
                    Join Call
                  </Button>
                )}
                
                <Button variant="outline" size="sm" data-testid={`button-contact-${appointment.id}`}>
                  <Phone className="w-4 h-4" />
                </Button>
              </>
            )}

            {appointment.status === "completed" && (
              <Button variant="outline" size="sm" data-testid={`button-view-report-${appointment.id}`}>
                <FileText className="w-4 h-4 mr-2" />
                Report
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" data-testid={`button-more-${appointment.id}`}>
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* FIX: Use onSelect instead of onClick for better compatibility */}
                <DropdownMenuItem 
                  data-testid={`menu-view-details-${appointment.id}`}
                  onSelect={handleViewDetails}
                >
                  View Details
                </DropdownMenuItem>
                
                {appointment.status === "scheduled" && (
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
            <p className="text-sm text-muted-foreground" data-testid={`appointment-notes-${appointment.id}`}>
              <strong>Notes:</strong> {appointment.notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}