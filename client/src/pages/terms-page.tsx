import Navigation from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Shield, FileText, Users, Lock, AlertTriangle, Mail } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12" data-testid="hero-section">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Terms & Privacy Policy</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our commitment to protecting your privacy and ensuring transparent, fair terms of service.
            </p>
            <div className="flex items-center justify-center space-x-4 mt-6">
              <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                <Shield className="w-3 h-3 mr-1" />
                HIPAA Compliant
              </Badge>
              <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                <Lock className="w-3 h-3 mr-1" />
                SSL Encrypted
              </Badge>
            </div>
          </div>

          {/* Quick Navigation */}
          <Card className="mb-8" data-testid="quick-nav">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Quick Navigation</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <a href="#terms-of-service" className="text-primary hover:underline">Terms of Service</a>
                <a href="#privacy-policy" className="text-primary hover:underline">Privacy Policy</a>
                <a href="#medical-disclaimer" className="text-primary hover:underline">Medical Disclaimer</a>
                <a href="#user-responsibilities" className="text-primary hover:underline">User Responsibilities</a>
                <a href="#data-protection" className="text-primary hover:underline">Data Protection</a>
                <a href="#contact-info" className="text-primary hover:underline">Contact Information</a>
              </div>
            </CardContent>
          </Card>

          {/* Last Updated */}
          <div className="text-center mb-8 text-muted-foreground">
            <p data-testid="last-updated">Last Updated: December 15, 2023</p>
          </div>

          <div className="space-y-12">
            {/* Terms of Service */}
            <section id="terms-of-service" data-testid="terms-section">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Terms of Service</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">1. Acceptance of Terms</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      By accessing and using MedConnect ("the Platform"), you accept and agree to be bound by the terms 
                      and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">2. Description of Service</h3>
                    <p className="text-muted-foreground leading-relaxed mb-3">
                      MedConnect is a telemedicine platform that facilitates connections between patients and licensed 
                      healthcare providers. Our services include:
                    </p>
                    <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                      <li>Video and audio consultations with verified doctors</li>
                      <li>Appointment scheduling and management</li>
                      <li>Digital prescription services</li>
                      <li>Secure health record storage</li>
                      <li>Payment processing for medical services</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">3. User Accounts</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      You are responsible for safeguarding the password and all activities that occur under your account. 
                      You must notify us immediately of any unauthorized use of your account. We reserve the right to 
                      terminate accounts that violate these terms.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">4. Payment Terms</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      All payments are processed securely through our certified payment gateway. Consultation fees are 
                      charged at the time of booking. Refunds are available according to our cancellation policy. 
                      The platform charges a service fee for facilitating the connection between patients and providers.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">5. Cancellation and Refund Policy</h3>
                    <div className="text-muted-foreground leading-relaxed space-y-2">
                      <p><strong>Patient Cancellations:</strong></p>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>Cancellations more than 2 hours before appointment: Full refund</li>
                        <li>Cancellations within 2 hours: 50% refund</li>
                        <li>No-shows: No refund</li>
                      </ul>
                      <p><strong>Doctor Cancellations:</strong> Full refund to patient</p>
                      <p><strong>Technical Issues:</strong> Full refund if consultation cannot proceed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <Separator />

            {/* Privacy Policy */}
            <section id="privacy-policy" data-testid="privacy-section">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Privacy Policy</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Information We Collect</h3>
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-foreground">Personal Information:</h4>
                        <p className="text-muted-foreground">Name, email address, phone number, date of birth, address, and emergency contact information.</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Health Information:</h4>
                        <p className="text-muted-foreground">Medical history, symptoms, diagnoses, treatment plans, prescriptions, and consultation notes.</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Technical Information:</h4>
                        <p className="text-muted-foreground">IP address, device information, browser type, and usage patterns for improving our services.</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">How We Use Your Information</h3>
                    <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                      <li>Facilitate medical consultations and appointments</li>
                      <li>Process payments and maintain transaction records</li>
                      <li>Communicate important updates and notifications</li>
                      <li>Improve our platform and user experience</li>
                      <li>Comply with legal and regulatory requirements</li>
                      <li>Ensure platform security and prevent fraud</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Data Protection & Security</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium text-foreground">Encryption:</h4>
                        <p className="text-muted-foreground text-sm">All data is encrypted in transit and at rest using industry-standard AES-256 encryption.</p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium text-foreground">Access Controls:</h4>
                        <p className="text-muted-foreground text-sm">Strict access controls ensure only authorized personnel can access your data.</p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium text-foreground">HIPAA Compliance:</h4>
                        <p className="text-muted-foreground text-sm">We comply with HIPAA regulations for healthcare data protection.</p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium text-foreground">Regular Audits:</h4>
                        <p className="text-muted-foreground text-sm">Regular security audits and penetration testing ensure platform security.</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Information Sharing</h3>
                    <p className="text-muted-foreground leading-relaxed mb-3">
                      We do not sell, trade, or otherwise transfer your personal information to third parties except in the following circumstances:
                    </p>
                    <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                      <li>With healthcare providers for the purpose of your medical care</li>
                      <li>With payment processors for transaction processing</li>
                      <li>When required by law or legal process</li>
                      <li>To protect the rights and safety of our users and the public</li>
                      <li>With your explicit consent</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </section>

            <Separator />

            {/* Medical Disclaimer */}
            <section id="medical-disclaimer" data-testid="medical-disclaimer-section">
              <Card className="border-orange-500/20 bg-orange-500/5">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center space-x-2">
                    <AlertTriangle className="h-6 w-6 text-orange-500" />
                    <span>Medical Disclaimer</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-orange-500/10 p-4 rounded-lg">
                    <h3 className="font-semibold text-orange-600 mb-2">Important Notice</h3>
                    <p className="text-muted-foreground text-sm">
                      MedConnect is a platform that facilitates connections between patients and healthcare providers. 
                      We do not practice medicine or provide medical advice directly.
                    </p>
                  </div>
                  
                  <div className="space-y-3 text-muted-foreground">
                    <p>
                      <strong>Not for Emergencies:</strong> This platform is not intended for emergency medical situations. 
                      In case of a medical emergency, call your local emergency number (102) or visit the nearest emergency room.
                    </p>
                    <p>
                      <strong>Doctor-Patient Relationship:</strong> The medical advice and treatment provided through our platform 
                      establish a doctor-patient relationship between you and the individual healthcare provider, not with MedConnect.
                    </p>
                    <p>
                      <strong>Verification:</strong> While we verify the credentials of healthcare providers on our platform, 
                      you should always verify their qualifications and seek second opinions when necessary.
                    </p>
                    <p>
                      <strong>Limitations:</strong> Telemedicine has limitations. Some conditions require in-person examination, 
                      diagnostic tests, or procedures that cannot be provided through remote consultations.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>

            <Separator />

            {/* User Responsibilities */}
            <section id="user-responsibilities" data-testid="user-responsibilities-section">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center space-x-2">
                    <Users className="h-6 w-6" />
                    <span>User Responsibilities</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">For Patients</h3>
                    <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                      <li>Provide accurate and complete medical history</li>
                      <li>Follow prescribed treatment plans and medication instructions</li>
                      <li>Attend scheduled appointments or cancel with appropriate notice</li>
                      <li>Maintain confidentiality of login credentials</li>
                      <li>Report any technical issues or concerns promptly</li>
                      <li>Use the platform responsibly and respectfully</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">For Healthcare Providers</h3>
                    <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                      <li>Maintain valid medical licenses and certifications</li>
                      <li>Provide quality medical care within scope of practice</li>
                      <li>Maintain professional standards and ethical conduct</li>
                      <li>Keep patient information confidential</li>
                      <li>Update availability and respond to patients promptly</li>
                      <li>Report any platform issues or security concerns</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Prohibited Activities</h3>
                    <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                      <li>Sharing account credentials with others</li>
                      <li>Using the platform for illegal activities</li>
                      <li>Harassment or inappropriate behavior</li>
                      <li>Attempting to bypass security measures</li>
                      <li>Misrepresenting qualifications or medical conditions</li>
                      <li>Violation of patient privacy or confidentiality</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </section>

            <Separator />

            {/* Data Protection */}
            <section id="data-protection" data-testid="data-protection-section">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center space-x-2">
                    <Shield className="h-6 w-6" />
                    <span>Data Protection Rights</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-muted-foreground leading-relaxed">
                    Under applicable data protection laws, you have the following rights regarding your personal information:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-2">Right to Access</h3>
                      <p className="text-muted-foreground text-sm">Request copies of your personal data we hold.</p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Right to Rectification</h3>
                      <p className="text-muted-foreground text-sm">Request correction of inaccurate personal data.</p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Right to Erasure</h3>
                      <p className="text-muted-foreground text-sm">Request deletion of your personal data under certain conditions.</p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Right to Restrict Processing</h3>
                      <p className="text-muted-foreground text-sm">Request restriction of processing your personal data.</p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Right to Data Portability</h3>
                      <p className="text-muted-foreground text-sm">Request transfer of your data to another organization.</p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Right to Object</h3>
                      <p className="text-muted-foreground text-sm">Object to processing of your personal data.</p>
                    </div>
                  </div>

                  <div className="bg-muted/20 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Data Retention</h4>
                    <p className="text-muted-foreground text-sm">
                      We retain your data for as long as necessary to provide our services and comply with legal obligations. 
                      Medical records are typically retained for 7 years as required by healthcare regulations.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>

            <Separator />

            {/* Contact Information */}
            <section id="contact-info" data-testid="contact-section">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center space-x-2">
                    <Mail className="h-6 w-6" />
                    <span>Contact Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-3">Privacy Officer</h3>
                      <p className="text-muted-foreground text-sm mb-2">
                        For privacy-related questions and data protection requests:
                      </p>
                      <p className="text-primary">privacy@medconnect.com</p>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold mb-3">Legal Department</h3>
                      <p className="text-muted-foreground text-sm mb-2">
                        For legal matters and terms of service questions:
                      </p>
                      <p className="text-primary">legal@medconnect.com</p>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">General Support</h3>
                      <p className="text-muted-foreground text-sm mb-2">
                        For general platform support and assistance:
                      </p>
                      <p className="text-primary">support@medconnect.com</p>
                      <p className="text-primary">+91 9876543210</p>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">Mailing Address</h3>
                      <p className="text-muted-foreground text-sm">
                        MedConnect Healthcare Pvt. Ltd.<br />
                        123 Medical Plaza<br />
                        Ranchi, Jharkhand 834001<br />
                        India
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>

          {/* Footer Notice */}
          <div className="mt-16 text-center text-muted-foreground text-sm" data-testid="footer-notice">
            <p>
              This document was last updated on December 15, 2023. We may update these terms and policies 
              from time to time. Please review them periodically for any changes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
