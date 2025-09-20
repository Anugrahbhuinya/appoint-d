import Navigation from "@/components/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Eye, Shield, Users, Clock, Award, Target, Globe } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16" data-testid="hero-section">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">About MedConnect</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Revolutionizing healthcare delivery by connecting patients with trusted medical professionals 
              through innovative technology and compassionate care.
            </p>
          </div>

          {/* Mission & Vision */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16" data-testid="mission-vision-section">
            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                  <Target className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-4" data-testid="mission-title">Our Mission</h2>
                <p className="text-muted-foreground leading-relaxed">
                  To make quality healthcare accessible to everyone by bridging the gap between patients and 
                  healthcare providers through secure, convenient, and reliable digital health solutions. We 
                  believe that every person deserves access to professional medical care, regardless of their 
                  location or circumstances.
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                  <Eye className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-4" data-testid="vision-title">Our Vision</h2>
                <p className="text-muted-foreground leading-relaxed">
                  To become the leading healthcare platform that empowers patients to take control of their 
                  health while enabling healthcare providers to deliver exceptional care through technology. 
                  We envision a future where quality healthcare is just a click away for every person in 
                  Ranchi and beyond.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Why Choose Us */}
          <div className="mb-16" data-testid="why-choose-section">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Why Choose MedConnect?</h2>
              <p className="text-muted-foreground text-lg">Experience healthcare like never before with our comprehensive platform</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: Shield,
                  title: "Secure & Compliant",
                  description: "HIPAA-compliant platform ensuring your health data privacy and security with end-to-end encryption.",
                },
                {
                  icon: Users,
                  title: "Verified Professionals",
                  description: "All healthcare providers undergo thorough verification including credentials, experience, and background checks.",
                },
                {
                  icon: Clock,
                  title: "24/7 Availability",
                  description: "Access healthcare services round the clock with emergency consultation options and urgent care support.",
                },
                {
                  icon: Globe,
                  title: "Easy to Use",
                  description: "Intuitive interface designed for all age groups with seamless booking and consultation experience.",
                },
                {
                  icon: Heart,
                  title: "Affordable Care",
                  description: "Transparent pricing with no hidden fees and various payment options to make healthcare accessible.",
                },
                {
                  icon: Award,
                  title: "Expert Support",
                  description: "Dedicated customer support team available to assist you throughout your healthcare journey.",
                },
              ].map((feature, index) => (
                <Card key={index} className="text-center hover:shadow-lg transition-shadow duration-200">
                  <CardContent className="p-6">
                    <div className="w-20 h-20 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <feature.icon className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3" data-testid={`feature-title-${index}`}>
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Our Story */}
          <div className="mb-16" data-testid="story-section">
            <Card>
              <CardContent className="p-12">
                <div className="max-w-4xl mx-auto text-center">
                  <h2 className="text-3xl font-bold mb-6">Our Story</h2>
                  <div className="space-y-6 text-muted-foreground leading-relaxed">
                    <p>
                      MedConnect was born from a simple yet powerful idea: healthcare should be accessible to everyone, 
                      regardless of geographical barriers or time constraints. Founded in 2023 in the heart of Ranchi, 
                      we recognized the growing need for digital healthcare solutions in Jharkhand and across India.
                    </p>
                    <p>
                      Our founders, a team of healthcare professionals and technology experts, witnessed firsthand the 
                      challenges patients faced in accessing quality medical care. Long waiting times, difficulty finding 
                      specialists, and the inconvenience of traveling for consultations inspired us to create a platform 
                      that bridges these gaps.
                    </p>
                    <p>
                      Today, MedConnect serves thousands of patients and works with hundreds of verified healthcare 
                      professionals. We continue to innovate and expand our services, always keeping our core mission 
                      at heart: making healthcare accessible, affordable, and convenient for all.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Values */}
          <div className="mb-16" data-testid="values-section">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Our Core Values</h2>
              <p className="text-muted-foreground text-lg">The principles that guide everything we do</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: "Integrity",
                  description: "We maintain the highest standards of honesty and transparency in all our interactions.",
                },
                {
                  title: "Innovation",
                  description: "We continuously evolve and adopt new technologies to improve healthcare delivery.",
                },
                {
                  title: "Compassion",
                  description: "We approach healthcare with empathy and understanding for every patient's unique needs.",
                },
                {
                  title: "Excellence",
                  description: "We strive for perfection in every aspect of our platform and services.",
                },
              ].map((value, index) => (
                <Card key={index} className="text-center">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-3" data-testid={`value-title-${index}`}>
                      {value.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {value.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Statistics */}
          <div className="text-center" data-testid="stats-section">
            <Card>
              <CardContent className="p-12">
                <h2 className="text-3xl font-bold mb-8">MedConnect in Numbers</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  <div data-testid="stat-doctors">
                    <div className="text-4xl font-bold text-primary mb-2">500+</div>
                    <div className="text-muted-foreground">Verified Doctors</div>
                  </div>
                  <div data-testid="stat-patients">
                    <div className="text-4xl font-bold text-primary mb-2">10,000+</div>
                    <div className="text-muted-foreground">Happy Patients</div>
                  </div>
                  <div data-testid="stat-consultations">
                    <div className="text-4xl font-bold text-primary mb-2">25,000+</div>
                    <div className="text-muted-foreground">Consultations</div>
                  </div>
                  <div data-testid="stat-satisfaction">
                    <div className="text-4xl font-bold text-primary mb-2">98%</div>
                    <div className="text-muted-foreground">Satisfaction Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
