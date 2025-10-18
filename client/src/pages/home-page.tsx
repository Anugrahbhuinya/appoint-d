import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import Navigation from "@/components/navigation";
import DoctorCard from "@/components/doctor-card";
import { Button } from "@/components/ui/button";
import { Waves } from "@/components/ui/waves-background";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Heart, Video, Shield, Users, Clock, Star, Search, MapPin, DollarSign, HeartPulse } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { isValid, parseISO, format } from "date-fns";

interface Doctor {
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
}

export default function HomePage() {
  const { user } = useAuth();
  const [preferredDate, setPreferredDate] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dateError, setDateError] = useState("");
  
  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ["/api/doctors"],
  });

  const featuredDoctors = doctors.slice(0, 3);

  // Validator for preferred date
  function validatePreferredDate(dateStr: string) {
    if (!dateStr) return "";
    // Regex for YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return "Enter date as YYYY-MM-DD";
    const parsed = parseISO(dateStr);
    if (!isValid(parsed)) return "Invalid date";
    const today = new Date();
    today.setHours(0,0,0,0);
    if (parsed < today) return "Date cannot be in the past";
    return "";
  }

  const handleDateChange = (dateStr: string) => {
    setPreferredDate(dateStr);
    setDateError(validatePreferredDate(dateStr));
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <div className="fixed inset-0 z-0 opacity-50">
        <Waves
          lineColor="rgba(99, 102, 241, 0.3)"
          backgroundColor="transparent"
          waveSpeedX={0.02}
          waveSpeedY={0.01}
          waveAmpX={40}
          waveAmpY={20}
          friction={0.9}
          tension={0.01}
          maxCursorMove={120}
          xGap={12}
          yGap={36}
        />
      </div>
      <Navigation />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-background/50 z-10" />
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{
            backgroundImage: "url('https://unsplash.com/photos/a-green-heart-beat-on-a-black-background-oCSol-lBtVA')"
          }}
        />
        
        <div className="relative z-20 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div data-testid="hero-content">
              <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
                Trusted doctors of <span className="text-primary">Ranchi</span>, available online
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl">
                Connect with certified healthcare professionals from the comfort of your home. 
                Book appointments, consult online, and manage your health records seamlessly.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link href={user ? "/patient" : "/auth"}>
                  <Button size="lg" variant="default" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground" data-testid="button-find-doctors">
                    <Search className="mr-2 h-5 w-5" />
                    Find Doctors
                  </Button>
                </Link>
                <Link href={user ? (user.role === "doctor" ? "/doctor" : "/auth") : "/auth"}>
                  <Button variant="outline" size="lg" className="w-full sm:w-auto border-primary text-primary hover:bg-primary/10" data-testid="button-join-doctor">
                    <Users className="mr-2 h-5 w-5" />
                    Join as Doctor
                  </Button>
                </Link>
              </div>

              <div className="flex items-center space-x-8 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>Verified Doctors</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>24/7 Support</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Video className="h-4 w-4 text-primary" />
                  <span>Video Consultation</span>
                </div>
              </div>
            </div>

            <div className="lg:justify-self-end">
              <Card className="max-w-lg w-full backdrop-blur-sm bg-card/80" data-testid="quick-book-form">
                <CardContent className="p-8">
                  <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <HeartPulse className="w-6 h-6 text-primary mr-2" />
                    Quick Book Appointment
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Select Specialization</label>
                      <Select>
                        <SelectTrigger data-testid="select-specialization">
                          <SelectValue placeholder="Choose specialization" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gp">General Physician</SelectItem>
                          <SelectItem value="dermatology">Dermatology</SelectItem>
                          <SelectItem value="psychiatry">Psychiatry</SelectItem>
                          <SelectItem value="gynaecology">Gynaecology</SelectItem>
                          <SelectItem value="pediatrics">Pediatrics</SelectItem>
                          <SelectItem value="dietetics">Dietetics</SelectItem>
                          <SelectItem value="ent">ENT Specialists</SelectItem>
                          <SelectItem value="urology">Urology</SelectItem>
                          <SelectItem value="gastroenterology">Gastroenterology</SelectItem>
                          <SelectItem value="endocrinology">Endocrinology</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Preferred Date</label>
                      <div className="flex items-center gap-2 relative z-[60]">
                        <Input
                          type="text"
                          placeholder="YYYY-MM-DD"
                          value={preferredDate}
                          onChange={e => {
                            setPreferredDate(e.target.value);
                            setDateError(validatePreferredDate(e.target.value));
                          }}
                          onBlur={e => setDateError(validatePreferredDate(e.target.value))}
                          data-testid="input-date"
                          min={format(new Date(), "yyyy-MM-dd")}
                          maxLength={10}
                          inputMode="numeric"
                          pattern="\\d{4}-\\d{2}-\\d{2}"
                          autoComplete="off"
                        />
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="ml-1 bg-primary hover:bg-primary/90 z-[61]"
                              aria-label="Pick date"
                            >
                              <CalendarIcon className="h-5 w-5 text-white" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-auto min-w-[320px] p-0 z-[70] bg-background border shadow-xl">
                            <Calendar
                              mode="single"
                              selected={preferredDate && isValid(parseISO(preferredDate)) ? parseISO(preferredDate) : undefined}
                              onSelect={date => {
                                if (date) {
                                  const formatted = format(date, "yyyy-MM-dd");
                                  setPreferredDate(formatted);
                                  setDateError(validatePreferredDate(formatted));
                                  setCalendarOpen(false);
                                }
                              }}
                              disabled={date => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      {dateError && (
                        <p className="text-red-500 text-xs mt-1">{dateError}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Preferred Time</label>
                      <Select>
                        <SelectTrigger data-testid="select-time">
                          <SelectValue placeholder="Choose time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="morning">Morning (9AM - 12PM)</SelectItem>
                          <SelectItem value="afternoon">Afternoon (12PM - 5PM)</SelectItem>
                          <SelectItem value="evening">Evening (5PM - 8PM)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Link href={user ? "/patient" : "/auth"}>
                      <Button 
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" 
                        size="lg" 
                        data-testid="button-find-available"
                        disabled={!!dateError || !preferredDate}
                      >
                        Find Available Doctors
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card/30" data-testid="features-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose appoint'd?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Your health is our priority. We provide comprehensive healthcare solutions with cutting-edge technology.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: "Verified Doctors",
                description: "All our healthcare professionals are verified and licensed practitioners with proven expertise.",
              },
              {
                icon: Video,
                title: "Video Consultations", 
                description: "High-quality video calls with secure, HIPAA-compliant technology for remote consultations.",
              },
              {
                icon: Heart,
                title: "Digital Records",
                description: "Secure storage and easy access to your medical records, prescriptions, and health data.",
              },
              {
                icon: Clock,
                title: "Flexible Scheduling",
                description: "Book, reschedule, or cancel appointments easily with our intelligent scheduling system.",
              },
              {
                icon: Shield,
                title: "Secure & Private",
                description: "End-to-end encryption and compliance with healthcare privacy regulations for your safety.",
              },
              {
                icon: DollarSign,
                title: "Secure Payments",
                description: "Multiple payment options with secure processing and transparent pricing.",
              },
            ].map((feature, index) => (
              <Card key={index} className="backdrop-blur-sm bg-card/80 hover:shadow-lg transition-all duration-200" data-testid={`feature-card-${index}`}>
                <CardContent className="p-6">
                  <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Doctors Section */}
      {featuredDoctors.length > 0 && (
        <section className="py-20" data-testid="featured-doctors-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Featured Doctors</h2>
              <p className="text-muted-foreground">Meet some of our top-rated healthcare professionals</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredDoctors.map((doctor) => (
                <DoctorCard key={doctor.id} doctor={doctor} />
              ))}
            </div>

            <div className="text-center mt-8">
              <Link href={user ? "/patient" : "/auth"}>
                <LiquidButton variant="outline" data-testid="button-view-all-doctors">
                  View All Doctors
                </LiquidButton>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Stats Section */}
      <section className="py-16 bg-card/30" data-testid="stats-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <Card className="backdrop-blur-sm bg-card/80" data-testid="stat-doctors">
              <CardContent className="p-6">
                <div className="text-3xl font-bold text-primary mb-2">500+</div>
                <div className="text-muted-foreground">Verified Doctors</div>
              </CardContent>
            </Card>
            <Card className="backdrop-blur-sm bg-card/80" data-testid="stat-patients">
              <CardContent className="p-6">
                <div className="text-3xl font-bold text-primary mb-2">10,000+</div>
                <div className="text-muted-foreground">Happy Patients</div>
              </CardContent>
            </Card>
            <Card className="backdrop-blur-sm bg-card/80" data-testid="stat-consultations">
              <CardContent className="p-6">
                <div className="text-3xl font-bold text-primary mb-2">25,000+</div>
                <div className="text-muted-foreground">Consultations</div>
              </CardContent>
            </Card>
            <Card className="backdrop-blur-sm bg-card/80" data-testid="stat-availability">
              <CardContent className="p-6">
                <div className="text-3xl font-bold text-primary mb-2">24/7</div>
                <div className="text-muted-foreground">Availability</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-12" data-testid="footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Heart className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold text-primary">appoint'd</span>
              </div>
              <p className="text-sm text-foreground/80 mb-4">
                Connecting patients with trusted healthcare professionals in Ranchi and surrounding areas.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-bold text-foreground mb-4">For Patients</h4>
              <div className="space-y-3 text-sm">
                <Link href={user ? "/patient" : "/auth"}>
                  <Button variant="ghost" className="w-full justify-start p-0 h-auto text-foreground/90 hover:text-primary hover:bg-transparent">
                    Find Doctors
                  </Button>
                </Link>
                <Link href={user ? "/patient" : "/auth"}>
                  <Button variant="ghost" className="w-full justify-start p-0 h-auto text-foreground/90 hover:text-primary hover:bg-transparent">
                    Book Appointment
                  </Button>
                </Link>
                <Link href={user ? "/patient" : "/auth"}>
                  <Button variant="ghost" className="w-full justify-start p-0 h-auto text-foreground/90 hover:text-primary hover:bg-transparent">
                    Health Records
                  </Button>
                </Link>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-bold text-foreground mb-4">For Doctors</h4>
              <div className="space-y-3 text-sm">
                <Link href="/auth">
                  <Button variant="ghost" className="w-full justify-start p-0 h-auto text-foreground/90 hover:text-primary hover:bg-transparent">
                    Join Platform
                  </Button>
                </Link>
                <Link href={user && user.role === "doctor" ? "/doctor" : "/auth"}>
                  <Button variant="ghost" className="w-full justify-start p-0 h-auto text-foreground/90 hover:text-primary hover:bg-transparent">
                    Doctor Dashboard
                  </Button>
                </Link>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-bold text-foreground mb-4">Support</h4>
              <div className="space-y-3 text-sm">
                <Link href="/faq">
                  <Button variant="ghost" className="w-full justify-start p-0 h-auto text-foreground/90 hover:text-primary hover:bg-transparent">
                    FAQ
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="ghost" className="w-full justify-start p-0 h-auto text-foreground/90 hover:text-primary hover:bg-transparent">
                    Contact Support
                  </Button>
                </Link>
                <Link href="/terms">
                  <Button variant="ghost" className="w-full justify-start p-0 h-auto text-foreground/90 hover:text-primary hover:bg-transparent">
                    Terms & Privacy
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center text-sm">
            <p className="text-foreground/90">&copy; 2023 appoint'd. All rights reserved.</p>
            <p className="text-foreground/90">Made with ❤️ for healthcare in Ranchi</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
