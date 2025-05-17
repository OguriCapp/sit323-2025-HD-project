const express = require('express');
const router = express.Router();
const { auth, db } = require('../config/firebase');
const { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail
} = require('firebase/auth');
const { doc, setDoc } = require('firebase/firestore');

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, course } = req.body;
    
    // Validate required fields
    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email and password are required'
      });
    }
    
    // Create user with Firebase
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Send verification email
    await sendEmailVerification(user);
    
    // Store user info in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      fullName,
      email,
      course: course || '',
      createdAt: new Date(),
      photoURL: user.photoURL || null
    });
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email for verification.',
      userId: user.uid
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message
    });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // Login with Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ 
      success: false, 
      message: error.message
    });
  }
});

// Forgot password endpoint
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    // Send password reset email
    await sendPasswordResetEmail(auth, email);
    
    res.json({
      success: true,
      message: 'Password reset email sent. Please check your inbox.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message
    });
  }
});

// Logout endpoint
router.get('/logout', async (req, res) => {
  try {
    await signOut(auth);
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to logout: ' + error.message
    });
  }
});

// Get current user status
router.get('/status', async (req, res) => {
  try {
    const user = auth.currentUser;
    
    if (user) {
      res.json({
        authenticated: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified
        }
      });
    } else {
      res.json({
        authenticated: false
      });
    }
  } catch (error) {
    console.error('Auth status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get authentication status: ' + error.message
    });
  }
});

module.exports = router; 