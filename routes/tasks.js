const express = require('express');
const router = express.Router();
const { auth, db, storage } = require('../config/firebase');
const { 
  collection, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where,
  orderBy,
  Timestamp
} = require('firebase/firestore');
const { ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

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

// Get all tasks (for current user or team)
router.get('/', checkAuth, async (req, res) => {
  try {
    const userId = auth.currentUser.uid;
    const teamId = req.query.teamId;
    const includeTeamTasks = req.query.includeTeamTasks === 'true';
    
    let tasks = [];
    
    if (teamId) {
      // Get tasks for a specific team
      const teamTasksQuery = query(
        collection(db, 'tasks'), 
        where('teamId', '==', teamId),
        orderBy('dueDate', 'asc')
      );
      
      const teamTasksSnapshot = await getDocs(teamTasksQuery);
      
      teamTasksSnapshot.forEach(docSnapshot => {
        const data = docSnapshot.data();
        tasks.push({
          id: docSnapshot.id,
          title: data.title,
          description: data.description,
          status: data.status,
          priority: data.priority,
          category: data.category,
          teamId: data.teamId,
          assignedTo: data.assignedTo,
          createdBy: data.createdBy,
          dueDate: data.dueDate?.toDate()?.toISOString() || null,
          createdAt: data.createdAt?.toDate()?.toISOString() || null,
          attachment: data.attachment || null,
          isAssignedToMe: data.assignedTo === userId
        });
      });
    } else {
      // Get personal tasks (assigned to current user)
      const personalTasksQuery = query(
        collection(db, 'tasks'), 
        where('assignedTo', '==', userId),
        orderBy('dueDate', 'asc')
      );
      
      const personalTasksSnapshot = await getDocs(personalTasksQuery);
      
      personalTasksSnapshot.forEach(docSnapshot => {
        const data = docSnapshot.data();
        tasks.push({
          id: docSnapshot.id,
          title: data.title,
          description: data.description,
          status: data.status,
          priority: data.priority,
          category: data.category,
          teamId: data.teamId,
          assignedTo: data.assignedTo,
          createdBy: data.createdBy,
          dueDate: data.dueDate?.toDate()?.toISOString() || null,
          createdAt: data.createdAt?.toDate()?.toISOString() || null,
          attachment: data.attachment || null,
          isAssignedToMe: true
        });
      });
      
      // Include tasks from teams the user is a member of
      if (includeTeamTasks) {
        // Get user's teams
        const createdTeamsQuery = query(
          collection(db, 'teams'), 
          where('createdBy', '==', userId)
        );
        
        const memberTeamsQuery = query(
          collection(db, 'teams'), 
          where('members', 'array-contains', userId)
        );
        
        const [createdTeamsSnapshot, memberTeamsSnapshot] = await Promise.all([
          getDocs(createdTeamsQuery),
          getDocs(memberTeamsQuery)
        ]);
        
        // Collect all team IDs
        const teamIds = new Set();
        
        createdTeamsSnapshot.forEach(doc => {
          teamIds.add(doc.id);
        });
        
        memberTeamsSnapshot.forEach(doc => {
          teamIds.add(doc.id);
        });
        
        // If user is a member of any teams, get team tasks
        if (teamIds.size > 0) {
          // We need to run separate queries for each team ID
          const teamTasksPromises = Array.from(teamIds).map(teamId => {
            const teamTasksQuery = query(
              collection(db, 'tasks'),
              where('teamId', '==', teamId),
              orderBy('dueDate', 'asc')
            );
            return getDocs(teamTasksQuery);
          });
          
          const teamTasksSnapshots = await Promise.all(teamTasksPromises);
          
          // Process team tasks
          teamTasksSnapshots.forEach(snapshot => {
            snapshot.forEach(docSnapshot => {
              const data = docSnapshot.data();
              
              // Avoid duplicates (tasks already assigned to the user)
              if (data.assignedTo !== userId) {
                tasks.push({
                  id: docSnapshot.id,
                  title: data.title,
                  description: data.description,
                  status: data.status,
                  priority: data.priority,
                  category: data.category,
                  teamId: data.teamId,
                  assignedTo: data.assignedTo,
                  createdBy: data.createdBy,
                  dueDate: data.dueDate?.toDate()?.toISOString() || null,
                  createdAt: data.createdAt?.toDate()?.toISOString() || null,
                  attachment: data.attachment || null,
                  isAssignedToMe: false,
                  isTeamTask: true
                });
              }
            });
          });
        }
      }
    }
    
    // Sort tasks by due date (null dates at the end)
    tasks.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
    
    res.json({ 
      success: true,
      tasks,
      teamId: teamId || null
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch tasks: ' + error.message
    });
  }
});

// Create task
router.post('/create', checkAuth, upload.single('attachment'), async (req, res) => {
  try {
    const { title, description, dueDate, priority, assignedTo, teamId, category } = req.body;
    const userId = auth.currentUser.uid;
    
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }
    
    // Prepare task data
    const taskData = {
      title,
      description: description || '',
      createdBy: userId,
      createdAt: Timestamp.now(),
      dueDate: dueDate ? Timestamp.fromDate(new Date(dueDate)) : null,
      priority: priority || 'medium',
      status: 'pending',
      assignedTo: assignedTo || userId,
      category: category || 'Other'
    };
    
    if (teamId) {
      taskData.teamId = teamId;
    }
    
    // If there's an attachment, upload to Firebase Storage
    if (req.file) {
      const fileDate = Date.now();
      const fileName = `tasks/${userId}/${fileDate}_${req.file.originalname}`;
      const storageRef = ref(storage, fileName);
      
      // Upload file
      await uploadBytes(storageRef, req.file.buffer);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Add to task data
      taskData.attachment = {
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        downloadURL
      };
    }
    
    // Save to Firestore
    const docRef = await addDoc(collection(db, 'tasks'), taskData);
    
    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      taskId: docRef.id,
      task: {
        id: docRef.id,
        ...taskData,
        dueDate: taskData.dueDate?.toDate()?.toISOString() || null,
        createdAt: taskData.createdAt.toDate().toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create task: ' + error.message
    });
  }
});

