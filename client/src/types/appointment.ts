// File: src/types/appointment.ts

export interface Appointment {
    _id?: string;
    id?: string;
    patientId: string;
    doctorId: string;
    appointmentDate: string;
    duration: number;
    type: "video" | "in-person";
    status: "scheduled" | "completed" | "cancelled" | "no-show" | "awaiting_payment" | "confirmed" | "pending" | "in-progress";
    consultationFee: number;
    notes?: string;
    prescription?: string;
    prescriptionFile?: string;
    createdAt?: string;
    
    // Video call related
    videoSessionId?: string;
    roomName?: string; // ✅ ADD THIS
    callStartedAt?: string;
    callEndedAt?: string;
    callDuration?: number;
    doctorJoinedAt?: string;
    patientJoinedAt?: string;
    recordingUrl?: string;
    callQuality?: any;
    participantStats?: any;
}