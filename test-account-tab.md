# Account Tab Login/Register - Testing Guide

## ✅ What Was Fixed

1. **Frontend Signup Form** - Added missing `role` parameter to API call
2. **Frontend Login Form** - Already working correctly  
3. **Authentication Status Check** - Added function to check login status on page load
4. **Logout Functionality** - Added complete logout handler
5. **Database Schema** - Added authentication columns to both local and production databases:
   - `passwordHash` - For storing hashed passwords
   - `isGuest` - To track guest vs authenticated users
   - `passwordResetToken` - For password reset functionality
   - `passwordResetExpiry` - Timestamp for reset token expiration

## 🧪 How to Test Locally

1. **Open the website**: http://localhost:3000
2. **Click on the "Account" tab** - You should see "Welcome to Athlytx" with a "Sign Up / Login" button
3. **Click "Sign Up / Login"** - A modal will open
4. **Create an account**:
   - Enter name (e.g., "John Doe")
   - Enter email (e.g., "john@example.com")
   - Enter password (min 8 characters)
   - Click "Create Account"
5. **Verify success**:
   - Modal should close
   - Account tab should now show your email, name, and user ID
   - Tab label should change from "Account" to your name/email
6. **Test logout**:
   - Click "Logout" button
   - Should return to guest view
7. **Test login**:
   - Click "Sign Up / Login" again
   - Switch to "Login" tab
   - Enter the same email and password
   - Click "Login"
   - Should see your account information again

## 🚀 Production (Railway)

The PostgreSQL database on Railway has been updated with the necessary authentication columns. When you deploy this to production, the login/register functionality will work automatically.

## 📝 API Endpoints Used

- **POST /api/auth/signup** - Create new account
- **POST /api/auth/login** - Login to existing account
- **POST /api/auth/logout** - Logout and invalidate session

## 🔒 Security Features

- Passwords are hashed using bcrypt (10 rounds)
- Session tokens are randomly generated (32 bytes)
- Sessions expire after 30 days
- Password minimum length: 8 characters

