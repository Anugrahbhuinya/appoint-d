import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Mail, CheckCircle2, AlertCircle, Loader2, Trash2, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Interface definitions (as provided)
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

interface Doctor {
  _id: string;
  firstName: string;
  lastName: string;
}

export function PatientNotificationDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [doctorsMap, setDoctorsMap] = useState<Map<string, Doctor>>(new Map());

  // 🔄 Fetch notifications (unchanged)
  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json() as Promise<Notification[]>;
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });

  // 🔄 Fetch doctors (unchanged)
  const { data: doctors = [] } = useQuery({
    queryKey: ['/api/doctors'],
    queryFn: async () => {
      const res = await fetch('/api/doctors');
      if (!res.ok) throw new Error('Failed to fetch doctors');
      return res.json();
    },
    refetchInterval: 30000,
  });

  // 📊 Build doctors map (unchanged)
  useEffect(() => {
    const newMap = new Map<string, Doctor>();
    doctors.forEach((doc: any) => {
      const doctorId = doc._id || doc.id;
      newMap.set(doctorId, {
        _id: doctorId,
        firstName: doc.firstName || '',
        lastName: doc.lastName || '',
      });
    });
    setDoctorsMap(newMap);
  }, [doctors]);

  // 📊 Calculate stats (unchanged)
  const unreadCount = notifications.filter((n) => !n.read).length;
  const pendingPayments = notifications.filter((n) => n.type === 'payment_pending' && !n.read);

  // ✅ Mark as read (unchanged)
  const markAsRead = async (notificationId: string) => {
    try {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      });

      if (!res.ok) throw new Error('Failed to mark as read');
      
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: '✅ Marked as read',
        description: 'Notification updated',
      });
    } catch (err) {
      console.error('Error marking as read:', err);
      toast({
        title: '❌ Error',
        description: 'Failed to mark notification as read',
        variant: 'destructive',
      });
    }
  };

  // 🗑️ Delete notification (unchanged)
  const deleteNotification = async (notificationId: string) => {
    try {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete notification');
      
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      setSelectedNotification(null);
      toast({
        title: '✅ Deleted',
        description: 'Notification removed',
      });
    } catch (err) {
      console.error('Error deleting:', err);
      toast({
        title: '❌ Error',
        description: 'Failed to delete notification',
        variant: 'destructive',
      });
    }
  };

  // 🎨 === THEME FIX ===
  // Get notification style based on portal's theme
  const getNotificationStyle = (type: string, read: boolean) => {
    // Read messages are always muted
    if (read) {
      return {
        cardClass: 'bg-card opacity-70',
        icon: <Bell className="w-5 h-5 text-muted-foreground" />,
        iconColor: 'text-muted-foreground',
        badgeVariant: 'secondary' as const,
        badgeText: 'Notification',
      };
    }

    // Unread messages
    switch (type) {
      case 'payment_pending':
        return {
          cardClass: 'bg-destructive/10 border-destructive/20',
          icon: <AlertCircle className="w-5 h-5 text-destructive" />,
          iconColor: 'text-destructive',
          badgeVariant: 'destructive' as const,
          badgeText: 'Payment Pending',
        };
      case 'appointment_confirmed':
        // Uses green, consistent with "Active Patient" badge in sidebar
        return {
          cardClass: 'bg-green-500/10 border-green-500/20',
          icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
          iconColor: 'text-green-600',
          badgeVariant: 'secondary' as const,
          badgeText: 'Confirmed',
        };
      case 'appointment_scheduled':
        return {
          cardClass: 'bg-primary/10 border-primary/20',
          icon: <Bell className="w-5 h-5 text-primary" />,
          iconColor: 'text-primary',
          badgeVariant: 'default' as const,
          badgeText: 'Scheduled',
        };
      case 'appointment_cancelled':
        return {
          cardClass: 'bg-destructive/10 border-destructive/20',
          icon: <AlertCircle className="w-5 h-5 text-destructive" />,
          iconColor: 'text-destructive',
          badgeVariant: 'destructive' as const,
          badgeText: 'Cancelled',
        };
      default:
        return {
          cardClass: 'bg-card/80 border-border',
          icon: <Bell className="w-5 h-5 text-muted-foreground" />,
          iconColor: 'text-muted-foreground',
          badgeVariant: 'secondary' as const,
          badgeText: 'Notification',
        };
    }
  };

  // 👨‍⚕️ Get doctor name (unchanged)
  const getDoctorName = (doctorId?: string) => {
    if (!doctorId) return 'Doctor';
    const doctor = doctorsMap.get(doctorId);
    if (doctor) {
      return `Dr. ${doctor.firstName} ${doctor.lastName}`.trim();
    }
    return 'Doctor';
  };

  // 📅 Format date (unchanged)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (error) {
    return (
      <Card className="border-destructive/20 bg-destructive/10">
        <CardContent className="pt-6">
          <p className="text-destructive">Failed to load notifications</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 🎨 === HEADER FIX: Matched to other portal tabs === */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Bell className="w-7 h-7" />
          Notifications
        </h1>
        {unreadCount > 0 && (
          <p className="text-muted-foreground">
            You have <span className="font-semibold text-primary">{unreadCount} unread</span> notification{unreadCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* 🎨 === ALERT FIX: Using theme colors === */}
      {pendingPayments.length > 0 && (
        <Card className="border-destructive/20 bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-destructive">
                  {pendingPayments.length} Payment{pendingPayments.length !== 1 ? 's' : ''} Pending
                </p>
                <p className="text-sm text-destructive/80">
                  Complete your appointment payment to confirm your booking
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications List */}
      <div className="space-y-3">
        {isLoading ? (
          <Card>
            <CardContent className="pt-6 flex justify-center items-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground py-8">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No notifications yet</p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => {
            const style = getNotificationStyle(notification.type, notification.read);
            const isSelected = selectedNotification?._id === notification._id;
            const doctorName = getDoctorName(notification.doctorId);

            return (
              <Card
                key={notification._id}
                className={`cursor-pointer transition-all border ${style.cardClass} ${
                  isSelected ? 'ring-2 ring-offset-2 ring-primary shadow-lg' : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedNotification(isSelected ? null : notification)}
              >
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className={`flex-shrink-0 mt-1 ${style.iconColor}`}>{style.icon}</div>

                    {/* Content */}
                    <div className="flex-grow min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-grow">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-sm leading-tight text-foreground">
                              {notification.title}
                            </h3>
                          </div>
                          {/* 👨‍⚕️ Doctor Name */}
                          <div className="flex items-center gap-1 mb-2">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <p className="text-xs font-medium text-muted-foreground">
                              {doctorName}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                        </div>
                        {/* 🎨 === UNREAD DOT FIX: Using primary color === */}
                        {!notification.read && (
                          <div className="w-2.5 h-2.5 bg-primary rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge variant={style.badgeVariant} className="text-xs">
                          {style.badgeText}
                        </Badge>

                        {/* Channels */}
                        <div className="flex gap-1">
                          {/* 🎨 === THEME FIX: Using standard secondary badge === */}
                          {notification.notificationChannels.includes('email') && (
                            <Badge variant="secondary" className="text-xs">
                              <Mail className="w-3 h-3 mr-1" />
                              Email
                            </Badge>
                          )}
                          {notification.notificationChannels.includes('inapp') && (
                            <Badge variant="secondary" className="text-xs">
                              <Bell className="w-3 h-3 mr-1" />
                              In-app
                            </Badge>
                          )}
                        </div>

                        <div className="ml-auto text-xs text-muted-foreground">
                          {formatDate(notification.createdAt)}
                        </div>
                      </div>

                      {/* Expanded details */}
                      {isSelected && (
                        <div className="mt-4 pt-4 border-t border-border space-y-3">
                          {notification.appointmentDate && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground">Appointment Date & Time</p>
                              <p className="text-sm font-medium text-foreground">
                                {new Date(notification.appointmentDate).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                              </p>
                            </div>
                          )}

                          {notification.consultationFee && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground">Consultation Fee</p>
                              <p className="text-lg font-bold text-green-600">
                                ₹{notification.consultationFee}
                              </p>
                            </div>
                          )}

                          <div>
                            <p className="text-xs font-semibold text-muted-foreground">Doctor</p>
                            <p className="text-sm font-medium text-foreground">
                              {doctorName}
                            </p>
                          </div>

                          {/* Actions (unchanged, style is good) */}
                          <div className="flex gap-2 pt-2">
                            {!notification.read && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification._id);
                                }}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Mark as Read
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification._id);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}