# Email + OTP Login Feature

## Overview
Users can now register with email and verify via OTP sent through AWS SES.

## Registration Flow

### Step 1: Send OTP
**Endpoint:** `POST /api/auth/send-otp`

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "OTP sent successfully",
  "email": "user@example.com"
}
```

**Rate Limit:** 3 attempts per 5 minutes

---

### Step 2: Verify OTP & Register
**Endpoint:** `POST /api/auth/verify-otp-signup`

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "otp": "1234",
  "password": "securePassword123",
  "confirmPassword": "securePassword123",
  "publicKey": "encryption-public-key"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": null,
    "status": "Hey there! I'm using Nexus"
  }
}
```

**Rate Limit:** 3 attempts per 5 minutes

---

## Technical Details

### OTP Generation
- **Length:** 4 digits
- **Expiry:** 5 minutes
- **Attempts:** 3 allowed verification attempts
- **Auto-delete:** Expired OTPs are automatically deleted via MongoDB TTL

### AWS SES Configuration
Required environment variables:
```
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_SES_EMAIL=noreply@nexus-messenger.com
```

### Email Template
The OTP is sent in an HTML-formatted email with:
- Subject: "Your Nexus Verification Code"
- OTP displayed prominently in a styled box
- 5-minute expiry message
- Security notice for unauthorized requests

### Validation Rules
- **Email:** Valid email format (normalized to lowercase)
- **Name:** Minimum 2 characters, XSS escaped
- **Password:** Minimum 6 characters
- **OTP:** Must be exactly 4 digits
- **Public Key:** Required for encryption

---

## Database Changes

### User Model
Modified fields:
- `email` (String, unique, lowercase) - User email
- `isEmailVerified` (Boolean) - Email verification status via OTP

### OTP Model (New)
```javascript
{
  email: String,        // Email address (indexed, lowercase)
  otp: String,          // 4-digit OTP
  attempts: Number,     // Failed verification attempts
  maxAttempts: Number,  // Max allowed attempts (3)
  expiresAt: Date,      // Auto-deletes after this time (TTL index)
  createdAt: Date
}
```

---

## Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| 400 | Email is required | Missing email in send-otp |
| 400 | Email already registered | User exists with verified email |
| 400 | Invalid or expired OTP | OTP is wrong, expired, or out of attempts |
| 400 | All fields are required | Missing required fields in signup |
| 400 | Passwords do not match | Password != confirmPassword |
| 429 | Too many OTP requests | Rate limit exceeded (3 per 5 min) |
| 500 | Failed to send OTP | AWS SES error |

---

## Testing

### Send OTP
```bash
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

### Verify OTP & Register
```bash
curl -X POST http://localhost:5000/api/auth/verify-otp-signup \
  -H "Content-Type: application/json" \
  -d '{
    "name":"John",
    "email":"john@test.com",
    "otp":"1234",
    "password":"pass123",
    "confirmPassword":"pass123",
    "publicKey":"key123"
  }'
```

---

## Security Features

✅ **Rate Limiting:** 3 OTP attempts per 5 minutes  
✅ **Attempt Tracking:** Locks after 3 failed attempts  
✅ **Auto-Expiry:** OTPs auto-delete after 5 minutes (TTL index)  
✅ **Email Validation:** Valid email format enforced  
✅ **Input Validation:** All fields validated with express-validator  
✅ **XSS Protection:** User inputs escaped  
✅ **AWS SES Secured:** Credentials from .env (not hardcoded)  
✅ **Email Normalization:** Emails converted to lowercase for consistency  

---

## Frontend Integration

The client needs to implement the 2-step flow:

1. **Step 1:** Get user's email address
2. **Call:** `POST /api/auth/send-otp`
3. **Step 2:** Show OTP input screen
4. **Collect:** name, email, otp, password, publicKey
5. **Call:** `POST /api/auth/verify-otp-signup`
6. **Store:** JWT token from response

---

## Alternative Authentication Methods

This email + OTP flow coexists with the existing email + password authentication:
- **Email + Password:** `POST /api/auth/register` (traditional signup)
- **Email + OTP:** `POST /api/auth/send-otp` → `POST /api/auth/verify-otp-signup` (OTP-based signup)

Both methods create a user with email-based identity; use whichever suits your UX.

---

## Limitations & Future Improvements

- [ ] SMS OTP option (WhatsApp Business API or Twilio)
- [ ] OTP resend counter
- [ ] Biometric verification after OTP
- [ ] Magic link authentication (without OTP)
- [ ] Passwordless login via email link
- [ ] OTP email template customization

