import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  UserCheck, 
  UserX, 
  AlertTriangle, 
  BarChart3, 
  TrendingUp,
  DollarSign,
  Calendar,
  ShieldCheck,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Activity,
  Heart,
  LogOut,
  Eye
} from "lucide-react";

export default function AdminDashboardFallback() {
  const [activeTab, setActiveTab] = useState("dashboard");

  // Check if admin is logged in
  const adminUser = localStorage.getItem("adminUser");
  if (!adminUser) {
    window.location.href = "/admin";
    return null;
  }

  const handleLogout = () => {
    localStorage.removeItem("adminUser");
    window.location.href = "/";
  };

  // Mock data for demonstration - replace with real API calls
  const mockUsers = [
    {
      _id: "1",
      username: "testuser",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      role: "patient",
      isVerified: true,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      _id: "2",
      username: "testdoctor",
      email: "doctor@example.com",
      firstName: "Test",
      lastName: "Doctor",
      role: "doctor",
      isVerified: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      profile: {
        specialization: "Cardiology",
        experience: 5,
        consultationFee: 500,
        isApproved: false
      }
    }
  ];

  const doctors = mockUsers.filter(user => user.role === "doctor");
  const patients = mockUsers.filter(user => user.role === "patient");
  const pendingDoctors = doctors.filter(doctor => !doctor.profile?.isApproved);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Heart className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold text-primary">appoint'd</span>
              </div>
              <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                <ShieldCheck className="w-3 h-3 mr-1" />
                Admin Dashboard
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground">
                Welcome, Admin
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-card border-r border-border min-h-screen">
          <div className="p-6">
            <nav className="space-y-2">
              <Button
                variant={activeTab === "dashboard" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("dashboard")}
              >
                <TrendingUp className="w-4 h-4 mr-3" />
                Dashboard
              </Button>
              <Button
                variant={activeTab === "doctors" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("doctors")}
              >
                <UserCheck className="w-4 h-4 mr-3" />
                Doctors ({doctors.length})
              </Button>
              <Button
                variant={activeTab === "patients" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("patients")}
              >
                <Users className="w-4 h-4 mr-3" />
                Patients ({patients.length})
              </Button>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {activeTab === "dashboard" && (
            <div>
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
                <p className="text-muted-foreground">Platform overview and management</p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Total Users</p>
                        <p className="text-2xl font-bold text-primary">
                          {mockUsers.length}
                        </p>
                        <p className="text-orange-400 text-xs">Demo data</p>
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
                        <p className="text-2xl font-bold text-primary">
                          {doctors.length}
                        </p>
                        <p className="text-orange-400 text-xs">Demo data</p>
                      </div>
                      <UserCheck className="w-8 h-8 text-primary/60" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Total Patients</p>
                        <p className="text-2xl font-bold text-primary">
                          {patients.length}
                        </p>
                        <p className="text-orange-400 text-xs">Demo data</p>
                      </div>
                      <Users className="w-8 h-8 text-primary/60" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Pending Verifications</p>
                        <p className="text-2xl font-bold text-primary">
                          {pendingDoctors.length}
                        </p>
                        <p className="text-orange-400 text-xs">Demo data</p>
                      </div>
                      <Clock className="w-8 h-8 text-primary/60" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Users */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {mockUsers.map((user) => (
                        <div key={user._id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-primary font-semibold text-sm">
                                {user.firstName[0]}{user.lastName[0]}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{user.firstName} {user.lastName}</p>
                              <p className="text-sm text-muted-foreground">{user.role}</p>
                            </div>
                          </div>
                          <Badge className={
                            user.isVerified 
                              ? "bg-green-500/10 text-green-600 border-green-500/20"
                              : "bg-orange-500/10 text-orange-600 border-orange-500/20"
                          }>
                            {user.isVerified ? "Verified" : "Pending"}
                          </Badge>
                        </div>
                      ))}
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
                      >
                        <UserCheck className="w-6 h-6 text-primary mb-2" />
                        <p className="font-medium">Manage Doctors</p>
                        <p className="text-sm text-muted-foreground">{pendingDoctors.length} pending</p>
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start"
                        onClick={() => setActiveTab("patients")}
                      >
                        <Users className="w-6 h-6 text-chart-1 mb-2" />
                        <p className="font-medium">Manage Patients</p>
                        <p className="text-sm text-muted-foreground">{patients.length} total</p>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "patients" && (
            <div>
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Patient Management</h1>
                <p className="text-muted-foreground">View and manage patient accounts</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>All Patients ({patients.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {patients.length > 0 ? (
                    <div className="space-y-4">
                      {patients.map((patient) => (
                        <div key={patient._id} className="border border-border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-4">
                              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                                <span className="text-primary font-semibold">
                                  {patient.firstName[0]}{patient.lastName[0]}
                                </span>
                              </div>
                              <div>
                                <h3 className="font-semibold">{patient.firstName} {patient.lastName}</h3>
                                <p className="text-sm text-muted-foreground">{patient.email}</p>
                                <p className="text-sm text-muted-foreground">
                                  Joined: {new Date(patient.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={
                                patient.isVerified 
                                  ? "bg-green-500/10 text-green-600 border-green-500/20"
                                  : "bg-orange-500/10 text-orange-600 border-orange-500/20"
                              }>
                                {patient.isVerified ? "Verified" : "Unverified"}
                              </Badge>
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No patients found</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "doctors" && (
            <div>
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Doctor Management</h1>
                <p className="text-muted-foreground">Manage doctor registrations and verifications</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Pending Doctor Verifications ({pendingDoctors.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingDoctors.length > 0 ? (
                    <div className="space-y-4">
                      {pendingDoctors.map((doctor) => (
                        <div key={doctor._id} className="border border-border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold">Dr. {doctor.firstName} {doctor.lastName}</h3>
                              <p className="text-sm text-muted-foreground">{doctor.profile?.specialization}</p>
                              <p className="text-sm text-muted-foreground">{doctor.profile?.experience} years experience</p>
                              <p className="text-sm text-muted-foreground">Fee: ₹{doctor.profile?.consultationFee}</p>
                            </div>
                            <div className="flex space-x-2">
                              <Button size="sm">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button variant="destructive" size="sm">
                                <XCircle className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No pending doctor verifications</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
