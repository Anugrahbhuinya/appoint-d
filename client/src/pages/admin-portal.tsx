import React, { useState } from "react";
import { 
  Users, 
  UserCheck, 
  AlertTriangle, 
  BarChart3, 
  Settings, 
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  GanttChart,
  // FIX: Import the missing ShieldCheck icon (Errors 2304, 348)
  ShieldCheck 
} from "lucide-react";

// --- MOCK EXTERNAL DEPENDENCIES AND UI COMPONENTS ---
// 1. Mock Hooks
const useAuth = () => ({ 
  user: { id: 'admin-1', firstName: "Admin", lastName: "User", role: "admin" },
  logoutMutation: { mutate: () => console.log("Logout triggered") }
});
const useToast = () => ({ toast: (options: { title: string, description: string, variant?: string }) => console.log("Toast:", options) });
const useQueryClient = () => ({ 
  invalidateQueries: (options: { queryKey: (string | string[])[] | string[]; }) => console.log("Invalidating queries for:", options.queryKey) 
});

// Mock TanStack Query Hooks
// FIX (Error 2558, 271): Move generic type parameter T from JSX call to function definition 
const useQuery = <T,>({ queryKey, initialData }: { queryKey: (string | string[])[], initialData?: T }) => {
  const [data, setData] = useState<T>(initialData as T);
  
  // Mock data fetching logic based on queryKey
  if (queryKey[0] === "/api/admin/pending-verifications" && !initialData) {
     return { data: [
        { id: '12345', firstName: 'Narayan', lastName: 'Kamal', email: 'narayan@doc.com', role: 'doctor', profile: { specialization: 'Cardiology', experience: 10, consultationFee: 500, licenseNumber: 'LIC12345', isApproved: false } },
        { id: '67890', firstName: 'Anugrah', lastName: 'Bhuiya', email: 'anugrah@doc.com', role: 'doctor', profile: { specialization: 'Dermatology', experience: 5, consultationFee: 400, licenseNumber: 'LIC67890', isApproved: false } },
     ] as T, isLoading: false };
  } else if (queryKey[0] === "/api/admin/verified-doctors") {
     return { data: [] as T, isLoading: false };
  } else if (queryKey[0] === "/api/admin/analytics") {
     return { data: initialData as T, isLoading: false };
  }
  return { data, isLoading: false };
};

const useMutation = ({ mutationFn, onSuccess, onError }: { mutationFn: any, onSuccess: any, onError: any }) => {
  return {
    mutate: async (variables: any) => {
      console.log(`MOCK MUTATION: Verifying Doctor ${variables.doctorId} with status ${variables.approved}`);
      try {
        const result = await mutationFn(variables);
        onSuccess(result, variables);
      } catch (error) {
        onError(error);
      }
    },
    isPending: false,
    // Note: We are mocking the result to always be successful for this demo
  };
};

const apiRequest = async (method: string, url: string, data: any) => {
    console.log(`MOCK API CALL: ${method} ${url}`, data);
    return { 
      json: async () => ({ success: true, message: "Verification status updated." }), 
      ok: true, 
      status: 200, 
      statusText: "OK" 
    };
};

// 2. Mock UI Components (Shadcn/ui style)
const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => <div className={`bg-card text-card-foreground rounded-xl shadow-lg ${className}`}>{children}</div>;
const CardContent = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => <div className={`p-6 ${className}`}>{children}</div>;
const CardHeader = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>{children}</div>;
const CardTitle = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => <h3 className={`text-xl font-semibold leading-none tracking-tight ${className}`}>{children}</h3>;

