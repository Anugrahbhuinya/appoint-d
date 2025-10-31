import Navigation from "@/components/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, HelpCircle, Users, Stethoscope, CreditCard, Shield, Phone } from "lucide-react";
import { useState } from "react";

const faqCategories = [
  { id: "general", label: "General", icon: HelpCircle },
  { id: "patients", label: "For Patients", icon: Users },
  { id: "doctors", label: "For Doctors", icon: Stethoscope },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "privacy", label: "Privacy & Security", icon: Shield },
  { id: "technical", label: "Technical Support", icon: Phone },
];

const faqData = [
  {
    category: "general",
    question: "What is appoint'd?",
    answer: "appoint'd is a comprehensive telemedicine platform that connects patients with verified healthcare professionals in Ranchi and surrounding areas. Our platform offers video consultations, appointment booking, digital prescriptions, and secure health record management."
  },
  {
    category: "general",
    question: "How do I get started with appoint'd?",
    answer: "Getting started is easy! Simply create an account by clicking 'Sign Up' and choose whether you're a patient or a doctor. For patients, you can immediately start searching for doctors and booking appointments. Doctors need to complete verification before they can start practicing on our platform."
  },
  {
    category: "general",
    question: "Is appoint'd available 24/7?",
    answer: "While our platform is accessible 24/7, doctor availability varies based on their individual schedules. Many of our healthcare providers offer extended hours, and we have emergency consultation options available."
  },
  {
    category: "patients",
    question: "How do I book an appointment?",
    answer: "To book an appointment: 1) Log into your patient account, 2) Search for doctors by specialization, location, or name, 3) Select a doctor and view their available time slots, 4) Choose your preferred time and consultation type (video or in-person), 5) Complete the payment process. You'll receive confirmation via email and SMS."
  },
  {
    category: "patients",
    question: "Can I cancel or reschedule my appointment?",
    answer: "Yes, you can cancel or reschedule appointments up to 2 hours before the scheduled time without any penalty. To do this, go to 'My Appointments' in your dashboard and select the appointment you want to modify. Cancellations made less than 2 hours before the appointment may be subject to a cancellation fee."
  },
  {
    category: "patients",
    question: "How do video consultations work?",
    answer: "Video consultations are conducted through our secure, HIPAA-compliant platform. You'll receive a 'Join Call' button 15 minutes before your appointment. Simply click it to enter the video consultation room. Make sure you have a stable internet connection and a device with a camera and microphone."
  },
  {
    category: "patients",
    question: "How do I access my medical records?",
    answer: "Your medical records are available in the 'Health Records' section of your patient dashboard. You can view consultation notes, prescriptions, lab reports, and any documents uploaded by your doctors. You can also upload your own medical documents for easy access during consultations."
  },
  {
    category: "doctors",
    question: "How do I join appoint'd as a doctor?",
    answer: "To join as a doctor: 1) Sign up and select 'Doctor' as your user type, 2) Complete your professional profile with specialization, experience, and consultation fees, 3) Upload required documents (medical license, educational certificates, experience letters), 4) Wait for admin verification (usually 2-3 business days), 5) Once approved, you can start receiving patients and managing your practice."
  },
  {
    category: "doctors",
    question: "What documents do I need for verification?",
    answer: "Required documents include: Valid medical license, Educational certificates (MBBS, MD/MS, etc.), Experience certificates from previous employment, Government-issued ID proof. All documents should be clear, readable, and in PDF format (max 5MB per file)."
  },
  {
    category: "doctors",
    question: "How do I set my availability?",
    answer: "In your doctor dashboard, go to 'Availability Calendar' where you can: Set your working days and hours, Create specific time slots for appointments, Block dates when you're unavailable, Set different availability for video vs. in-person consultations. Changes to availability are reflected immediately on the platform."
  },
  {
    category: "doctors",
    question: "How and when do I get paid?",
    answer: "Payments are processed automatically after completed consultations. You receive 90% of the consultation fee (10% platform fee). Payments are transferred to your registered bank account weekly. You can view detailed payment reports in your dashboard under 'Earnings'."
  },
  {
    category: "payments",
    question: "What payment methods are accepted?",
    answer: "We accept all major payment methods including: Credit/Debit cards (Visa, Mastercard, RuPay), UPI payments (Google Pay, PhonePe, Paytm), Net banking from all major banks, Digital wallets (Paytm, Amazon Pay). All payments are processed securely through our certified payment gateway."
  },
  {
    category: "payments",
    question: "Is my payment information secure?",
    answer: "Absolutely. We use industry-standard encryption and are PCI DSS compliant. Your payment information is never stored on our servers and is processed through secure, certified payment gateways. We also offer tokenization for repeat payments for added security."
  },
  {
    category: "payments",
    question: "Can I get a refund?",
    answer: "Refunds are processed in the following cases: Doctor cancellation (full refund), Technical issues preventing consultation (full refund), Patient cancellation more than 2 hours before appointment (full refund). Refunds are processed within 5-7 business days to your original payment method."
  },
  {
    category: "privacy",
    question: "How is my health data protected?",
    answer: "Your health data is protected through: End-to-end encryption for all communications, HIPAA-compliant data storage, Regular security audits and penetration testing, Access controls ensuring only authorized personnel can access data, Secure backup and disaster recovery systems. We never sell or share your personal health information without your explicit consent."
  },
  {
    category: "privacy",
    question: "Who can access my medical information?",
    answer: "Your medical information can only be accessed by: You (the patient), Healthcare providers you've consulted with, Authorized appoint'd support staff (only for technical support, with your consent). We maintain detailed audit logs of all data access for your security and privacy."
  },
  {
    category: "technical",
    question: "What devices and browsers are supported?",
    answer: "appoint'd works on: Computers: Chrome, Firefox, Safari, Edge (latest versions), Mobile devices: iOS 12+ (Safari), Android 8+ (Chrome), Tablets: iPad (iOS 12+), Android tablets (Android 8+). For video consultations, ensure you have a camera and microphone."
  },
  {
    category: "technical",
    question: "I'm having trouble with video calls. What should I do?",
    answer: "For video call issues, try: Check your internet connection (minimum 1 Mbps recommended), Allow camera and microphone permissions in your browser, Close other applications using camera/microphone, Try refreshing the page or restarting your browser, Contact our technical support if issues persist. Our team is available to help during business hours."
  },
  {
    category: "technical",
    question: "How do I update my account information?",
    answer: "To update your account: Log into your dashboard, Go to 'Profile' or 'Settings', Edit the information you want to change, Save your changes. For sensitive information like email or phone number, you may need to verify the changes through OTP verification."
  },
];

