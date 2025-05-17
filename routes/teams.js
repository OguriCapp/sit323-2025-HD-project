const express = require('express');
const router = express.Router();
const { auth, db } = require('../config/firebase');
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
  arrayUnion,
  arrayRemove,
  Timestamp
} = require('firebase/firestore');

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

// Get all teams (user is a member of)
router.get('/', checkAuth, async (req, res) => {
  try {
    const userId = auth.currentUser.uid;
    
    // Get teams created by user
    const createdTeamsQuery = query(
      collection(db, 'teams'), 
      where('createdBy', '==', userId)
    );
    
    // Get teams user is a member of
    const memberTeamsQuery = query(
      collection(db, 'teams'), 
      where('members', 'array-contains', userId)
    );
    
    const [createdTeamsSnapshot, memberTeamsSnapshot] = await Promise.all([
      getDocs(createdTeamsQuery),
      getDocs(memberTeamsQuery)
    ]);
    
    const createdTeams = [];
    const memberTeams = [];
    
    createdTeamsSnapshot.forEach(docSnapshot => {
      const data = docSnapshot.data();
      createdTeams.push({
        id: docSnapshot.id,
        name: data.name,
        description: data.description,
        createdBy: data.createdBy,
        members: data.members,
        createdAt: data.createdAt?.toDate()?.toISOString() || null,
        memberCount: data.members?.length || 0
      });
    });
    
    memberTeamsSnapshot.forEach(docSnapshot => {
      // Avoid duplicates, don't include user's created teams
      const data = docSnapshot.data();
      if (data.createdBy !== userId) {
        memberTeams.push({
          id: docSnapshot.id,
          name: data.name,
          description: data.description,
          createdBy: data.createdBy,
          members: data.members,
          createdAt: data.createdAt?.toDate()?.toISOString() || null,
          memberCount: data.members?.length || 0
        });
      }
    });
    
    res.json({ 
      success: true,
      createdTeams,
      memberTeams
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch teams: ' + error.message
    });
  }
});

// Create team 
router.post('/create', checkAuth, async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = auth.currentUser.uid;
    
    // Validate input
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Team name is required'
      });
    }
    
    // Prepare team data
    const teamData = {
      name,
      description: description || '',
      createdBy: userId,
      members: [userId], // Creator automatically becomes member
      createdAt: Timestamp.now()
    };
    
    // Save to Firestore
    const docRef = await addDoc(collection(db, 'teams'), teamData);
    
    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      teamId: docRef.id,
      team: {
        id: docRef.id,
        name: teamData.name,
        description: teamData.description,
        createdBy: userId,
        members: teamData.members,
        createdAt: teamData.createdAt.toDate().toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create team: ' + error.message
    });
  }
});

