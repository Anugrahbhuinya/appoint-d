// Add these methods to the MongoStorage class in server/mongodb-storage.ts

  // Admin User Management Methods
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
