import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // <-- Added Select imports
import { Calendar } from "@/components/ui/calendar"; // <-- Added Calendar import
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"; // <-- Added Popover imports
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Calendar as CalendarIcon, Clock } from "lucide-react"; // <-- Added CalendarIcon import
import { format } from "date-fns"; // <-- Added format import

interface RescheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  currentDate: string;
}

// 💡 NOTE: In a real application, the availability logic below would come from a query,
// similar to your AppointmentBookingModal, but for now, we use a mock.

const mockTimeSlots = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
];

// Helper to disable past dates
const isPastDate = (date: Date) =>
  date < new Date() && !isSameDay(date, new Date());
const isSameDay = (date1: Date, date2: Date) =>
  date1.getFullYear() === date2.getFullYear() &&
  date1.getMonth() === date2.getMonth() &&
  date1.getDate() === date2.getDate();

export function RescheduleAppointmentModal({
  open,
  onOpenChange,
  appointmentId,
  currentDate,
}: RescheduleModalProps) {
  // State now stores Date object for the calendar
  const [newDate, setNewDate] = useState<Date | undefined>(undefined);
  const [newTime, setNewTime] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Use a unique key for the Popover to manage its open/close state
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      if (!newDate || !newTime) {
        throw new Error("Please select both date and time");
      }

      // Combine Date object and time string
      const appointmentDateTime = new Date(newDate);
      const [hours, minutes] = newTime.split(":").map(Number);
      appointmentDateTime.setHours(hours, minutes, 0, 0);

      const res = await apiRequest(
        "PUT",
        `/api/appointments/${appointmentId}`,
        {
          appointmentDate: appointmentDateTime.toISOString(),
          status: "pending", // Reset status to pending for doctor review
        }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to reschedule appointment");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Appointment Rescheduled",
        description: "Your appointment has been successfully rescheduled.",
      });
      setNewDate(undefined);
      setNewTime("");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Reschedule Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleReschedule = () => {
    rescheduleMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule Appointment</DialogTitle>
          <DialogDescription>
            Current appointment: {new Date(currentDate).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 📅 DATE SELECTION (Using Popover & Calendar) */}
          <div className="space-y-2">
            <Label htmlFor="date">Select New Date</Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 rounded-xl border border-border/60 bg-background/85 px-4 py-3 text-left text-sm font-medium shadow-sm transition hover:border-primary/60 hover:bg-primary/10"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newDate ? format(newDate, "PPP") : "Select a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto border-none bg-transparent p-0 shadow-none"
                align="start"
                sideOffset={12}
              >
                <Calendar
                  mode="single"
                  selected={newDate}
                  onSelect={(date) => {
                    setNewDate(date);
                    setIsCalendarOpen(false); // Close calendar upon selection
                  }}
                  // Disable dates in the past (optional, but good practice)
                  disabled={isPastDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* ⏰ TIME SELECTION (Using Select) */}
          <div className="space-y-2">
            <Label htmlFor="time">Select New Time</Label>
            <Select
              value={newTime}
              onValueChange={setNewTime}
              disabled={!newDate} // Disable if no date is selected
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={!newDate ? "Select a date first" : "Select time"}
                />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                {/* 💡 MOCK DATA: In a real scenario, this would be the timeSlots array from an availability query */}
                {mockTimeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReschedule}
              disabled={rescheduleMutation.isPending || !newDate || !newTime}
            >
              {rescheduleMutation.isPending ? "Rescheduling..." : "Reschedule"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
