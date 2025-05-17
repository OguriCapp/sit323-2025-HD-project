const express = require('express');
const router = express.Router();
const { auth, db } = require('../config/firebase');
const { 
  collection, 
  getDoc, 
  getDocs, 
  doc, 
  query, 
  where,
  orderBy,
  limit,
  setDoc
} = require('firebase/firestore');
const moment = require('moment');

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

// Home/Welcome page
router.get('/', (req, res) => {
  // If already logged in, return user info
  if (auth.currentUser) {
    return res.json({
      success: true,
      message: 'Authenticated',
      user: {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        displayName: auth.currentUser.displayName,
        photoURL: auth.currentUser.photoURL
      }
    });
  }
  
  res.json({
    success: true,
    message: 'Welcome to Deakin Task Board API',
    authenticated: false
  });
});

// Dashboard data
router.get('/dashboard', checkAuth, async (req, res) => {
  try {
    const userId = auth.currentUser.uid;
    
    // Get user information
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    // If user document doesn't exist in Firestore, create it
    if (!userDoc.exists()) {
      const userData = {
        email: auth.currentUser.email,
        fullName: auth.currentUser.displayName || 'Deakin User',
        createdAt: new Date(),
        photoURL: auth.currentUser.photoURL || null
      };
      
      try {
        await setDoc(userDocRef, userData);
        console.log('Created new user document in Firestore');
      } catch (err) {
        console.error('Error creating user document:', err);
      }
    }
    
    const userData = userDoc.exists() ? userDoc.data() : {
      email: auth.currentUser.email,
      fullName: auth.currentUser.displayName || 'Deakin User',
      photoURL: auth.currentUser.photoURL || null
    };
    
    // Initialize stats with default values
    const stats = {
      totalTeams: 0,
      totalCreatedTasks: 0,
      totalAssignedTasks: 0,
      completedTasks: 0
    };
    
    // Initialize empty array for recent tasks
    const recentTasks = [];
    
    try {
      // Get user's recent tasks (sorted by due date)
      const recentTasksQuery = query(
        collection(db, 'tasks'),
        where('assignedTo', '==', userId),
        orderBy('dueDate', 'asc'),
        limit(5)
      );
      
      // Get number of user's teams
      const teamsQuery = query(
        collection(db, 'teams'),
        where('members', 'array-contains', userId)
      );
      
      // Get number of tasks created by user
      const createdTasksQuery = query(
        collection(db, 'tasks'),
        where('createdBy', '==', userId)
      );
      
      // Get number of tasks assigned to user
      const assignedTasksQuery = query(
        collection(db, 'tasks'),
        where('assignedTo', '==', userId)
      );
      
      // Fetch data in parallel
      const [
        recentTasksSnapshot,
        teamsSnapshot,
        createdTasksSnapshot,
        assignedTasksSnapshot
      ] = await Promise.all([
        getDocs(recentTasksQuery),
        getDocs(teamsQuery),
        getDocs(createdTasksQuery),
        getDocs(assignedTasksQuery)
      ]);
      
      // Process recent tasks
      recentTasksSnapshot.forEach(docSnapshot => {
        const data = docSnapshot.data();
        const dueDate = data.dueDate?.toDate();
        
        recentTasks.push({
          id: docSnapshot.id,
          title: data.title,
          description: data.description,
          status: data.status,
          priority: data.priority,
          teamId: data.teamId,
          assignedTo: data.assignedTo,
          createdBy: data.createdBy,
          dueDate: dueDate ? dueDate.toISOString() : null,
          createdAt: data.createdAt?.toDate()?.toISOString() || null,
          isOverdue: dueDate && dueDate < new Date() && data.status !== 'completed'
        });
      });
      
      // Update stats
      stats.totalTeams = teamsSnapshot.size;
      stats.totalCreatedTasks = createdTasksSnapshot.size;
      stats.totalAssignedTasks = assignedTasksSnapshot.size;
      
      // Calculate completed tasks
      assignedTasksSnapshot.forEach(docSnapshot => {
        if (docSnapshot.data().status === 'completed') {
          stats.completedTasks++;
        }
      });
    } catch (fetchError) {
      console.error('Error fetching dashboard data:', fetchError);
      // Continue with default values instead of failing
    }
    
    res.json({ 
      success: true,
      user: {
        id: userId,
        email: userData.email,
        fullName: userData.fullName,
        photoURL: userData.photoURL,
        course: userData.course,
        createdAt: userData.createdAt?.toDate()?.toISOString() || null
      },
      recentTasks,
      stats
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to load dashboard data: ' + error.message
    });
  }
});

module.exports = router;