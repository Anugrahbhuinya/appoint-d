# Bug Report - Appoint'd Medical Appointment System

## Summary
Analysis completed on: October 18, 2025
Total Bugs Found: **15 Critical Issues**
NPM Audit: **5 Vulnerabilities (3 low, 2 moderate)**

---

## 🔴 CRITICAL SECURITY ISSUES

### 1. **Payment Verification Vulnerability** (CRITICAL)
**Location:** `server/routes.ts:414-423`
**Severity:** CRITICAL - Financial Security Risk

```typescript
app.post("/api/payments/:id/confirm", async (req, res) => {
  const payment = await storage.updatePaymentStatus(req.params.id, "completed"); 
  res.json(payment);
});
```

**Issues:**
- No authentication check
- No verification of Razorpay payment signature
- Anyone can mark any payment as "completed" without actually paying
- Missing payment validation logic

**Fix Required:**
```typescript
app.post("/api/payments/:id/confirm", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    // Verify signature
    const crypto = require("crypto");
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");
    
    if (razorpay_signature !== expectedSignature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }
    
    const payment = await storage.updatePaymentStatus(req.params.id, "completed", razorpay_payment_id);
    res.json(payment);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});
```

---

### 2. **Sensitive Data Exposure in API Response**
**Location:** `server/routes.ts:367-411`
**Severity:** HIGH

```typescript
res.json({
  orderId: order.id,
  amount: order.amount,
  currency: order.currency,
  key: process.env.RAZORPAY_KEY_ID,  // ✓ OK to expose (public key)
});
```

**Issue:** While this specific case is OK (Razorpay key_id is meant to be public), ensure RAZORPAY_KEY_SECRET is NEVER exposed.

---

### 3. **Missing Input Validation on Payment Amount**
**Location:** `server/routes.ts:377-380`
**Severity:** HIGH - Financial Risk

```typescript
const { amount, appointmentId, doctorId } = req.body;
const options = {
  amount: Math.round(amount * 100),  // No validation!
```

**Issues:**
- No validation that amount matches appointment fee
- User could pay less than required
- No check for negative amounts

**Fix Required:**
```typescript
// Validate amount matches appointment
const appointment = await storage.getAppointment(appointmentId);
if (!appointment) {
  return res.status(404).json({ message: "Appointment not found" });
}

if (Math.round(amount * 100) !== Math.round(appointment.consultationFee * 100)) {
  return res.status(400).json({ message: "Amount mismatch" });
}

if (amount <= 0) {
  return res.status(400).json({ message: "Invalid amount" });
}
```

---

## 🟡 HIGH PRIORITY BUGS

### 4. **Appointment Authorization Bypass**
**Location:** `server/routes.ts:339-364`
**Severity:** HIGH

```typescript
app.put("/api/appointments/:id", async (req, res) => {
  // Check permissions
  if (req.user!.role === "patient" && appointment.patientId !== req.user!._id) {
    return res.status(403).json({ message: "Access denied" });
  }
  if (req.user!.role === "doctor" && appointment.doctorId !== req.user!._id) {
    return res.status(403).json({ message: "Access denied" });
  }
  
  const updatedAppointment = await storage.updateAppointment(req.params.id, req.body);
```

**Issues:**
- Admin role can modify any appointment without restrictions
- No validation of what fields can be updated
- Patient could change `doctorId` or `consultationFee`

**Fix Required:**
- Add admin permission check
- Whitelist allowed fields for each role
- Prevent modification of sensitive fields like fees

---

### 5. **File Upload Security Issues**
**Location:** `server/routes.ts:36-52`
**Severity:** HIGH

```typescript
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
```

**Issues:**
- MIME type can be spoofed
- No actual file content validation
- File extension check is insufficient
- Uploaded files are not scanned for malware
- No file size limits per user

**Recommendations:**
- Use file magic number validation
- Implement virus scanning
- Add rate limiting on uploads
- Store files with unique, non-guessable names
- Implement per-user upload quotas

---

### 6. **Race Condition in Appointment Booking**
**Location:** `server/routes.ts:296-313`
**Severity:** MEDIUM-HIGH

```typescript
app.post("/api/appointments", async (req, res) => {
  const validatedData = insertAppointmentSchema.parse({
    ...req.body,
    patientId: req.user!._id.toString(),
  });
  const appointment = await storage.createAppointment(validatedData);
```

**Issues:**
- No check if doctor is available at requested time
- Multiple patients could book same time slot
- No validation of appointment date (could be in the past)
- No check if doctor exists or is approved

**Fix Required:**
```typescript
// Check if doctor exists and is approved
const doctor = await storage.getUser(req.body.doctorId);
if (!doctor || doctor.role !== 'doctor') {
  return res.status(404).json({ message: "Doctor not found" });
}

const doctorProfile = await storage.getDoctorProfile(req.body.doctorId);
if (!doctorProfile?.isApproved) {
  return res.status(400).json({ message: "Doctor not approved" });
}

// Check if time slot is available
const existingAppointments = await storage.getAppointmentsByDoctorAndDate(
  req.body.doctorId,
  req.body.appointmentDate
);

if (existingAppointments.length > 0) {
  return res.status(409).json({ message: "Time slot not available" });
}

// Validate date is in future
if (new Date(req.body.appointmentDate) < new Date()) {
  return res.status(400).json({ message: "Cannot book past appointments" });
}
```

---

### 7. **NoSQL Injection Vulnerability**
**Location:** Multiple endpoints
**Severity:** HIGH

```typescript
const doctor = await storage.getUser(req.params.id);
```

**Issues:**
- No sanitization of user input parameters
- Could allow NoSQL injection attacks
- MongoDB queries might be vulnerable

