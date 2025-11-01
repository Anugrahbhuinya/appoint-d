import { useState } from "react";
// FIX: Using placeholder functions/components for external dependencies
const useAuth = () => ({ 
  user: { firstName: "Admin", lastName: "User", role: "admin" },
  logoutMutation: { mutate: () => console.log("Logout triggered") }
});
const useToast = () => ({ toast: (options: any) => console.log("Toast:", options) });
const apiRequest = async (method: string, url: string, data?: any) => {
    console.log(`MOCK API CALL: ${method} ${url}`, data);
    return { 
        json: async () => ({ success: true }), 
        ok: true, 
        status: 200, 
        statusText: "OK" 
    };
};
// Dummy Components for Imports
const Navigation = () => <div className="p-4 bg-primary text-primary-foreground text-sm font-semibold shadow-md">Admin Navigation Bar</div>;
const AdminDocumentVerification = () => <Card className="p-4"><p className="text-muted-foreground">Document Verification Component</p></Card>;
const AdminDoctorManagement = () => <Card className="p-4"><p className="text-muted-foreground">Doctor Management Component</p></Card>;
const AdminPatientManagement = () => <Card className="p-4"><p className="text-muted-foreground">Patient Management Component</p></Card>;


import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  UserCheck, 
  AlertTriangle, 
  BarChart3, 
  Settings, 
  TrendingUp,
  DollarSign,
  Calendar,
  ShieldCheck,
  Clock,
  CheckCircle,
  XCircle,
  FileText
} from "lucide-react";

interface PendingDoctor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  profile: {
    specialization: string;
    experience: number;
    consultationFee: number;
    licenseNumber: string;
    isApproved: boolean;
  };
}

interface Analytics {
  totalUsers: number;
  totalDoctors: number;
  totalPatients: number;
  totalAppointments: number;
  totalRevenue: number;
  monthlyAppointments: number;
}

