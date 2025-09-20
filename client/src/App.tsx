import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";

import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import DoctorPortal from "@/pages/doctor-portal";
import PatientPortal from "@/pages/patient-portal";
import AdminPortal from "@/pages/admin-portal";
import AboutPage from "@/pages/about-page";
import ContactPage from "@/pages/contact-page";
import FAQPage from "@/pages/faq-page";
import TermsPage from "@/pages/terms-page";
import CheckoutPage from "@/pages/checkout-page";
import VideoConsultation from "@/pages/video-consultation";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/doctor" component={DoctorPortal} />
      <ProtectedRoute path="/patient" component={PatientPortal} />
      <ProtectedRoute path="/admin" component={AdminPortal} />
      <Route path="/about" component={AboutPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/faq" component={FAQPage} />
      <Route path="/terms" component={TermsPage} />
      <ProtectedRoute path="/checkout" component={CheckoutPage} />
      <ProtectedRoute path="/consultation/:appointmentId" component={VideoConsultation} />
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
