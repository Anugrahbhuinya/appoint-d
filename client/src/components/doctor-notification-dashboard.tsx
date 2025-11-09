// doctor-notification-dashboard.tsx

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  MessageSquare, 
  Clock, 
  Video, 
  DollarSign, 
  CheckCircle, 
  ArrowLeft, 
  AlertCircle, 
  Loader2
} from "lucide-react"; 
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
// Removed unused import: import { DoctorScheduleButton } from "@/components/doctor-schedule-system"; 

interface AppointmentRequest {
  _id: string;
  appointmentId: string; // Note: Using _id as appointmentId for simplicity here
  patientId: string;
  patientName: string;
  patientEmail: string;
  requestDate: string; // Should correspond to createdAt
  preferredDate: string; // Corresponds to appointmentDate
  preferredTime: string;
  consultationType: "Video Call" | "In-Person";
  duration: string;
  status: "pending"; // Only pending requests show here
  fee: number;
  notes?: string;
}

interface AwaitingPaymentAppointment {
  _id: string;
  appointmentId: string; // Note: Using _id as appointmentId for simplicity here
  patientId: string;
  patientName: string;
  patientEmail: string;
  appointmentDate: string;
  appointmentTime: string;
  consultationType: "Video Call" | "In-Person";
  duration: string;
  status: "awaiting_payment";
  fee: number;
  notes?: string;
}

/* ------------------------------------------
   Appointment Request Detail View (Handles status: pending)
-------------------------------------------*/
const AppointmentRequestDetailView = ({ 
  request, 
  onBack,
  onAccept,
  onReject,
  isLoading
}: { 
  request: AppointmentRequest;
  onBack: () => void;
  onAccept: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  isLoading: boolean;
}) => {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectPrompt, setShowRejectPrompt] = useState(false);

  return (
    <div className="space-y-6 bg-slate-950 min-h-screen p-6 rounded-lg">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Back to Notifications</span>
      </button>

      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-8 space-y-8">
          {/* Patient Info */}
          <div className="border-b border-slate-700 pb-6">
            <h2 className="text-2xl font-bold text-white mb-2">{request.patientName}</h2>
            <p className="text-slate-400">{request.patientEmail}</p>
          </div>

          {/* Appointment Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <p className="text-sm text-slate-400">Requested Date & Time</p>
              </div>
              <p className="text-lg font-semibold text-white">
                {new Date(request.preferredDate).toLocaleDateString()}
              </p>
              <p className="text-slate-300">{request.preferredTime}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Video className="w-4 h-4 text-slate-400" />
                <p className="text-sm text-slate-400">Type</p>
              </div>
              <p className="text-lg font-semibold text-white">
                {request.consultationType}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <p className="text-sm text-slate-400">Duration</p>
              </div>
              <p className="text-lg font-semibold text-white">{request.duration}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-slate-400" />
                <p className="text-sm text-slate-400">Consultation Fee</p>
              </div>
              <p className="text-lg font-semibold text-white">₹{request.fee}</p>
            </div>
          </div>

          {request.notes && (
            <div className="border-t border-slate-700 pt-6">
              <p className="text-sm text-slate-400 mb-2">Patient Notes</p>
              <p className="text-white font-medium bg-slate-800 p-4 rounded">
                {request.notes}
              </p>
            </div>
          )}

          {/* Status Badge */}
          <div>
            <span className="text-sm font-semibold px-3 py-1 rounded border border-yellow-500/50 text-yellow-400 bg-yellow-500/10">
              New Request (Pending Confirmation)
            </span>
          </div>

          {/* Action Buttons */}
          <div className="border-t border-slate-700 pt-6 flex gap-3 justify-end flex-wrap">
            {!showRejectPrompt ? (
              <>
                <Button 
                  onClick={() => onAccept(request._id)}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Accepting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Schedule & Send Payment Notification
                    </>
                  )}
                </Button>
                <Button 
                  onClick={() => setShowRejectPrompt(true)}
                  disabled={isLoading}
                  variant="outline"
                  className="border-red-600/50 text-red-400 hover:bg-red-500/10 hover:border-red-600"
                >
                  Reject Request
                </Button>
              </>
            ) : (
              <div className="w-full space-y-3">
                <div>
                  <label className="text-sm text-slate-400 block mb-2">
                    Reason for rejection (optional):
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter reason..."
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => onReject(request._id, rejectReason)}
                    disabled={isLoading}
                    className="bg-red-600 hover:bg-red-700 text-white flex-1"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Rejecting...
                      </>
                    ) : (
                      "Confirm Rejection"
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowRejectPrompt(false);
                      setRejectReason("");
                    }}
                    disabled={isLoading}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/* ------------------------------------------
   Awaiting Payment Detail View (Handles status: awaiting_payment)
-------------------------------------------*/
const AwaitingPaymentDetailView = ({ 
  appointment, 
  onBack
}: { 
  appointment: AwaitingPaymentAppointment;
  onBack: () => void;
}) => (
  <div className="space-y-6 bg-slate-950 min-h-screen p-6 rounded-lg">
    <button 
      onClick={onBack}
      className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      <span className="text-sm font-medium">Back to Notifications</span>
    </button>

    <Card className="bg-slate-900 border-slate-700">
      <CardContent className="p-8 space-y-8">
        {/* Alert */}
        <div className="bg-amber-500/10 border border-amber-500/50 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-400">Awaiting Patient Payment</p>
            <p className="text-sm text-amber-300 mt-1">
              This appointment is confirmed by you. It will only appear on your main dashboard once the patient completes the payment.
            </p>
          </div>
        </div>

        {/* Patient Info */}
        <div className="border-b border-slate-700 pb-6">
          <h2 className="text-2xl font-bold text-white mb-2">{appointment.patientName}</h2>
          <p className="text-slate-400">{appointment.patientEmail}</p>
        </div>

        {/* Appointment Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-400">Appointment Date & Time</p>
            </div>
            <p className="text-lg font-semibold text-white">
              {new Date(appointment.appointmentDate).toLocaleDateString()}
            </p>
            <p className="text-slate-300">{appointment.appointmentTime}</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Video className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-400">Type</p>
            </div>
            <p className="text-lg font-semibold text-white">
              {appointment.consultationType}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-400">Duration</p>
            </div>
            <p className="text-lg font-semibold text-white">{appointment.duration}</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-400">Amount Pending</p>
            </div>
            <p className="text-lg font-semibold text-amber-400">₹{appointment.fee}</p>
          </div>
        </div>

        {appointment.notes && (
          <div className="border-t border-slate-700 pt-6">
            <p className="text-sm text-slate-400 mb-2">Patient Notes</p>
            <p className="text-white font-medium bg-slate-800 p-4 rounded">
              {appointment.notes}
            </p>
          </div>
        )}

        {/* Status Badge */}
        <div>
          <span className="text-sm font-semibold px-3 py-1 rounded border border-amber-500/50 text-amber-400 bg-amber-500/10">
            ⏳ Awaiting Payment
          </span>
        </div>
      </CardContent>
    </Card>
  </div>
);

