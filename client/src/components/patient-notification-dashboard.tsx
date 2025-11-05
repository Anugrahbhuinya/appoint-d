import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Mail, CheckCircle2, AlertCircle, Loader2, Trash2, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

  // 🔄 Fetch notifications
  const { data: notifications = [], isLoading, error, refetch } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json() as Promise<Notification[]>;
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });

  // 🔄 Fetch doctors to get their names
  const { data: doctors = [] } = useQuery({
    queryKey: ['/api/doctors'],
    queryFn: async () => {
      const res = await fetch('/api/doctors');
      if (!res.ok) throw new Error('Failed to fetch doctors');
      return res.json();
    },
    refetchInterval: 30000,
  });

  // 📊 Build doctors map for quick lookup
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

  // 📊 Calculate stats
  const unreadCount = notifications.filter((n) => !n.read).length;
  const pendingPayments = notifications.filter((n) => n.type === 'payment_pending' && !n.read);

  // ✅ Mark as read
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

  // 🗑️ Delete notification
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

  // 🎨 Get notification style based on type with vibrant colors
  const getNotificationStyle = (type: string, read: boolean) => {
    if (type === 'payment_pending') {
      return {
        bgClass: read ? 'bg-orange-50 border-orange-200' : 'bg-gradient-to-r from-orange-100 to-amber-100 border-2 border-orange-400',
        icon: <AlertCircle className="w-5 h-5 text-orange-600" />,
        badge: 'Payment Pending',
        badgeColor: 'bg-orange-500',
      };
    }
    if (type === 'appointment_confirmed') {
      return {
        bgClass: read ? 'bg-emerald-50 border-emerald-200' : 'bg-gradient-to-r from-emerald-100 to-teal-100 border-2 border-emerald-400',
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
        badge: 'Confirmed',
        badgeColor: 'bg-emerald-500',
      };
    }
    if (type === 'appointment_scheduled') {
      return {
        bgClass: read ? 'bg-blue-50 border-blue-200' : 'bg-gradient-to-r from-blue-100 to-cyan-100 border-2 border-blue-400',
        icon: <Bell className="w-5 h-5 text-blue-600" />,
        badge: 'Scheduled',
        badgeColor: 'bg-blue-500',
      };
    }
    if (type === 'appointment_cancelled') {
      return {
        bgClass: read ? 'bg-red-50 border-red-200' : 'bg-gradient-to-r from-red-100 to-pink-100 border-2 border-red-400',
        icon: <AlertCircle className="w-5 h-5 text-red-600" />,
        badge: 'Cancelled',
        badgeColor: 'bg-red-500',
      };
    }
    return {
      bgClass: read ? 'bg-gray-50 border-gray-200' : 'bg-gradient-to-r from-gray-100 to-slate-100 border-2 border-gray-400',
      icon: <Bell className="w-5 h-5 text-gray-600" />,
      badge: 'Notification',
      badgeColor: 'bg-gray-500',
    };
  };

  // 👨‍⚕️ Get doctor name from doctorId
  const getDoctorName = (doctorId?: string) => {
    if (!doctorId) return 'Doctor';
    const doctor = doctorsMap.get(doctorId);
    if (doctor) {
      return `Dr. ${doctor.firstName} ${doctor.lastName}`.trim();
    }
    return 'Doctor';
  };

  // 📅 Format date
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
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-red-600">Failed to load notifications</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Notifications
          </h2>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              You have <span className="font-semibold text-blue-600">{unreadCount} unread</span> notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <Badge variant="secondary" className="text-base px-3 py-1 bg-red-500 text-white">
            {unreadCount} New
          </Badge>
        )}
      </div>

      {/* Alert for pending payments */}
      {pendingPayments.length > 0 && (
        <Card className="border-orange-400 bg-gradient-to-r from-orange-50 to-amber-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-900">
                  {pendingPayments.length} Payment{pendingPayments.length !== 1 ? 's' : ''} Pending
                </p>
                <p className="text-sm text-orange-800">
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
                className={`cursor-pointer transition-all ${style.bgClass} ${
                  isSelected ? 'ring-2 ring-offset-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedNotification(isSelected ? null : notification)}
              >
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">{style.icon}</div>

                    {/* Content */}
                    <div className="flex-grow min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-grow">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-sm leading-tight">
                              {notification.title}
                            </h3>
                          </div>
                          {/* 👨‍⚕️ Doctor Name */}
                          <div className="flex items-center gap-1 mb-2">
                            <User className="w-3 h-3 text-gray-500" />
                            <p className="text-xs font-medium text-gray-600">
                              {doctorName}
                            </p>
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${style.badgeColor}`} />
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge variant="outline" className={`text-xs text-white border-0 ${style.badgeColor}`}>
                          {style.badge}
                        </Badge>

                        {/* Channels */}
                        <div className="flex gap-1">
                          {notification.notificationChannels.includes('email') && (
                            <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                              <Mail className="w-3 h-3 mr-1" />
                              Email
                            </Badge>
                          )}
                          {notification.notificationChannels.includes('inapp') && (
                            <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-700">
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
                        <div className="mt-4 pt-4 border-t border-gray-300 space-y-3">
                          {notification.appointmentDate && (
                            <div>
                              <p className="text-xs font-semibold text-gray-600">Appointment Date & Time</p>
                              <p className="text-sm font-medium">
                                {new Date(notification.appointmentDate).toLocaleString()}
                              </p>
                            </div>
                          )}

                          {notification.consultationFee && (
                            <div>
                              <p className="text-xs font-semibold text-gray-600">Consultation Fee</p>
                              <p className="text-lg font-bold text-green-600">
                                ₹{notification.consultationFee}
                              </p>
                            </div>
                          )}

                          {/* Full Doctor Info */}
                          <div>
                            <p className="text-xs font-semibold text-gray-600">Doctor</p>
                            <p className="text-sm font-medium">
                              {doctorName}
                            </p>
                          </div>

                          {/* Actions */}
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
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
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