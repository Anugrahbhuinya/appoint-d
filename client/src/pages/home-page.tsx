import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import Navigation from "@/components/navigation";
import DoctorCard from "@/components/doctor-card";
import { Button } from "@/components/ui/button";
import { Waves } from "@/components/ui/waves-background";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Heart, Video, Shield, Users, Clock, DollarSign, MapPin, Search as SearchIcon } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

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
            {/* Period doubts or Pregnancy */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200">
                <svg className="w-20 h-20" viewBox="0 0 100 100" fill="none">
                  <path d="M50 20 C30 20, 20 35, 20 50 C20 65, 35 75, 50 75 C65 75, 80 65, 80 50 C80 35, 70 20, 50 20 Z" 
                        stroke="white" strokeWidth="3" fill="rgba(59, 130, 246, 0.3)"/>
                  <path d="M35 50 Q50 40, 65 50" stroke="white" strokeWidth="3" fill="none"/>
                  <circle cx="35" cy="50" r="4" fill="rgba(59, 130, 246, 0.6)"/>
                  <circle cx="65" cy="50" r="4" fill="rgba(59, 130, 246, 0.6)"/>
                  <path d="M50 75 L50 95" stroke="#EF4444" strokeWidth="4"/>
                  <circle cx="50" cy="95" r="6" fill="#EF4444"/>
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-foreground/90 mb-2 max-w-[8rem] mx-auto">Dental pain or concern</h3>
              <Button variant="link" className="text-blue-500 text-xs font-medium underline-offset-4 p-0 h-auto">
                CONSULT NOW
              </Button>
            </div>

            {/* Acne, pimple or skin issues */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200">
                <svg className="w-20 h-20" viewBox="0 0 100 100" fill="none">
                  <ellipse cx="50" cy="65" rx="25" ry="35" fill="rgba(59, 130, 246, 0.2)"/>
                  <ellipse cx="50" cy="50" rx="28" ry="32" fill="gray" opacity="0.3"/>
                  <path d="M35 35 Q50 30, 65 35" stroke="gray" strokeWidth="2"/>
                  <circle cx="42" cy="50" r="3" fill="#EF4444"/>
                  <circle cx="58" cy="50" r="3" fill="#EF4444"/>
                  <circle cx="50" cy="58" r="3" fill="#EF4444"/>
                  <circle cx="45" cy="45" r="2" fill="#EF4444"/>
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-foreground/90 mb-2 max-w-[8rem] mx-auto">Acne, pimple or skin issues</h3>
              <Button variant="link" className="text-blue-500 text-xs font-medium underline-offset-4 p-0 h-auto">
                CONSULT NOW
              </Button>
            </div>

           
            {/* Cold, cough or fever */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200">
                <svg className="w-20 h-20" viewBox="0 0 100 100" fill="none">
                  <ellipse cx="50" cy="60" rx="22" ry="30" fill="gray" opacity="0.2"/>
                  <ellipse cx="50" cy="70" rx="20" ry="28" fill="rgba(59, 130, 246, 0.3)"/>
                  <ellipse cx="50" cy="50" rx="28" ry="32" fill="gray" opacity="0.3"/>
                  <path d="M35 35 Q50 30, 65 35" stroke="gray" strokeWidth="2"/>
                  <ellipse cx="48" cy="42" rx="12" ry="14" fill="rgba(255, 165, 0, 0.3)"/>
                  <path d="M55 42 Q58 40, 60 45 M60 45 Q62 50, 58 52 M58 52 Q54 54, 52 49" 
                        stroke="#EF4444" strokeWidth="2" fill="none"/>
                  <circle cx="40" cy="70" r="5" fill="white"/>
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-foreground/90 mb-2 max-w-[8rem] mx-auto">Cold, cough or fever</h3>
              <Button variant="link" className="text-blue-500 text-xs font-medium underline-offset-4 p-0 h-auto">
                CONSULT NOW
              </Button>
            </div>

            {/* Child not feeling well */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200">
                <svg className="w-20 h-20" viewBox="0 0 100 100" fill="none">
                  <circle cx="50" cy="45" r="20" fill="#FB923C"/>
                  <circle cx="50" cy="45" r="18" fill="#FED7AA"/>
                  <ellipse cx="45" cy="44" rx="2" ry="3" fill="black"/>
                  <ellipse cx="55" cy="44" rx="2" ry="3" fill="black"/>
                  <path d="M45 50 Q50 53, 55 50" stroke="black" strokeWidth="2" fill="none"/>
                  <ellipse cx="50" cy="75" rx="18" ry="22" fill="#9333EA"/>
                  <path d="M35 70 Q40 75, 35 80 M65 70 Q60 75, 65 80" stroke="#C084FC" strokeWidth="3"/>
                  <ellipse cx="50" cy="62" rx="8" ry="10" fill="#EF4444"/>
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-foreground/90 mb-2 max-w-[8rem] mx-auto">Child not feeling well</h3>
              <Button variant="link" className="text-blue-500 text-xs font-medium underline-offset-4 p-0 h-auto">
                CONSULT NOW
              </Button>
            </div>

            {/* Depression or anxiety */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200">
                <svg className="w-20 h-20" viewBox="0 0 100 100" fill="none">
                  <path d="M50 20 Q30 15, 20 35 Q20 55, 35 60 Q30 50, 35 40 Q40 30, 50 30 Q60 30, 65 40 Q70 50, 65 60 Q80 55, 80 35 Q70 15, 50 20 Z" 
                        fill="#FED7AA"/>
                  <rect x="20" y="20" width="60" height="35" rx="10" fill="none" stroke="white" strokeWidth="2"/>
                  <path d="M40 28 L60 28 M40 35 L60 35 M40 42 L55 42" stroke="white" strokeWidth="3"/>
                  <ellipse cx="50" cy="75" rx="18" ry="22" fill="#FED7AA"/>
                  <ellipse cx="40" cy="44" rx="3" ry="3" fill="#FED7AA"/>
                  <ellipse cx="60" cy="44" rx="3" ry="3" fill="#FED7AA"/>
                  <path d="M38 47 Q43 52, 38 57" stroke="#EF4444" strokeWidth="2" fill="none"/>
                  <circle cx="50" cy="48" r="8" fill="rgba(255, 200, 200, 0.5)"/>
                </svg>
              </div>
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
