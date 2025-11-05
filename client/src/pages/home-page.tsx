import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import Navigation from "@/components/navigation";
import DoctorCard from "@/components/doctor-card";
import { Button } from "@/components/ui/button";
{/*import { Waves } from "@/components/ui/waves-background";*/}
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Heart, Video, Shield, Users, Clock, DollarSign, MapPin, ShieldCheck, BrainCircuit, Lock, Search as SearchIcon } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { HeartbeatAnimation } from "@/components/ui/HeartbeatAnimation"; // --- 1. ADDITION: IMPORTED HEARTBEAT COMPONENT ---

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
    // --- I am re-adding these from our previous chat to ensure your DoctorCard doesn't break ---
    gender?: 'male' | 'female' | 'other';
    clinicAddress?: {
      fullAddress: string;
      city: string;
      state: string;
      pincode: string;
      lat: string;
      lon: string;
    };
    // --- End of re-added fields ---
  };
}

export default function HomePage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ place: string; lat?: string; lon?: string }>>([]);
  const [typing, setTyping] = useState("");
  const suggestionsRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ["/api/doctors"],
  });

  const featuredDoctors = doctors.slice(0, 3);

  // Try auto-detect on first load. If user declines, they can still type or retry.
  useEffect(() => {
    tryAutoDetect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reverseGeocode(lat: number, lon: number) {
    try {
      // Using OpenStreetMap Nominatim reverse geocoding (no API key).
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
        lat
      )}&lon=${encodeURIComponent(lon)}&zoom=10&addressdetails=1`;
      const res = await fetch(url, {
        headers: { "User-Agent": "appointd-app/1.0 (you@example.com)" },
      });
      if (!res.ok) throw new Error("Reverse geocode failed");
      const data = await res.json();
      const addr = data.address || {};
      const place =
        addr.city || addr.town || addr.village || addr.county || addr.state || data.display_name;
      return place || "";
    } catch {
      return "";
    }
  }

  function tryAutoDetect() {
    if (!navigator?.geolocation) {
      setDetectError("Geolocation not supported");
      return;
    }
    setDetecting(true);
    setDetectError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const place = await reverseGeocode(latitude, longitude);
        if (place) {
          setLocation(place);
          setDetectError(null);
          setTyping(place);
          setSuggestions([]);
          setMenuOpen(false);
        } else {
          setDetectError("Could not resolve location");
        }
        setDetecting(false);
      },
      (err) => {
        // user denied or error
        setDetectError(err?.message || "Location permission denied");
        setDetecting(false);
      },
      { timeout: 10000 }
    );
  }

  // Debounced suggestions from Nominatim
  useEffect(() => {
    if (!typing || typing.trim().length === 0) {
      setSuggestions([]);
      return;
    }
    const id = setTimeout(async () => {
      try {
        const q = encodeURIComponent(typing);
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${q}&addressdetails=1&limit=6`;
        const res = await fetch(url, { headers: { "User-Agent": "appointd-app/1.0 (you@example.com)" } });
        if (!res.ok) return;
        const data = await res.json();
        const list = (data || []).map((it: any) => ({
          place: it.display_name,
          lat: it.lat,
          lon: it.lon,
        }));
        setSuggestions(list);
      } catch {
        setSuggestions([]);
      }
    }, 350);
    return () => clearTimeout(id);
  }, [typing]);

  // Close menu when clicking outside
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Build search URL; if query is empty but location exists, request doctors by default
  const buildSearchHref = () => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("query", searchQuery.trim());
    if (location.trim()) params.set("location", location.trim());
    // if user only provided location, default to doctors results
    if (!searchQuery.trim() && location.trim()) params.set("category", "doctors");
    const qs = params.toString();
    return `/search${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <div className="fixed inset-0 z-0 opacity-50">
        
      </div>

      {/* --- 2. ADDITION: RENDERED HEARTBEAT ANIMATION BEHIND CONTENT --- */}
      <HeartbeatAnimation />

      {/* --- 3. ADDITION: WRAPPED ALL CONTENT IN A z-10 CONTAINER --- */}
      <div className="relative z-10"> 
        <Navigation />

        {/* Compact top search bar: smaller panel (max-w-xl), tighter spacing */}
        <section className="py-6">
          <div className="max-w-xl mx-auto px-3 sm:px-4">
            <Card className="bg-card/80 backdrop-blur-md shadow-md rounded-full overflow-hidden">
              <CardContent className="p-1">
                <div className="flex items-center gap-1">
                  {/* Left: Location (narrower and non-stretching) */}
                  <div className="w-28 flex-none relative">
                    <label className="sr-only">Location</label>
                    <div className="flex items-center bg-background/5 rounded-full border border-border px-3 py-1.5">
                      <MapPin className="h-4 w-4 text-muted-foreground mr-2" />
                      <Input
                        ref={inputRef}
                        className="bg-transparent border-0 p-0 text-sm focus:ring-0 rounded-full"
                        placeholder="Location"
                        value={location || typing}
                        onChange={(e) => {
                          setTyping(e.target.value);
                          setLocation(e.target.value);
                          setMenuOpen(true);
                        }}
                        onFocus={() => setMenuOpen(true)}
                        data-testid="search-location"
                      />
                    </div>
                    {/* Dropdown menu for Auto-detect + suggestions */}
                    {menuOpen && (
                      <div
                        ref={suggestionsRef}
                        className="absolute left-0 mt-2 w-72 bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden"
                      >
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-background/5 text-sm flex items-center gap-2"
                          onClick={() => {
                            // run auto detect
                            tryAutoDetect();
                          }}
                          data-testid="dropdown-auto-detect"
                        >
                          {detecting ? "Detecting..." : "Auto detect my location"}
                        </button>
                        <div className="border-t border-border" />
                        <div className="max-h-48 overflow-auto">
                          {suggestions.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">Type to see suggestions</div>
                          ) : (
                            suggestions.map((s, i) => (
                              <button
                                key={i}
                                type="button"
                                className="w-full text-left px-3 py-2 hover:bg-background/5 text-sm"
                                onClick={() => {
                                  setLocation(s.place);
                                  setTyping(s.place);
                                  setMenuOpen(false);
                                  setSuggestions([]);
                                }}
                              >
                                {s.place}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                    {detectError && (
                      <p className="text-xs text-muted-foreground mt-1">{detectError}</p>
                    )}
                  </div>

                  {/* Right: Search input + Button grouped so button is near the input */}
                  <div className="flex-1 flex items-center gap-1">
                    <div className="flex-1">
                      <label className="sr-only">Search</label>
                      <div className="flex items-center bg-background/5 rounded-full border border-border px-3 py-1.5">
                        <SearchIcon className="h-4 w-4 text-muted-foreground mr-2" />
                        <Input
                          className="bg-transparent border-0 p-0 text-sm focus:ring-0 rounded-full"
                          placeholder="Find hospitals, clinics, doctors, services..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          data-testid="search-query"
                        />
                      </div>
                    </div>

                    <div>
                      <Link
                        href={buildSearchHref()}
                      >
                        <Button
                          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 h-9 rounded-full flex items-center justify-center"
                          disabled={!searchQuery.trim() && !location.trim()}
                          data-testid="button-top-search"
                        >
                          Search
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
        {/* --- NEW HERO SECTION --- */}
      <section className="py-16 md:py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Optional Title for the Section */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Comfortaa' }}>
              Your Health, Secured by Design
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              We build trust into every step of your healthcare journey.
            </p>
          </div>

          {/* The 3 Vertical Rounded Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Card 1: Verified Doctors */}
            <div 
              className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg p-6 text-center flex flex-col items-center
                         transition-all duration-300 ease-in-out 
                         hover:-translate-y-2 hover:shadow-xl hover:shadow-white/10"
            >
              <div className="bg-primary/10 rounded-full p-4 mb-4">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                NMC-Verified Doctors
              </h3>
              <p className="text-sm text-gray-300">
                Every doctor on our platform is 100% verified, licensed, and vetted for expertise and professionalism.
              </p>
            </div>

            {/* Card 2: AI Triage */}
            <div 
              className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg p-6 text-center flex flex-col items-center
                         transition-all duration-300 ease-in-out 
                         hover:-translate-y-2 hover:shadow-xl hover:shadow-white/10"
            >
              <div className="bg-primary/10 rounded-full p-4 mb-4">
                <BrainCircuit className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                AI-Powered Triage
              </h3>
              <p className="text-sm text-gray-300">
                Our AI symptom checker guides you to the right specialist, saving you time and guesswork before you book.
              </p>
            </div>

            {/* Card 3: Secure & Private */}
            <div 
              className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg p-6 text-center flex flex-col items-center
                         transition-all duration-300 ease-in-out 
                         hover:-translate-y-2 hover:shadow-xl hover:shadow-white/10"
            >
              <div className="bg-primary/10 rounded-full p-4 mb-4">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Secure & Private
              </h3>
              <p className="text-sm text-gray-300">
                All consultations and medical records are end-to-end encrypted. Your data is always yours.
              </p>
            </div>

          </div>
        </div>
      </section>
      {/* --- END OF NEW HERO SECTION --- */}
        

        {/* Health Consultation Categories Section */}
        <section className="py-16 bg-background" data-testid="health-categories-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-12">
              <div>
                {/* use site foreground color so heading matches other fonts */}
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2" style={{ fontFamily: 'Comfortaa' }}>
                  Consult top doctors online for any health concern
                </h2>
                <p className="text-lg text-muted-foreground">
                  Private online consultations with verified doctors in all specialists
                </p>
              </div>
              <Button variant="outline" className="mt-4 md:mt-0 border-blue-500 text-blue-500 hover:bg-blue-50 rounded-full">
                View All Specialities
              </Button>
            </div>

            {/* show items in a single row on medium+ screens; use 5 columns when only 5 items present */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8">
    
              {/* 1. Dental pain or concern */}
              <div className="flex flex-col items-center text-center group">
                {/* --- FIX --- */}
                <div className="w-32 h-32 rounded-full bg-white shadow-md flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200 overflow-hidden">
                  <img
                    src="/images/dental-icon.png" 
                    alt="Dental pain icon"
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* --- END OF FIX --- */}
                <h3 className="text-sm font-semibold text-foreground/90 mb-2 max-w-[8rem] mx-auto">Dental pain or concern</h3>
                <Button variant="link" className="text-blue-500 text-xs font-medium underline-offset-4 p-0 h-auto">
                  CONSULT NOW
                </Button>
              </div>

              {/* 2. Acne, pimple or skin issues */}
              <div className="flex flex-col items-center text-center group">
                {/* --- FIX --- */}
                <div className="w-32 h-32 rounded-full bg-white shadow-md flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200 overflow-hidden">
                  <img
                    src="/images/skin-icon.png" 
                    alt="Skin issues icon"
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* --- END OF FIX --- */}
                <h3 className="text-sm font-semibold text-foreground/90 mb-2 max-w-[8rem] mx-auto">Acne, pimple or skin issues</h3>
                <Button variant="link" className="text-blue-500 text-xs font-medium underline-offset-4 p-0 h-auto">
                  CONSULT NOW
                </Button>
              </div>

              
              {/* 3. Cold, cough or fever */}
              <div className="flex flex-col items-center text-center group">
                {/* --- FIX --- */}
                <div className="w-32 h-32 rounded-full bg-white shadow-md flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200 overflow-hidden">
                  <img
                    src="/images/fever-icon.png" 
                    alt="Cold and fever icon"
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* --- END OF FIX --- */}
                <h3 className="text-sm font-semibold text-foreground/90 mb-2 max-w-[8rem] mx-auto">Cold, cough or fever</h3>
                <Button variant="link" className="text-blue-500 text-xs font-medium underline-offset-4 p-0 h-auto">
                  CONSULT NOW
                </Button>
              </div>

              {/* 4. Child not feeling well */}
              <div className="flex flex-col items-center text-center group">
                {/* --- FIX --- */}
                <div className="w-32 h-32 rounded-full bg-white shadow-md flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200 overflow-hidden">
                  <img
                    src="/images/child-icon.png" 
                    alt="Pediatrics icon"
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* --- END OF FIX --- */}
                <h3 className="text-sm font-semibold text-foreground/90 mb-2 max-w-[8rem] mx-auto">Child not feeling well</h3>
                <Button variant="link" className="text-blue-500 text-xs font-medium underline-offset-4 p-0 h-auto">
                  CONSULT NOW
                </Button>
              </div>

              {/* 5. Depression or anxiety */}
              <div className="flex flex-col items-center text-center group">
                {/* --- FIX --- */}
                <div className="w-32 h-32 rounded-full bg-white shadow-md flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200 overflow-hidden">
                  <img
                    src="/images/mental-health-icon.png" 
                    alt="Mental health icon"
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* --- END OF FIX --- */}
                <h3 className="text-sm font-semibold text-foreground/90 mb-2 max-w-[8rem] mx-auto">Depression or anxiety</h3>
                <Button variant="link" className="text-blue-500 text-xs font-medium underline-offset-4 p-0 h-auto">
                  CONSULT NOW
                </Button>
              </div>

            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-card/30" data-testid="features-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'Comfortaa' }}>Why Choose appoint'd?</h2>
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
                
                <Card 
                  key={index} 
                  className="cursor-pointer backdrop-blur-sm bg-card/80 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:shadow-primary/10" 
                  data-testid={`feature-card-${index}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-primary/10 w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                        <feature.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-1">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
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
              <Link href={user ? "/patient" : "/auth"} data-testid="button-view-all-doctors">
              <button
              className="bg-white text-black text-sm font-semibold hover:bg-gray-200 rounded-full px-5 py-2"
                >
                View All Doctors
                </button>
              </Link>
              </div>
            </div>
          </section>
        )}

        {/* Stats Section 
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
        </section>*/}

        {/* Footer */}
        <footer className="bg-background border-t border-border py-12" data-testid="footer">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <Heart className="h-6 w-6 text-primary" />
                  <span className="text-xl font-bold text-primary" style={{ fontFamily: 'Comfortaa' }}>appoint'd</span>
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
                      Appoint'd Vault
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
            
            
              <div className="border-t border-border pt-8 flex items-center space-x-2 justify-center cursor-pointer" data-testid="logo">
                  
                  <span className="text-xl font-bold text-primary" style={{ fontFamily: 'Comfortaa' }}>appoint'd</span>
                </div>
                <div className="flex flex-col md:flex-row justify-center items-center text-sm">
              <p className="text-foreground/90">&copy; 2025 appoint'd. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div> {/* --- END OF z-10 WRAPPER --- */}
    </div>
  );
}