// Get task details
router.get('/:id', checkAuth, async (req, res) => {
  try {
    const taskId = req.params.id;
    const taskDoc = await getDoc(doc(db, 'tasks', taskId));
    
    if (!taskDoc.exists()) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    const taskData = taskDoc.data();
    const task = {
      id: taskDoc.id,
      title: taskData.title,
      description: taskData.description,
      status: taskData.status,
      priority: taskData.priority,
      category: taskData.category || 'Other',
      teamId: taskData.teamId || null,
      assignedTo: taskData.assignedTo,
      createdBy: taskData.createdBy,
      dueDate: taskData.dueDate?.toDate()?.toISOString() || null,
      createdAt: taskData.createdAt?.toDate()?.toISOString() || null,
      attachment: taskData.attachment || null
    };
    
    // Get creator information
    const creatorDoc = await getDoc(doc(db, 'users', task.createdBy));
    let creator = { id: task.createdBy };
    if (creatorDoc.exists()) {
      const creatorData = creatorDoc.data();
      creator = {
        id: task.createdBy,
        fullName: creatorData.fullName,
        email: creatorData.email,
        photoURL: creatorData.photoURL
      };
    }
    
    // Get assignee information
    let assignee = { id: task.assignedTo };
    if (task.assignedTo) {
      const assigneeDoc = await getDoc(doc(db, 'users', task.assignedTo));
      if (assigneeDoc.exists()) {
        const assigneeData = assigneeDoc.data();
        assignee = {
          id: task.assignedTo,
          fullName: assigneeData.fullName,
          email: assigneeData.email,
          photoURL: assigneeData.photoURL
        };
      }
    }
    
    // Get team information if task is associated with a team
    let team = null;
    if (task.teamId) {
      const teamDoc = await getDoc(doc(db, 'teams', task.teamId));
      if (teamDoc.exists()) {
        const teamData = teamDoc.data();
        team = {
          id: task.teamId,
          name: teamData.name,
          description: teamData.description
        };
      }
    }
    
    res.json({
      success: true,
      task,
      creator,
      assignee,
      team,
      canEdit: task.createdBy === auth.currentUser.uid || task.assignedTo === auth.currentUser.uid
    });
  } catch (error) {
    console.error('Error fetching task details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task details: ' + error.message
    });
  }
});

