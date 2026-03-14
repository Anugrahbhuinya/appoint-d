import { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Clock, User } from "lucide-react"; 

// --- Doctor interface: FIXED to match top-level structure in patient-portal.tsx ---
interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  // ⭐ FIX 1: profilePicture moved to the top level
  profilePicture?: string; 
  profile: {
    specialization: string;
    experience: number;
    consultationFee: number;
    bio: string;
    rating: number;
    totalReviews: number;
    isApproved: boolean;
    // ⭐ NOTE: profilePicture removed from here (since it's now top level)
    gender?: 'male' | 'female' | 'other';
    clinicAddress?: {
      fullAddress: string;
      city: string;
      state: string;
      pincode: string;
      lat: string;
      lon: string;
    };
  };
}
// --- END ---

interface DoctorCardProps {
  doctor: Doctor;
  onBookAppointment?: (doctor: Doctor) => void;
}

const DoctorCard = forwardRef<HTMLDivElement, DoctorCardProps>(({ doctor, onBookAppointment }, ref) => {
  const avatarInitials = `${doctor.firstName?.[0] || ''}${doctor.lastName?.[0] || ''}`;
  // ⭐ FIX 2: Accessing the picture from the top level
  const profilePictureUrl = doctor.profilePicture; 
  const rating = doctor.profile.rating ? (doctor.profile.rating / 10).toFixed(1) : "N/A";

  // --- Logic for address and gender (unchanged) ---
  let displayAddress = "Location not specified";
  if (doctor.profile.clinicAddress) {
    const { city, state } = doctor.profile.clinicAddress;
    if (city && state) {
      displayAddress = `${city}, ${state}`;
    } else if (city) {
      displayAddress = city;
    } else if (state) {
      displayAddress = state;
    }
  }

  let displayGender = "";
  if (doctor.profile.gender) {
    displayGender = doctor.profile.gender.charAt(0).toUpperCase() + doctor.profile.gender.slice(1);
  }
  // --- END ---

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200" data-testid={`card-doctor-${doctor.id}`} ref={ref}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          
            {/* ⭐ AVATAR CONDITIONAL LOGIC (CLEANED) ⭐ */}
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
            {profilePictureUrl ? (
                // 🚀 RENDER IMAGE if URL/Base64 data exists
                <img 
                    src={profilePictureUrl} 
                    alt={`Dr. ${doctor.lastName} Profile`} 
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                />
            ) : (
                // 🎨 Fallback to Initials div
                <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                  <span className="text-primary font-semibold text-base">{avatarInitials}</span>
                </div>
            )}
          </div>
            {/* ---------------------------------------------------- */}
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <div>

                {/* --- Name and Badge --- */}
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold" data-testid={`text-doctor-name-${doctor.id}`}>
                    Dr. {doctor.firstName} {doctor.lastName}
                  </h3>

                  <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    Available
                  </Badge>
                </div>

                <p className="text-primary font-medium text-sm" data-testid={`text-specialization-${doctor.id}`}>
                  {doctor.profile.specialization}
                </p>
              </div>
              
              {doctor.profile.rating > 0 && (
                <div className="flex items-center space-x-1 bg-green-500/10 text-green-400 px-2 py-1 rounded-full text-xs">
                  <Star className="w-3 h-3 fill-current" />
                  <span data-testid={`text-rating-${doctor.id}`}>{rating}</span>
                </div>
              )}
            </div>

            <p className="text-sm text-muted-foreground mb-2" data-testid={`text-experience-${doctor.id}`}>
              {doctor.profile.experience} years experience
            </p>

            <p className="text-sm text-muted-foreground mb-3 line-clamp-2" data-testid={`text-bio-${doctor.id}`}>
              {doctor.profile.bio}
            </p>

            <div className="flex flex-wrap items-center justify-between mb-3 gap-y-2">
              <div className="flex items-center space-x-4 text-xs text-muted-foreground"> 
                
                <div className="flex items-center space-x-1">
                  <MapPin className="w-4 h-4" />
                  <span>{displayAddress}</span>
                </div>

                <div className="flex items-center space-x-1">
                  <span>₹{doctor.profile.consultationFee}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {displayGender && (
                  <Badge variant="secondary" className="text-xs">
                    <User className="w-3 h-3 mr-1" />
                    {displayGender}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex space-x-2">
              <Button 
                className="flex-1" 
                size="sm" 
                data-testid={`button-book-appointment-${doctor.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onBookAppointment?.(doctor);
                }}
              >
                Book Appointment
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

DoctorCard.displayName = "DoctorCard";

export default DoctorCard;