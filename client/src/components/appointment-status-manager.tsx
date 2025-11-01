import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { DoctorScheduleButton } from "@/components/doctor-schedule-system"; // ADD THIS IMPORT
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Video,
  MapPin,
  User,
  Phone,
  Mail,
  Edit,
  Stethoscope,
  FileUp,
  X as XIcon,
  Bell // ADD THIS IMPORT
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

interface Appointment {
  _id: string;
  id?: string;
  patientId: string;
  doctorId: string;
  patientName?: string;
  appointmentDate: string;
  duration: number;
  type: "video" | "in-person";
  status: "scheduled" | "completed" | "cancelled" | "no-show" | "awaiting_payment" | "confirmed"; // ADD NEW STATUSES
  consultationFee: number;
  notes?: string;
  prescription?: string;
  prescriptionFile?: string;
  createdAt: string;
}

interface AppointmentStatusManagerProps {
  appointment: Appointment;
  userRole: "doctor" | "patient" | "admin";
  onStatusChange?: () => void;
}

const statusConfig = {
  scheduled: {
    label: "Scheduled",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    icon: Calendar,
    description: "Appointment is scheduled"
  },
  awaiting_payment: { // ADD THIS
    label: "Awaiting Payment",
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    icon: Bell,
    description: "Waiting for patient payment"
  },
  confirmed: { // ADD THIS
    label: "Confirmed",
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    icon: CheckCircle,
    description: "Payment confirmed, appointment ready"
  },
  completed: {
    label: "Completed",
    color: "bg-green-500/10 text-green-600 border-green-500/20",
    icon: CheckCircle,
    description: "Appointment has been completed"
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-500/10 text-red-600 border-red-500/20",
    icon: XCircle,
    description: "Appointment was cancelled"
  },
  "no-show": {
    label: "No Show",
    color: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    icon: AlertCircle,
    description: "Patient did not show up"
  }
};

