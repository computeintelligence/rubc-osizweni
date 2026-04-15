# Backend Setup Guide for Ticket Form

## Overview
The ticket form now uses a custom backend server to handle file uploads and email delivery with attachments. This replaces the FormSubmit.co service to provide better file handling.

## Prerequisites
- Node.js and npm installed
- Gmail account for sending emails

## Setup Steps

### 1. Generate Gmail App Password
The backend uses Gmail to send emails with attachments. You need to create an app-specific password:

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** if not already enabled
3. Go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Select "Mail" and "Windows PC" (or your device)
5. Copy the generated 16-character password

### 2. Configure Environment Variables
Create a `.env` file in the root directory (or update the existing one):

```bash
# Email Configuration
EMAIL_USER="rubcosizweni.office@gmail.com"
EMAIL_PASSWORD="your_16_character_app_password_here"

# Server Configuration
PORT=3001
```

For local development, `.env.local` is already configured:
```bash
VITE_API_URL=http://localhost:3001
```

### 3. Install Dependencies
All required dependencies are already installed:
- `multer` - For handling file uploads
- `nodemailer` - For sending emails with attachments
- `express` - For the backend server
- `concurrently` - For running both frontend and backend

### 4. Running the Application

#### Option 1: Run Backend and Frontend Together (Recommended for Development)
```bash
npm run dev:all
```
This will start:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

#### Option 2: Run Only Backend
```bash
npm run server
```

#### Option 3: Run Only Frontend
```bash
npm run dev
```

## API Endpoint

### POST `/api/submit-ticket`
Submits a ticket registration with proof of payment attachment.

**Request:**
- Content-Type: `multipart/form-data`
- Fields:
  - `firstName` (string): User's first name
  - `lastName` (string): User's last name
  - `ticketType` (string): Ticket type (general, vip, vvip)
  - `price` (number): Ticket price
  - `proofOfPayment` (file): Proof of payment file (JPG, PNG, GIF, PDF, max 5MB)

**Response:**
```json
{
  "success": true,
  "message": "Ticket registration submitted successfully. Proof of payment attached to email."
}
```

## Email Template
When a ticket is submitted, an email is sent to `rubcosizweni.office@gmail.com` with:
- Form details (name, ticket type, price)
- Proof of payment file as an attachment
- Submission timestamp

## File Storage
Uploaded files are temporarily stored in the `/uploads` directory and automatically deleted after the email is sent. This directory is excluded from version control (.gitignore).

## Troubleshooting

### Email Not Sending
1. Verify Gmail app password is correct
2. Check that 2-Step Verification is enabled on Gmail account
3. Check server logs for error messages
4. Ensure `nodemailer` is properly installed

### File Upload Failed
1. Ensure file is under 5MB
2. Check that file type is JPG, PNG, GIF, or PDF
3. Verify disk space available for uploads

### Backend Connection Error
1. Ensure backend is running on port 3001
2. Check `VITE_API_URL` in `.env.local` points to correct backend URL
3. Check browser console for CORS errors

## Production Deployment

For production deployment:

1. Set environment variables on your deployment platform (Vercel, Railway, etc.)
2. Ensure `PORT` is set correctly (usually provided by the platform)
3. Update `VITE_API_URL` in build configuration to point to production backend URL
4. Ensure upload directory is writable or use cloud storage instead

## Security Notes

- Keep `.env` file secure and never commit it to version control
- The app password is less secure than your main Gmail password; consider using Google Workspace or another email service for production
- Files are deleted after email is sent, but consider adding antivirus scanning for production
