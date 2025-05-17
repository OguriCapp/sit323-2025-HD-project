// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBy4Z3PYziygEpMJp9TWlkO2Poq8hJkjF4", 
  authDomain: "deakinataskboardby224385035.firebaseapp.com",
  projectId: "deakinataskboardby224385035",
  storageBucket: "deakinataskboardby224385035.appspot.com",
  messagingSenderId: "928342173867", 
  appId: "1:928342173867:web:2a685aa3254e0d3584efee" 
};

// Initialize Firebase
if (typeof firebase !== 'undefined') {
  // Check if Firebase is already initialized
  if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  // Initialize Firestore
  const db = firebase.firestore();

  // Enable offline persistence
  db.enablePersistence()
    .then(() => {
      console.log("Firebase persistence enabled");
    })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time
        console.log("Firebase persistence unavailable - multiple tabs open");
      } else if (err.code === 'unimplemented') {
        // The current browser does not support all of the features required
        console.log("Firebase persistence not supported by browser");
      }
    });

  console.log("Firebase initialized successfully");
} else {
  console.error("Firebase SDK not loaded");
} 