// Additional admin routes to be added to server/routes.ts

// Admin Users Route
app.get("/api/admin/users", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (req.user!.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const users = await storage.getAllUsers();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Admin Appointments Route
app.get("/api/admin/appointments", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (req.user!.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const appointments = await storage.getAllAppointments();
    res.json(appointments);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Admin Verify User Route
app.post("/api/admin/verify-user/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (req.user!.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { verified } = req.body;
    const user = await storage.updateUserVerification(req.params.id, verified);
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Admin Documents Route
app.get("/api/admin/documents", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (req.user!.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const documents = await storage.getAllDocuments();
    res.json(documents);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Admin Verify Document Route
app.post("/api/admin/verify-document/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (req.user!.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { verified, reason } = req.body;
    const document = await storage.updateDocumentVerification(req.params.id, verified, reason);
    res.json(document);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});