**Fix Required:**
- Validate all IDs are valid MongoDB ObjectIds
- Use mongoose query builders properly
- Sanitize all user inputs

---

## 🟢 MEDIUM PRIORITY ISSUES

### 8. **Error Message Information Disclosure**
**Location:** Multiple locations throughout `routes.ts`
**Severity:** MEDIUM

```typescript
res.status(400).json({ message: error.message });
```

**Issues:**
- Exposes internal error details to users
- Could reveal database structure
- Helps attackers understand system internals

**Fix Required:**
- Log detailed errors server-side
- Return generic error messages to client
- Use error codes instead of messages

---

### 9. **Missing Rate Limiting**
**Location:** All API endpoints
**Severity:** MEDIUM

**Issues:**
- No rate limiting on login attempts
- No rate limiting on appointment creation
- Vulnerable to brute force attacks
- Vulnerable to DoS attacks

**Fix Required:**
- Implement express-rate-limit
- Add stricter limits on auth endpoints
- Add per-user rate limiting

---

### 10. **Session Security Issues**
**Location:** `server/auth.ts` and `server/index.ts`
**Severity:** MEDIUM

**Potential Issues:**
- Check if session secret is strong and from environment
- Verify secure cookie settings in production
- Ensure session timeout is implemented

---

### 11. **Missing CORS Configuration**
**Location:** `server/index.ts`
**Severity:** MEDIUM

**Issue:** No explicit CORS configuration visible. Could allow unauthorized origins.

**Fix Required:**
```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:5173',
  credentials: true,
}));
```

---

### 12. **Webhook Replay Attack Vulnerability**
**Location:** `server/routes.ts:426-462`
**Severity:** MEDIUM

```typescript
app.post("/api/razorpay-webhook", async (req, res) => {
  // Signature verification is good, but...
  if (event === "payment.captured") {
    await storage.updatePaymentStatus(order_id, "completed", payment_id); 
  }
```

**Issues:**
- No check for duplicate webhook processing
- Same webhook could be processed multiple times
- No timestamp validation

**Fix Required:**
- Store processed webhook IDs
- Check for duplicates before processing
- Validate webhook timestamp

---

### 13. **Doctor Availability Not Validated**
**Location:** Appointment booking
**Severity:** MEDIUM

**Issue:** System doesn't check doctor's availability schedule before allowing booking.

---

### 14. **Password Policy Not Enforced**
**Location:** `shared/mongodb-schema.ts:319`
**Severity:** MEDIUM

```typescript
password: z.string().min(6),
```

**Issues:**
- Only 6 character minimum
- No complexity requirements
- Weak passwords allowed

**Fix Required:**
```typescript
password: z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    "Password must contain uppercase, lowercase, number, and special character"),
```

---

### 15. **Missing Database Transaction Support**
**Location:** Payment and appointment creation
**Severity:** MEDIUM

**Issue:** Critical operations like payment+appointment aren't atomic. Could lead to inconsistent state if one fails.

---

## 📦 NPM VULNERABILITIES

Run `npm audit` to see details:
- 3 Low severity vulnerabilities
- 2 Moderate severity vulnerabilities

**Fix:** Run `npm audit fix` to address non-breaking changes.

---

## 🔧 RECOMMENDED IMMEDIATE ACTIONS

1. **CRITICAL:** Fix payment verification (Issue #1)
2. **CRITICAL:** Add payment amount validation (Issue #3)
3. **HIGH:** Fix appointment authorization (Issue #4)
4. **HIGH:** Add appointment slot conflict checking (Issue #6)
5. Add rate limiting middleware
6. Run `npm audit fix`
7. Implement input sanitization
8. Add comprehensive logging
9. Implement database transactions for critical operations
10. Add integration tests for payment flow

---

## Additional Recommendations

### Security Headers
Add security headers using helmet:
```typescript
import helmet from 'helmet';
app.use(helmet());
```

### Environment Variables
Ensure all sensitive data is in `.env` and never committed:
- RAZORPAY_KEY_SECRET
- RAZORPAY_WEBHOOK_SECRET
- SESSION_SECRET
- MONGODB_URI

### Logging
Implement proper logging:
- Audit logs for admin actions
- Payment transaction logs
- Failed authentication attempts
- File upload logs

### Testing
Add comprehensive tests:
- Unit tests for all API endpoints
- Integration tests for payment flow
- Security penetration testing
- Load testing

---

## Priority Matrix

| Issue | Severity | Impact | Effort | Priority |
|-------|----------|--------|--------|----------|
| #1 - Payment Verification | Critical | High | Low | **P0** |
| #3 - Amount Validation | High | High | Low | **P0** |
| #4 - Auth Bypass | High | High | Medium | **P1** |
| #6 - Race Condition | High | Medium | Medium | **P1** |
| #5 - File Upload | High | Medium | High | **P2** |
| #7 - NoSQL Injection | High | High | Medium | **P1** |
| #9 - Rate Limiting | Medium | Medium | Low | **P2** |

---

## Testing Checklist

- [ ] Fix payment verification vulnerability
- [ ] Add payment amount validation
- [ ] Implement appointment conflict detection
- [ ] Add input sanitization
- [ ] Implement rate limiting
- [ ] Fix authorization bypass issues
- [ ] Add security headers
- [ ] Update weak password policy
- [ ] Add CORS configuration
- [ ] Implement webhook replay protection
- [ ] Add comprehensive error handling
- [ ] Run security audit tools
- [ ] Perform penetration testing
- [ ] Update npm dependencies
- [ ] Add integration tests

---

**Report Generated By:** TestSprite AI Analysis
**Date:** October 18, 2025