// FIX: Update Button props to explicitly define all used properties
const Button = ({ children, className = "", variant = "default", onClick, "data-testid": testId, disabled = false }: { 
  children: React.ReactNode, 
  className?: string, 
  variant?: string, 
  onClick: () => void, 
  "data-testid"?: string, 
  disabled?: boolean 
}) => {
  let baseClasses = "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2";
  let variantClasses = "";
  switch (variant) {
    case "destructive": variantClasses = "bg-red-500 text-white hover:bg-red-600"; break;
    case "outline": variantClasses = "border border-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"; break;
    case "ghost": variantClasses = "hover:bg-gray-100 dark:hover:bg-gray-700"; break;
    case "default":
    default: variantClasses = "bg-indigo-600 text-white hover:bg-indigo-700"; break;
  }
  // FIX (Error 2322): This error was incorrectly reported against Badge usage inside Card in the previous step, but the core Button definition is fine.
  return <button className={`${baseClasses} ${variantClasses} ${className}`} onClick={onClick} data-testid={testId} disabled={disabled}>{children}</button>;
};
const Badge = ({ children, className = "", variant = "default" }: { children: React.ReactNode, className?: string, variant?: string }) => {
    let variantClasses = "";
    if (variant === "outline") {
        variantClasses = "bg-transparent border border-gray-300 text-gray-500 dark:border-gray-600 dark:text-gray-400";
    }
    // FIX (Error 2322): Explicitly handling the variant prop in Badge definition
    return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variantClasses} ${className}`}>{children}</span>;
};


const Tabs = ({ children, defaultValue }: { children: React.ReactNode, defaultValue: string }) => <div data-default-value={defaultValue}>{children}</div>;
const TabsList = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => <div className={`inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground ${className}`}>{children}</div>;
const TabsTrigger = ({ children, value, className = "", onClick }: { children: React.ReactNode, value: string, className?: string, onClick: (value: string) => void }) => <button onClick={() => onClick(value)} className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow ${className}`}>{children}</button>;
const TabsContent = ({ children, value, currentTab }: { children: React.ReactNode, value: string, currentTab: string }) => (
  <div className={`mt-2 ${value === currentTab ? 'block' : 'hidden'}`}>{children}</div>
);
const Navigation = () => <div className="p-4 bg-gray-900 text-white text-sm font-semibold shadow-xl">Admin Navigation Bar</div>;
const AdminDocumentVerification = () => <Card className="p-4"><p className="text-muted-foreground">Document Verification Component</p></Card>;
const AdminPatientManagement = () => <Card className="p-4"><p className="text-muted-foreground">Patient Management Component</p></Card>;

// --- INTERFACES ---
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

// --- SUB-COMPONENTS ---

interface DoctorVerificationViewProps {
  pendingDoctors: PendingDoctor[];
  handleVerifyDoctor: (doctorId: string, approved: boolean) => void;
  isLoading: boolean;
}