/* ------------------------------------------
   Notification List Renderer (Used for both tabs)
-------------------------------------------*/
const NotificationList = ({
  items,
  Icon,
  emptyMessage,
  onItemClick,
  type
}: any) => {
  // Use appointmentDate for payment, requestDate for request
  const sorted = items.sort(
    (a: any, b: any) =>
      new Date(b.appointmentDate || b.requestDate).getTime() - 
      new Date(a.appointmentDate || a.requestDate).getTime()
  );

  return sorted.length > 0 ? (
    <div className="space-y-4">
      {sorted.map((item: any) => (
        <div
          key={item._id}
          onClick={() => onItemClick(item)}
          className="p-4 rounded-lg border transition-all cursor-pointer bg-slate-900 border-slate-700 hover:bg-slate-800 hover:border-slate-600"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1 min-w-0">
              <Icon className="w-5 h-5 mt-1 flex-shrink-0 text-slate-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">
                  {item.patientName}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {type === "request" 
                    ? `Requested: ${new Date(item.preferredDate).toLocaleDateString()} at ${item.preferredTime}`
                    : `Appointment: ${new Date(item.appointmentDate).toLocaleDateString()} at ${item.appointmentTime}`
                  }
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {item.consultationType} • {item.duration}
                </p>
              </div>
            </div>
            <div className="text-right ml-4 flex-shrink-0">
              <p className="text-sm font-bold text-white">₹{item.fee}</p>
              <p className="text-xs text-slate-400 mt-1">
                {type === "request" ? "New Request" : "Awaiting Payment"}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="text-center p-8 bg-slate-900 rounded-lg border border-slate-700">
      <Icon className="w-12 h-12 mx-auto mb-4 opacity-50 text-slate-500" />
      <p className="text-slate-400">{emptyMessage}</p>
    </div>
  );
};

/* ------------------------------------------
   Main Component
-------------------------------------------*/
export const DoctorNotificationDashboard = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"requests" | "awaitingPayment">("requests");
  const [selectedItem, setSelectedItem] = useState<AppointmentRequest | AwaitingPaymentAppointment | null>(null);
  const [selectedType, setSelectedType] = useState<"request" | "payment" | null>(null);

  // Fetch appointment requests (status: 'pending')
  const { data: appointmentRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["/api/doctor/appointment-requests"],
    queryFn: async () => {
      const res = await fetch("/api/doctor/appointment-requests");
      if (!res.ok) throw new Error("Failed to fetch requests");
      return res.json();
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch awaiting payment appointments (status: 'awaiting_payment')
  const { data: awaitingPaymentAppointments = [], isLoading: paymentLoading } = useQuery({
    queryKey: ["/api/doctor/awaiting-payment-appointments"],
    queryFn: async () => {
      const res = await fetch("/api/doctor/awaiting-payment-appointments");
      if (!res.ok) throw new Error("Failed to fetch awaiting payment");
      return res.json();
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Accept request mutation (Changes status from 'pending' to 'awaiting_payment')
  const acceptRequestMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const res = await fetch(
        `/api/doctor/appointment-requests/${appointmentId}/accept`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Failed to accept appointment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctor/appointment-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/doctor/awaiting-payment-appointments"] });
      // Also invalidate dashboard appointments, as the total patient count might change if appointments are managed there
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] }); 
      
      toast({ title: "✅ Appointment accepted! Patient will receive payment notification." });
      setSelectedItem(null);
      setSelectedType(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept appointment",
        variant: "destructive"
      });
    },
  });

  // Reject request mutation (Changes status from 'pending' to 'cancelled')
  const rejectRequestMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await fetch(
        `/api/doctor/appointment-requests/${id}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason })
        }
      );
      if (!res.ok) throw new Error("Failed to reject appointment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctor/appointment-requests"] });
      toast({ title: "✅ Appointment rejected. Patient has been notified." });
      setSelectedItem(null);
      setSelectedType(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject appointment",
        variant: "destructive"
      });
    },
  });

  const isLoading = requestsLoading || paymentLoading || 
                    acceptRequestMutation.isPending || 
                    rejectRequestMutation.isPending;

  // Show detail view for Requests (pending)
  if (selectedItem && selectedType === "request") {
    return (
      <AppointmentRequestDetailView
        request={selectedItem as AppointmentRequest}
        onBack={() => {
          setSelectedItem(null);
          setSelectedType(null);
        }}
        onAccept={async (id) => {
          await acceptRequestMutation.mutateAsync(id);
        }}
        onReject={async (id, reason) => {
          await rejectRequestMutation.mutateAsync({ id, reason });
        }}
        isLoading={isLoading}
      />
    );
  }

  // Show detail view for Awaiting Payment
  if (selectedItem && selectedType === "payment") {
    return (
      <AwaitingPaymentDetailView
        appointment={selectedItem as AwaitingPaymentAppointment}
        onBack={() => {
          setSelectedItem(null);
          setSelectedType(null);
        }}
      />
    );
  }

  // Main list view (This is what matches the screenshot)
  return (
    <div className="space-y-6 bg-slate-950 min-h-screen p-6 rounded-lg">
      {/* --- TAB NAVIGATION (Matches Screenshot) --- */}
      <div className="flex gap-3 bg-slate-900 p-2 rounded-lg w-fit border border-slate-700">
        <button
          onClick={() => setActiveTab("requests")}
          className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium ${
            activeTab === "requests"
              ? "bg-slate-700 text-white"
              : "text-slate-400 hover:text-slate-300"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Requests
          {appointmentRequests.length > 0 && (
            <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-semibold">
              {appointmentRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("awaitingPayment")}
          className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium ${
            activeTab === "awaitingPayment"
              ? "bg-slate-700 text-white"
              : "text-slate-400 hover:text-slate-300"
          }`}
        >
          <Clock className="w-4 h-4" />
          Awaiting Payment
          {awaitingPaymentAppointments.length > 0 && (
            <span className="ml-1 bg-amber-500 text-white text-xs rounded-full px-2 py-0.5 font-semibold">
              {awaitingPaymentAppointments.length}
            </span>
          )}
        </button>
      </div>

      {isLoading && !appointmentRequests.length && !awaitingPaymentAppointments.length && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
          <span className="text-slate-400">Loading notifications...</span>
        </div>
      )}

      {/* --- REQUESTS TAB CONTENT (Status: pending) --- */}
      {activeTab === "requests" && (
        <NotificationList
          items={appointmentRequests}
          Icon={MessageSquare}
          emptyMessage="No pending appointment requests."
          onItemClick={(item: AppointmentRequest) => {
            setSelectedItem(item);
            setSelectedType("request");
          }}
          type="request"
        />
      )}

      {/* --- AWAITING PAYMENT TAB CONTENT (Status: awaiting_payment) --- */}
      {activeTab === "awaitingPayment" && (
        <NotificationList
          items={awaitingPaymentAppointments}
          Icon={Clock}
          emptyMessage="No appointments awaiting payment."
          onItemClick={(item: AwaitingPaymentAppointment) => {
            setSelectedItem(item);
            setSelectedType("payment");
          }}
          type="payment"
        />
      )}
    </div>
  );
};