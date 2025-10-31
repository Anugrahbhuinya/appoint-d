# Update Server Files for Real MongoDB Data

To enable real MongoDB data in the admin portal, you need to update these files:

## 1. Update server/routes.ts

Replace the entire content of `server/routes.ts` with the content from `server/routes-with-admin.ts`.

## 2. Update server/mongodb-storage.ts

Replace the entire content of `server/mongodb-storage.ts` with the content from `server/mongodb-storage-with-admin.ts`.

## 3. Restart the Server

After updating the files, restart your development server:

```bash
npm run dev
```

## 4. Test the Admin Portal

1. Go to `http://127.0.0.1:5000/admin`
2. Login with:
   - Username: `admin123`
   - Password: `qwertyuiop1234567890`
3. You should now see real data from your MongoDB Atlas database

## What's Added

### New Admin API Endpoints:
- `GET /api/admin/users` - Get all users
- `GET /api/admin/appointments` - Get all appointments
- `POST /api/admin/verify-user/:id` - Verify/unverify users
- `GET /api/admin/documents` - Get all documents
- `POST /api/admin/verify-document/:id` - Verify/reject documents

### New Storage Methods:
- `updateUserVerification()` - Update user verification status
- `updateUserStatus()` - Update user active status
- `getAllDocuments()` - Get all doctor documents
- `updateDocumentVerification()` - Update document verification

### Enhanced Analytics:
- Real-time user counts
- Real-time appointment data
- Real-time revenue calculations
- Pending verification counts

After these updates, your admin portal will show real data from MongoDB Atlas instead of demo data!
