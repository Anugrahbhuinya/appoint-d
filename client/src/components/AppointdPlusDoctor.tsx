import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Star, TrendingUp, DollarSign, BrainCircuit, BarChart } from "lucide-react";

// Define the core benefits
const plusBenefits = [
  {
    icon: <DollarSign className="w-6 h-6 text-primary" />,
    title: "Reduced Commissions",
    description: "Keep more of your earnings. Our 'Plus' plan drops your platform fee from 20% to just 10% on every consultation."
  },
  {
    icon: <TrendingUp className="w-6 h-6 text-primary" />,
    title: "Priority Search Ranking",
    description: "Appear at the top of patient search results for your specialization and get a 'Featured' badge on your profile."
  },
  {
    icon: <BrainCircuit className="w-6 h-6 text-primary" />,
    title: "AI-Powered Notes",
    description: "Access our exclusive AI assistant to auto-generate clinical notes and summaries from your video consultations, saving you hours per week."
  },
  {
    icon: <BarChart className="w-6 h-6 text-primary" />,
    title: "Advanced Analytics",
    description: "Get insights on your patient demographics, peak booking times, and income reports to optimize your practice."
  },
  {
    icon: <Star className="w-6 h-6 text-primary" />,
    title: "Dedicated Support",
    description: "Skip the line with priority email and chat support from a dedicated account manager."
  },
  {
    icon: <CheckCircle className="w-6 h-6 text-primary" />,
    title: "More..." ,
    description: "Including custom profile banners, video introductions, and more features added every month."
  }
];

export function AppointdPlusDoctor() {
  return (
    <div className="space-y-12">
      {/* 1. The Header */}
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'Comfortaa' }}>
          Unlock Your Practice's Full Potential
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Upgrade to Appoint'd Plus to reduce commissions, get priority placement,
          and access powerful AI tools that save you time.
        </p>
      </div>

      {/* 2. The Benefits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {plusBenefits.map((benefit) => (
          <div key={benefit.title} className="flex items-start gap-4">
            <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
              {benefit.icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">{benefit.title}</h3>
              <p className="text-sm text-muted-foreground">{benefit.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 3. The Pricing Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Card 1: Basic (Current Plan) */}
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Basic Plan</CardTitle>
            <p className="text-3xl font-bold">
              ₹0 <span className="text-sm font-normal text-muted-foreground">/ month</span>
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              For doctors just getting started on our platform.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-muted-foreground" />
                <span>Standard Profile Listing</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-muted-foreground" />
                <span>20% Consultation Commission</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-muted-foreground" />
                <span>Standard Email Support</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" disabled>
              Your Current Plan
            </Button>
          </CardFooter>
        </Card>

        {/* Card 2: Appoint'd Plus (The Upsell) */}
        <Card className="border-2 border-primary shadow-xl shadow-primary/10 relative -mt-4">
          <Badge 
            variant="default" 
            className="absolute -top-3 left-1/2 -translate-x-1/2"
          >
            Most Popular
          </Badge>
          <CardHeader className="pb-4 pt-10">
            <CardTitle className="text-2xl">Appoint'd Plus</CardTitle>
            <p className="text-4xl font-bold">
              ₹1,999 <span className="text-sm font-normal text-muted-foreground">/ month</span>
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              For professionals ready to grow and optimize their practice.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span>Reduced 10% Commission</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span>Priority Search Ranking</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span>AI-Powered Notes</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span>Advanced Analytics</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span>Dedicated Support</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full">
              Upgrade to Plus
            </Button>
          </CardFooter>
        </Card>

        {/* Card 3: Clinic / Enterprise */}
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Clinic Platform</CardTitle>
            <p className="text-3xl font-bold">
              Custom <span className="text-sm font-normal text-muted-foreground">/ month</span>
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              For multi-doctor clinics and hospitals needing custom solutions.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-muted-foreground" />
                <span>All 'Plus' Features</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-muted-foreground" />
                <span>Multi-Doctor Management</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-muted-foreground" />
                <span>Custom Branding</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-muted-foreground" />
                <span>API Access & Integration</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">
              Contact Sales
            </Button>
          </CardFooter>
        </Card>

      </div>
    </div>
  );
}