const { initializeApp } = require('firebase/app');
const { getAuth, connectAuthEmulator } = require('firebase/auth');
const { 
  getFirestore, 
  connectFirestoreEmulator, 
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} = require('firebase/firestore');
const { getStorage, connectStorageEmulator } = require('firebase/storage');
const firebaseConfig = require('./firebaseConfig');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Firebase with better error handling
let firebaseApp, auth, db, storage;

try {
  console.log('Initializing Firebase...');
  
  // Initialize Firebase app
  firebaseApp = initializeApp(firebaseConfig);
  
  // Initialize auth
  auth = getAuth(firebaseApp);
  
  // Initialize Firestore with persistence settings
  const syncEnabled = process.env.ENABLE_FIREBASE_SYNC === 'true';
  
  if (typeof window !== 'undefined') {
    // Browser environment - configure with persistence
    console.log(`Firebase sync ${syncEnabled ? 'enabled' : 'disabled'}`);
    
    if (syncEnabled) {
      // Initialize with multi-tab persistence for cross-device sync
      db = initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache({
          cacheSizeBytes: CACHE_SIZE_UNLIMITED,
          tabManager: persistentMultipleTabManager()
        })
      });
      
      console.log('Firestore initialized with multi-tab persistence');
    } else {
      // Regular Firestore
      db = getFirestore(firebaseApp);
      
      // Enable single-tab persistence
      enableIndexedDbPersistence(db)
        .then(() => {
          console.log('Firestore persistence enabled (single-tab)');
        })
        .catch(err => {
          if (err.code === 'failed-precondition') {
            // Multiple tabs open, persistence can only be enabled in one tab at a time
            console.warn('Firestore persistence unavailable - multiple tabs open');
          } else if (err.code === 'unimplemented') {
            // The current browser does not support persistence
            console.warn('Firestore persistence not supported by browser');
          } else {
            console.warn('Firestore persistence error:', err.code);
          }
        });
    }
  } else {
    // Server-side environment - no persistence needed
    db = getFirestore(firebaseApp);
  }
  
  // Initialize storage
  storage = getStorage(firebaseApp);
  
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  throw new Error(`Firebase initialization failed: ${error.message}`);
}

module.exports = {
  firebaseApp,
  auth,
  db,
  storage
}; 