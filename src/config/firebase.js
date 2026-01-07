import admin from "firebase-admin";

let initialized = false;

export function getFirebaseAdmin() {
  if (!initialized) {
    // Uses Application Default Credentials by default (GOOGLE_APPLICATION_CREDENTIALS)
    // Optionally uses FIREBASE_PROJECT_ID if provided.
    const projectId = process.env.FIREBASE_PROJECT_ID;

    admin.initializeApp(
      projectId
        ? { credential: admin.credential.applicationDefault(), projectId }
        : { credential: admin.credential.applicationDefault() }
    );
    initialized = true;
  }
  return admin;
}