// Get team details
router.get('/:id', checkAuth, async (req, res) => {
  try {
    const teamId = req.params.id;
    const teamDoc = await getDoc(doc(db, 'teams', teamId));
    
    if (!teamDoc.exists()) {
      return res.status(404).json({ 
        success: false,
        message: 'Team not found'
      });
    }
    
    const teamData = teamDoc.data();
    const team = {
      id: teamId,
      name: teamData.name,
      description: teamData.description,
      createdBy: teamData.createdBy,
      members: teamData.members,
      createdAt: teamData.createdAt?.toDate()?.toISOString() || null
    };
    
    // Check if user is team member
    const userId = auth.currentUser.uid;
    if (!team.members.includes(userId)) {
      return res.status(403).json({ 
        success: false,
        message: 'You are not a member of this team'
      });
    }
    
    // Get team member details
    const members = [];
    if (team.members && team.members.length > 0) {
      const memberPromises = team.members.map(async (memberId) => {
        const memberDoc = await getDoc(doc(db, 'users', memberId));
        if (memberDoc.exists()) {
          const memberData = memberDoc.data();
          return {
            id: memberId,
            fullName: memberData.fullName,
            email: memberData.email,
            photoURL: memberData.photoURL,
            isCreator: memberId === team.createdBy
          };
        }
        return null;
      });
      
      const memberResults = await Promise.all(memberPromises);
      members.push(...memberResults.filter(member => member !== null));
    }
    
    // Get team tasks
    const tasksQuery = query(
      collection(db, 'tasks'), 
      where('teamId', '==', teamId)
    );
    
    const tasksSnapshot = await getDocs(tasksQuery);
    const tasks = [];
    
    tasksSnapshot.forEach(docSnapshot => {
      const data = docSnapshot.data();
      tasks.push({
        id: docSnapshot.id,
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        assignedTo: data.assignedTo,
        createdBy: data.createdBy,
        dueDate: data.dueDate?.toDate()?.toISOString() || null,
        createdAt: data.createdAt?.toDate()?.toISOString() || null
      });
    });
    
    // Group tasks by status
    const pendingTasks = tasks.filter(task => task.status === 'pending');
    const inProgressTasks = tasks.filter(task => task.status === 'in-progress');
    const completedTasks = tasks.filter(task => task.status === 'completed');
    
    res.json({ 
      success: true,
      team,
      members,
      tasks: {
        pending: pendingTasks,
        inProgress: inProgressTasks,
        completed: completedTasks
      },
      isCreator: userId === team.createdBy
    });
  } catch (error) {
    console.error('Error fetching team details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team details: ' + error.message
    });
  }
});

// Invite member to team
router.post('/:id/invite', checkAuth, async (req, res) => {
  console.log(`Invite member request received for team: ${req.params.id}, email: ${req.body.email}`);
  try {
    const teamId = req.params.id;
    const { email } = req.body;
    const currentUserId = auth.currentUser.uid;
    
    // Validate input
    if (!email) {
      console.log('Invite member request missing email');
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    // Check if team exists
    const teamDoc = await getDoc(doc(db, 'teams', teamId));
    if (!teamDoc.exists()) {
      console.log(`Team not found: ${teamId}`);
      return res.status(404).json({ 
        success: false,
        message: 'Team not found'
      });
    }
    
    // Check if current user is team creator or member
    const teamData = teamDoc.data();
    if (teamData.createdBy !== currentUserId && !teamData.members.includes(currentUserId)) {
      console.log(`User ${currentUserId} not authorized to invite to team ${teamId}`);
      return res.status(403).json({ 
        success: false,
        message: 'You are not authorized to invite members to this team'
      });
    }
    
    // Find user by email
    const usersQuery = query(
      collection(db, 'users'), 
      where('email', '==', email)
    );
    const usersSnapshot = await getDocs(usersQuery);
    
    if (usersSnapshot.empty) {
      console.log(`User with email ${email} not found`);
      return res.status(404).json({ 
        success: false,
        message: 'User with this email not found'
      });
    }
    
    // Get user ID from the query result
    const userData = usersSnapshot.docs[0];
    const userId = userData.id;
    
    // Check if user is already a member
    if (teamData.members.includes(userId)) {
      console.log(`User ${userId} is already a member of team ${teamId}`);
      return res.status(400).json({ 
        success: false,
        message: 'User is already a member of this team'
      });
    }
    
    // Add user to team members
    await updateDoc(doc(db, 'teams', teamId), {
      members: arrayUnion(userId)
    });
    
    console.log(`Member ${userId} invited successfully to team ${teamId}`);
    res.json({ 
      success: true,
      message: 'Member invited successfully'
    });
  } catch (error) {
    console.error('Error inviting member:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to invite member: ' + error.message
    });
  }
});

// Update team
router.put('/:id', checkAuth, async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = auth.currentUser.uid;
    const { name, description } = req.body;
    
    const teamDoc = await getDoc(doc(db, 'teams', teamId));
    
    if (!teamDoc.exists()) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    const teamData = teamDoc.data();
    
    // Check if user is team creator
    if (teamData.createdBy !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the team creator can update team details'
      });
    }
    
    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    
    await updateDoc(doc(db, 'teams', teamId), updateData);
    
    res.json({
      success: true,
      message: 'Team updated successfully',
      teamId
    });
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update team: ' + error.message
    });
  }
});

