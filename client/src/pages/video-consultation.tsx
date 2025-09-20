import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Navigation from "@/components/navigation";
import VideoCallInterface from "@/components/video-call-interface";
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Monitor, 
  MonitorOff,
  MessageSquare, 
  FileText, 
  Clock,
  User,
  Calendar,
  Settings
} from "lucide-react";

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  duration: number;
  type: string;
  status: string;
  consultationFee: number;
  notes?: string;
  prescription?: string;
}

interface CallControls {
  video: boolean;
  audio: boolean;
  screen: boolean;
}

export default function VideoConsultation() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [callControls, setCallControls] = useState<CallControls>({
    video: true,
    audio: true,
    screen: false,
  });
  const [callDuration, setCallDuration] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [consultationNotes, setConsultationNotes] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{id: string, sender: string, message: string, timestamp: Date}>>([]);
  const callStartTime = useRef<Date | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect if not authenticated
  if (!user) {
    setLocation("/auth");
    return null;
  }

  const { data: appointment, isLoading } = useQuery<Appointment>({
    queryKey: ["/api/appointments", appointmentId],
    queryFn: async () => {
      const res = await fetch(`/api/appointments/${appointmentId}`);
      if (!res.ok) throw new Error("Appointment not found");
      return res.json();
    },
    enabled: !!appointmentId,
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async (updates: Partial<Appointment>) => {
      const res = await apiRequest("PUT", `/api/appointments/${appointmentId}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments", appointmentId] });
    },
  });

  useEffect(() => {
    if (isCallActive && !durationInterval.current) {
      callStartTime.current = new Date();
      durationInterval.current = setInterval(() => {
        if (callStartTime.current) {
          const elapsed = Math.floor((Date.now() - callStartTime.current.getTime()) / 1000);
          setCallDuration(elapsed);
        }
      }, 1000);
    }

    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [isCallActive]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleControl = (control: keyof CallControls) => {
    setCallControls(prev => ({
      ...prev,
      [control]: !prev[control]
    }));
  };

  const startCall = () => {
    setIsCallActive(true);
    toast({
      title: "Call Started",
      description: "Video consultation is now active.",
    });
  };

  const endCall = async () => {
    setIsCallActive(false);
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }

    // Update appointment status to completed
    try {
      await updateAppointmentMutation.mutateAsync({
        status: "completed",
        notes: consultationNotes,
      });

      toast({
        title: "Call Ended",
        description: "Consultation completed successfully.",
      });

      // Redirect after a delay
      setTimeout(() => {
        setLocation(user.role === "doctor" ? "/doctor" : "/patient");
      }, 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update appointment status.",
        variant: "destructive",
      });
    }
  };

  const addChatMessage = (message: string) => {
    const newMessage = {
      id: Date.now().toString(),
      sender: user.role === "doctor" ? "Doctor" : "Patient",
      message,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, newMessage]);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading consultation...</p>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Appointment Not Found</h1>
          <p className="text-muted-foreground">The requested consultation could not be found.</p>
          <Button 
            className="mt-4" 
            onClick={() => setLocation(user.role === "doctor" ? "/doctor" : "/patient")}
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Video Consultation</h1>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(appointment.appointmentDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(appointment.appointmentDate).toLocaleTimeString()}</span>
                  </div>
                  <Badge className={isCallActive ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20"}>
                    {isCallActive ? "In Call" : "Waiting"}
                  </Badge>
                </div>
              </div>
              
              {isCallActive && (
                <div className="text-center">
                  <div className="text-2xl font-mono font-bold" data-testid="call-duration">
                    {formatDuration(callDuration)}
                  </div>
                  <p className="text-sm text-muted-foreground">Call Duration</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Video Interface */}
            <div className="lg:col-span-3">
              <Card className="h-[600px]" data-testid="video-interface">
                <CardContent className="p-0 h-full">
                  <VideoCallInterface 
                    isCallActive={isCallActive}
                    callControls={callControls}
                    userRole={user.role as "doctor" | "patient"}
                    participantName={user.role === "doctor" ? "Patient" : "Dr. " + (user.firstName || "Doctor")}
                  />
                </CardContent>
              </Card>

              {/* Call Controls */}
              <div className="flex items-center justify-center space-x-4 mt-4">
                {!isCallActive ? (
                  <Button
                    size="lg"
                    onClick={startCall}
                    className="bg-green-500 hover:bg-green-600"
                    data-testid="button-start-call"
                  >
                    <Video className="w-5 h-5 mr-2" />
                    Start Call
                  </Button>
                ) : (
                  <>
                    <Button
                      variant={callControls.audio ? "default" : "destructive"}
                      size="lg"
                      onClick={() => toggleControl('audio')}
                      data-testid="button-toggle-audio"
                    >
                      {callControls.audio ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                    </Button>

                    <Button
                      variant={callControls.video ? "default" : "destructive"}
                      size="lg"
                      onClick={() => toggleControl('video')}
                      data-testid="button-toggle-video"
                    >
                      {callControls.video ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                    </Button>

                    <Button
                      variant={callControls.screen ? "default" : "outline"}
                      size="lg"
                      onClick={() => toggleControl('screen')}
                      data-testid="button-toggle-screen"
                    >
                      {callControls.screen ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                    </Button>

                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setShowChat(!showChat)}
                      data-testid="button-toggle-chat"
                    >
                      <MessageSquare className="w-5 h-5" />
                      {chatMessages.length > 0 && (
                        <span className="ml-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                          {chatMessages.length}
                        </span>
                      )}
                    </Button>

                    <Button
                      variant="destructive"
                      size="lg"
                      onClick={endCall}
                      data-testid="button-end-call"
                    >
                      <PhoneOff className="w-5 h-5" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Participant Info */}
              <Card data-testid="participant-info">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {user.role === "doctor" ? "Patient Information" : "Doctor Information"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {user.role === "doctor" ? "Patient" : "Dr. " + (user.firstName || "Doctor")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {user.role === "doctor" ? "General Consultation" : appointment.notes || "Cardiologist"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span>{appointment.duration} minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span>Video Call</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fee:</span>
                      <span>₹{appointment.consultationFee}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Chat Messages */}
              {showChat && (
                <Card data-testid="chat-panel">
                  <CardHeader>
                    <CardTitle className="text-lg">Chat</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 mb-4 max-h-40 overflow-y-auto">
                      {chatMessages.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No messages yet
                        </p>
                      ) : (
                        chatMessages.map((msg) => (
                          <div key={msg.id} className="text-sm">
                            <div className="flex items-center space-x-1 mb-1">
                              <span className="font-medium text-xs">{msg.sender}</span>
                              <span className="text-muted-foreground text-xs">
                                {msg.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-muted-foreground">{msg.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="Type a message..."
                        className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                            addChatMessage(e.currentTarget.value.trim());
                            e.currentTarget.value = '';
                          }
                        }}
                        data-testid="input-chat-message"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Consultation Notes */}
              {user.role === "doctor" && (
                <Card data-testid="consultation-notes">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <FileText className="w-5 h-5" />
                      <span>Consultation Notes</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Patient symptoms, diagnosis, treatment plan..."
                      value={consultationNotes}
                      onChange={(e) => setConsultationNotes(e.target.value)}
                      className="min-h-32 resize-none"
                      data-testid="textarea-notes"
                    />
                    <Button 
                      className="w-full mt-3" 
                      variant="outline"
                      disabled={!consultationNotes.trim()}
                      data-testid="button-save-notes"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Save Notes
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Technical Support */}
              <Card data-testid="technical-support">
                <CardContent className="p-4">
                  <div className="text-center">
                    <Settings className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Having technical issues?
                    </p>
                    <Button variant="outline" size="sm" data-testid="button-technical-support">
                      Get Help
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
