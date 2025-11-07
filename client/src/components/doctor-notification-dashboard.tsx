import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Calendar, MessageSquare, Clock, Video, DollarSign, CheckCircle, ArrowLeft 
} from "lucide-react"; 
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { DoctorScheduleButton } from "@/components/doctor-schedule-system";

interface Notification {
  _id: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  appointmentId?: string;
  patientId?: string;
  patientName?: string;
  appointmentDate?: string;
  duration?: number;
  consultationFee?: number;
  notes?: string;
  appointmentType?: "video" | "in-person";
  status?: string;
  doctorId?: string;
}

interface DoctorNotificationDashboardProps {
  notifications: Notification[];
}

/* ------------------------------------------
   Appointment Detail View
-------------------------------------------*/
const AppointmentDetailView = ({ 
  notification, 
  onBack 
}: { 
  notification: Notification;
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-400">Date & Time</p>
            </div>
            <p className="text-lg font-semibold text-white">{notification.appointmentDate}</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Video className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-400">Type</p>
            </div>
            <p className="text-lg font-semibold text-white">
              {notification.appointmentType === 'video' ? 'Video Call' : 'In-Person'}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-400">Status</p>
            </div>
            <span className="text-sm font-semibold px-3 py-1 rounded border border-blue-500/50 text-blue-400 bg-blue-500/10">
              {notification.status || 'Pending'}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-400">Consultation Fee</p>
            </div>
            <p className="text-lg font-semibold text-white">
              ₹{notification.consultationFee || 300}
            </p>
          </div>
        </div>

        {notification.notes && (
          <div className="border-t border-slate-700 pt-8">
            <p className="text-sm text-slate-400 mb-2">Patient Notes</p>
            <p className="text-white font-medium bg-slate-800 p-4 rounded">{notification.notes}</p>
          </div>
        )}

        <div className="border-t border-slate-700 pt-6 flex gap-3 justify-end">
          <DoctorScheduleButton
            appointmentId={notification.appointmentId || ''}
            patientId={notification.patientId || ''}
            doctorId={notification.doctorId || ''}
            consultationFee={notification.consultationFee || 0}
            appointmentDate={notification.appointmentDate || ''}
            currentStatus={notification.status}
          />
          <Button 
            variant="outline"
            className="border-red-600/50 text-red-400 hover:bg-red-500/10 hover:border-red-600"
          >
            Decline
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

/* ------------------------------------------
   Notification List
-------------------------------------------*/
const NotificationList = ({
  notifications, markAsReadMutation, Icon, emptyMessage, onNotificationClick
}: any) => {
  const sorted = notifications.sort(
    (a: Notification, b: Notification) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return sorted.length > 0 ? (
    <div className="space-y-4">
      {sorted.map((n: Notification) => {
        const isUnread = !n.read;
        return (
          <div
            key={n._id}
            onClick={() => onNotificationClick(n)}
            className={`p-4 rounded-lg border transition-all cursor-pointer flex items-start justify-between ${
              isUnread
                ? "bg-primary/5 border-primary/30 hover:bg-primary/10 hover:border-primary/50"
                : "bg-slate-900 border-slate-700 hover:bg-slate-800 hover:border-slate-600"
            }`}
          >
            <div className="flex items-start space-x-3 flex-1 min-w-0">
              <Icon className={`w-5 h-5 mt-1 flex-shrink-0 ${isUnread ? 'text-primary' : 'text-slate-500'}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${isUnread ? 'font-semibold text-white' : 'text-slate-300'}`}>{n.message}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            {!n.read && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8"
                onClick={(e) => {
                  e.stopPropagation();
                  markAsReadMutation.mutate(n._id);
                }}
              >
                Mark as Read
              </Button>
            )}
          </div>
        );
      })}
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
export const DoctorNotificationDashboard = ({ notifications }: DoctorNotificationDashboardProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("requests");
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/doctor/notifications/${id}/read`, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctor/notifications"] });
      toast({ title: "Notification marked as read" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update notification", variant: "destructive" });
    },
  });

  // 🧠 FIXED: include virtual notifications from doctor-portal.tsx
  const requestNotifications = notifications.filter(
    n => 
      n.type === "appointment_request" || 
      n.type === "appointment_approval_pending" ||
      n.type === "patient_note_reply"
  );

  const awaitingPaymentNotifications = notifications.filter(
  (n) =>
    n.type === "awaiting_payment" ||
    (typeof n.message === "string" && n.message.includes("Payment Awaiting Confirmation"))
);


  if (selectedNotification) {
    return (
      <AppointmentDetailView 
        notification={selectedNotification} 
        onBack={() => setSelectedNotification(null)} 
      />
    );
  }

  return (
    <div className="space-y-6 bg-slate-950 min-h-screen p-6 rounded-lg">
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
          {requestNotifications.length > 0 && (
            <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-semibold">
              {requestNotifications.length}
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
          <Calendar className="w-4 h-4" />
          Awaiting Payment
          {awaitingPaymentNotifications.length > 0 && (
            <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-semibold">
              {awaitingPaymentNotifications.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "requests" && (
        <NotificationList
          notifications={requestNotifications}
          markAsReadMutation={markAsReadMutation}
          Icon={MessageSquare}
          emptyMessage="No pending appointment requests."
          onNotificationClick={setSelectedNotification}
        />
      )}

      {activeTab === "awaitingPayment" && (
        <NotificationList
          notifications={awaitingPaymentNotifications}
          markAsReadMutation={markAsReadMutation}
          Icon={Calendar}
          emptyMessage="No pending payments."
          onNotificationClick={setSelectedNotification}
        />
      )}
    </div>
  );
};
