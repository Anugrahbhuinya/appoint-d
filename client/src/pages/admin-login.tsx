import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Shield, AlertCircle } from "lucide-react";
// FIX: Using relative path based on the common structure: 
// client/src/pages/admin-login.tsx -> client/src/lib/queryClient
// This requires going up one directory (pages) and then down into lib.
import { apiRequest } from "../lib/queryClient"; 

const adminLoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type AdminLoginData = z.infer<typeof adminLoginSchema>;

// Removed: Hardcoded Admin Credentials

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<AdminLoginData>({
    resolver: zodResolver(adminLoginSchema),
  });

  const onLogin = async (data: AdminLoginData) => {
    setIsLoading(true);
    setError("");

    try {
      // === DATABASE ADMIN AUTHENTICATION VIA API ===
      const response = await apiRequest("POST", "/api/login", {
        // We use 'username' field to send the identifier (username or email)
        username: data.username, 
        password: data.password,
      });
      const user = await response.json();
      
      if (user.role === "admin") {
        // Check succeeded: User is authenticated and is an admin
        
        // Store user details for client-side state management
        localStorage.setItem("adminUser", JSON.stringify(user));

        // Redirect to admin dashboard
        setLocation("/admin-portal");
        
      } else {
        // Authentication succeeded, but user is NOT an admin
        setError("User authenticated, but requires Admin access.");
      }
      
    } catch (error: any) {
      // Failed API call (401 Unauthorized, 404 Not Found, etc.)
      const message = error.message.includes("401")
        ? "Invalid username or password."
        : error.message;
        
      setError(message || "Login failed. Please try again.");
      console.error("Admin login error:", error); 
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Heart className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-primary">appoint'd</span>
            </div>
            <CardTitle className="2xl">Admin Portal</CardTitle>
            <p className="text-muted-foreground">
              Enter your admin credentials to access the management dashboard
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onLogin)} className="space-y-4">
              {error && (
                <div className="flex items-center space-x-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div>
                <Label htmlFor="username">Admin Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter admin username"
                  {...form.register("username")}
                  disabled={isLoading}
                />
                {form.formState.errors.username && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.username.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="password">Admin Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter admin password"
                  {...form.register("password")}
                  disabled={isLoading}
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Secure Admin Access</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