const DoctorVerificationView: React.FC<DoctorVerificationViewProps> = ({ pendingDoctors, handleVerifyDoctor, isLoading }) => {
  const [currentSubTab, setCurrentSubTab] = useState("pending");

  // Mock data for verified doctors (to simulate the other side of the screen)
  const { data: verifiedDoctors = [], isLoading: isLoadingVerified } = useQuery<PendingDoctor[]>({
    queryKey: ["/api/admin/verified-doctors"],
    // Mock 1 verified doctor for demonstration
    initialData: [{ id: '99999', firstName: 'Dr.', lastName: 'Approved', email: 'approved@doc.com', role: 'doctor', profile: { specialization: 'General', experience: 10, consultationFee: 700, licenseNumber: 'LIC99999', isApproved: true } }],
  });

  const renderDoctorList = (doctors: PendingDoctor[], isPending: boolean) => (
    <div className="space-y-4">
      {doctors.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <GanttChart className="w-10 h-10 mx-auto mb-3 text-primary/50" />
          <p>{isPending ? "No pending verifications." : "No verified doctors yet."}</p>
        </div>
      ) : (
        doctors.map((doctor) => (
          <Card key={doctor.id} className="p-4 flex items-center justify-between">
            <div className="flex flex-col space-y-1">
              <p className="font-semibold text-lg">{doctor.firstName} {doctor.lastName}</p>
              <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">{doctor.profile.specialization}</Badge>
                <Badge variant="outline" className="border-border">Exp: {doctor.profile.experience} years</Badge>
                <Badge variant="outline" className="border-border">License: {doctor.profile.licenseNumber}</Badge>
              </div>
            </div>
            {isPending ? (
              <div className="flex space-x-2">
                <Button 
                  variant="default" 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleVerifyDoctor(doctor.id, true)} 
                  disabled={isLoading}
                  data-testid={`approve-${doctor.id}`}
                >
                  <CheckCircle className="w-4 h-4 mr-2" /> Approve
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => handleVerifyDoctor(doctor.id, false)} 
                  disabled={isLoading}
                  data-testid={`reject-${doctor.id}`}
                >
                  <XCircle className="w-4 h-4 mr-2" /> Reject
                </Button>
              </div>
            ) : (
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                <ShieldCheck className="w-3 h-3 mr-1" /> Approved
              </Badge>
            )}
          </Card>
        ))
      )}
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Doctor Verification & Management</h1>
        <p className="text-muted-foreground">Approve new profiles and manage existing doctor accounts.</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" onClick={() => setCurrentSubTab("pending")}>
            Pending Verifications ({pendingDoctors.length})
          </TabsTrigger>
          <TabsTrigger value="verified" onClick={() => setCurrentSubTab("verified")}>
            Verified Doctors ({verifiedDoctors.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pending" currentTab={currentSubTab}>
          <Card className="mt-4">
            <CardContent className="p-6">
              {isLoading ? <p>Loading pending doctors...</p> : renderDoctorList(pendingDoctors, true)}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="verified" currentTab={currentSubTab}>
          <Card className="mt-4">
            <CardContent className="p-6">
              {isLoadingVerified ? <p>Loading verified doctors...</p> : renderDoctorList(verifiedDoctors, false)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};


// --- MAIN COMPONENT ---
export default function AdminPortal() {
  const { user, logoutMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Custom Tailwind colors not available, setting them here for visual consistency
  const chartColors = {
    'bg-chart-1': 'bg-blue-500', 
    'bg-chart-2': 'bg-red-500', 
    'bg-chart-3': 'bg-green-500', 
    'bg-chart-4': 'bg-yellow-500'
  };

  // Redirect if not admin
  if (user?.role !== "admin") {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-500 mb-2">Access Denied</h1>
        <p className="text-gray-400">This portal is only accessible to administrators.</p>
      </div>
    </div>;
  }

  // Fetch pending doctors
  const { data: pendingDoctors = [], isLoading: isLoadingPending } = useQuery<PendingDoctor[]>({
    queryKey: ["/api/admin/pending-verifications"],
    // Initial data is mocked inside useQuery mock to ensure list population
  });

  // Fetch analytics
  const { data: analytics = { totalUsers: 150, totalDoctors: 25, totalPatients: 125, totalAppointments: 300, totalRevenue: 150000, monthlyAppointments: 80 } } = useQuery<Analytics>({
    queryKey: ["/api/admin/analytics"],
    initialData: { totalUsers: 150, totalDoctors: 25, totalPatients: 125, totalAppointments: 300, totalRevenue: 150000, monthlyAppointments: 80 }
  });

  // Verification Mutation
  const verifyDoctorMutation = useMutation({
    mutationFn: async ({ doctorId, approved }: { doctorId: string; approved: boolean }) => {
      // NOTE: This is the critical API call that sets isApproved=true in MongoDB
      const res = await apiRequest("POST", `/api/admin/verify-doctor/${doctorId}`, { approved });
      if (!res.ok) {
        throw new Error(`Failed to update status. Server responded with ${res.status}`);
      }
      return res.json();
    },
    onSuccess: (data: any, variables: { doctorId: string, approved: boolean }) => { // FIX: Explicitly type the first parameter 'data'
      // CRITICAL: Invalidate caches across the entire app
      
      // 1. Invalidate the specific doctor's public profile (used by Appointment Booking Modal/Patient App)
      queryClient.invalidateQueries({ queryKey: ["/api/doctors", variables.doctorId] });
      
      // 2. Invalidate the doctor's self-managed profile (for the Doctor Portal itself)
      queryClient.invalidateQueries({ queryKey: ["/api/doctor/profile"] });

      // 3. Invalidate admin verification lists
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-verifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/verified-doctors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] });

      toast({
        title: variables.approved ? "Doctor Approved" : "Doctor Rejected",
        description: `Doctor verification ${variables.approved ? "approved" : "rejected"} successfully.`,
        variant: variables.approved ? "default" : "destructive"
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
    verifyDoctorMutation.mutate({ doctorId, approved });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      <Navigation />
      
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-screen shadow-2xl">
          <div className="p-6">
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-12 h-12 bg-primary/10 dark:bg-indigo-600/20 rounded-full flex items-center justify-center">
                  <span className="text-primary dark:text-indigo-400 font-semibold">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold dark:text-white" data-testid="text-admin-name">
                    {user.firstName} {user.lastName}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Administrator</p>
                </div>
              </div>
              <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 dark:bg-purple-900/30 dark:text-purple-400">
                <ShieldCheck className="w-3 h-3 mr-1" />
                Admin Access
              </Badge>
            </div>

            <nav className="space-y-2">
              {[
                { key: "dashboard", icon: TrendingUp, label: "Dashboard" },
                { key: "doctors", icon: UserCheck, label: "Doctor Management" },
                { key: "documents", icon: FileText, label: "Document Verification" },
                { key: "patients", icon: Users, label: "Patient Management" },
                { key: "disputes", icon: AlertTriangle, label: "Disputes" },
                { key: "analytics", icon: BarChart3, label: "Analytics" },
                { key: "settings", icon: Settings, label: "Settings" },
              ].map(item => (
                <Button
                  key={item.key}
                  variant={activeTab === item.key ? "default" : "ghost"}
                  className={`w-full justify-start ${activeTab === item.key ? 'dark:bg-indigo-700 dark:text-white bg-indigo-600 text-white' : 'dark:text-gray-300 dark:hover:bg-gray-700 hover:bg-gray-100'}`}
                  onClick={() => setActiveTab(item.key)}
                  data-testid={`button-${item.key}`}
                  disabled={false}
                >
                  <item.icon className="w-4 h-4 mr-3" />
                  {item.label}
                </Button>
              ))}
            </nav>

            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                className="w-full border-gray-300 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 hover:bg-gray-100"
                onClick={() => logoutMutation.mutate()}
                data-testid="button-logout"
                disabled={false}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <div data-testid="dashboard-content">
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 dark:text-white">Admin Dashboard</h1>
                <p className="text-gray-500 dark:text-gray-400">Platform overview and key metrics</p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Users */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Total Users</p>
                        <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400" data-testid="stat-total-users">
                          {analytics.totalUsers}
                        </p>
                        <p className="text-green-500 text-xs">+12% from last month</p>
                      </div>
                      <Users className="w-8 h-8 text-indigo-600/60 dark:text-indigo-400/60" />
                    </div>
                  </CardContent>
                </Card>

                {/* Active Doctors */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Active Doctors</p>
                        <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400" data-testid="stat-active-doctors">
                          {analytics.totalDoctors}
                        </p>
                        <p className="text-green-500 text-xs">+8% from last month</p>
                      </div>
                      <UserCheck className="w-8 h-8 text-indigo-600/60 dark:text-indigo-400/60" />
                    </div>
                  </CardContent>
                </Card>

                {/* Monthly Revenue */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Monthly Revenue</p>
                        <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400" data-testid="stat-monthly-revenue">
                          ₹{analytics.totalRevenue.toLocaleString()}
                        </p>
                        <p className="text-green-500 text-xs">+15% from last month</p>
                      </div>
                      <DollarSign className="w-8 h-8 text-indigo-600/60 dark:text-indigo-400/60" />
                    </div>
                  </CardContent>
                </Card>

                {/* Pending Verifications */}
                <Card className="border-l-4 border-yellow-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Pending Verifications</p>
                        <p className="text-2xl font-bold text-yellow-500" data-testid="stat-pending-verifications">
                          {pendingDoctors.length}
                        </p>
                        <p className="text-yellow-500 text-xs">Needs attention</p>
                      </div>
                      <Clock className="w-8 h-8 text-yellow-500/60" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start dark:hover:bg-gray-700"
                        onClick={() => setActiveTab("doctors")}
                        data-testid="quick-verify-doctors"
                        disabled={false}
                      >
                        <UserCheck className="w-6 h-6 text-indigo-600 mb-2 dark:text-indigo-400" />
                        <p className="font-medium">Verify Doctors</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{pendingDoctors.length} pending</p>
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start dark:hover:bg-gray-700"
                        onClick={() => setActiveTab("disputes")}
                        data-testid="quick-handle-disputes"
                        disabled={false}
                      >
                        <AlertTriangle className="w-6 h-6 text-red-500 mb-2" />
                        <p className="font-medium">Handle Disputes</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">5 active</p>
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start dark:hover:bg-gray-700"
                        onClick={() => setActiveTab("patients")}
                        data-testid="quick-manage-patients"
                        disabled={false}
                      >
                        <Users className="w-6 h-6 text-blue-500 mb-2" />
                        <p className="font-medium">Manage Patients</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{analytics.totalPatients} total</p>
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start dark:hover:bg-gray-700"
                        onClick={() => setActiveTab("analytics")}
                        data-testid="quick-view-analytics"
                        disabled={false}
                      >
                        <BarChart3 className="w-6 h-6 text-teal-500 mb-2" />
                        <p className="font-medium">View Analytics</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Latest reports</p>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activities */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Platform Activities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Mocked activity list for demo */}
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 ${chartColors['bg-chart-1']} rounded-full`}></div>
                        <p className="text-sm">New doctor registration: Dr. Sharma</p>
                        <span className="text-gray-500 dark:text-gray-400 text-xs ml-auto">2 mins ago</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 ${chartColors['bg-chart-2']} rounded-full`}></div>
                        <p className="text-sm">Payment processed: ₹500</p>
                        <span className="text-gray-500 dark:text-gray-400 text-xs ml-auto">5 mins ago</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 ${chartColors['bg-chart-3']} rounded-full`}></div>
                        <p className="text-sm">User reported issue resolved</p>
                        <span className="text-gray-500 dark:text-gray-400 text-xs ml-auto">1 hour ago</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 ${chartColors['bg-chart-4']} rounded-full`}></div>
                        <p className="text-sm">Doctor verification completed</p>
                        <span className="text-gray-500 dark:text-gray-400 text-xs ml-auto">2 hours ago</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Doctor Management Tab (The focus of the fix) */}
          {activeTab === "doctors" && (
            <div data-testid="doctors-content">
              <DoctorVerificationView 
                pendingDoctors={pendingDoctors} 
                handleVerifyDoctor={handleVerifyDoctor}
                isLoading={verifyDoctorMutation.isPending || isLoadingPending}
              />
            </div>
          )}

          {/* Document Verification Tab */}
          {activeTab === "documents" && (
            <div data-testid="documents-content">
              <AdminDocumentVerification />
            </div>
          )}

          {/* Patient Management Tab */}
          {activeTab === "patients" && (
            <div data-testid="patients-content">
              <AdminPatientManagement />
            </div>
          )}
          
          {/* Analytics Tab (Simplified) */}
          {activeTab === "analytics" && (
            <div data-testid="analytics-content">
               <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 dark:text-white">Analytics Dashboard</h1>
                <p className="text-gray-500 dark:text-gray-400">Platform performance and insights (Simplified View)</p>
              </div>
              <Card>
                <CardHeader><CardTitle>Appointment Statistics</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400">Total Appointments</span>
                      <span className="font-medium" data-testid="stat-total-appointments">{analytics.totalAppointments}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400">Monthly Revenue</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium">₹{analytics.totalRevenue.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Disputes Tab (Simplified) */}
          {activeTab === "disputes" && (
            <div data-testid="disputes-content">
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 dark:text-white">Dispute Management</h1>
                <p className="text-gray-500 dark:text-gray-400">Handle patient and doctor disputes</p>
              </div>

              <Card>
                <CardContent className="text-center py-12">
                  <AlertTriangle className="w-16 h-16 mx-auto mb-4 opacity-50 text-red-500" />
                  <h3 className="text-lg font-semibold mb-2">Dispute Resolution</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Manage and resolve disputes between patients and healthcare providers.
                  </p>
                  <Button 
                    data-testid="button-handle-disputes" 
                    variant="destructive"
                    onClick={() => setActiveTab("disputes")}
                    disabled={false}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Handle Disputes
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Settings Tab (Simplified) */}
          {activeTab === "settings" && (
            <div data-testid="settings-content">
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 dark:text-white">Platform Settings</h1>
                <p className="text-gray-500 dark:text-gray-400">Configure platform-wide settings</p>
              </div>

              <Card>
                <CardContent className="text-center py-12">
                  <Settings className="w-16 h-16 mx-auto mb-4 opacity-50 text-indigo-600" />
                  <h3 className="text-lg font-semibold mb-2">System Configuration</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Manage platform settings, payment configurations, and system preferences.
                  </p>
                  <Button 
                    data-testid="button-configure-settings"
                    onClick={() => setActiveTab("settings")}
                    disabled={false}
                  >
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