// Update task
router.put('/:id', checkAuth, upload.single('attachment'), async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = auth.currentUser.uid;
    const { title, description, status, dueDate, priority, assignedTo, category } = req.body;
    
    // Get the task
    const taskDoc = await getDoc(doc(db, 'tasks', taskId));
    
    if (!taskDoc.exists()) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    const taskData = taskDoc.data();
    
    // Check if user has permission to edit (creator or assignee)
    if (taskData.createdBy !== userId && taskData.assignedTo !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to edit this task'
      });
    }
    
    // Prepare task update data
    const updateData = {};
    
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = status;
    if (dueDate) updateData.dueDate = Timestamp.fromDate(new Date(dueDate));
    if (priority) updateData.priority = priority;
    if (assignedTo) updateData.assignedTo = assignedTo;
    if (category) updateData.category = category;
    
    // If there's a new attachment, upload to Firebase Storage
    if (req.file) {
      const fileDate = Date.now();
      const fileName = `tasks/${userId}/${fileDate}_${req.file.originalname}`;
      const storageRef = ref(storage, fileName);
      
      // Upload file
      await uploadBytes(storageRef, req.file.buffer);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Add to update data
      updateData.attachment = {
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        downloadURL
      };
    }
    
    // Update task
    await updateDoc(doc(db, 'tasks', taskId), updateData);
    
    res.json({
      success: true,
      message: 'Task updated successfully',
      taskId
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task: ' + error.message
    });
  }
});

// Delete task
router.delete('/:id', checkAuth, async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = auth.currentUser.uid;
    
    // Get the task
    const taskDoc = await getDoc(doc(db, 'tasks', taskId));
    
    if (!taskDoc.exists()) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    const taskData = taskDoc.data();
    
    // Check if user has permission to delete (creator only)
    if (taskData.createdBy !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this task'
      });
    }
    
    // Delete task
    await deleteDoc(doc(db, 'tasks', taskId));
    
    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete task: ' + error.message
    });
  }
});

// Test Microservice Endpoint 1: User Service
router.get('/test/userservice/getUser/:userId', (req, res) => {
  const { userId } = req.params;
  console.log(`[Test Microservice] Received request for user: ${userId}`);
  // Simulate fetching user data from a separate user service
  res.json({
    success: true,
    message: `Simulated user data for user ID: ${userId}`,
    userData: {
      id: userId,
      username: `testuser_${userId}`,
      email: `${userId}@example.com`
    }
  });
});

// Test Microservice Endpoint 3: Task Service
router.get('/test/taskservice/getTask/:taskId', (req, res) => {
  const { taskId } = req.params;
  console.log(`[Test Microservice] Received request for task: ${taskId}`);
  // Simulate fetching task data from a separate task service
  res.json({
    success: true,
    message: `Simulated task data for task ID: ${taskId}`,
    taskData: {
      id: taskId,
      title: `Simulated Task ${taskId}`,
      description: `This is a simulated description for task ${taskId}.`,
      status: 'pending',
      priority: 'medium',
      dueDate: '2025-12-31T23:59:59.999Z',
      assignedTo: 'simulated_user_id',
      teamId: 'simulated_team_id'
    }
  });
});

// Test Microservice Endpoint 4: Team Service
router.get('/test/teamservice/getTeam/:teamId', (req, res) => {
  const { teamId } = req.params;
  console.log(`[Test Microservice] Received request for team: ${teamId}`);
  // Simulate fetching team data from a separate team service
  res.json({
    success: true,
    message: `Simulated team data for team ID: ${teamId}`,
    teamData: {
      id: teamId,
      name: `Simulated Team ${teamId}`,
      description: `This is a simulated description for team ${teamId}.`,
      members: ['user1', 'user2', 'user3'],
      createdBy: 'simulated_user_id'
    }
  });
});

module.exports = router; 