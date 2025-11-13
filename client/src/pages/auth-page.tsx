import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/mongodb-schema";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { UserCircle, Stethoscope, ArrowRight, Mail, Lock, User, Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AnimatedBackground } from "@/components/AnimatedBackground";

// --- SCHEMAS ---
const loginSchema = z.object({
  username: z.string().min(1, "Username/Email is required"),
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
  const { toast } = useToast();

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: "patient",
    },
  });

  useEffect(() => {
    if (user) {
      const redirectPath = user.role === "admin" ? "/admin" : user.role === "doctor" ? "/doctor" : "/patient";
      setLocation(redirectPath);
    }
  }, [user, setLocation]);

  if (user) return null;

  const handlePortalSelect = (portal: "patient" | "doctor") => {
    setSelectedPortal(portal);
    if (!isLogin) {
      registerForm.setValue("role", portal);
    }
  };

  const onLogin = async (data: LoginData) => {
    try {
      if (data.username === "admin123" && data.password === "qwertyuiop1234567890") {
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
          localStorage.setItem("adminUser", JSON.stringify(adminUser));
          setLocation("/admin");
          return;
      }

      await loginMutation.mutateAsync(data);
    } catch (error) {
      console.error("Login failed:", error);
      toast({ title: "Login Failed", description: "Invalid credentials", variant: "destructive" });
    }
  };

  const onRegister = async (data: RegisterData) => {
    try {
      const { confirmPassword, ...registerData } = data;
      await registerMutation.mutateAsync(registerData);
      toast({ title: "Account Created", description: "Please log in to continue." });
      setIsLogin(true); 
      setSelectedPortal(data.role); 
    } catch (error: any) {
      console.error("Registration failed:", error);
      toast({ title: "Registration Failed", description: error.message || "Could not create account", variant: "destructive" });
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setSelectedPortal(null);
    loginForm.reset();
    registerForm.reset();
  };

  const handleBack = () => {
    setSelectedPortal(null);
    loginForm.reset();
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      <AnimatedBackground />
      
      <div className="relative z-10 w-full max-w-md">
        <AnimatePresence mode="wait">
          {isLogin ? (
            <motion.div
              key="signin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              // --- FIX: Reduced duration from 0.4 to 0.1 for snappy transition ---
              transition={{ duration: 0.1 }}
              // --- END FIX ---
              className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 md:p-10 shadow-2xl w-full max-w-md"
            >
              <div className="flex items-center justify-center mb-8">
                <span className="text-3xl text-white font-bold" style={{ fontFamily: 'Comfortaa, sans-serif' }}>appoint'd</span>
              </div>

              {!selectedPortal ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <h1 className="text-white text-xl font-semibold mb-2 text-center">Welcome Back</h1>
                  <p className="text-zinc-500 mb-8 text-center text-sm">Choose your portal to continue</p>

                  <div className="space-y-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handlePortalSelect('patient')}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border border-zinc-800 hover:border-orange-600 transition-all bg-zinc-900/50 text-left group"
                    >
                      <div className="p-3 rounded-xl bg-orange-600/10 border border-orange-600/30 group-hover:bg-orange-600/20 transition-colors">
                        <UserCircle className="w-6 h-6 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <span className="text-white block font-medium">Patient Portal</span>
                        <span className="text-zinc-500 text-xs">Book consultations</span>
                      </div>
                      <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-orange-600 transition-colors" />
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handlePortalSelect('doctor')}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border border-zinc-800 hover:border-teal-600 transition-all bg-zinc-900/50 text-left group"
                    >
                      <div className="p-3 rounded-xl bg-teal-600/10 border border-teal-600/30 group-hover:bg-teal-600/20 transition-colors">
                        <Stethoscope className="w-6 h-6 text-teal-600" />
                      </div>
                      <div className="flex-1">
                        <span className="text-white block font-medium">Doctor Portal</span>
                        <span className="text-zinc-500 text-xs">Manage patients</span>
                      </div>
                      <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-teal-600 transition-colors" />
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }} // Slightly faster form appearance
                >
                  <button
                    onClick={handleBack}
                    className="text-zinc-500 hover:text-white transition-colors mb-6 flex items-center gap-2 text-sm"
                  >
                    ← Back
                  </button>

                  <div className="mb-6 text-center">
                    <h1 className="text-white text-xl font-semibold mb-2">Sign In</h1>
                    <div className="flex items-center justify-center gap-2 text-sm">
                      {selectedPortal === 'patient' ? (
                        <>
                          <UserCircle className="w-4 h-4 text-orange-600" />
                          <span className="text-orange-600">Patient Portal</span>
                        </>
                      ) : (
                        <>
                          <Stethoscope className="w-4 h-4 text-teal-600" />
                          <span className="text-teal-600">Doctor Portal</span>
                        </>
                      )}
                    </div>
                  </div>

                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-zinc-400">Username or Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                        <Input
                          id="username"
                          type="text"
                          placeholder="Enter username"
                          {...loginForm.register("username")}
                          className={`pl-12 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 h-12 rounded-xl focus-visible:ring-0 ${
                            selectedPortal === 'patient' ? 'focus:border-orange-600' : 'focus:border-teal-600'
                          }`}
                        />
                      </div>
                      {loginForm.formState.errors.username && (
                        <p className="text-red-500 text-xs">{loginForm.formState.errors.username.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-zinc-400">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          {...loginForm.register("password")}
                          className={`pl-12 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 h-12 rounded-xl focus-visible:ring-0 ${
                            selectedPortal === 'patient' ? 'focus:border-orange-600' : 'focus:border-teal-600'
                          }`}
                        />
                      </div>
                      {loginForm.formState.errors.password && (
                        <p className="text-red-500 text-xs">{loginForm.formState.errors.password.message}</p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={loginMutation.isPending}
                      className={`w-full h-12 rounded-xl text-white font-medium ${
                        selectedPortal === 'patient'
                          ? 'bg-orange-600 hover:bg-orange-700'
                          : 'bg-teal-600 hover:bg-teal-700'
                      }`}
                    >
                      {loginMutation.isPending ? <Loader2 className="animate-spin" /> : "Sign In"}
                    </Button>
                  </form>
                </motion.div>
              )}

              <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
                <p className="text-zinc-500 text-sm">
                  Don't have an account?{' '}
                  <button onClick={toggleMode} className="text-white hover:underline transition-colors">
                    Sign up here
                  </button>
                </p>
              </div>
            </motion.div>
          ) : (
            // =================================================================
            // SIGN UP VIEW
            // =================================================================
            <motion.div
              key="signup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              // --- FIX: Reduced duration from 0.4 to 0.1 for snappy transition ---
              transition={{ duration: 0.1 }}
              // --- END FIX ---
              className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 md:p-10 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto hide-scrollbar"
            >
              <div className="flex items-center justify-center mb-6">
                <span className="text-3xl text-white font-bold" style={{ fontFamily: 'Comfortaa, sans-serif' }}>appoint'd</span>
              </div>

              <div className="text-center mb-6">
                <h1 className="text-white text-xl font-semibold mb-2">Create Account</h1>
                <p className="text-zinc-500 text-sm">Join the future of healthcare</p>
              </div>

              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                
                <div className="space-y-2">
                  <Label className="text-zinc-400">User Type</Label>
                  <Select
                    value={registerForm.watch("role")}
                    onValueChange={(val) => registerForm.setValue("role", val as "patient" | "doctor")}
                  >
                    <SelectTrigger className="bg-zinc-900/50 border-zinc-800 text-white h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      <SelectItem value="patient">Patient</SelectItem>
                      <SelectItem value="doctor">Doctor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-zinc-400">First Name</Label>
                    <Input
                      {...registerForm.register("firstName")}
                      className="bg-zinc-900/50 border-zinc-800 text-white h-12 rounded-xl focus:border-white"
                      placeholder="John"
                    />
                    {registerForm.formState.errors.firstName && <p className="text-red-500 text-xs">{registerForm.formState.errors.firstName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Last Name</Label>
                    <Input
                      {...registerForm.register("lastName")}
                      className="bg-zinc-900/50 border-zinc-800 text-white h-12 rounded-xl focus:border-white"
                      placeholder="Doe"
                    />
                    {registerForm.formState.errors.lastName && <p className="text-red-500 text-xs">{registerForm.formState.errors.lastName.message}</p>}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-zinc-400">Username</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <Input
                      {...registerForm.register("username")}
                      className="pl-11 bg-zinc-900/50 border-zinc-800 text-white h-12 rounded-xl focus:border-white"
                      placeholder="johndoe"
                    />
                  </div>
                  {registerForm.formState.errors.username && <p className="text-red-500 text-xs">{registerForm.formState.errors.username.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-400">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <Input
                      type="email"
                      {...registerForm.register("email")}
                      className="pl-11 bg-zinc-900/50 border-zinc-800 text-white h-12 rounded-xl focus:border-white"
                      placeholder="john@example.com"
                    />
                  </div>
                  {registerForm.formState.errors.email && <p className="text-red-500 text-xs">{registerForm.formState.errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-400">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <Input
                      type="tel"
                      {...registerForm.register("phone")}
                      className="pl-11 bg-zinc-900/50 border-zinc-800 text-white h-12 rounded-xl focus:border-white"
                      placeholder="+91 9876543210"
                    />
                  </div>
                  {registerForm.formState.errors.phone && <p className="text-red-500 text-xs">{registerForm.formState.errors.phone.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-400">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <Input
                      type="password"
                      {...registerForm.register("password")}
                      className="pl-11 bg-zinc-900/50 border-zinc-800 text-white h-12 rounded-xl focus:border-white"
                      placeholder="••••••••"
                    />
                  </div>
                  {registerForm.formState.errors.password && <p className="text-red-500 text-xs">{registerForm.formState.errors.password.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-400">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <Input
                      type="password"
                      {...registerForm.register("confirmPassword")}
                      className="pl-11 bg-zinc-900/50 border-zinc-800 text-white h-12 rounded-xl focus:border-white"
                      placeholder="••••••••"
                    />
                  </div>
                  {registerForm.formState.errors.confirmPassword && <p className="text-red-500 text-xs">{registerForm.formState.errors.confirmPassword.message}</p>}
                </div>

                <Button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="w-full h-12 rounded-xl bg-white hover:bg-zinc-200 text-black font-medium mt-4"
                >
                  {registerMutation.isPending ? <Loader2 className="animate-spin" /> : "Create Account"}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
                <p className="text-zinc-500 text-sm">
                  Already have an account?{' '}
                  <button onClick={toggleMode} className="text-white hover:underline transition-colors">
                    Sign in here
                  </button>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}