const express = require('express');
const router = express.Router();
const { auth, db, storage } = require('../config/firebase');
const { 
  collection, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  doc, 
  query, 
  where,
  Timestamp,
  setDoc
} = require('firebase/firestore');
const { ref, uploadBytes, getDownloadURL, deleteObject } = require('firebase/storage');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { updateProfile } = require('firebase/auth');

// Middleware: Check if user is logged in
const checkAuth = (req, res, next) => {
  if (!auth.currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  next();
};

// User registration handler
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, course } = req.body;
    const userId = auth.currentUser.uid;
    
    // Prepare user data
    const userData = {
      fullName,
      email,
      course: course || '',
      createdAt: Timestamp.now()
    };
    
    // Save to Firestore
    await setDoc(doc(db, 'users', userId), userData);
    
    res.status(201).json({
      success: true,
      message: 'User profile created successfully',
      userId
    });
  } catch (error) {
    console.error('Error saving user information:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save user information: ' + error.message
    });
  }
});

// User profile endpoint
router.get('/profile', checkAuth, async (req, res) => {
  try {
    const userId = auth.currentUser.uid;
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    let userData = {};
    if (userDoc.exists()) {
      userData = userDoc.data();
    }
    
    res.json({
      success: true,
      user: {
        id: userId,
        ...userData,
        email: auth.currentUser.email,
        photoURL: auth.currentUser.photoURL,
        createdAt: userData.createdAt?.toDate()?.toISOString() || null
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile: ' + error.message
    });
  }
});

// Get user settings
router.get('/settings', checkAuth, async (req, res) => {
  try {
    const userId = auth.currentUser.uid;
    const userSettingsDoc = await getDoc(doc(db, 'userSettings', userId));
    
    let settings = getDefaultSettings();
    
    if (userSettingsDoc.exists()) {
      const userSettings = userSettingsDoc.data();
      
      // Merge with defaults to ensure all fields exist
      settings = {
        ...settings,
        ...userSettings,
        notifications: {
          ...settings.notifications,
          ...(userSettings.notifications || {})
        },
        sync: {
          ...settings.sync,
          ...(userSettings.sync || {})
        }
      };
    }
    
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user settings: ' + error.message
    });
  }
});

// Update user settings
router.put('/settings', checkAuth, async (req, res) => {
  try {
    const userId = auth.currentUser.uid;
    const settings = req.body;
    
    // Validate settings
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid settings data'
      });
    }
    
    // Sanitize and structure the settings
    const sanitizedSettings = {
      notifications: {
        emailReminders: Boolean(settings.notifications?.emailReminders),
        reminderDays: parseInt(settings.notifications?.reminderDays) || 3
      },
      sync: {
        enabled: Boolean(settings.sync?.enabled),
        offlineAccess: Boolean(settings.sync?.offlineAccess),
        dataSaver: Boolean(settings.sync?.dataSaver)
      },
      updatedAt: Timestamp.now()
    };
    
    // Save to Firestore
    await setDoc(doc(db, 'userSettings', userId), sanitizedSettings);
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: sanitizedSettings
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user settings: ' + error.message
    });
  }
});

// Edit user profile handler
router.put('/profile', checkAuth, upload.single('avatar'), async (req, res) => {
  try {
    const userId = auth.currentUser.uid;
    const { fullName, course } = req.body;
    
    // Prepare update data
    const updateData = {
      fullName,
      course: course || '',
      updatedAt: Timestamp.now()
    };
    
    // If there's a new avatar, upload to Firebase Storage
    if (req.file) {
      const fileName = `avatars/${userId}`;
      const storageRef = ref(storage, fileName);
      
      // Upload file
      await uploadBytes(storageRef, req.file.buffer);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Add to user data
      updateData.photoURL = downloadURL;
      
      // Update Firebase Auth user profile
      await updateProfile(auth.currentUser, {
        photoURL: downloadURL
      });
    }
    
    // Update Firestore
    await updateDoc(doc(db, 'users', userId), updateData);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      userId
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user profile: ' + error.message
    });
  }
});

// Search users API (for adding team members, etc.)
router.get('/search', checkAuth, async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.json({ users: [] });
    }
    
    // Search users
    const usersQuery = query(
      collection(db, 'users'), 
      where('email', '>=', email),
      where('email', '<=', email + '\uf8ff')
    );
    
    const usersSnapshot = await getDocs(usersQuery);
    const users = [];
    
    usersSnapshot.forEach(docSnapshot => {
      // Don't include current user
      if (docSnapshot.id !== auth.currentUser.uid) {
        const userData = docSnapshot.data();
        users.push({
          id: docSnapshot.id,
          fullName: userData.fullName,
          email: userData.email,
          photoURL: userData.photoURL,
          course: userData.course
        });
      }
    });
    
    res.json({ 
      success: true,
      users 
    });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to search users: ' + error.message 
    });
  }
});

// Helper function to get default settings
function getDefaultSettings() {
  return {
    notifications: {
      emailReminders: true,
      reminderDays: 3
    },
    sync: {
      enabled: true,
      offlineAccess: true,
      dataSaver: false
    }
  };
}

module.exports = router; 