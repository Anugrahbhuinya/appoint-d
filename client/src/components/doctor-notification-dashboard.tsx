// --- components/doctor-notification-dashboard.tsx (New File) ---

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, AlertCircle, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  _id: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

interface DoctorNotificationDashboardProps {
  notifications: Notification[];
}

export const DoctorNotificationDashboard = ({ notifications }: DoctorNotificationDashboardProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Mutation for marking a notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      // Assuming an API endpoint exists for this action
      await fetch(`/api/doctor/notifications/${notificationId}/read`, { method: "POST" });
    },
    onSuccess: () => {
      // Invalidate the notifications query to refetch the updated list
      queryClient.invalidateQueries({ queryKey: ["/api/doctor/notifications"] });
      toast({
        title: "Success",
        description: "Notification marked as read.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update notification.",
        variant: "destructive",
      });
    },
  });

  const sortedNotifications = notifications.sort((a, b) => {
    // Sort by unread first, then by date (newest first)
    if (a.read !== b.read) {
      return a.read ? 1 : -1;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const getIconForType = (type: string) => {
    if (type.includes("appointment")) return Calendar;
    if (type.includes("profile") || type.includes("document")) return AlertCircle;
    return Bell;
  };

  return (
    <Card>
      <CardContent className="p-0">
        {sortedNotifications.length > 0 ? (
          <div className="divide-y divide-border">
            {sortedNotifications.map((n) => {
              const Icon = getIconForType(n.type);
              const isUnread = !n.read;
              
              return (
                <div
                  key={n._id}
                  className={`p-4 transition-colors ${
                    isUnread ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <Icon className={`w-5 h-5 mt-1 ${isUnread ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="flex-1">
                      <p className={`text-sm ${isUnread ? 'font-semibold' : 'text-muted-foreground'}`}>{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!n.read && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs h-8"
                        onClick={() => markAsReadMutation.mutate(n._id)}
                        disabled={markAsReadMutation.isPending}
                      >
                        Mark as Read
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center p-8 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>You are all caught up!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};