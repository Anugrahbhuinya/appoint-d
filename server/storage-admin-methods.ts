// Additional storage methods for admin functionality to be added to mongodb-storage.ts

// Admin User Management Methods
async getAllUsers(): Promise<User[]> {
  return await User.find().sort({ createdAt: -1 });
}

async getUsersByRole(role: string): Promise<User[]> {
  return await User.find({ role }).sort({ createdAt: -1 });
}

async updateUserVerification(userId: string, isVerified: boolean): Promise<User> {
  return await User.findByIdAndUpdate(userId, { isVerified }, { new: true });
}

async updateUserStatus(userId: string, isActive: boolean): Promise<User> {
  return await User.findByIdAndUpdate(userId, { isActive }, { new: true });
}

// Admin Document Management Methods
async getAllDocuments(): Promise<DoctorDocument[]> {
  return await DoctorDocument.find().populate('doctorId', 'firstName lastName email').sort({ uploadedAt: -1 });
}

async updateDocumentVerification(documentId: string, isVerified: boolean, rejectionReason?: string): Promise<DoctorDocument> {
  const updates: any = { isVerified };
  if (!isVerified && rejectionReason) {
    updates.rejectionReason = rejectionReason;
  }
  return await DoctorDocument.findByIdAndUpdate(documentId, updates, { new: true });
}

// Admin Analytics Methods
async getAnalytics(): Promise<{
  totalUsers: number;
  totalDoctors: number;
  totalPatients: number;
  totalAppointments: number;
  totalRevenue: number;
  monthlyAppointments: number;
  pendingVerifications: number;
}> {
  const totalUsers = await User.countDocuments();
  const totalDoctors = await User.countDocuments({ role: 'doctor' });
  const totalPatients = await User.countDocuments({ role: 'patient' });
  const totalAppointments = await Appointment.countDocuments();
  
  const completedPayments = await Payment.find({ status: 'completed' });
  const totalRevenue = completedPayments.reduce((sum, payment) => sum + payment.amount, 0);
  
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyAppointments = await Appointment.countDocuments({
    createdAt: { $gte: startOfMonth }
  });
  
  const pendingVerifications = await User.countDocuments({
    role: 'doctor',
    'profile.isApproved': false
  });

  return {
    totalUsers,
    totalDoctors,
    totalPatients,
    totalAppointments,
    totalRevenue,
    monthlyAppointments,
    pendingVerifications
  };
}
