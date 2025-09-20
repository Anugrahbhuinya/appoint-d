import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Heart, Users, UserCog, Stethoscope, Shield, Video } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string(),
  role: z.enum(["patient", "doctor"]),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
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

  // Redirect if already logged in
  if (user) {
    const redirectPath = user.role === "admin" ? "/admin" : user.role === "doctor" ? "/doctor" : "/patient";
    setLocation(redirectPath);
    return null;
  }

  const onLogin = async (data: LoginData) => {
    try {
      await loginMutation.mutateAsync(data);
      const userRole = loginMutation.data?.role;
      if (userRole) {
        const redirectPath = userRole === "admin" ? "/admin" : userRole === "doctor" ? "/doctor" : "/patient";
        setLocation(redirectPath);
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const onRegister = async (data: RegisterData) => {
    try {
      const { confirmPassword, ...registerData } = data;
      await registerMutation.mutateAsync(registerData);
      const userRole = registerMutation.data?.role;
      if (userRole) {
        const redirectPath = userRole === "doctor" ? "/doctor" : "/patient";
        setLocation(redirectPath);
      }
    } catch (error) {
      console.error("Registration failed:", error);
    }
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
                <span className="text-2xl font-bold text-primary">MedConnect</span>
              </div>
              <h2 className="text-2xl font-bold">
                {isLogin ? "Welcome Back" : "Create Account"}
              </h2>
              <p className="text-muted-foreground mt-2">
                {isLogin ? "Choose your portal to continue" : "Join our healthcare platform"}
              </p>
            </div>

            {isLogin && (
              <div className="space-y-3 mb-6">
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  data-testid="button-patient-portal"
                  onClick={() => {/* Handle patient portal selection */}}
                >
                  <Users className="mr-3 h-4 w-4" />
                  Patient Portal
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  data-testid="button-doctor-portal"
                  onClick={() => {/* Handle doctor portal selection */}}
                >
                  <Stethoscope className="mr-3 h-4 w-4" />
                  Doctor Portal
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  data-testid="button-admin-portal"
                  onClick={() => {/* Handle admin portal selection */}}
                >
                  <UserCog className="mr-3 h-4 w-4" />
                  Admin Portal
                </Button>
              </div>
            )}

            {isLogin ? (
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4" data-testid="login-form">
                <div>
                  <Label htmlFor="username">Email or Username</Label>
                  <Input 
                    id="username"
                    type="text" 
                    placeholder="Enter your username or email"
                    data-testid="input-username"
                    {...loginForm.register("username")}
                  />
                  {loginForm.formState.errors.username && (
                    <p className="text-sm text-destructive mt-1">{loginForm.formState.errors.username.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password"
                    type="password" 
                    placeholder="Enter your password"
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
            ) : (
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
                  <Select onValueChange={(value) => registerForm.setValue("role", value as "patient" | "doctor")}>
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
