import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Calendar as CalendarIcon, Clock, Video, User, CreditCard } from "lucide-react";
import { format } from "date-fns";

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  profile: {
    specialization: string;
    consultationFee: number;
  };
}

interface AppointmentBookingModalProps {
  doctor: Doctor;
  children: React.ReactNode;
}

export default function AppointmentBookingModal({ doctor, children }: AppointmentBookingModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [appointmentType, setAppointmentType] = useState<"video" | "in-person">("video");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  interface AppointmentData {
    doctorId: string;
    appointmentDate: string;
    duration: number;
    type: "video" | "in-person";
    consultationFee: number;
    notes: string;
  }

  const bookAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: AppointmentData) => {
      const res = await apiRequest("POST", "/api/appointments", appointmentData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Appointment Booked",
        description: "Your appointment has been scheduled successfully.",
      });
      setOpen(false);
      // Reset form
      setSelectedDate(undefined);
      setSelectedTime("");
      setAppointmentType("video");
      setNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Booking Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleBookAppointment = () => {
    if (!selectedDate || !selectedTime) {
      toast({
        title: "Missing Information",
        description: "Please select a date and time for your appointment.",
        variant: "destructive",
      });
      return;
    }

    const appointmentDateTime = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':').map(Number);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    const appointmentData = {
      doctorId: doctor.id,
      appointmentDate: appointmentDateTime.toISOString(),
      duration: 30,
      type: appointmentType,
      consultationFee: doctor.profile.consultationFee,
      notes: notes,
    };

    bookAppointmentMutation.mutate(appointmentData);
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CalendarIcon className="w-5 h-5 mr-2" />
            Book Appointment with Dr. {doctor.firstName} {doctor.lastName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Doctor Info */}
          <div className="p-4 bg-muted/20 rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                <span className="text-primary font-semibold">
                  {doctor.firstName[0]}{doctor.lastName[0]}
                </span>
              </div>
              <div>
                <h3 className="font-semibold">Dr. {doctor.firstName} {doctor.lastName}</h3>
                <p className="text-sm text-muted-foreground">{doctor.profile.specialization}</p>
                <p className="text-sm font-medium">₹{doctor.profile.consultationFee}</p>
              </div>
            </div>
          </div>

          {/* Appointment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Select Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="time">Select Time</Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="type">Appointment Type</Label>
            <Select value={appointmentType} onValueChange={setAppointmentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">
                  <div className="flex items-center">
                    <Video className="w-4 h-4 mr-2" />
                    Video Consultation
                  </div>
                </SelectItem>
                <SelectItem value="in-person">
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    In-Person Visit
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any specific concerns or questions you'd like to discuss..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Payment Summary */}
          <div className="p-4 bg-muted/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Consultation Fee</p>
                <p className="text-sm text-muted-foreground">
                  {appointmentType === "video" ? "Video Consultation" : "In-Person Visit"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">₹{doctor.profile.consultationFee}</p>
                <p className="text-sm text-muted-foreground">30 minutes</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBookAppointment}
              disabled={bookAppointmentMutation.isPending || !selectedDate || !selectedTime}
              className="flex-1"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {bookAppointmentMutation.isPending ? "Booking..." : "Book & Pay"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
