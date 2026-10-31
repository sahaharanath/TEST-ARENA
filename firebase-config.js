// Unique Infotech CMS — Firebase configuration
// ---------------------------------------------------------------------------
// Populate the values below from your Firebase project settings
// (Project settings > General > Your apps > Firebase SDK snippet > Config).
// This project id is unique-infotech-cms, region asia-south1 (Mumbai).
//
// If no real config is provided, the application runs in LOCAL PREVIEW / DEMO
// mode backed by localStorage. Demo data is NEVER written to Firebase.
// ---------------------------------------------------------------------------
const FIREBASE_CONFIG = {
  apiKey: "",            // e.g. "AIzaSy..."
  authDomain: "",        // e.g. "unique-infotech-cms.firebaseapp.com"
  projectId: "",         // "unique-infotech-cms"
  storageBucket: "",     // e.g. "unique-infotech-cms.appspot.com"
  messagingSenderId: "", // e.g. "123456789012"
  appId: ""              // e.g. "1:123456789012:web:abcdef..."
};

let firebaseReady = false;
let firebaseAuth = null;
let firebaseFirestore = null;
let firebaseStorage = null;

function isFirebaseConfigured() {
  return (
    FIREBASE_CONFIG.apiKey &&
    FIREBASE_CONFIG.projectId &&
    FIREBASE_CONFIG.appId
  );
}

function initFirebase() {
  if (!isFirebaseConfigured()) {
    console.info("[Unique Infotech CMS] Firebase not configured — running in local preview (demo) mode.");
    firebaseReady = false;
    return;
  }
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    firebaseAuth = firebase.auth();
    firebaseFirestore = firebase.firestore();
    firebaseStorage = firebase.storage();
    firebaseReady = true;
    console.info("[Unique Infotech CMS] Firebase initialised.");
  } catch (err) {
    console.error("[Unique Infotech CMS] Firebase initialisation failed:", err);
    firebaseReady = false;
  }
}

// Persistence across refreshes (only meaningful when Firebase is configured)
if (isFirebaseConfigured()) {
  firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {
    /* session persistence fallback */
  });
}

initFirebase();
