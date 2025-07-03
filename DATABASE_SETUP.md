# Database Setup Guide

## Neon PostgreSQL Setup

### 1. Create Neon Account & Database

1. Go to [Neon Console](https://console.neon.tech/)
2. Sign up/Login with GitHub
3. Create a new project named "love-island-follower-tracker"
4. Choose the closest region to your deployment
5. Copy the connection string

### 2. Environment Variables

Create `.env` file in project root:

```bash
# Get this from Neon Console -> Connection Details
DATABASE_URL="postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/love-island-db?sslmode=require"

# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET="your-generated-secret-here"

NEXTAUTH_URL="http://localhost:3000"
```

### 3. Database Commands

```bash
# Generate Prisma client
npm run postinstall

# Push schema to database (for development)
npm run db:push

# Run database migrations (for production)
npm run db:migrate

# Seed with Love Island contestant data
npm run db:seed

# Open Prisma Studio (database GUI)
npm run db:studio
```

### 4. Database Schema

The database includes two main tables:

#### Profile Table
- `id`: Unique identifier (cuid)
- `name`: Contestant name
- `instagramUrl`: Instagram profile URL (unique)
- `profileImage`: Profile image URL (optional)
- `createdAt`/`updatedAt`: Timestamps

#### FollowerCount Table
- `id`: Unique identifier (cuid)
- `profileId`: Foreign key to Profile
- `count`: Instagram follower count
- `timestamp`: When the count was recorded

### 5. Indexes

Optimized for common queries:
- `Profile.instagramUrl` (unique constraint)
- `Profile.name` (for searching)
- `FollowerCount.profileId` (for joins)
- `FollowerCount.timestamp` (for historical data)
- `FollowerCount.[profileId, timestamp]` (composite for latest counts)

### 6. Sample Data

The seed script includes 8 Love Island USA Season 6 contestants with random initial follower counts between 50k-150k.

### 7. Production Deployment

For Vercel deployment:
1. Add `DATABASE_URL` to Vercel environment variables
2. Run `npm run db:migrate` in build step
3. Ensure connection pooling is enabled in Neon

### 8. Local Development (Optional)

If you prefer local PostgreSQL:

```bash
# Install PostgreSQL locally
brew install postgresql

# Create database
createdb love-island-db

# Update .env with local connection
DATABASE_URL="postgresql://username:password@localhost:5432/love-island-db?schema=public"
```

## Troubleshooting

### Connection Issues
- Ensure DATABASE_URL includes `?sslmode=require` for Neon
- Check if IP is whitelisted (Neon allows all by default)
- Verify environment variables are loaded

### Migration Issues
- Run `npx prisma generate` after schema changes
- Use `npx prisma db push` for development
- Use `npx prisma migrate deploy` for production

### Seed Issues
- Ensure database is accessible before running seed
- Check for duplicate Instagram URLs
- Verify Prisma client is generated