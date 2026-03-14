import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter"; 
import { Video, X, Users, Send, MessageSquare, ClipboardList, Stethoscope, Save, Mic, MicOff, VideoOff, Camera } from "lucide-react";
import Twilio, { LocalTrack, Room, RemoteParticipant, LocalVideoTrack, LocalDataTrack, RemoteDataTrack, LocalAudioTrack } from "twilio-video";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";

interface VideoConsultationProps {
    appointmentId: string;
    roomName: string;
    userRole: "doctor" | "patient";
    onCallEnd?: (metrics: any) => void;
    onCallExit?: () => void;
}

export const VideoConsultation: React.FC<VideoConsultationProps> = ({
    appointmentId,
    roomName,
    userRole,
    onCallEnd,
    onCallExit
}) => {
    const { user } = useAuth();
    const [, setLocation] = useLocation();
    
    const [room, setRoom] = useState<Room | null>(null);
    const [loading, setLoading] = useState(true);
    const [participantCount, setParticipantCount] = useState(1);
    const [callElapsedTime, setCallElapsedTime] = useState(0);
    const [localDataTrack, setLocalDataTrack] = useState<LocalDataTrack | null>(null);
    const [remoteParticipant, setRemoteParticipant] = useState<RemoteParticipant | null>(null);
    const [showSummaryForm, setShowSummaryForm] = useState(false);
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isAudioOnly, setIsAudioOnly] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState("");
    
    // ✅ IMPORTANT: Initialize refs WITHOUT null
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const localTracksRef = useRef<LocalTrack[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    const [summaryData, setSummaryData] = useState({
        diagnosis: "",
        notes: "",
        prescription: "",
        followUpDate: ""
    });

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    useEffect(() => {
        if (!loading && room) {
            const timer = setInterval(() => setCallElapsedTime(prev => prev + 1), 1000);
            return () => clearInterval(timer);
        }
    }, [loading, room]);

    const toggleMic = () => {
        const audioTrack = localTracksRef.current.find(t => t.kind === 'audio') as LocalAudioTrack;
        if (audioTrack) {
            if (isMicMuted) audioTrack.enable();
            else audioTrack.disable();
            setIsMicMuted(!isMicMuted);
        }
    };

    const toggleVideo = () => {
        const videoTrack = localTracksRef.current.find(t => t.kind === 'video') as LocalVideoTrack;
        if (videoTrack) {
            if (isVideoOff) videoTrack.enable();
            else videoTrack.disable();
            setIsVideoOff(!isVideoOff);
        }
    };

    const handleParticipantConnected = useCallback((participant: RemoteParticipant) => {
        console.log("👤 Participant connected:", participant.sid);
        setRemoteParticipant(participant);
        setParticipantCount(prev => prev + 1);

        participant.on("trackSubscribed", (track) => {
            if (track.kind === "video" && remoteVideoRef.current) {
                track.attach(remoteVideoRef.current);
                console.log("✅ Remote video attached");
            }
            if (track.kind === "audio" && remoteVideoRef.current) {
                track.attach(remoteVideoRef.current);
                console.log("✅ Remote audio attached");
            }
            if (track.kind === "data") {
                (track as RemoteDataTrack).on("message", (data: string) => {
                    const received = JSON.parse(data);
                    setMessages(prev => [...prev, { ...received, isMe: false }]);
                });
            }
        });
    }, []);

    // ✅ Main connection effect
    useEffect(() => {
        if (!appointmentId || !roomName) return;
        let activeRoom: Room | null = null;

        const connect = async () => {
            try {
                console.log("🔐 Getting video token...");
                const res = await apiRequest("POST", "/api/video-token", { appointmentId, roomName });
                const { token } = await res.json();
                console.log("✅ Token received");
                
                const dataTrack = new LocalDataTrack();
                setLocalDataTrack(dataTrack);

                let tracks: LocalTrack[] = [];
                
                try {
                    console.log("🎥 Creating local tracks...");
                    tracks = await Twilio.createLocalTracks({ 
                        audio: true, 
                        video: { name: "camera" } 
                    });
                    console.log("✅ Tracks created:", tracks.map((t: any) => t.kind));
                } catch (videoErr: any) {
                    console.warn("⚠️ Video error:", videoErr.name);
                    
                    if (videoErr.name === 'NotReadableError') {
                        setIsAudioOnly(true);
                        try {
                            tracks = await Twilio.createLocalTracks({ audio: true });
                            console.log("✅ Audio-only fallback");
                            alert("Camera in use. Continuing with audio only.");
                        } catch (audioErr) {
                            console.error("❌ Audio failed too:", audioErr);
                            setLoading(false);
                            return;
                        }
                    } else {
                        setIsAudioOnly(true);
                        try {
                            tracks = await Twilio.createLocalTracks({ audio: true });
                            console.log("✅ Fallback to audio-only");
                        } catch (fallbackErr) {
                            console.error("❌ Fallback failed:", fallbackErr);
                            setLoading(false);
                            return;
                        }
                    }
                }
                
                localTracksRef.current = tracks;

                console.log("🔗 Connecting to Twilio...");
                activeRoom = await Twilio.connect(token, {
                    name: roomName,
                    tracks: [...tracks, dataTrack],
                });
                console.log("✅ Connected to Twilio");

                setRoom(activeRoom);
                setLoading(false);

                // ✅ CRITICAL: Attach video AFTER state is set
                // This ensures video element exists
                requestAnimationFrame(() => {
                    if (localVideoRef.current) {
                        const vTrack = tracks.find(t => t.kind === 'video') as LocalVideoTrack;
                        if (vTrack) {
                            try {
                                vTrack.attach(localVideoRef.current);
                                console.log("✅ Local video attached");
                            } catch (err) {
                                console.warn("⚠️ Video attach failed:", err);
                            }
                        }
                    } else {
                        console.warn("⚠️ Video element still null");
                    }
                });
                
                activeRoom.participants.forEach(handleParticipantConnected);
                activeRoom.on("participantConnected", handleParticipantConnected);
                activeRoom.on("participantDisconnected", () => {
                    setRemoteParticipant(null);
                    setParticipantCount(prev => prev - 1);
                });
            } catch (err) { 
                console.error("❌ Connection error:", err);
                setLoading(false); 
            }
        };

        connect();
        return () => { 
            activeRoom?.disconnect(); 
            localTracksRef.current.forEach(t => (t as any).stop?.());
        };
    }, [appointmentId, roomName, handleParticipantConnected]);

    const sendChatMessage = () => {
        if (!chatInput.trim() || !localDataTrack) return;
        const msg = { 
            text: chatInput, 
            author: user?.firstName || "User", 
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        };
        localDataTrack.send(JSON.stringify(msg));
        setMessages(prev => [...prev, { ...msg, isMe: true }]);
        setChatInput("");
    };

    if (loading) return (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center text-white">
            <Video className="animate-pulse text-primary h-12 w-12 mb-4" />
            <p className="text-sm">Connecting...</p>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
            {/* Header */}
            <div className="h-16 border-b bg-card px-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-xs font-bold uppercase">Live</span>
                    </div>
                    <span className="font-mono text-sm">{new Date(callElapsedTime * 1000).toISOString().substr(14, 5)}</span>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={toggleMic} className={isMicMuted ? "text-red-500" : ""}>
                        {isMicMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="icon" onClick={toggleVideo} className={isVideoOff ? "text-red-500" : ""}>
                        {isVideoOff ? <VideoOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                    </Button>
                    <div className="w-px h-6 bg-border mx-2" />
                    {userRole === "doctor" && <Button variant="outline" size="sm"><ClipboardList className="h-4 w-4 mr-2" />Notes</Button>}
                    <Button variant="destructive" size="sm" onClick={() => setLocation(userRole === "doctor" ? "/doctor" : "/patient")}><X className="h-4 w-4 mr-2" />End</Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden bg-slate-950">
                {/* Video Grid */}
                <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Remote Video */}
                    <div className="relative rounded-lg bg-slate-900 border border-white/10 overflow-hidden">
                        <video 
                            ref={remoteVideoRef} 
                            className="w-full h-full object-cover bg-black" 
                            autoPlay 
                            playsInline 
                        />
                        {participantCount < 2 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80">
                                <Users className="h-10 w-10 text-primary/50 mb-2" />
                                <p className="text-white text-sm">Waiting for {userRole === 'doctor' ? 'patient' : 'doctor'}...</p>
                            </div>
                        )}
                    </div>

                    {/* Local Video */}
                    <div className="relative rounded-lg bg-slate-900 border border-white/10 overflow-hidden">
                        <video 
                            ref={localVideoRef} 
                            className="w-full h-full object-cover bg-black"
                            autoPlay 
                            muted 
                            playsInline 
                        />
                        {isAudioOnly && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800/80">
                                <Mic className="h-12 w-12 text-amber-500/70" />
                                <p className="text-white text-xs mt-2">Audio Only</p>
                            </div>
                        )}
                        <div className="absolute top-3 left-3"><Badge className="bg-blue-600">You</Badge></div>
                    </div>
                </div>

                {/* Chat Sidebar */}
                <div className="w-80 border-l bg-card flex flex-col">
                    <div className="p-4 border-b text-xs font-bold uppercase">Chat</div>
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-3">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-xs p-2 rounded text-xs ${msg.isMe ? 'bg-primary text-white' : 'bg-muted text-black'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            <div ref={scrollRef} />
                        </div>
                    </ScrollArea>
                    <div className="p-3 border-t">
                        <form onSubmit={(e) => { e.preventDefault(); sendChatMessage(); }} className="flex gap-2">
                            <Input placeholder="Message..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} className="text-xs h-8" />
                            <Button type="submit" size="sm"><Send className="h-3 w-3" /></Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoConsultation;