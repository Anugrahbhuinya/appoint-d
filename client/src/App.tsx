import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";

// Page Imports
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import DoctorPortal from "@/pages/doctor-portal";
import PatientPortal from "@/pages/patient-portal";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import AboutPage from "@/pages/about-page";
import ContactPage from "@/pages/contact-page";
import FAQPage from "@/pages/faq-page";
import TermsPage from "@/pages/terms-page";
import CheckoutPage from "@/pages/checkout-page";
import VideoConsultationPage from "@/pages/video-consultation"; // Note: renamed for clarity
import NotFound from "@/pages/not-found";
import SearchResultsPage from "@/pages/search-results";

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/admin" component={AdminLogin} />
      <Route path="/admin-portal" component={AdminDashboard} />
      <Route path="/about" component={AboutPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/faq" component={FAQPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/search" component={SearchResultsPage} />

      {/* Protected Routes */}
      <ProtectedRoute path="/doctor" component={DoctorPortal} />
      <ProtectedRoute path="/patient" component={PatientPortal} />
      <ProtectedRoute path="/checkout" component={CheckoutPage} />
      
      {/* This now works because ProtectedRoute wraps its component 
          in a Route that provides the 'params' object.
      */}
      <ProtectedRoute 
        path="/consultation/:appointmentId" 
        component={VideoConsultationPage} 
      />

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;