export default function AppointmentStatusManager({
  appointment,
  userRole,
  onStatusChange
}: AppointmentStatusManagerProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<"scheduled" | "completed" | "cancelled" | "no-show" | "awaiting_payment" | "confirmed">(appointment.status as any);
  const [notes, setNotes] = useState(appointment.notes || "");
  const [prescription, setPrescription] = useState(appointment.prescription || "");
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [prescriptionFileName, setPrescriptionFileName] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log("📄 Prescription file selected:", {
        name: file.name,
        type: file.type,
        size: file.size,
      });

      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/png",
        "image/jpeg"
      ];

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload PDF, DOC, DOCX, PNG, or JPG files only",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file under 5MB",
          variant: "destructive",
        });
        return;
      }

      setPrescriptionFile(file);
      setPrescriptionFileName(file.name);
    }
  };

  const removeFile = () => {
    setPrescriptionFile(null);
    setPrescriptionFileName("");
  };

  const updateStatusMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("📤 [UPDATE APPOINTMENT STATUS]");
      console.log("   appointmentId:", appointment._id);
      console.log("   newStatus:", data.status);
      console.log("   notes:", data.notes);
      console.log("   prescription:", data.prescription);

      const res = await apiRequest("PUT", `/api/appointments/${appointment._id}`, data);
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Failed to update appointment");
      }
      
      return res.json();
    },
    onSuccess: () => {
      console.log("✅ Appointment status updated");
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      
      toast({
        title: "Success",
        description: `Appointment status changed to ${selectedStatus}`,
      });
      
      setIsEditDialogOpen(false);
      onStatusChange?.();
    },
    onError: (error: Error) => {
      console.error("❌ Status update failed:", error.message);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = async () => {
    if (selectedStatus === appointment.status && notes === appointment.notes && prescription === appointment.prescription && !prescriptionFile) {
      toast({
        title: "No Changes",
        description: "No changes were made",
        variant: "destructive",
      });
      return;
    }

    let prescriptionFileBase64 = "";
    
    if (prescriptionFile && selectedStatus === "completed") {
      const reader = new FileReader();
      
      return new Promise((resolve) => {
        reader.onload = () => {
          const base64 = reader.result as string;
          prescriptionFileBase64 = base64;
          
          const updateData: any = { status: selectedStatus };
          
          if (notes) updateData.notes = notes;
          if (prescription) updateData.prescription = prescription;
          if (prescriptionFileBase64) updateData.prescriptionFile = prescriptionFileBase64;

          updateStatusMutation.mutate(updateData);
          resolve(true);
        };
        reader.onerror = () => {
          toast({
            title: "Error",
            description: "Failed to read file",
            variant: "destructive",
          });
          resolve(false);
        };
        reader.readAsDataURL(prescriptionFile);
      });
    } else {
      const updateData: any = { status: selectedStatus };
      
      if (notes) updateData.notes = notes;
      if (prescription) updateData.prescription = prescription;

      updateStatusMutation.mutate(updateData);
    }
  };

  const canUpdateStatus = userRole === "doctor" || userRole === "admin";
  const canViewPrescription = userRole === "doctor" || userRole === "patient" || userRole === "admin";

  const StatusIcon = statusConfig[appointment.status].icon;
  const appointmentDateTime = new Date(appointment.appointmentDate);

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Date & Time */}
            <div className="flex items-start space-x-3">
              <Calendar className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
              <div>
                <p className="text-xs text-muted-foreground">Date & Time</p>
                <p className="font-semibold text-sm">{format(appointmentDateTime, "MMM d, yyyy")}</p>
                <p className="text-xs text-muted-foreground">{format(appointmentDateTime, "h:mm a")}</p>
              </div>
            </div>

            {/* Type */}
            <div className="flex items-start space-x-3">
              {appointment.type === "video" ? (
                <Video className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
              ) : (
                <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
              )}
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="font-semibold text-sm capitalize">{appointment.type === "video" ? "Video Call" : "In-Person"}</p>
                <p className="text-xs text-muted-foreground">{appointment.duration} mins</p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-start space-x-3">
              <StatusIcon className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge className={`${statusConfig[appointment.status].color} border`}>
                  {statusConfig[appointment.status].label}
                </Badge>
              </div>
            </div>

            {/* Fee */}
            <div className="flex items-start space-x-3">
              <Stethoscope className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
              <div>
                <p className="text-xs text-muted-foreground">Consultation Fee</p>
                <p className="font-semibold text-sm">₹{appointment.consultationFee}</p>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          {appointment.notes && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Patient Notes</p>
              <p className="text-sm">{appointment.notes}</p>
            </div>
          )}

          {/* Prescription Section */}
          {canViewPrescription && appointment.prescription && (
            <div className="mb-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <p className="text-xs font-semibold text-green-600 mb-1">Prescription</p>
              <p className="text-sm text-green-600">{appointment.prescription}</p>
            </div>
          )}

          {/* Prescription File Section */}
          {canViewPrescription && appointment.prescriptionFile && (
            <div className="mb-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <p className="text-xs font-semibold text-blue-600 mb-2">Prescription File</p>
              <a 
                href={appointment.prescriptionFile}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center"
              >
                <FileUp className="w-4 h-4 mr-2" />
                Download Prescription
              </a>
            </div>
          )}

          {/* Action Buttons - UPDATED */}
          <div className="flex justify-end gap-2">
            {canUpdateStatus && (
              <>
                {/* Schedule & Notify Button - Only for DOCTOR when status is 'scheduled' */}
                {userRole === "doctor" && appointment.status === "scheduled" && (
                  <DoctorScheduleButton
                    appointmentId={appointment._id}
                    patientId={appointment.patientId}
                    doctorId={appointment.doctorId}
                    consultationFee={appointment.consultationFee}
                    appointmentDate={appointment.appointmentDate}
                    currentStatus={appointment.status}
                  />
                )}
                
                {/* Update Status Button */}
                <Button
                  size="sm"
                  onClick={() => setIsEditDialogOpen(true)}
                  variant="outline"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {appointment.status === "scheduled" ? "Manage" : "Update"} Status
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Status Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Appointment Status</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Current Status */}
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-3">Current Status</p>
              <Badge className={`${statusConfig[appointment.status].color} border`}>
                {statusConfig[appointment.status].label}
              </Badge>
            </div>

            {/* Status Selection */}
            <div>
              <Label className="text-sm font-semibold mb-3 block">Change Status To</Label>
              <div className="grid grid-cols-2 gap-3">
                {(["scheduled", "completed", "cancelled", "no-show"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`p-3 rounded-lg border-2 transition-colors text-left ${
                      selectedStatus === status
                        ? `border-primary bg-primary/10`
                        : `border-muted hover:border-primary/50`
                    }`}
                  >
                    <p className="font-semibold text-sm">{statusConfig[status].label}</p>
                    <p className="text-xs text-muted-foreground">{statusConfig[status].description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes" className="text-sm font-semibold">
                Appointment Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this appointment..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-2"
              />
            </div>

            {/* Prescription (only for completed appointments) */}
            {selectedStatus === "completed" && (
              <>
                <div>
                  <Label htmlFor="prescription" className="text-sm font-semibold">
                    Prescription Details
                  </Label>
                  <Textarea
                    id="prescription"
                    placeholder="Add prescription details for the patient..."
                    value={prescription}
                    onChange={(e) => setPrescription(e.target.value)}
                    rows={3}
                    className="mt-2"
                  />
                </div>

                {/* Prescription File Upload */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">
                    Upload Prescription File (Optional)
                  </Label>
                  <div className="space-y-3">
                    {!prescriptionFile ? (
                      <label className="cursor-pointer">
                        <div className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-primary/30 rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors">
                          <div className="text-center">
                            <FileUp className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                            <span className="text-sm font-medium">Click to upload prescription</span>
                            <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX, PNG, JPG (Max 5MB)</p>
                          </div>
                        </div>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="p-3 bg-muted/50 rounded-lg border border-border flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileUp className="w-4 h-4 text-muted-foreground" />
                          <p className="text-sm font-medium">{prescriptionFileName}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={removeFile}
                        >
                          <XIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleStatusUpdate}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}