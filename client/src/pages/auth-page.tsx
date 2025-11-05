import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth"; // Keeping alias as per your project structure
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Heart, Users, UserCog, Stethoscope, Shield, Video } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/mongodb-schema"; // Keeping alias as per your project structure
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string(),
  role: z.enum(["patient", "doctor"]),
}).refine((data: any) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [selectedPortal, setSelectedPortal] = useState<"patient" | "doctor" | "admin" | null>(null);
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: "patient",
    },
  });

  /**
   * FIX: Handles navigation/redirection after successful login/registration.
   * This is moved to useEffect to prevent the "Cannot update a component while rendering a different component" warning.
   */
  useEffect(() => {
    if (user) {
      const redirectPath = user.role === "admin" ? "/admin" : user.role === "doctor" ? "/doctor" : "/patient";
      // setLocation is a side effect and must run after render
      setLocation(redirectPath);
    }
  }, [user, setLocation]); // Re-run effect whenever user object changes

  // If the user is present (meaning they are authenticated), return null 
  // immediately to stop rendering the AuthPage. The useEffect will handle navigation.
  if (user) {
    return null;
  }
  // ======================================================

  const onLogin = async (data: LoginData) => {
    try {
      // Handle admin login with hardcoded credentials
      if (selectedPortal === "admin") {
        if (data.username === "admin123" && data.password === "qwertyuiop1234567890") {
          // Create a mock admin user object
          const adminUser = {
            _id: "admin",
            username: "admin123",
            email: "admin@appointd.com",
            role: "admin" as const,
            firstName: "Admin",
            lastName: "User",
            isVerified: true,
            isActive: true,
            createdAt: new Date(),
          };
          
          // Set the admin user in the auth context
          localStorage.setItem("adminUser", JSON.stringify(adminUser));
          // For local storage admin login, we still call setLocation here 
          // to trigger the redirect immediately, as the 'user' object won't update
          // until the next query runs.
          setLocation("/admin");
          return;
        } else {
          throw new Error("Invalid admin credentials");
        }
      }
      
      const result = await loginMutation.mutateAsync(data);
      console.log("Login result:", result);
      
      // When loginMutation is successful, the 'user' object in useAuth should update, 
      // triggering the useEffect for navigation. We only keep this setLocation here
      // for redundancy/immediate feedback if necessary.
      if (result?.role) {
         const redirectPath = result.role === "admin" ? "/admin" : result.role === "doctor" ? "/doctor" : "/patient";
         setLocation(redirectPath);
      }

    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const onRegister = async (data: RegisterData) => {
    try {
      const { confirmPassword, ...registerData } = data;
      const result = await registerMutation.mutateAsync(registerData);
      console.log("Registration result:", result);
      
      // When registerMutation is successful, the 'user' object in useAuth should update, 
      // triggering the useEffect for navigation. We keep this setLocation for redundancy.
      if (result?.role) {
         const redirectPath = result.role === "doctor" ? "/doctor" : "/patient";
         setLocation(redirectPath);
      }

    } catch (error) {
      console.error("Registration failed:", error);
    }
  };

  const handlePortalSelection = (portal: "patient" | "doctor" | "admin") => {
    setSelectedPortal(portal);
    if (portal === "admin") {
      // For admin, we only show login form
      setIsLogin(true);
    } else {
      // For patient/doctor, show registration form
      setIsLogin(false);
      registerForm.setValue("role", portal);
    }
  };

  const resetPortalSelection = () => {
    setSelectedPortal(null);
    setIsLogin(true);
  };

  const clearAllData = () => {
    localStorage.removeItem("adminUser");
    setSelectedPortal(null);
    setIsLogin(true);
    // Force refresh the user query
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <Heart className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold text-primary">appoint'd</span>
              </div>
              <h2 className="text-2xl font-bold">
                {isLogin ? "Welcome Back" : "Create Account"}
              </h2>
              <p className="text-muted-foreground mt-2">
                {isLogin ? "Choose your portal to continue" : "Join our healthcare platform"}
              </p>
              {selectedPortal && (
                <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-primary">
                        {selectedPortal === "admin" ? "Admin Login" : 
                          selectedPortal === "doctor" ? "Doctor Portal" : "Patient Portal"}
                      </p>
                      {selectedPortal === "admin" && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Use admin credentials to access the admin panel
                        </p>
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={resetPortalSelection}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {isLogin && !selectedPortal && (
              <div className="space-y-3 mb-6">
                <Button 
                  variant={selectedPortal === "patient" ? "default" : "outline"}
                  className="w-full justify-start" 
                  data-testid="button-patient-portal"
                  onClick={() => handlePortalSelection("patient")}
                >
                  <Users className="mr-3 h-4 w-4" />
                  Patient Portal
                </Button>
                
                <Button 
                  variant={selectedPortal === "doctor" ? "default" : "outline"}
                  className="w-full justify-start"
                  data-testid="button-doctor-portal"
                  onClick={() => handlePortalSelection("doctor")}
                >
                  <Stethoscope className="mr-3 h-4 w-4" />
                  Doctor Portal
                </Button>
                
                
              </div>
            )}
            
            {/* Show login form if selected portal or if isLogin is true and no portal is selected (initial view) */}
            {isLogin && selectedPortal && (
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4" data-testid="login-form">
                <div>
                  <Label htmlFor="username">
                    {selectedPortal === "admin" ? "Admin Username" : "Email or Username"}
                  </Label>
                  <Input 
                    id="username"
                    type="text" 
                    placeholder={selectedPortal === "admin" ? "Enter admin username" : "Enter your username or email"}
                    data-testid="input-username"
                    {...loginForm.register("username")}
                  />
                  {loginForm.formState.errors.username && (
                    <p className="text-sm text-destructive mt-1">{loginForm.formState.errors.username.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password">
                    {selectedPortal === "admin" ? "Admin Password" : "Password"}
                  </Label>
                  <Input 
                    id="password"
                    type="password" 
                    placeholder={selectedPortal === "admin" ? "Enter admin password" : "Enter your password"}
                    data-testid="input-password"
                    {...loginForm.register("password")}
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive mt-1">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="remember" />
                    <Label htmlFor="remember">Remember me</Label>
                  </div>
                  <Button variant="link" className="p-0 text-primary hover:underline">
                    Forgot password?
                  </Button>
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={loginMutation.isPending}
                  data-testid="button-sign-in"
                >
                  {loginMutation.isPending ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            )}

            {!isLogin && selectedPortal && ( // Only show register form if a portal is selected
              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4" data-testid="register-form">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName"
                      type="text"
                      data-testid="input-firstname"
                      {...registerForm.register("firstName")}
                    />
                    {registerForm.formState.errors.firstName && (
                      <p className="text-sm text-destructive mt-1">{registerForm.formState.errors.firstName.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName"
                      type="text"
                      data-testid="input-lastname"
                      {...registerForm.register("lastName")}
                    />
                    {registerForm.formState.errors.lastName && (
                      <p className="text-sm text-destructive mt-1">{registerForm.formState.errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input 
                    id="username"
                    type="text"
                    data-testid="input-register-username"
                    {...registerForm.register("username")}
                  />
                  {registerForm.formState.errors.username && (
                    <p className="text-sm text-destructive mt-1">{registerForm.formState.errors.username.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email"
                    type="email"
                    data-testid="input-email"
                    {...registerForm.register("email")}
                  />
                  {registerForm.formState.errors.email && (
                    <p className="text-sm text-destructive mt-1">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone"
                    type="tel"
                    data-testid="input-phone"
                    {...registerForm.register("phone")}
                  />
                </div>

                <div>
                  <Label htmlFor="role">User Type</Label>
                  <Select 
                    value={registerForm.getValues("role")} 
                    onValueChange={(value) => registerForm.setValue("role", value as "patient" | "doctor")}>
                    <SelectTrigger data-testid="select-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="patient">Patient</SelectItem>
                      <SelectItem value="doctor">Doctor</SelectItem>
                    </SelectContent>
                  </Select>
                  {registerForm.formState.errors.role && (
                    <p className="text-sm text-destructive mt-1">{registerForm.formState.errors.role.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password"
                    type="password"
                    data-testid="input-register-password"
                    {...registerForm.register("password")}
                  />
                  {registerForm.formState.errors.password && (
                    <p className="text-sm text-destructive mt-1">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input 
                    id="confirmPassword"
                    type="password"
                    data-testid="input-confirm-password"
                    {...registerForm.register("confirmPassword")}
                  />
                  {registerForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive mt-1">{registerForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2 text-sm">
                  <Checkbox id="terms" />
                  <Label htmlFor="terms">
                    I agree to the <Button variant="link" className="p-0 text-primary hover:underline">Terms & Privacy Policy</Button>
                  </Label>
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={registerMutation.isPending}
                  data-testid="button-create-account"
                >
                  {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            )}

            {/* Show toggle button only if a portal is selected, or if showing login forms */}
            <p className="text-center text-sm text-muted-foreground mt-6">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <Button 
                variant="link" 
                className="p-0 ml-1 text-primary hover:underline"
                onClick={() => setIsLogin(!isLogin)}
                data-testid="button-toggle-form"
              >
                {isLogin ? "Sign up here" : "Sign in here"}
              </Button>
            </p>
            
            {/* Debug button - remove in production */}
            <div className="mt-4 text-center">
              
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Side - Hero */}
      <div className="hidden lg:flex flex-1 bg-primary/5 items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="mb-8">
            <div className="bg-primary/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-4">
              Healthcare Made Simple
            </h2>
            <p className="text-muted-foreground mb-6">
              Connect with trusted doctors, book appointments instantly, and manage your health records securely.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm">Verified healthcare professionals</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center">
                <Video className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm">Secure video consultations</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center">
                <Heart className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm">Trusted by thousands of patients</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
