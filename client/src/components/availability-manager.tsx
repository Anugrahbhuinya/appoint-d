import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Clock, Plus, Trash2, Save } from "lucide-react";

interface Availability {
  _id: string;
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

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
  });
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
    mutationFn: async (data: typeof newAvailability) => {
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

    createAvailabilityMutation.mutate(newAvailability);
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
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="day">Day of Week</Label>
              <Select
                value={newAvailability.dayOfWeek.toString()}
                onValueChange={(value) =>
                  setNewAvailability(prev => ({
                    ...prev,
                    dayOfWeek: parseInt(value)
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

            <div>
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={newAvailability.startTime}
                onChange={(e) =>
                  setNewAvailability(prev => ({
                    ...prev,
                    startTime: e.target.value
                  }))
                }
              />
            </div>

            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={newAvailability.endTime}
                onChange={(e) =>
                  setNewAvailability(prev => ({
                    ...prev,
                    endTime: e.target.value
                  }))
                }
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleAddAvailability}
                disabled={createAvailabilityMutation.isPending}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                {createAvailabilityMutation.isPending ? "Adding..." : "Add"}
              </Button>
            </div>
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
        <CardContent>
          {availability.length > 0 ? (
            <div className="space-y-3">
              {availability
                .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                .map((slot) => (
                  <div
                    key={slot._id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition"
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-24">
                        <span className="font-medium text-sm">
                          {getDayName(slot.dayOfWeek)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) =>
                            handleUpdateTime(slot._id, "startTime", e.target.value)
                          }
                          className="w-24 h-8"
                          disabled={updateAvailabilityMutation.isPending}
                        />
                        <span className="text-sm text-muted-foreground">-</span>
                        <Input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) =>
                            handleUpdateTime(slot._id, "endTime", e.target.value)
                          }
                          className="w-24 h-8"
                          disabled={updateAvailabilityMutation.isPending}
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={slot.isAvailable}
                          onCheckedChange={(checked) =>
                            handleToggleAvailability(slot._id, checked)
                          }
                          disabled={updateAvailabilityMutation.isPending}
                        />
                        <span className="text-sm whitespace-nowrap">
                          {slot.isAvailable ? "Available" : "Unavailable"}
                        </span>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteAvailability(slot._id)}
                        disabled={deleteAvailabilityMutation.isPending}
                        className="ml-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium mb-2">No availability set</p>
              <p className="text-sm">Add your working hours above to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}