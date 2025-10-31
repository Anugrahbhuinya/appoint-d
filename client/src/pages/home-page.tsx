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
