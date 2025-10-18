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

const DAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];

export default function AvailabilityManager() {
  const [newAvailability, setNewAvailability] = useState({
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "17:00",
    isAvailable: true,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: availability = [], isLoading } = useQuery<Availability[]>({
    queryKey: ["/api/doctor/availability"],
  });

  const createAvailabilityMutation = useMutation({
    mutationFn: async (data: typeof newAvailability) => {
      const res = await apiRequest("POST", "/api/doctor/availability", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctor/availability"] });
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
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctor/availability"] });
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
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctor/availability"] });
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
    createAvailabilityMutation.mutate(newAvailability);
  };

  const handleToggleAvailability = (id: string, isAvailable: boolean) => {
    updateAvailabilityMutation.mutate({ id, data: { isAvailable } });
  };

  const handleDeleteAvailability = (id: string) => {
    deleteAvailabilityMutation.mutate(id);
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
                onValueChange={(value) => setNewAvailability(prev => ({ ...prev, dayOfWeek: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((day, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {day}
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
                onChange={(e) => setNewAvailability(prev => ({ ...prev, startTime: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={newAvailability.endTime}
                onChange={(e) => setNewAvailability(prev => ({ ...prev, endTime: e.target.value }))}
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleAddAvailability}
                disabled={createAvailabilityMutation.isPending}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                Add
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
              {availability.map((slot) => (
                <div
                  key={slot._id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-24">
                      <span className="font-medium">{DAYS[slot.dayOfWeek]}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">
                        {slot.startTime} - {slot.endTime}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={slot.isAvailable}
                        onCheckedChange={(checked) => handleToggleAvailability(slot._id, checked)}
                      />
                      <span className="text-sm">
                        {slot.isAvailable ? "Available" : "Unavailable"}
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteAvailability(slot._id)}
                      disabled={deleteAvailabilityMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No availability set. Add your working hours above.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
