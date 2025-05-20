
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, CACHE_SIZE_UNLIMITED, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Enhanced logging to ensure environment variables are loaded
console.log('[Firebase.ts] Initializing Firebase. Verifying config from process.env:');
let allConfigValuesPresent = true;
for (const [key, value] of Object.entries(firebaseConfig)) {
  const envVarName = `NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z0-9])/g, '_$1').toUpperCase().replace('CONFIG_','').slice(0,-1)}`;
  console.log(`  [Firebase.ts] Config Key: ${key}, Env Var: ${envVarName}, Value from process.env: ${process.env[envVarName] || firebaseConfig[key as keyof typeof firebaseConfig]}`);
  if (!value && key !== 'measurementId') { // measurementId is optional
    console.error(`[Firebase.ts] CRITICAL: Environment variable for ${key} (likely ${envVarName}) is missing or empty!`);
    allConfigValuesPresent = false;
  }
}

if (!allConfigValuesPresent) {
  console.error("[Firebase.ts] CRITICAL: One or more Firebase config values are missing. Firebase will likely fail to initialize correctly. Please check your .env.local file and ensure all NEXT_PUBLIC_FIREBASE_... variables are set.");
}

let app: FirebaseApp;

if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
    console.log('[Firebase.ts] Firebase app initialized successfully with Project ID (from input config):', firebaseConfig.projectId);
  } catch (e: any) {
    console.error('[Firebase.ts] Firebase app initialization failed:', e);
    console.error('[Firebase.ts] This often means NEXT_PUBLIC_FIREBASE_API_KEY or NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing or incorrect in your .env.local file, or there is an issue with your Firebase project setup.');
    throw e;
  }
} else {
  app = getApp();
  console.log('[Firebase.ts] Existing Firebase app instance retrieved. Project ID (from existing app.options):', app.options.projectId);
}

const auth = getAuth(app);

const db = initializeFirestore(app, {
  experimentalForceLongPolling: true, // Keep this for restricted environments
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
});

// Enable offline persistence
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db)
    .then(() => console.log('[Firebase.ts] Firestore offline persistence enabled.'))
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('[Firebase.ts] Firestore offline persistence failed: Multiple tabs open or other issue preventing persistence.');
      } else if (err.code === 'unimplemented') {
        console.warn('[Firebase.ts] Firestore offline persistence failed: Browser does not support IndexedDB or it is disabled.');
      } else {
        console.error('[Firebase.ts] Firestore offline persistence failed:', err);
      }
    });
}

// Log the project ID associated with the db instance
if (db && db.app && db.app.options && db.app.options.projectId) {
  console.log('[Firebase.ts] Firestore instance is configured for Project ID:', db.app.options.projectId);
  if (db.app.options.projectId !== firebaseConfig.projectId) {
    console.warn(`[Firebase.ts] Mismatch Alert: Firestore SDK project ID (${db.app.options.projectId}) vs. initial firebaseConfig.projectId (${firebaseConfig.projectId}). Ensure this is intended.`);
  }
} else {
  console.error('[Firebase.ts] Could not determine Project ID from Firestore instance. This is highly unusual.');
}

export { app, auth, db };