export default function FAQPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredFaqs = faqData.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12" data-testid="hero-section">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Frequently Asked Questions</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Find answers to common questions about appoint'd. Can't find what you're looking for? 
              Contact our support team.
            </p>
          </div>

          {/* Search */}
          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search frequently asked questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-faq"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="mb-8" data-testid="category-filter">
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={selectedCategory === "all" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedCategory("all")}
                data-testid="category-all"
              >
                All Questions
              </Badge>
              {faqCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <Badge
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "outline"}
                    className="cursor-pointer flex items-center space-x-1"
                    onClick={() => setSelectedCategory(category.id)}
                    data-testid={`category-${category.id}`}
                  >
                    <Icon className="h-3 w-3" />
                    <span>{category.label}</span>
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* FAQ Content */}
          {filteredFaqs.length > 0 ? (
            <Card data-testid="faq-content">
              <CardContent className="p-6">
                <Accordion type="single" collapsible className="w-full">
                  {filteredFaqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger 
                        className="text-left"
                        data-testid={`faq-question-${index}`}
                      >
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent 
                        className="text-muted-foreground leading-relaxed"
                        data-testid={`faq-answer-${index}`}
                      >
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <HelpCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No questions found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search terms or browse different categories.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Still Need Help */}
          <div className="mt-16" data-testid="need-help-section">
            <Card>
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-6">
                  <Phone className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Still need help?</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Can't find the answer you're looking for? Our support team is here to help you.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <div className="text-center">
                    <p className="font-semibold">Email Support</p>
                    <p className="text-primary">support@medconnect.com</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">Phone Support</p>
                    <p className="text-primary">+91 9876543210</p>
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
