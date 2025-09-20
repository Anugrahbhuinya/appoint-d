import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Navigation from "@/components/navigation";
import { 
  CreditCard, 
  Shield, 
  Calendar, 
  Clock, 
  Video, 
  User, 
  Lock,
  CheckCircle,
  Smartphone,
  Building,
  Wallet
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Mock Stripe integration - would use real Stripe in production
const mockStripe = {
  confirmPayment: async (options: any) => {
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate success/failure
    if (Math.random() > 0.1) { // 90% success rate
      return { error: null };
    } else {
      return { error: { message: "Payment failed. Please try again." } };
    }
  }
};

const paymentSchema = z.object({
  cardNumber: z.string().min(16, "Card number must be 16 digits"),
  expiryDate: z.string().regex(/^\d{2}\/\d{2}$/, "Format: MM/YY"),
  cvv: z.string().min(3, "CVV must be 3-4 digits"),
  cardholderName: z.string().min(1, "Cardholder name is required"),
  saveCard: z.boolean().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("card");
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
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

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      cardNumber: "",
      expiryDate: "",
      cvv: "",
      cardholderName: "",
      saveCard: false,
    },
  });

  // Redirect if not authenticated
  if (!user) {
    setLocation("/auth");
    return null;
  }

  useEffect(() => {
    // Create payment intent when component mounts
    const createPaymentIntent = async () => {
      try {
        const totalAmount = appointmentDetails.consultationFee + 50 + // Platform fee
          Math.round((appointmentDetails.consultationFee + 50) * 0.18); // GST
        
        const res = await apiRequest("POST", "/api/create-payment-intent", {
          amount: totalAmount,
          appointmentData: appointmentDetails,
        });
        
        const data = await res.json();
        setClientSecret(data.clientSecret);
      } catch (error) {
        console.error("Failed to create payment intent:", error);
        toast({
          title: "Payment Setup Failed",
          description: "Unable to setup payment processing. Please try again.",
          variant: "destructive",
        });
      }
    };

    createPaymentIntent();
  }, [toast]);

  const calculateTotals = () => {
    const consultationFee = appointmentDetails.consultationFee;
    const platformFee = 50;
    const subtotal = consultationFee + platformFee;
    const gst = Math.round(subtotal * 0.18);
    const total = subtotal + gst;

    return { consultationFee, platformFee, subtotal, gst, total };
  };

  const { consultationFee, platformFee, subtotal, gst, total } = calculateTotals();

  const onSubmit = async (data: PaymentFormData) => {
    if (!clientSecret) {
      toast({
        title: "Payment Error",
        description: "Payment not initialized. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Mock payment confirmation - would use real Stripe in production
      const result = await mockStripe.confirmPayment({
        clientSecret,
        payment_method: {
          card: {
            number: data.cardNumber,
            exp_month: parseInt(data.expiryDate.split('/')[0]),
            exp_year: parseInt('20' + data.expiryDate.split('/')[1]),
            cvc: data.cvv,
          },
          billing_details: {
            name: data.cardholderName,
          },
        },
        return_url: window.location.origin + "/patient",
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Payment successful
      toast({
        title: "Payment Successful",
        description: "Your appointment has been booked successfully!",
      });

      // Redirect to patient portal
      setTimeout(() => {
        setLocation("/patient");
      }, 2000);

    } catch (error: any) {
      toast({
        title: "Payment Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
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
              <Card>
                <CardHeader>
                  <CardTitle>Payment Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Payment Methods */}
                  <div className="space-y-3 mb-6" data-testid="payment-methods">
                    <label 
                      className="flex items-center space-x-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/10 transition-colors"
                      onClick={() => setSelectedPaymentMethod("card")}
                    >
                      <input 
                        type="radio" 
                        name="paymentMethod" 
                        checked={selectedPaymentMethod === "card"}
                        className="text-primary"
                        data-testid="radio-card"
                      />
                      <CreditCard className="w-5 h-5 text-primary" />
                      <span>Credit/Debit Card</span>
                    </label>

                    <label 
                      className="flex items-center space-x-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/10 transition-colors"
                      onClick={() => setSelectedPaymentMethod("upi")}
                    >
                      <input 
                        type="radio" 
                        name="paymentMethod" 
                        checked={selectedPaymentMethod === "upi"}
                        className="text-primary"
                        data-testid="radio-upi"
                      />
                      <Smartphone className="w-5 h-5 text-primary" />
                      <span>UPI Payment</span>
                    </label>

                    <label 
                      className="flex items-center space-x-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/10 transition-colors"
                      onClick={() => setSelectedPaymentMethod("netbanking")}
                    >
                      <input 
                        type="radio" 
                        name="paymentMethod" 
                        checked={selectedPaymentMethod === "netbanking"}
                        className="text-primary"
                        data-testid="radio-netbanking"
                      />
                      <Building className="w-5 h-5 text-primary" />
                      <span>Net Banking</span>
                    </label>

                    <label 
                      className="flex items-center space-x-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/10 transition-colors"
                      onClick={() => setSelectedPaymentMethod("wallet")}
                    >
                      <input 
                        type="radio" 
                        name="paymentMethod" 
                        checked={selectedPaymentMethod === "wallet"}
                        className="text-primary"
                        data-testid="radio-wallet"
                      />
                      <Wallet className="w-5 h-5 text-primary" />
                      <span>Digital Wallets</span>
                    </label>
                  </div>

                  {/* Card Payment Form */}
                  {selectedPaymentMethod === "card" && (
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div>
                        <Label htmlFor="cardNumber">Card Number</Label>
                        <Input
                          id="cardNumber"
                          placeholder="1234 5678 9012 3456"
                          maxLength={19}
                          data-testid="input-card-number"
                          {...form.register("cardNumber")}
                          onChange={(e) => {
                            // Format card number with spaces
                            const value = e.target.value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
                            e.target.value = value;
                            form.setValue("cardNumber", value.replace(/\s/g, ''));
                          }}
                        />
                        {form.formState.errors.cardNumber && (
                          <p className="text-sm text-destructive mt-1">
                            {form.formState.errors.cardNumber.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="cardholderName">Cardholder Name</Label>
                        <Input
                          id="cardholderName"
                          placeholder="Enter name as on card"
                          data-testid="input-cardholder-name"
                          {...form.register("cardholderName")}
                        />
                        {form.formState.errors.cardholderName && (
                          <p className="text-sm text-destructive mt-1">
                            {form.formState.errors.cardholderName.message}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="expiryDate">Expiry Date</Label>
                          <Input
                            id="expiryDate"
                            placeholder="MM/YY"
                            maxLength={5}
                            data-testid="input-expiry-date"
                            {...form.register("expiryDate")}
                            onChange={(e) => {
                              // Format MM/YY
                              const value = e.target.value.replace(/\D/g, '');
                              if (value.length >= 2) {
                                e.target.value = `${value.substring(0,2)}/${value.substring(2,4)}`;
                              } else {
                                e.target.value = value;
                              }
                              form.setValue("expiryDate", e.target.value);
                            }}
                          />
                          {form.formState.errors.expiryDate && (
                            <p className="text-sm text-destructive mt-1">
                              {form.formState.errors.expiryDate.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="cvv">CVV</Label>
                          <Input
                            id="cvv"
                            placeholder="123"
                            maxLength={4}
                            data-testid="input-cvv"
                            {...form.register("cvv")}
                          />
                          {form.formState.errors.cvv && (
                            <p className="text-sm text-destructive mt-1">
                              {form.formState.errors.cvv.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="saveCard"
                          className="rounded"
                          data-testid="checkbox-save-card"
                          {...form.register("saveCard")}
                        />
                        <Label htmlFor="saveCard" className="text-sm">
                          Save card for future payments
                        </Label>
                      </div>

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isProcessing || !clientSecret}
                        data-testid="button-pay"
                      >
                        {isProcessing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Processing Payment...
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4 mr-2" />
                            Pay ₹{total} Securely
                          </>
                        )}
                      </Button>
                    </form>
                  )}

                  {/* Other payment method placeholders */}
                  {selectedPaymentMethod !== "card" && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-muted/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                        {selectedPaymentMethod === "upi" && <Smartphone className="w-8 h-8 text-muted-foreground" />}
                        {selectedPaymentMethod === "netbanking" && <Building className="w-8 h-8 text-muted-foreground" />}
                        {selectedPaymentMethod === "wallet" && <Wallet className="w-8 h-8 text-muted-foreground" />}
                      </div>
                      <p className="text-muted-foreground mb-4">
                        {selectedPaymentMethod === "upi" && "UPI payment gateway integration"}
                        {selectedPaymentMethod === "netbanking" && "Net banking integration"}
                        {selectedPaymentMethod === "wallet" && "Digital wallet integration"}
                      </p>
                      <Button className="w-full" disabled>
                        Coming Soon
                      </Button>
                    </div>
                  )}

                  {/* Security Notice */}
                  <div className="flex items-center justify-center space-x-4 mt-6 pt-6 border-t border-border">
                    <Shield className="w-5 h-5 text-primary" />
                    <span className="text-sm text-muted-foreground">256-bit SSL encrypted payment</span>
                  </div>
                </CardContent>
              </Card>

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