// Delete team
router.delete('/:id', checkAuth, async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = auth.currentUser.uid;
    
    const teamDoc = await getDoc(doc(db, 'teams', teamId));
    
    if (!teamDoc.exists()) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    // Check if user is team creator
    if (teamDoc.data().createdBy !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the team creator can delete the team'
      });
    }
    
    // Get team tasks
    const tasksQuery = query(
      collection(db, 'tasks'), 
      where('teamId', '==', teamId)
    );
    
    const tasksSnapshot = await getDocs(tasksQuery);
    
    // Delete all team tasks
    const deleteTaskPromises = [];
    tasksSnapshot.forEach(taskDoc => {
      deleteTaskPromises.push(deleteDoc(doc(db, 'tasks', taskDoc.id)));
    });
    
    await Promise.all([
      ...deleteTaskPromises,
      deleteDoc(doc(db, 'teams', teamId))
    ]);
    
    res.json({
      success: true,
      message: 'Team and associated tasks deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete team: ' + error.message
    });
  }
});

// Add member to team
router.post('/:id/members/add', checkAuth, async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = auth.currentUser.uid;
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Member email is required'
      });
    }
    
    // Check if team exists
    const teamDoc = await getDoc(doc(db, 'teams', teamId));
    if (!teamDoc.exists()) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    // Check if user is team creator
    if (teamDoc.data().createdBy !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the team creator can add members'
      });
    }
    
    // Find user by email
    const usersQuery = query(
      collection(db, 'users'), 
      where('email', '==', email)
    );
    
    const usersSnapshot = await getDocs(usersQuery);
    
    if (usersSnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get user ID
    const newMemberId = usersSnapshot.docs[0].id;
    
    // Check if user is already a member
    if (teamDoc.data().members.includes(newMemberId)) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this team'
      });
    }
    
    // Add user to team
    await updateDoc(doc(db, 'teams', teamId), {
      members: arrayUnion(newMemberId)
    });
    
    res.json({
      success: true,
      message: 'Member added successfully',
      teamId,
      memberId: newMemberId
    });
  } catch (error) {
    console.error('Error adding team member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add team member: ' + error.message
    });
  }
});

// Remove member from team
router.post('/:id/members/:memberId/remove', checkAuth, async (req, res) => {
  try {
    const teamId = req.params.id;
    const memberId = req.params.memberId;
    const userId = auth.currentUser.uid;
    
    // Check if team exists
    const teamDoc = await getDoc(doc(db, 'teams', teamId));
    if (!teamDoc.exists()) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    const teamData = teamDoc.data();
    
    // Check if user is team creator
    if (teamData.createdBy !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the team creator can remove members'
      });
    }
    
    // Check if member is team creator
    if (memberId === teamData.createdBy) {
      return res.status(400).json({
        success: false,
        message: 'Team creator cannot be removed'
      });
    }
    
    // Check if user is a member
    if (!teamData.members.includes(memberId)) {
      return res.status(400).json({
        success: false,
        message: 'User is not a member of this team'
      });
    }
    
    // Remove user from team
    await updateDoc(doc(db, 'teams', teamId), {
      members: arrayRemove(memberId)
    });
    
    // Get tasks assigned to this member in this team
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('teamId', '==', teamId),
      where('assignedTo', '==', memberId)
    );
    
    const tasksSnapshot = await getDocs(tasksQuery);
    
    // Reassign tasks to team creator
    const reassignPromises = [];
    tasksSnapshot.forEach(taskDoc => {
      reassignPromises.push(
        updateDoc(doc(db, 'tasks', taskDoc.id), {
          assignedTo: teamData.createdBy
        })
      );
    });
    
    await Promise.all(reassignPromises);
    
    res.json({
      success: true,
      message: 'Member removed successfully',
      tasksReassigned: reassignPromises.length
    });
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove team member: ' + error.message
    });
  }
});

module.exports = router;