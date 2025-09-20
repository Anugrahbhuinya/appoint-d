import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Wifi, WifiOff, Video, VideoOff } from "lucide-react";

interface VideoCallInterfaceProps {
  isCallActive: boolean;
  callControls: {
    video: boolean;
    audio: boolean;
    screen: boolean;
  };
  userRole: "doctor" | "patient";
  participantName: string;
}

export default function VideoCallInterface({ 
  isCallActive, 
  callControls, 
  userRole,
  participantName 
}: VideoCallInterfaceProps) {
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected");
  const [isVideoLoading, setIsVideoLoading] = useState(false);

  useEffect(() => {
    if (isCallActive) {
      setConnectionStatus("connecting");
      setIsVideoLoading(true);
      
      // Simulate connection process
      const connectTimer = setTimeout(() => {
        setConnectionStatus("connected");
        setIsVideoLoading(false);
      }, 2000);

      return () => clearTimeout(connectTimer);
    } else {
      setConnectionStatus("disconnected");
      setIsVideoLoading(false);
    }
  }, [isCallActive]);

  const ConnectionIndicator = () => (
    <div className="absolute top-4 left-4 z-20">
      <Badge 
        className={
          connectionStatus === "connected" 
            ? "bg-green-500/10 text-green-400 border-green-500/20" 
            : connectionStatus === "connecting"
            ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
            : "bg-red-500/10 text-red-400 border-red-500/20"
        }
        data-testid="connection-status"
      >
        {connectionStatus === "connected" ? (
          <><Wifi className="w-3 h-3 mr-1" />Connected</>
        ) : connectionStatus === "connecting" ? (
          <><div className="w-3 h-3 mr-1 border border-orange-400 border-t-transparent rounded-full animate-spin" />Connecting</>
        ) : (
          <><WifiOff className="w-3 h-3 mr-1" />Disconnected</>
        )}
      </Badge>
    </div>
  );

  const VideoPlaceholder = ({ label, isMain = false }: { label: string; isMain?: boolean }) => (
    <div 
      className={`${isMain ? 'w-full h-full' : 'w-48 h-36'} bg-gradient-to-br from-muted to-muted/50 rounded-lg flex items-center justify-center relative overflow-hidden`}
      data-testid={`video-placeholder-${label.toLowerCase().replace(' ', '-')}`}
    >
      {isVideoLoading ? (
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading video...</p>
        </div>
      ) : !callControls.video ? (
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center">
            <VideoOff className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Video disabled</p>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm font-medium">{label}</p>
        </div>
      )}
      
      {/* Video overlay info */}
      {isMain && (
        <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">
            {userRole === "doctor" ? "Patient" : "Cardiologist"}
          </p>
        </div>
      )}
    </div>
  );

  if (!isCallActive) {
    return (
      <div className="w-full h-full bg-muted/20 rounded-2xl flex items-center justify-center" data-testid="call-waiting">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Video className="w-12 h-12 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Ready for Video Consultation</h3>
            <p className="text-muted-foreground">
              Click "Start Call" to begin your consultation with {participantName}
            </p>
          </div>
          <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full" />
              <span>Camera Ready</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full" />
              <span>Microphone Ready</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-background rounded-2xl overflow-hidden" data-testid="video-call-active">
      <ConnectionIndicator />
      
      {/* Main Video Area */}
      <div className="absolute inset-4">
        <VideoPlaceholder label={participantName} isMain />
      </div>

      {/* Self Video (Picture-in-Picture) */}
      <div className="absolute top-4 right-4 z-10">
        <VideoPlaceholder label="You" />
      </div>

      {/* Screen Share Indicator */}
      {callControls.screen && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
            <Video className="w-3 h-3 mr-1" />
            Screen Sharing
          </Badge>
        </div>
      )}

      {/* Audio Indicator */}
      {!callControls.audio && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20">
          <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
            Microphone Muted
          </Badge>
        </div>
      )}

      {/* Call Quality Indicator */}
      <div className="absolute bottom-4 right-4 z-20">
        <div className="flex items-center space-x-1 bg-background/80 backdrop-blur-sm rounded-lg px-2 py-1">
          <div className="flex space-x-0.5">
            <div className="w-1 h-3 bg-green-400 rounded-full" />
            <div className="w-1 h-4 bg-green-400 rounded-full" />
            <div className="w-1 h-2 bg-muted rounded-full" />
            <div className="w-1 h-1 bg-muted rounded-full" />
          </div>
          <span className="text-xs text-muted-foreground ml-1">Good</span>
        </div>
      </div>

      {/* Waiting for participant overlay */}
      {connectionStatus === "connecting" && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-30">
          <Card className="bg-card/90">
            <CardContent className="p-6 text-center">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Connecting to {participantName}</h3>
              <p className="text-sm text-muted-foreground">
                Please wait while we establish the connection...
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
