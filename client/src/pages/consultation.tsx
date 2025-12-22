// FILE: src/pages/consultation.tsx
// This page handles the /consultation/:appointmentId?roomName=X route

import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { VideoConsultation } from "@/components/video-consultation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export default function ConsultationPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // ✅ STEP 1: Extract appointmentId from route params
  const [match, params] = useRoute("/consultation/:appointmentId");
  const appointmentId = match ? params?.appointmentId : null;

  // ✅ STEP 2: Extract roomName from query string
  const [roomName, setRoomName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, location] = useLocation();

  useEffect(() => {
    console.log("🔍 Consultation Page Mounted");
    console.log("   URL:", location);
    console.log("   Appointment ID from route:", appointmentId);

    if (!appointmentId) {
      console.error("❌ No appointment ID in route");
      setError("Missing appointment ID");
      setIsLoading(false);
      return;
    }

    // ✅ Extract roomName from query string using URLSearchParams
    try {
      const url = new URL(window.location.href);
      const room = url.searchParams.get("roomName");

      console.log("   Room name from query:", room);

      if (!room) {
        console.error("❌ No room name in query string");
        setError("Missing room name - video session not initialized.");
        setIsLoading(false);
        return;
      }

      setRoomName(room);
      setError(null);
      setIsLoading(false);

      console.log("✅ Consultation page ready");
      console.log("   appointmentId:", appointmentId);
      console.log("   roomName:", room);
    } catch (err) {
      console.error("❌ Error parsing URL:", err);
      setError("Failed to parse consultation parameters");
      setIsLoading(false);
    }
  }, [appointmentId, location]);

  // ✅ Handler for when call ends
  const handleCallEnd = (metrics: any) => {
    console.log("✅ Call ended with metrics:", metrics);
    // You can add additional logic here if needed
  };

  // ✅ Handler for when user exits the call
  const handleCallExit = () => {
    console.log("📴 User exiting consultation");
    if (user?.role === "doctor") {
      setLocation("/doctor");
    } else {
      setLocation("/patient");
    }
  };

  // ===== RENDER STATES =====

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="text-center max-w-md space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-destructive mb-2">Error</h1>
            <p className="text-muted-foreground">{error}</p>
          </div>
          <Button onClick={handleCallExit} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading || !roomName || !appointmentId) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-white font-medium">Connecting to secure server...</p>
        </div>
      </div>
    );
  }

  // ✅ Render video consultation component
  return (
    <VideoConsultation
      appointmentId={appointmentId}
      roomName={roomName}
      userRole={(user?.role === "doctor" ? "doctor" : "patient") as "doctor" | "patient"}
      onCallEnd={handleCallEnd}
      onCallExit={handleCallExit}
    />
  );
}