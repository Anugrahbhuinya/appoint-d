import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle2, Clock, Mail, Bell, CreditCard, Loader2 } from 'lucide-react';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface DoctorScheduleButtonProps {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  consultationFee: number;
  appointmentDate: string;
  currentStatus?: string;
}

interface Notification {
  _id: string;
  recipientId: string;
  type: 'payment_pending' | 'appointment_confirmed' | 'appointment_scheduled' | 'appointment_cancelled';
  title: string;
  message: string;
  appointmentId?: string;
  appointmentDate?: string;
  consultationFee?: number;
  doctorId?: string;
  notificationChannels: ('email' | 'inapp')[];
  read: boolean;
  createdAt: string;
}

interface PaymentModalProps {
  appointmentId: string;
  amount: number;
  doctorId: string;
  onSuccess?: () => void;
}

// ============================================
// 1. DOCTOR SCHEDULE BUTTON COMPONENT
// ============================================

interface DoctorScheduleButtonProps {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  consultationFee: number;
  appointmentDate: string;
  currentStatus?: string;
}

export function DoctorScheduleButton({ 
  appointmentId, 
  patientId, 
  doctorId, 
  consultationFee, 
  appointmentDate,
  currentStatus = 'scheduled',
  onScheduleSuccess 
}: DoctorScheduleButtonProps  & { onScheduleSuccess?: () => void } ) {
  const [open, setOpen] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Only show button if appointment is in 'scheduled' status
  if (currentStatus !== 'scheduled') {
    return null;
  }

  const scheduleAppointment = async () => {
    try {
      setIsScheduling(true);
      console.log('📋 [DOCTOR SCHEDULING APPOINTMENT]');
      console.log('   appointmentId:', appointmentId);
      console.log('   patientId:', patientId);

      // Create notification for patient
      const notificationRes = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: patientId,
          type: 'payment_pending',
          title: 'Appointment Scheduled - Payment Required',
          message: `Your appointment has been scheduled for ${new Date(appointmentDate).toLocaleString()}. Please complete the payment to confirm.`,
          appointmentId: appointmentId,
          appointmentDate: appointmentDate,
          consultationFee: consultationFee,
          doctorId: doctorId,
          notificationChannels: ['email', 'inapp'], // EMAIL + IN-APP
        }),
      });

      if (!notificationRes.ok) {
        throw new Error('Failed to send notification');
      }

      // Update appointment status to "awaiting_payment"
      const updateRes = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'awaiting_payment' }),
      });

      if (!updateRes.ok) {
        throw new Error('Failed to update appointment status');
      }

      toast({
        title: '✅ Success',
        description: 'Patient has been notified and appointment is pending payment.',
      });

      // Invalidate queries to refresh
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      onScheduleSuccess?.();
      setOpen(false);
    } catch (err: unknown) {
      console.error('❌ Scheduling error:', err);
      const message =
        err instanceof Error ? err.message : typeof err === 'string' ? err : 'Failed to schedule appointment';
      toast({
        title: '❌ Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="default"
        size="sm"
      >
        <Clock className="w-4 h-4 mr-2" />
        Schedule & Notify
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Appointment Scheduling</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                This will send a notification to the patient with payment details via email and in-app notification.
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>Date:</strong> {new Date(appointmentDate).toLocaleString()}</p>
              <p><strong>Fee:</strong> ₹{consultationFee}</p>
              <p><strong>New Status:</strong> <Badge>Awaiting Payment</Badge></p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={scheduleAppointment}
                disabled={isScheduling}
              >
                {isScheduling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  'Schedule & Send Notification'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================
// 2. PATIENT NOTIFICATIONS CENTER
// ============================================
export function PatientNotificationCenter() {
  const { toast } = useToast();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json();
    },
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const pendingPaymentNotifications = notifications.filter(
    (n: any) => n.type === 'payment_pending' && !n.read
  );

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading notifications...</p>;

  if (pendingPaymentNotifications.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-2" />
        <p className="text-muted-foreground">No pending payments</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pendingPaymentNotifications.map((notification: any) => (
        <NotificationCard key={notification._id} notification={notification} />
      ))}
    </div>
  );
}

// ============================================
// 3. INDIVIDUAL NOTIFICATION CARD
// ============================================
function NotificationCard({ notification }: { notification: Notification }) {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  const markAsRead = async () => {
    try {
      const res = await fetch(`/api/notifications/${notification._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      });

      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  return (
    <Card className={notification.read ? 'opacity-75' : 'border-blue-300 bg-blue-50'}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {notification.notificationChannels?.includes('email') && (
                <Badge variant="outline" className="text-xs">
                  <Mail className="w-3 h-3 mr-1" /> Email sent
                </Badge>
              )}
              {notification.notificationChannels?.includes('inapp') && (
                <Badge variant="outline" className="text-xs">
                  <Bell className="w-3 h-3 mr-1" /> In-app
                </Badge>
              )}
            </div>
            <h3 className="font-semibold">{notification.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {new Date(notification.createdAt).toLocaleString()}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? '−' : '+'}
          </Button>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-3">
            <div className="bg-white p-3 rounded border">
              <p className="text-sm font-semibold mb-2">Payment Details:</p>
              <p className="text-sm">Amount: <strong>₹{notification.consultationFee}</strong></p>
              {notification.appointmentDate && (
                <p className="text-sm">Date: {new Date(notification.appointmentDate).toLocaleString()}</p>
              )}
            </div>
            {notification.appointmentId && (
              <PatientPaymentModal
                appointmentId={notification.appointmentId}
                amount={notification.consultationFee || 0}
                doctorId={notification.doctorId || ''}
                onSuccess={() => markAsRead()}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// 4. PATIENT PAYMENT MODAL (Razorpay)
// ============================================
export function PatientPaymentModal({ appointmentId, amount, doctorId, onSuccess }: PaymentModalProps) {
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createOrder = async () => {
    try {
      setIsProcessing(true);
      console.log('💳 [CREATING RAZORPAY ORDER]');
      console.log('   amount:', amount);
      console.log('   appointmentId:', appointmentId);

      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount,
          appointmentId: appointmentId,
          doctorId: doctorId,
        }),
      });

      if (!res.ok) throw new Error('Failed to create order');
      const { orderId, key } = await res.json();

      // Initialize Razorpay
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      document.body.appendChild(script);

      script.onload = () => {
        const options = {
          key: key,
          order_id: orderId,
          amount: amount * 100,
          currency: 'INR',
          name: 'Appointment Payment',
          description: `Consultation Fee - Appointment ${appointmentId}`,
          handler: async (response: any) => {
            await handlePaymentSuccess(response);
          },
          prefill: {
            contact: '',
            email: '',
          },
        };

        const razorpay = new (window as any).Razorpay(options);
        razorpay.open();
      };
    } catch (err: unknown) {
      console.error('❌ Order creation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate payment';
      toast({
        title: '❌ Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = async (response: any) => {
    try {
      console.log('✅ [PAYMENT SUCCESSFUL]');
      console.log('   razorpay_order_id:', response.razorpay_order_id);
      console.log('   razorpay_payment_id:', response.razorpay_payment_id);

      // Verify payment with backend
      const confirmRes = await fetch(`/api/payments/${appointmentId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        }),
      });

      if (!confirmRes.ok) throw new Error('Payment verification failed');

      // Update appointment status to "confirmed"
      const updateRes = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      });

      if (!updateRes.ok) throw new Error('Failed to confirm appointment');

      // Send confirmation notification to doctor
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: doctorId,
          type: 'appointment_confirmed',
          title: 'Appointment Confirmed',
          message: `Patient has completed payment for appointment ${appointmentId}`,
          appointmentId: appointmentId,
          notificationChannels: ['email', 'inapp'],
        }),
      });

      toast({
        title: '✅ Payment Successful',
        description: 'Your appointment is confirmed!',
      });

      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      onSuccess?.();
      setOpen(false);
    } catch (error) {
      console.error('❌ Payment confirmation error:', error);
      toast({
        title: '❌ Error',
        description: error instanceof Error ? error.message : 'Payment verification failed',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="w-full">
        <CreditCard className="w-4 h-4 mr-2" />
        Pay Now (₹{amount})
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-900">
                <p className="font-semibold">Payment Required</p>
                <p>Complete your payment to confirm the appointment</p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Amount to pay</p>
              <p className="text-3xl font-bold text-green-600">₹{amount}</p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={createOrder}
                disabled={isProcessing}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pay with Razorpay
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================
// 5. DOCTOR PORTAL SCHEDULED APPOINTMENTS
// ============================================
export function DoctorScheduledAppointments() {
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['/api/appointments'],
    queryFn: async () => {
      const res = await fetch('/api/appointments');
      if (!res.ok) throw new Error('Failed to fetch appointments');
      return res.json();
    },
  });

  if (isLoading) return <p>Loading appointments...</p>;

  const scheduled = appointments.filter((apt: any) => apt.status === 'scheduled');
  const awaitingPayment = appointments.filter((apt: any) => apt.status === 'awaiting_payment');
  const confirmed = appointments.filter((apt: any) => apt.status === 'confirmed');

  return (
    <Tabs defaultValue="awaiting" className="w-full">
      <TabsList>
        <TabsTrigger value="awaiting">
          Awaiting Payment ({awaitingPayment.length})
        </TabsTrigger>
        <TabsTrigger value="confirmed">
          Confirmed ({confirmed.length})
        </TabsTrigger>
        <TabsTrigger value="scheduled">
          Scheduled ({scheduled.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="awaiting">
        <div className="space-y-3">
          {awaitingPayment.length === 0 ? (
            <p className="text-muted-foreground">No appointments awaiting payment</p>
          ) : (
            awaitingPayment.map((apt: any) => (
              <AppointmentStatusCard key={apt._id} appointment={apt} />
            ))
          )}
        </div>
      </TabsContent>

      <TabsContent value="confirmed">
        <div className="space-y-3">
          {confirmed.length === 0 ? (
            <p className="text-muted-foreground">No confirmed appointments</p>
          ) : (
            confirmed.map((apt: any) => (
              <AppointmentStatusCard key={apt._id} appointment={apt} />
            ))
          )}
        </div>
      </TabsContent>

      <TabsContent value="scheduled">
        <div className="space-y-3">
          {scheduled.length === 0 ? (
            <p className="text-muted-foreground">No scheduled appointments</p>
          ) : (
            scheduled.map((apt: any) => (
              <AppointmentStatusCard key={apt._id} appointment={apt} />
            ))
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}

function AppointmentStatusCard({ appointment }: { appointment: any }) {
  const statusColor: Record<string, string> = {
    awaiting_payment: 'bg-yellow-50 border-yellow-200',
    confirmed: 'bg-green-50 border-green-200',
    scheduled: 'bg-blue-50 border-blue-200',
  };

  const statusIcon: Record<string, JSX.Element> = {
    awaiting_payment: <Clock className="w-4 h-4 text-yellow-600" />,
    confirmed: <CheckCircle2 className="w-4 h-4 text-green-600" />,
    scheduled: <Clock className="w-4 h-4 text-blue-600" />,
  };

  return (
    <Card className={`${statusColor[appointment.status as keyof typeof statusColor]} border`}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-2">
          {statusIcon[appointment.status as keyof typeof statusIcon]}
          <Badge variant="secondary" className="capitalize">
            {appointment.status.replace('_', ' ')}
          </Badge>
          <span className="text-xs text-muted-foreground ml-auto">
            ₹{appointment.consultationFee}
          </span>
        </div>
        <p className="text-sm font-semibold">
          {new Date(appointment.appointmentDate).toLocaleString()}
        </p>
        <p className="text-sm text-muted-foreground">{appointment.type}</p>
      </CardContent>
    </Card>
  );
}