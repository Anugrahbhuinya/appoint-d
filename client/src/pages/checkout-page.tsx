import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/navigation";
import { RazorpayPayment } from "@/components/razorpay-payment";
import { 
  Shield, 
  Calendar, 
  Clock, 
  Video, 
  User, 
  CheckCircle
} from "lucide-react";


interface AppointmentDetails {
  doctorName: string;
  specialization: string;
  date: string;
  time: string;
  type: "video" | "in-person";
  duration: number;
  consultationFee: number;
}

export default function CheckoutPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const { toast } = useToast();

  // Mock appointment details - would come from state/props in real app
  const appointmentDetails: AppointmentDetails = {
    doctorName: "Dr. Rajesh Kumar",
    specialization: "Cardiologist",
    date: "December 15, 2023",
    time: "10:30 AM",
    type: "video",
    duration: 30,
    consultationFee: 800,
  };

  // Redirect if not authenticated
  if (!user) {
    setLocation("/auth");
    return null;
  }

  const calculateTotals = () => {
    const consultationFee = appointmentDetails.consultationFee;
    const platformFee = 50;
    const subtotal = consultationFee + platformFee;
    const gst = Math.round(subtotal * 0.18);
    const total = subtotal + gst;

    return { consultationFee, platformFee, subtotal, gst, total };
  };

  const { consultationFee, platformFee, subtotal, gst, total } = calculateTotals();

  const handlePaymentSuccess = (paymentId: string) => {
    setPaymentSuccess(true);
    toast({
      title: "Payment Successful",
      description: "Your appointment has been booked successfully!",
    });

    // Redirect to patient portal after 2 seconds
    setTimeout(() => {
      setLocation("/patient");
    }, 2000);
  };

  const handlePaymentError = (error: string) => {
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8" data-testid="header">
            <h1 className="text-3xl font-bold mb-2">Secure Checkout</h1>
            <p className="text-muted-foreground">Complete your appointment booking with secure payment</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Appointment Summary */}
            <div data-testid="appointment-summary">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Appointment Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Doctor Info */}
                    <div className="flex items-center space-x-4 p-4 bg-muted/20 rounded-lg">
                      <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                        <User className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg" data-testid="doctor-name">
                          {appointmentDetails.doctorName}
                        </h3>
                        <p className="text-primary font-medium" data-testid="doctor-specialization">
                          {appointmentDetails.specialization}
                        </p>
                        <p className="text-sm text-muted-foreground">MBBS, MD - Cardiology</p>
                      </div>
                    </div>

                    {/* Appointment Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Date</span>
                        </div>
                        <p className="font-medium" data-testid="appointment-date">
                          {appointmentDetails.date}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Time</span>
                        </div>
                        <p className="font-medium" data-testid="appointment-time">
                          {appointmentDetails.time}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <Video className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Type</span>
                        </div>
                        <Badge className="bg-primary/10 text-primary">
                          {appointmentDetails.type === "video" ? "Video Call" : "In-Person"}
                        </Badge>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Duration</span>
                        </div>
                        <p className="font-medium" data-testid="appointment-duration">
                          {appointmentDetails.duration} minutes
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Price Breakdown */}
              <Card data-testid="price-breakdown">
                <CardHeader>
                  <CardTitle>Price Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Consultation Fee</span>
                      <span data-testid="consultation-fee">₹{consultationFee}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Platform Fee</span>
                      <span data-testid="platform-fee">₹{platformFee}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">GST (18%)</span>
                      <span data-testid="gst-amount">₹{gst}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total Amount</span>
                      <span data-testid="total-amount">₹{total}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Form */}
            <div data-testid="payment-form">
              {paymentSuccess ? (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-8 text-center">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-green-800 mb-2">Payment Successful!</h3>
                    <p className="text-green-600 mb-4">Your appointment has been booked successfully.</p>
                    <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
                  </CardContent>
                </Card>
              ) : (
                <RazorpayPayment
                  amount={total}
                  appointmentId="apt_123456"
                  doctorId="doc_123456"
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              )}

              {/* Payment Security Info */}
              <Card className="mt-6 bg-green-500/5 border-green-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="font-medium text-green-600">Secure Payment Processing</p>
                      <p className="text-sm text-muted-foreground">
                        Your payment information is encrypted and secure. We never store your card details.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
