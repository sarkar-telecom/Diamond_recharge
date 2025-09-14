# Diamond Topup — Static Firebase Site

This is a ready-to-use static site for a **Diamond Topup** system.  
It uses Firebase (Authentication + Firestore) for backend functionality.  
**You can host it on GitHub Pages / Netlify for free.**

## Features
- Email + Google Sign-in
- User dashboard (profile, balance, weekly completed)
- Order diamonds (fixed packages + custom)
- Order history (users see their own orders only)
- Admin panel: view all orders, mark Complete / Cancel, add balance to users
- Mobile friendly neon glass UI

## Quick setup
1. Open `js/firebase-config.js` and confirm the firebase config (already set).
2. In Firebase Console, enable:
   - Authentication (Email/Password and Google)
   - Firestore Database (in native mode)
3. Recommended Firestore rules (basic):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
    match /orders/{orderId} {
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      allow read: if request.auth != null && (request.auth.uid == resource.data.userId || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow update: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow delete: if false;
    }
  }
}
```
4. Create an admin user in Firestore by setting `role: "admin"` in the user's document.
5. Deploy to GitHub Pages / Netlify by uploading the files.

## Important notes
- This implementation performs balance deduction/refund in client-side transactions (Firestore transactions). For production use, move sensitive operations to Cloud Functions to prevent abuse.
- The Firebase config is intentionally public (it's a client-side config).