export default function AdminPortal() {
  const { user, logoutMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect if not admin
  if (user?.role !== "admin") {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
        <p className="text-muted-foreground">This portal is only accessible to administrators.</p>
      </div>
    </div>;
  }

  const { data: pendingDoctors = [] } = useQuery<PendingDoctor[]>({
    queryKey: ["/api/admin/pending-verifications"],
    // Mocking data to ensure dashboard displays something
    initialData: [{ 
        id: '12345', 
        firstName: 'Test', 
        lastName: 'Doctor', 
        email: 'test@doc.com', 
        role: 'doctor', 
        profile: { specialization: 'General', experience: 5, consultationFee: 500, licenseNumber: 'A123', isApproved: false } 
    }]
  });

  const { data: analytics = { totalUsers: 150, totalDoctors: 25, totalPatients: 125, totalAppointments: 300, totalRevenue: 150000, monthlyAppointments: 80 } } = useQuery<Analytics>({
    queryKey: ["/api/admin/analytics"],
  });

  const verifyDoctorMutation = useMutation({
    mutationFn: async ({ doctorId, approved }: { doctorId: string; approved: boolean }) => {
      const res = await apiRequest("POST", `/api/admin/verify-doctor/${doctorId}`, { approved });
      return res.json();
    },
    onSuccess: (_, variables) => {
      // CRITICAL FIX: Invalidate caches to force patient/doctor apps to fetch new status
      
      // 1. Invalidate the specific doctor's public profile (key used by Appointment Booking Modal/Patient App)
      queryClient.invalidateQueries({ queryKey: ["/api/doctors", variables.doctorId] });

      // 2. Invalidate the doctor's self-managed profile (for the Doctor Portal itself)
      queryClient.invalidateQueries({ queryKey: ["/api/doctor/profile"] });

      // 3. Invalidate general doctor list query (if used for search pages)
      queryClient.invalidateQueries({ queryKey: ["/api/doctors"] });
      
      // Existing admin invalidations
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-verifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
      toast({
        title: variables.approved ? "Doctor Approved" : "Doctor Rejected",
        description: `Doctor verification ${variables.approved ? "approved" : "rejected"} successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleVerifyDoctor = (doctorId: string, approved: boolean) => {
    // FIX: Call the mutation hook's mutate function
    verifyDoctorMutation.mutate({ doctorId, approved });
  };

  const mockActivities = [
    { description: "New doctor registration: Dr. Sharma", time: "2 mins ago", color: "bg-chart-1" },
    { description: "Payment processed: ₹500", time: "5 mins ago", color: "bg-chart-2" },
    { description: "User reported issue resolved", time: "1 hour ago", color: "bg-chart-3" },
    { description: "Doctor verification completed", time: "2 hours ago", color: "bg-chart-4" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-card border-r border-border min-h-screen">
          <div className="p-6">
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-primary font-semibold">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold" data-testid="text-admin-name">
                    {user.firstName} {user.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">Administrator</p>
                </div>
              </div>
              <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                <ShieldCheck className="w-3 h-3 mr-1" />
                Admin Access
              </Badge>
            </div>

            <nav className="space-y-2">
              <Button
                variant={activeTab === "dashboard" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("dashboard")}
                data-testid="button-dashboard"
              >
                <TrendingUp className="w-4 h-4 mr-3" />
                Dashboard
              </Button>
              <Button
                variant={activeTab === "doctors" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("doctors")}
                data-testid="button-doctors"
              >
                <UserCheck className="w-4 h-4 mr-3" />
                Doctor Management
              </Button>
              <Button
                variant={activeTab === "documents" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("documents")}
                data-testid="button-documents"
              >
                <FileText className="w-4 h-4 mr-3" />
                Document Verification
              </Button>
              <Button
                variant={activeTab === "patients" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("patients")}
                data-testid="button-patients"
              >
                <Users className="w-4 h-4 mr-3" />
                Patient Management
              </Button>
              <Button
                variant={activeTab === "disputes" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("disputes")}
                data-testid="button-disputes"
              >
                <AlertTriangle className="w-4 h-4 mr-3" />
                Disputes
              </Button>
              <Button
                variant={activeTab === "analytics" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("analytics")}
                data-testid="button-analytics"
              >
                <BarChart3 className="w-4 h-4 mr-3" />
                Analytics
              </Button>
              <Button
                variant={activeTab === "settings" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("settings")}
                data-testid="button-settings"
              >
                <Settings className="w-4 h-4 mr-3" />
                Settings
              </Button>
            </nav>

            <div className="mt-8 pt-8 border-t border-border">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => logoutMutation.mutate()}
                data-testid="button-logout"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {activeTab === "dashboard" && (
            <div data-testid="dashboard-content">
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
                <p className="text-muted-foreground">Platform overview and key metrics</p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Total Users</p>
                        <p className="text-2xl font-bold text-primary" data-testid="stat-total-users">
                          {analytics.totalUsers}
                        </p>
                        <p className="text-green-400 text-xs">+12% from last month</p>
                      </div>
                      <Users className="w-8 h-8 text-primary/60" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Active Doctors</p>
                        <p className="text-2xl font-bold text-primary" data-testid="stat-active-doctors">
                          {analytics.totalDoctors}
                        </p>
                        <p className="text-green-400 text-xs">+8% from last month</p>
                      </div>
                      <UserCheck className="w-8 h-8 text-primary/60" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Monthly Revenue</p>
                        <p className="text-2xl font-bold text-primary" data-testid="stat-monthly-revenue">
                          ₹{analytics.totalRevenue.toLocaleString()}
                        </p>
                        <p className="text-green-400 text-xs">+15% from last month</p>
                      </div>
                      <DollarSign className="w-8 h-8 text-primary/60" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Pending Verifications</p>
                        <p className="text-2xl font-bold text-primary" data-testid="stat-pending-verifications">
                          {pendingDoctors.length}
                        </p>
                        <p className="text-orange-400 text-xs">Needs attention</p>
                      </div>
                      <Clock className="w-8 h-8 text-primary/60" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Activities */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Platform Activities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-chart-1 rounded-full"></div>
                        <p className="text-sm">New doctor registration: Dr. Sharma</p>
                        <span className="text-muted-foreground text-xs ml-auto">2 mins ago</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-chart-2 rounded-full"></div>
                        <p className="text-sm">Payment processed: ₹500</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-chart-3 rounded-full"></div>
                        <p className="text-sm">User reported issue resolved</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-chart-4 rounded-full"></div>
                        <p className="text-sm">Doctor verification completed</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start"
                        onClick={() => setActiveTab("doctors")}
                        data-testid="quick-verify-doctors"
                      >
                        <UserCheck className="w-6 h-6 text-primary mb-2" />
                        <p className="font-medium">Verify Doctors</p>
                        <p className="text-sm text-muted-foreground">{pendingDoctors.length} pending</p>
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start"
                        onClick={() => setActiveTab("disputes")}
                        data-testid="quick-handle-disputes"
                      >
                        <AlertTriangle className="w-6 h-6 text-destructive mb-2" />
                        <p className="font-medium">Handle Disputes</p>
                        <p className="text-sm text-muted-foreground">5 active</p>
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start"
                        onClick={() => setActiveTab("patients")}
                        data-testid="quick-manage-patients"
                      >
                        <Users className="w-6 h-6 text-chart-1 mb-2" />
                        <p className="font-medium">Manage Patients</p>
                        <p className="text-sm text-muted-foreground">{analytics.totalPatients} total</p>
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start"
                        onClick={() => setActiveTab("analytics")}
                        data-testid="quick-view-analytics"
                      >
                        <BarChart3 className="w-6 h-6 text-chart-2 mb-2" />
                        <p className="font-medium">View Analytics</p>
                        <p className="text-sm text-muted-foreground">Latest reports</p>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "doctors" && (
            <div data-testid="doctors-content">
              <AdminDoctorManagement />
            </div>
          )}

          {activeTab === "documents" && (
            <div data-testid="documents-content">
              <AdminDocumentVerification />
            </div>
          )}

          {activeTab === "analytics" && (
            <div data-testid="analytics-content">
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
                <p className="text-muted-foreground">Platform performance and insights</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Appointment Statistics */}
                <Card>
                  <CardHeader>
                    <CardTitle>Appointment Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Appointments</span>
                        <span className="font-medium" data-testid="stat-total-appointments">
                          {analytics.totalAppointments}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">This Month</span>
                        <span className="text-chart-2 font-medium" data-testid="stat-monthly-appointments">
                          {analytics.monthlyAppointments}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Success Rate</span>
                        <span className="text-chart-2 font-medium">91%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Average Rating</span>
                        <span className="text-chart-3 font-medium">4.8 ⭐</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Revenue Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Revenue</span>
                        <span className="font-medium" data-testid="stat-total-revenue">
                          ₹{analytics.totalRevenue.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Platform Fee (10%)</span>
                        <span className="text-chart-2 font-medium">
                          ₹{Math.round(analytics.totalRevenue * 0.1).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Average per Appointment</span>
                        <span className="text-chart-3 font-medium">₹650</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Growth Rate</span>
                        <span className="text-green-400 font-medium">+22%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Specializations */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Specializations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { name: "General Medicine", percentage: 85, color: "bg-chart-1" },
                        { name: "Cardiology", percentage: 72, color: "bg-chart-2" },
                        { name: "Dermatology", percentage: 68, color: "bg-chart-3" },
                        { name: "Pediatrics", percentage: 54, color: "bg-chart-4" },
                      ].map((spec, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm">{spec.name}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-muted rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${spec.color}`}
                                style={{ width: `${spec.percentage}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground">{spec.percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* User Growth */}
                <Card>
                  <CardHeader>
                    <CardTitle>User Growth</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-muted-foreground">User growth chart placeholder</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "doctors" && (
            <div data-testid="doctors-content">
              <AdminDoctorManagement />
            </div>
          )}

          {activeTab === "documents" && (
            <div data-testid="documents-content">
              <AdminDocumentVerification />
            </div>
          )}

          {activeTab === "patients" && (
            <div data-testid="patients-content">
              <AdminPatientManagement />
            </div>
          )}

          {activeTab === "disputes" && (
            <div data-testid="disputes-content">
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Dispute Management</h1>
                <p className="text-muted-foreground">Handle patient and doctor disputes</p>
              </div>

              <Card>
                <CardContent className="text-center py-12">
                  <AlertTriangle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Dispute Resolution</h3>
                  <p className="text-muted-foreground mb-4">
                    Manage and resolve disputes between patients and healthcare providers.
                  </p>
                  <Button data-testid="button-handle-disputes">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Handle Disputes
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "settings" && (
            <div data-testid="settings-content">
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Platform Settings</h1>
                <p className="text-muted-foreground">Configure platform-wide settings</p>
              </div>

              <Card>
                <CardContent className="text-center py-12">
                  <Settings className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">System Configuration</h3>
                  <p className="text-muted-foreground mb-4">
                    Manage platform settings, payment configurations, and system preferences.
                  </p>
                  <Button data-testid="button-configure-settings">
                    <Settings className="w-4 h-4 mr-2" />
                    Configure Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
