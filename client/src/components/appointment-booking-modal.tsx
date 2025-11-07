import { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea"; 
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Clock, Video, User, CreditCard, Calendar as CalendarIcon } from "lucide-react";
import { format, getISODay, addDays, startOfDay } from "date-fns"; 

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  profile: {
    specialization: string;
    consultationFee: number;
    isApproved: boolean;
  };
}

interface AppointmentBookingModalProps {
  doctor: Doctor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DoctorAvailability {
    _id: string;
    doctorId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
}

const isSameDay = (date1: Date, date2: Date) => 
  date1.getFullYear() === date2.getFullYear() &&
  date1.getMonth() === date2.getMonth() &&
  date1.getDate() === date2.getDate();

const isDoctorEligible = (doctor: Doctor | null) => {
  if (!doctor) {
    console.warn("❌ No doctor object provided");
    return false;
  }

  console.log("🔍 Checking doctor eligibility:", {
    id: doctor.id,
    name: `${doctor.firstName} ${doctor.lastName}`,
    isApproved: doctor.profile?.isApproved,
  });

  const isApproved = doctor.profile?.isApproved ?? false;

  if (!isApproved) {
    console.warn("❌ Doctor profile not approved"); 
    return false;
  }

  console.log("✅ Doctor is eligible for bookings");
  return true;
};

export default function AppointmentBookingModal({ doctor, open, onOpenChange }: AppointmentBookingModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [appointmentType, setAppointmentType] = useState<"video" | "in-person">("video");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const doctorId = doctor?.id;
  const isDoctorReady = !!doctorId;
  
  useEffect(() => {
    console.log("🏥 [DOCTOR INFO]");
    console.log("   doctor prop:", doctor);
    console.log("   doctorId:", doctorId);
    console.log("   isDoctorReady:", isDoctorReady);
  }, [doctor, doctorId, isDoctorReady]);

  useEffect(() => {
    setSelectedTime("");
  }, [selectedDate]);

  useEffect(() => {
    if (!open) {
      setSelectedDate(undefined);
      setSelectedTime("");
      setAppointmentType("video");
      setNotes("");
    }
  }, [open]);

  interface AppointmentData {
    doctorId: string;
    appointmentDate: string;
    duration: number;
    type: "video" | "in-person";
    consultationFee: number;
    notes: string;
  }
  
  const { data: doctorAvailability = [], isLoading, error: availabilityError } = useQuery<DoctorAvailability[]>({
    queryKey: ["/api/doctor/availability", doctorId, selectedDate], 
    queryFn: async () => {
      console.log("🔄 [FETCH AVAILABILITY - QUERY RUNNING]");
      console.log("   isDoctorReady:", isDoctorReady);
      console.log("   selectedDate:", selectedDate);
      console.log("   doctorId:", doctorId);
      
      if (!isDoctorReady || !selectedDate) {
        console.warn("⚠️  Early return - missing doctor or date");
        console.warn("     isDoctorReady:", isDoctorReady, "selectedDate:", selectedDate);
        return [];
      }
      
      const dayOfWeek = getISODay(selectedDate);
      const url = `/api/doctor/availability?doctorId=${doctorId}&dayOfWeek=${dayOfWeek}`;
      
      console.log("📍 FULL URL:", url);
      console.log("   Doctor ID value:", doctorId);
      console.log("   Date:", format(selectedDate, "PPP"));
      console.log("   ISO Day value:", dayOfWeek);
      
      try {
        console.log("📡 Making API request to:", url);
        const res = await apiRequest("GET", url);
        
        console.log("📥 Response received - Status:", res.status, res.statusText);
        
        if (!res.ok) {
          console.error("❌ HTTP Error:", res.status);
          const errorText = await res.text();
          console.error("   Response body:", errorText);
          throw new Error(`HTTP ${res.status}`);
        }
        
        const data = await res.json();
        console.log("✅ Raw response data:", data);
        console.log("✅ Got slots:", data.length, "items");
        
        if (!Array.isArray(data)) {
          console.warn("⚠️  Data is not an array:", typeof data);
          return [];
        }
        
        if (data.length === 0) {
          console.warn("⚠️  Empty array returned - doctor has no availability set!");
        }
        
        data.forEach((slot: DoctorAvailability, i: number) => {
          console.log(`   [${i+1}] Day: ${slot.dayOfWeek}, Time: ${slot.startTime}-${slot.endTime}, Available: ${slot.isAvailable}`);
        });
        
        return data;
      } catch (err: any) {
        console.error("❌ Fetch error:", err.message);
        console.error("   Full error:", err);
        throw err;
      }
    },
    enabled: open && isDoctorReady && !!selectedDate, 
  });
  
  useEffect(() => {
    console.log("📊 useQuery state changed:");
    console.log("   isLoading:", isLoading);
    console.log("   data length:", doctorAvailability.length);
    console.log("   error:", availabilityError);
    console.log("   enabled:", open && isDoctorReady && !!selectedDate);
  }, [isLoading, doctorAvailability, availabilityError, open, isDoctorReady, selectedDate]);

  const { data: availabilitySummary = [] } = useQuery<DoctorAvailability[]>({
    queryKey: ["/api/doctor/availability-summary", doctorId],
    queryFn: async () => {
      if (!isDoctorReady) return [];

      const url = `/api/doctor/availability?doctorId=${doctorId}`;
      try {
        const res = await apiRequest("GET", url);
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || "Failed to load availability");
        }
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("❌ Failed to load availability summary", error);
        return [];
      }
    },
    enabled: open && isDoctorReady,
    staleTime: 1000 * 60,
  });

  const enabledDateKeySet = useMemo(() => {
    const set = new Set<string>();
    if (!availabilitySummary.length) return set;

    const startDate = startOfDay(new Date());
    const horizonDays = 90;

    for (let i = 0; i <= horizonDays; i++) {
      const date = addDays(startDate, i);
      const isoDay = getISODay(date);
      const hasAvailability = availabilitySummary.some(
        (slot) => slot.isAvailable && slot.dayOfWeek === isoDay
      );

      if (hasAvailability) {
        set.add(format(date, "yyyy-MM-dd"));
      }
    }

    return set;
  }, [availabilitySummary]);

  const enabledDateObjects = useMemo(() => {
    return Array.from(enabledDateKeySet).map((key) => new Date(`${key}T00:00:00`));
  }, [enabledDateKeySet]);

  useEffect(() => {
    if (!open) return;
    if (!enabledDateKeySet.size) return;

    if (!selectedDate || !enabledDateKeySet.has(format(selectedDate, "yyyy-MM-dd"))) {
      const firstKey = Array.from(enabledDateKeySet).sort()[0];
      if (firstKey) {
        setSelectedDate(new Date(`${firstKey}T00:00:00`));
      }
    }
  }, [open, enabledDateKeySet, selectedDate]);
  
  const timeSlots = useMemo(() => {
    if (!selectedDate) return [];

    const dayIndexToMatch = getISODay(selectedDate);
    
    console.log("🔍 [FILTER TIME SLOTS]");
    console.log("   Looking for ISO day:", dayIndexToMatch);
    console.log("   Available slots:", doctorAvailability.length);
    
    const availableSlots = doctorAvailability.filter(
      slot => slot.dayOfWeek === dayIndexToMatch && slot.isAvailable
    );

    console.log("   Matching slots:", availableSlots.length);

    if (availableSlots.length === 0) {
      console.warn("   ⚠️ No available slots for this day");
      return [];
    } 
    
    const generatedSlots: string[] = [];

    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        
        const isInAvailableSlot = availableSlots.some(slot => {
          return timeStr >= slot.startTime && timeStr < slot.endTime;
        });
        
        if (isInAvailableSlot) {
          generatedSlots.push(timeStr);
        }
      }
    }
    
    console.log("   Generated slots:", generatedSlots.length, generatedSlots.slice(0, 5));
    
    if (isSameDay(selectedDate, new Date())) {
      const currentTime = format(new Date(), 'HH:mm');
      const filtered = generatedSlots.filter(time => time > currentTime);
      console.log("   Filtered past times (current:", currentTime + "), kept:", filtered.length);
      return filtered;
    }

    return generatedSlots;

  }, [selectedDate, doctorAvailability]);
  
  useEffect(() => {
    if (timeSlots.length > 0 && selectedTime === "") {
      setSelectedTime(timeSlots[0]);
      console.log("✅ Auto-selected:", timeSlots[0]);
    }
  }, [timeSlots, selectedTime]);

  const bookAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: AppointmentData) => {
      console.log("📤 [BOOKING APPOINTMENT]");
      console.log("   Data:", appointmentData);
      
      const res = await apiRequest("POST", "/api/appointments", appointmentData);
      
      if (!res.ok) {
        console.error("❌ Booking failed:", res.status);
        let errorMessage = "Booking failed";
        try {
          const errorData = await res.json();
          console.error("   Error response:", errorData);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          const errorText = await res.text();
          console.error("   Raw error:", errorText);
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const result = await res.json();
      console.log("✅ Booking successful!");
      
      console.log("📢 [SENDING NOTIFICATION TO DOCTOR]");
      try {
        await apiRequest("POST", "/api/notifications", {
          recipientId: appointmentData.doctorId,
          type: "appointment_booked",
          title: "New Appointment Booked",
          message: `A new appointment has been scheduled for ${format(new Date(appointmentData.appointmentDate), "PPP 'at' p")}`,
          appointmentId: result.id,
          appointmentDate: appointmentData.appointmentDate,
          appointmentType: appointmentData.type,
        });
        console.log("✅ Notification sent to doctor!");
      } catch (notificationError) {
        console.error("⚠️  Failed to send notification:", notificationError);
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Appointment Booked",
        description: "Your appointment has been scheduled successfully.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Booking Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    console.log("📋 [QUERY ENABLED STATE]");
    console.log("   open:", open);
    console.log("   isDoctorReady:", isDoctorReady);
    console.log("   selectedDate:", selectedDate);
    console.log("   Should enable query?", open && isDoctorReady && !!selectedDate);
  }, [open, isDoctorReady, selectedDate]);

  if (!doctor) {
    console.warn("⚠️  No doctor prop provided!");
    return null;
  }
  
  const handleBookAppointment = () => {
    console.log("🚀 [BOOKING INITIATED]");
    
    if (!doctor) {
      console.error("❌ No doctor provided");
      return;
    }

    if (!isDoctorEligible(doctor)) {
      toast({
        title: "Booking Not Available",
        description: "This doctor is not currently accepting appointments.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedDate || !selectedTime) {
      console.error("❌ Missing info");
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

    const appointmentData: AppointmentData = {
      doctorId: doctorId!,
      appointmentDate: appointmentDateTime.toISOString(),
      duration: 30,
      type: appointmentType,
      consultationFee: doctor.profile.consultationFee,
      notes: notes,
    };

    bookAppointmentMutation.mutate(appointmentData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CalendarIcon className="w-5 h-5 mr-2" />
            Book Appointment with Dr. {doctor.firstName} {doctor.lastName}
          </DialogTitle>
          <DialogDescription>
            Schedule a {appointmentType === "video" ? "video consultation" : "in-person visit"}
          </DialogDescription>
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

          {/* Date & Time Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Select Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 rounded-xl border border-border/60 bg-background/85 px-4 py-3 text-left text-sm font-medium shadow-sm transition hover:border-primary/60 hover:bg-primary/10"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto border-none bg-transparent p-0 shadow-none" align="start" sideOffset={12}>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => !enabledDateKeySet.has(format(date, "yyyy-MM-dd"))}
                    modifiers={{ available: enabledDateObjects }}
                    modifiersClassNames={{
                      available: "relative after:absolute after:bottom-1/2 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:translate-y-3 after:rounded-full after:bg-primary",
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="time">Select Time</Label>
              <Select 
                value={selectedTime} 
                onValueChange={setSelectedTime}
                disabled={!selectedDate || timeSlots.length === 0 || isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                        isLoading ? "Loading slots..." : 
                        !selectedDate ? "Select a date first" : 
                        timeSlots.length === 0 ? "No slots available" : "Select time"
                    } />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] overflow-y-auto">
                  {timeSlots.length > 0 ? (
                    timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="py-6 text-center text-sm text-muted-foreground px-4">
                      {!selectedDate ? "Pick a date to see available slots" : "No slots available"}
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="type">Appointment Type</Label>
            <Select value={appointmentType} onValueChange={(value: "video" | "in-person") => setAppointmentType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Video Consultation</SelectItem>
                <SelectItem value="in-person">In-Person Visit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any specific concerns..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Payment Summary */}
          <div className="p-4 bg-muted/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Consultation Fee</p>
                <p className="text-sm text-muted-foreground">30 minutes</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">₹{doctor.profile.consultationFee}</p>
              </div>
            </div>
          </div>

          {/* Warning message if doctor isn't eligible */}
          {doctor && !isDoctorEligible(doctor) && (
            <div className="text-sm text-red-500 text-center mb-2">
              This doctor is not currently accepting appointments
            </div>
          )}

          {/* Buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBookAppointment}
              disabled={
                bookAppointmentMutation.isPending || 
                !selectedDate || 
                !selectedTime || 
                isLoading ||
                !doctor ||
                !isDoctorEligible(doctor)
              }
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