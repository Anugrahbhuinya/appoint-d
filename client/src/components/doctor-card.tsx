import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Clock, Video, MessageCircle } from "lucide-react";

interface DoctorCardProps {
  doctor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profile: {
      specialization: string;
      experience: number;
      consultationFee: number;
      bio: string;
      rating: number;
      totalReviews: number;
      isApproved: boolean;
    };
  };
}

export default function DoctorCard({ doctor }: DoctorCardProps) {
  const avatarInitials = `${doctor.firstName?.[0] || ''}${doctor.lastName?.[0] || ''}`;
  const rating = doctor.profile.rating ? (doctor.profile.rating / 10).toFixed(1) : "N/A";

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200" data-testid={`card-doctor-${doctor.id}`}>
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
            <span className="text-primary font-semibold text-lg">{avatarInitials}</span>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-lg font-semibold" data-testid={`text-doctor-name-${doctor.id}`}>
                  Dr. {doctor.firstName} {doctor.lastName}
                </h3>
                <p className="text-primary font-medium" data-testid={`text-specialization-${doctor.id}`}>
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

            <p className="text-sm text-muted-foreground mb-4 line-clamp-2" data-testid={`text-bio-${doctor.id}`}>
              {doctor.profile.bio}
            </p>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <MapPin className="w-4 h-4" />
                  <span>Ranchi</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>₹{doctor.profile.consultationFee}</span>
                </div>
                <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                  <Clock className="w-3 h-3 mr-1" />
                  Available
                </Badge>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button className="flex-1" data-testid={`button-book-appointment-${doctor.id}`}>
                Book Appointment
              </Button>
              <Button variant="outline" size="sm" data-testid={`button-video-${doctor.id}`}>
                <Video className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" data-testid={`button-chat-${doctor.id}`}>
                <MessageCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
