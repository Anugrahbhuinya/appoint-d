import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Clock, Plus, Trash2, Save, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as DayPickerCalendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { eachDayOfInterval, endOfMonth, format, getISODay, isSameMonth, startOfDay, startOfMonth } from "date-fns";

interface Availability {
  _id: string;
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  specificDate?: string;
}

type CreateAvailabilityPayload = {
  dayOfWeek?: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  specificDate?: string;
};

const DAYS_ISO = [
  { iso: 1, name: "Monday" },
  { iso: 2, name: "Tuesday" },
  { iso: 3, name: "Wednesday" },
  { iso: 4, name: "Thursday" },
  { iso: 5, name: "Friday" },
  { iso: 6, name: "Saturday" },
  { iso: 7, name: "Sunday" },
];

const getDayName = (dayIndex: number): string => {
  const day = DAYS_ISO.find(d => d.iso === dayIndex);
  return day ? day.name : `Day ${dayIndex}`;
};

export default function AvailabilityManager() {
  const [newAvailability, setNewAvailability] = useState({
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "17:00",
    isAvailable: true,
    mode: "specific" as "specific" | "recurring",
    specificDate: undefined as Date | undefined,
  });
  const [selectedOverviewMonth, setSelectedOverviewMonth] = useState(startOfMonth(new Date()));
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const ALL_AVAILABILITY_QUERY_KEY = ["/api/doctor/availability"];
 
  const { data: availability = [], isLoading, error: queryError } = useQuery<Availability[]>({
    queryKey: ALL_AVAILABILITY_QUERY_KEY,
    queryFn: async () => {
      console.log("🔄 [FETCH AVAILABILITY - AvailabilityManager]");
      try {
        const res = await apiRequest("GET", "/api/doctor/availability");
        
        console.log("   Response status:", res.status);
        console.log("   Response ok:", res.ok);
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error("   ❌ Error response:", errorText);
          throw new Error(`HTTP ${res.status}: ${errorText}`);
        }
        
        const data = await res.json();
        console.log("   ✅ Got data:", data);
        console.log("   Data length:", data.length);
        
        return Array.isArray(data) ? data : [];
      } catch (err: any) {
        console.error("   ❌ Query error:", err.message);
        throw err;
      }
    }
  });

  console.log("📊 Query state:");
  console.log("   isLoading:", isLoading);
  console.log("   availability:", availability);
  console.log("   error:", queryError);

  const createAvailabilityMutation = useMutation({
    mutationFn: async (data: CreateAvailabilityPayload) => {
      console.log("📤 [CREATE AVAILABILITY]");
      console.log("   Data:", data);
      
      const res = await apiRequest("POST", "/api/doctor/availability", data);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("   ❌ Error:", errorText);
        throw new Error(errorText);
      }
      
      const result = await res.json();
      console.log("   ✅ Created:", result);
      return result;
    },
    onSuccess: () => {
      console.log("🔄 [INVALIDATING QUERY]");
      queryClient.invalidateQueries({ queryKey: ALL_AVAILABILITY_QUERY_KEY });
      toast({
        title: "Availability Added",
        description: "Your availability has been set successfully.",
      });
      setNewAvailability({
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "17:00",
        isAvailable: true,
        mode: "specific",
        specificDate: undefined,
      });
    },
    onError: (error: Error) => {
      console.error("❌ Mutation error:", error.message);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateAvailabilityMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Availability> }) => {
      const res = await apiRequest("PUT", `/api/doctor/availability/${id}`, data);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALL_AVAILABILITY_QUERY_KEY });
      toast({
        title: "Availability Updated",
        description: "Your availability has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAvailabilityMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/doctor/availability/${id}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALL_AVAILABILITY_QUERY_KEY });
      toast({
        title: "Availability Removed",
        description: "Your availability has been removed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddAvailability = () => {
    if (!newAvailability.startTime || !newAvailability.endTime) {
      toast({
        title: "Error",
        description: "Please enter both start and end times.",
        variant: "destructive",
      });
      return;
    }

    if (newAvailability.startTime >= newAvailability.endTime) {
      toast({
        title: "Error",
        description: "End time must be after start time.",
        variant: "destructive",
      });
      return;
    }

    if (newAvailability.mode === "specific" && !newAvailability.specificDate) {
      toast({
        title: "Select a date",
        description: "Choose a calendar date for this availability entry.",
        variant: "destructive",
      });
      return;
    }

    const payload: CreateAvailabilityPayload = {
      startTime: newAvailability.startTime,
      endTime: newAvailability.endTime,
      isAvailable: newAvailability.isAvailable,
    };

    if (newAvailability.mode === "recurring") {
      payload.dayOfWeek = newAvailability.dayOfWeek;
    } else if (newAvailability.specificDate) {
      payload.specificDate = format(newAvailability.specificDate, "yyyy-MM-dd");
      payload.dayOfWeek = getISODay(newAvailability.specificDate);
    }

    createAvailabilityMutation.mutate(payload);
  };

  const handleToggleAvailability = (id: string, isAvailable: boolean) => {
    updateAvailabilityMutation.mutate({ id, data: { isAvailable } });
  };

  const handleDeleteAvailability = (id: string) => {
    deleteAvailabilityMutation.mutate(id);
  };

  const handleUpdateTime = (id: string, field: "startTime" | "endTime", value: string) => {
    updateAvailabilityMutation.mutate({ id, data: { [field]: value } });
  };

const todayStart = startOfDay(new Date());

const specificAvailabilityForMonth = useMemo(() => {
  return availability
    .filter((slot) => {
      if (!slot.specificDate) return false;
      const slotDate = new Date(`${slot.specificDate}T00:00:00`);
      return isSameMonth(slotDate, selectedOverviewMonth);
    })
    .sort((a, b) => {
      if (!a.specificDate || !b.specificDate) return 0;
      return a.specificDate.localeCompare(b.specificDate) || a.startTime.localeCompare(b.startTime);
    });
}, [availability, selectedOverviewMonth]);

const recurringAvailability = useMemo(() => {
  return availability
    .filter((slot) => !slot.specificDate)
    .sort((a, b) => {
      if (a.dayOfWeek === b.dayOfWeek) {
        return a.startTime.localeCompare(b.startTime);
      }
      return a.dayOfWeek - b.dayOfWeek;
    });
}, [availability]);

const monthOverview = useMemo(() => {
  const start = startOfMonth(selectedOverviewMonth);
  const end = endOfMonth(selectedOverviewMonth);
  const daysInMonth = eachDayOfInterval({ start, end });

  const availableKeys = new Set<string>();
  const blockedKeys = new Set<string>();

  const specificMap = new Map<string, { hasAvailable: boolean }>();
  availability
    .filter((slot) => slot.specificDate)
    .forEach((slot) => {
      const key = slot.specificDate!;
      const entry = specificMap.get(key) ?? { hasAvailable: false };
      if (slot.isAvailable) {
        entry.hasAvailable = true;
      }
      specificMap.set(key, entry);
    });

  specificMap.forEach((entry, key) => {
    if (entry.hasAvailable) {
      availableKeys.add(key);
    } else {
      blockedKeys.add(key);
    }
  });

  const recurringActive = availability.filter((slot) => !slot.specificDate && slot.isAvailable);

  daysInMonth.forEach((day) => {
    const key = format(day, "yyyy-MM-dd");
    if (specificMap.has(key)) {
      return;
    }
    const iso = getISODay(day);
    if (recurringActive.some((slot) => slot.dayOfWeek === iso)) {
      availableKeys.add(key);
    }
  });

  return {
    available: Array.from(availableKeys).map((key) => new Date(`${key}T00:00:00`)),
    blocked: Array.from(blockedKeys).map((key) => new Date(`${key}T00:00:00`)),
  };
}, [availability, selectedOverviewMonth]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="space-y-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (queryError) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-6">
          <p className="text-red-900 font-semibold">Error loading availability</p>
          <p className="text-red-700 text-sm mt-2">{(queryError as Error).message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add New Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Add Availability
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Schedule type</Label>
              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-4">
                <div>
                  <p className="text-sm font-semibold">Repeat weekly</p>
                  <p className="text-xs text-muted-foreground">Toggle on to create a recurring weekly slot.</p>
                </div>
                <Switch
                  checked={newAvailability.mode === "recurring"}
                  onCheckedChange={(checked) =>
                    setNewAvailability((prev) => ({
                      ...prev,
                      mode: checked ? "recurring" : "specific",
                      specificDate: checked ? undefined : prev.specificDate,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Allow bookings</Label>
              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-4">
                <span className="text-sm text-muted-foreground">
                  {newAvailability.isAvailable ? "Patients can book this slot" : "Marked as unavailable"}
                </span>
                <Switch
                  checked={newAvailability.isAvailable}
                  onCheckedChange={(checked) =>
                    setNewAvailability((prev) => ({
                      ...prev,
                      isAvailable: checked,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {newAvailability.mode === "recurring" ? (
              <div>
                <Label className="text-sm font-medium">Day of week</Label>
                <Select
                  value={newAvailability.dayOfWeek.toString()}
                  onValueChange={(value) =>
                    setNewAvailability((prev) => ({
                      ...prev,
                      dayOfWeek: parseInt(value),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_ISO.map((day) => (
                      <SelectItem key={day.iso} value={day.iso.toString()}>
                        {day.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2 rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-left text-sm font-medium shadow-sm transition hover:border-primary/60 hover:bg-primary/10"
                    >
                      <CalendarIcon className="h-4 w-4" />
                      {newAvailability.specificDate ? format(newAvailability.specificDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" sideOffset={12}>
                    <DayPickerCalendar
                      mode="single"
                      selected={newAvailability.specificDate}
                      onSelect={(date) => {
                        if (!date) return;
                        setNewAvailability((prev) => ({
                          ...prev,
                          specificDate: date,
                          dayOfWeek: getISODay(date),
                        }));
                        setSelectedOverviewMonth(startOfMonth(date));
                      }}
                      disabled={(date) => date < todayStart}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime" className="text-sm font-medium">Start time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={newAvailability.startTime}
                  onChange={(e) =>
                    setNewAvailability((prev) => ({
                      ...prev,
                      startTime: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="endTime" className="text-sm font-medium">End time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={newAvailability.endTime}
                  onChange={(e) =>
                    setNewAvailability((prev) => ({
                      ...prev,
                      endTime: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleAddAvailability}
              disabled={createAvailabilityMutation.isPending}
              className="min-w-[160px]"
            >
              <Save className="w-4 h-4 mr-2" />
              {createAvailabilityMutation.isPending ? "Saving..." : "Save slot"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Current Availability
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {availability.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium mb-2">No availability set</p>
              <p className="text-sm">Add a date or weekly slot to make yourself bookable.</p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Specific dates ({format(selectedOverviewMonth, "MMMM yyyy")})
                    </h3>
                  </div>
                  {specificAvailabilityForMonth.length > 0 ? (
                    <div className="space-y-3">
                      {specificAvailabilityForMonth.map((slot) => {
                        const displayDate = slot.specificDate
                          ? format(new Date(`${slot.specificDate}T00:00:00`), "PPP")
                          : "";
                        return (
                          <div
                            key={slot._id}
                            className="flex flex-col gap-4 rounded-lg border border-border/60 bg-card/80 p-4 shadow-sm transition hover:border-primary/40 hover:bg-card"
                          >
                            <div className="flex flex-wrap items-center gap-3">
                              <Badge variant="secondary" className={slot.isAvailable ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}>
                                {slot.isAvailable ? "Available" : "Blocked"}
                              </Badge>
                              <span className="font-semibold text-sm">{displayDate}</span>
                              <span className="text-xs text-muted-foreground">One-time slot</span>
                            </div>
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div className="flex items-center gap-2">
                                <Input
                                  type="time"
                                  value={slot.startTime}
                                  onChange={(e) => handleUpdateTime(slot._id, "startTime", e.target.value)}
                                  className="w-28 h-9"
                                  disabled={updateAvailabilityMutation.isPending}
                                />
                                <span className="text-sm text-muted-foreground">-</span>
                                <Input
                                  type="time"
                                  value={slot.endTime}
                                  onChange={(e) => handleUpdateTime(slot._id, "endTime", e.target.value)}
                                  className="w-28 h-9"
                                  disabled={updateAvailabilityMutation.isPending}
                                />
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={slot.isAvailable}
                                    onCheckedChange={(checked) => handleToggleAvailability(slot._id, checked)}
                                    disabled={updateAvailabilityMutation.isPending}
                                  />
                                  <span className="text-sm text-muted-foreground">
                                    {slot.isAvailable ? "Open" : "Blocked"}
                                  </span>
                                </div>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleDeleteAvailability(slot._id)}
                                  disabled={deleteAvailabilityMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No specific-date availability set for this month.</p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Weekly recurring</h3>
                  </div>
                  {recurringAvailability.length > 0 ? (
                    <div className="space-y-3">
                      {recurringAvailability.map((slot) => (
                        <div
                          key={slot._id}
                          className="flex flex-col gap-4 rounded-lg border border-border/60 bg-card/80 p-4 shadow-sm transition hover:border-primary/40 hover:bg-card"
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{getDayName(slot.dayOfWeek)}</Badge>
                            <span className="text-xs text-muted-foreground">Repeats every week</span>
                          </div>
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-2">
                              <Input
                                type="time"
                                value={slot.startTime}
                                onChange={(e) => handleUpdateTime(slot._id, "startTime", e.target.value)}
                                className="w-28 h-9"
                                disabled={updateAvailabilityMutation.isPending}
                              />
                              <span className="text-sm text-muted-foreground">-</span>
                              <Input
                                type="time"
                                value={slot.endTime}
                                onChange={(e) => handleUpdateTime(slot._id, "endTime", e.target.value)}
                                className="w-28 h-9"
                                disabled={updateAvailabilityMutation.isPending}
                              />
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={slot.isAvailable}
                                  onCheckedChange={(checked) => handleToggleAvailability(slot._id, checked)}
                                  disabled={updateAvailabilityMutation.isPending}
                                />
                                <span className="text-sm text-muted-foreground">
                                  {slot.isAvailable ? "Open" : "Blocked"}
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleDeleteAvailability(slot._id)}
                                disabled={deleteAvailabilityMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No weekly recurring availability configured.</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-border/60 bg-card/80 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-sm">Monthly overview</p>
                      <p className="text-xs text-muted-foreground">Select a day to prefill the form.</p>
                    </div>
                  </div>
                  <DayPickerCalendar
                    mode="single"
                    month={selectedOverviewMonth}
                    onMonthChange={setSelectedOverviewMonth}
                    selected={newAvailability.mode === "specific" ? newAvailability.specificDate : undefined}
                    onSelect={(date) => {
                      if (!date) return;
                      setNewAvailability((prev) => ({
                        ...prev,
                        mode: "specific",
                        specificDate: date,
                        dayOfWeek: getISODay(date),
                      }));
                      setSelectedOverviewMonth(startOfMonth(date));
                    }}
                    modifiers={{
                      available: monthOverview.available,
                      blocked: monthOverview.blocked,
                    }}
                    modifiersClassNames={{
                      available: "relative after:absolute after:left-1/2 after:top-[70%] after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-primary",
                      blocked: "opacity-40 text-destructive",
                    }}
                    disabled={(date) => date < todayStart}
                  />
                  <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary" /> Available day
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-muted" /> Blocked day
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}