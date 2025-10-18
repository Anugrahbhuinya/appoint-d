# MongoDB Atlas Connection Guide

## Step-by-Step Setup

### 1. Get Your MongoDB Atlas Connection String

1. **Log into MongoDB Atlas**: Go to [https://cloud.mongodb.com](https://cloud.mongodb.com)
2. **Select your project** (or create a new one)
3. **Go to Database Access**:
   - Click "Database Access" in the left sidebar
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Create a username and password (save these!)
   - Set privileges to "Read and write to any database"
   - Click "Add User"

4. **Configure Network Access**:
   - Go to "Network Access" in the left sidebar
   - Click "Add IP Address"
   - For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
   - For production: Add your specific IP addresses
   - Click "Confirm"

5. **Get Connection String**:
   - Go to "Clusters" in the left sidebar
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Select "Node.js" and version "4.1 or later"
   - Copy the connection string

### 2. Update Your Environment Variables

Create or update your `.env` file in the project root:

```env
# Replace with your actual MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/appointd?retryWrites=true&w=majority

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-here

# Razorpay Configuration (get these from Razorpay dashboard)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Server Configuration
PORT=5000
NODE_ENV=development
```

### 3. Test Your Connection

Run the connection test:

```bash
npm run db:test
```

This will:
- Test the MongoDB Atlas connection
- Create a test user
- Verify database operations
- Clean up test data

### 4. Seed Your Database

Once the connection is working, seed your database with initial data:

```bash
npm run db:seed
```

### 5. Start Your Application

```bash
npm run dev
```

## Connection String Format

Your MongoDB Atlas connection string should look like this:

```
mongodb+srv://username:password@cluster-name.xxxxx.mongodb.net/database-name?retryWrites=true&w=majority
```

**Important Notes:**
- Replace `username` with your database username
- Replace `password` with your database password
- Replace `cluster-name` with your actual cluster name
- Replace `xxxxx` with your cluster identifier
- Replace `database-name` with `appointd`

## Troubleshooting

### Common Issues:

1. **Authentication Failed**:
   - Check your username and password
   - Ensure the user has proper permissions

2. **Network Access Denied**:
   - Add your IP address to the Network Access list
   - For development, you can temporarily allow all IPs (0.0.0.0/0)

3. **Connection Timeout**:
   - Check your internet connection
   - Verify the connection string format
   - Ensure your cluster is running

4. **Database Not Found**:
   - The database will be created automatically when you first write data
   - Make sure the database name in the connection string is `appointd`

### Testing Commands:

```bash
# Test connection
npm run db:test

# Seed database
npm run db:seed

# Start application
npm run dev

# Check TypeScript compilation
npm run check
```

## Security Best Practices

1. **Never commit your `.env` file** to version control
2. **Use strong passwords** for your database users
3. **Restrict network access** to specific IPs in production
4. **Rotate your credentials** regularly
5. **Use environment-specific connection strings** for different deployments

## Production Considerations

For production deployment:

1. **Use a dedicated database user** with minimal required permissions
2. **Restrict network access** to your application servers only
3. **Enable MongoDB Atlas monitoring** and alerts
4. **Set up regular backups**
5. **Use connection pooling** (already configured in the code)
6. **Monitor performance** and scale as needed







