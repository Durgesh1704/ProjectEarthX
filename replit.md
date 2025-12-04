# EARTHX - Plastic Recycling dApp

## Project Overview
EARTHX is a blockchain-powered plastic recycling platform that incentivizes recycling through cryptocurrency rewards. The platform connects Citizens, Collectors, and Recyclers in a proof-of-impact economy built on the Polygon blockchain.

## Recent Setup (December 4, 2025)
This project was imported from GitHub and configured to run in the Replit environment:

### What Was Set Up
1. **Backend API Server** (Node.js + Express + TypeScript)
   - Created server entry point (`backend/src/server.ts`)
   - Implemented authentication system with JWT
   - Set up RESTful API routes for collections and batch verification
   - Configured controllers and services for business logic
   - Added AI-powered fraud detection system
   - Integrated blockchain service for Polygon network

2. **TypeScript Configuration**
   - Fixed import paths for shared types
   - Compiled TypeScript to JavaScript successfully
   - Resolved all type errors in services and controllers

3. **Environment & Dependencies**
   - Installed Node.js 20
   - Installed all required npm packages (express, pg, ethers, bcryptjs, jsonwebtoken, etc.)
   - Configured environment variables for development

4. **Frontend**
   - Created simple web interface at `/public/index.html` for API documentation
   - Serves static files through Express

5. **Workflow**
   - Configured "Backend Server" workflow running on localhost:3000
   - Backend properly serves API endpoints

### Architecture

#### Backend Structure
```
backend/
├── src/
│   ├── config/          # Database configuration
│   ├── controllers/     # API request handlers
│   │   ├── auth.controller.ts
│   │   ├── collection.controller.ts
│   │   └── batch.controller.ts
│   ├── services/        # Business logic layer
│   │   ├── collection.service.ts
│   │   ├── batch.service.ts
│   │   ├── verification.service.ts
│   │   └── blockchain.service.ts
│   ├── middleware/      # Auth & validation middleware
│   ├── routes/          # API route definitions
│   ├── shared/          # Shared TypeScript types
│   └── server.ts        # Express app entry point
└── database/
    └── schema.sql       # PostgreSQL database schema
```

#### Mobile App Structure
```
mobile/
├── src/
│   ├── contexts/        # React contexts (AuthContext)
│   ├── navigation/      # React Navigation setup
│   ├── screens/         # UI screens for different roles
│   └── services/        # API client
└── App.tsx              # Main app component
```

## 🚧 What Still Needs Setup

### Critical: Database Configuration
The application requires a PostgreSQL database. You need to:

1. **Create a PostgreSQL Database**
   - Use Replit's built-in PostgreSQL or external database service
   - Note: Replit database creation was not available during initial setup

2. **Run Database Migration**
   ```bash
   psql -h <host> -U <user> -d <database> -f backend/database/schema.sql
   ```

3. **Configure Database Environment Variables**
   Set these in Replit Secrets or environment variables:
   - `DB_HOST` - Database host
   - `DB_PORT` - Database port (usually 5432)
   - `DB_NAME` - Database name (earthx_db)
   - `DB_USER` - Database username
   - `DB_PASSWORD` - Database password

### Optional: Blockchain Configuration
For full blockchain functionality, set:
- `POLYGON_PRIVATE_KEY` - Your Polygon wallet private key
- `POLYGON_CONTRACT_ADDRESS` - Deployed smart contract address
- `POLYGON_RPC_URL` - Polygon Amoy testnet RPC (default provided)

### Mobile App
The mobile app (React Native/Expo) is partially set up but not running:
- Install Expo dependencies: `cd mobile && npm install`
- Run on web: `npm run web`
- Note: React Native development is better suited for local environment

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - User authentication
- `GET /api/auth/profile` - Get user profile (requires auth)

### Collections (Collector Role)
- `POST /api/collection/record` - Record plastic collection
- `GET /api/collection/history` - Get collection history

### Batch Verification (Recycler Role)
- `POST /api/batch/verify` - Verify batch with AI fraud detection
- `GET /api/batch/pending` - Get pending batches
- `GET /api/batch/history` - Get verification history
- `GET /api/batch/:batchId/mint-status` - Check blockchain mint status
- `POST /api/batch/:batchId/retry-mint` - Retry failed mint

### System
- `GET /api/health` - API health check
- `GET /` - API documentation (HTML page)

## Tech Stack
- **Backend**: Node.js, Express, TypeScript, PostgreSQL
- **Blockchain**: Polygon (Amoy Testnet), Ethers.js
- **Mobile**: React Native, Expo
- **Authentication**: JWT, bcrypt
- **AI/Fraud Detection**: Custom double-weight verification algorithm

## User Roles
1. **Citizens** - Earn EIU tokens for recycling plastic
2. **Collectors** - Track weight and verify pickups
3. **Recyclers** - Verify batches and mint tokens on Polygon blockchain

## Current Status
✅ Backend server running on port 3000  
✅ API endpoints functional  
✅ TypeScript compiled successfully  
⚠️ Database not connected (requires setup)  
⚠️ Blockchain service inactive (requires private key)  
⚠️ Mobile app not running (React Native setup incomplete)

## Next Steps for Development
1. Set up PostgreSQL database and run migration
2. Test API endpoints with tools like Postman
3. Configure blockchain integration with Polygon testnet
4. Complete mobile app setup (optional - can use API directly)
5. Add integration tests
6. Deploy to production with proper secrets management

## License
Copyright © 2025 SDA EcoLabs. All Rights Reserved.
