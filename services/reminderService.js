const { db } = require('../config/firebase');
const { collection, query, where, getDocs, getDoc, doc, Timestamp } = require('firebase/firestore');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * Check for tasks that are due soon and send reminders
 * @param {number} daysBeforeDue - Days before due date to send reminder
 */
const checkUpcomingDeadlines = async (daysBeforeDue = 1) => {
  try {
    console.log(`Checking for tasks due in ${daysBeforeDue} days...`);
    
    // Calculate the date range for tasks due soon
    const now = new Date();
    const targetDate = new Date();
    targetDate.setDate(now.getDate() + daysBeforeDue);
    
    // Get start and end of target date
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
    
    // Query for tasks due on the target date
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('dueDate', '>=', Timestamp.fromDate(startOfDay)),
      where('dueDate', '<=', Timestamp.fromDate(endOfDay)),
      where('status', '!=', 'completed')
    );
    
    const tasksSnapshot = await getDocs(tasksQuery);
    const tasksCount = tasksSnapshot.size;
    
    console.log(`Found ${tasksCount} tasks due in ${daysBeforeDue} days.`);
    
    // Skip if no tasks found
    if (tasksCount === 0) {
      return 0;
    }
    
    // Group tasks by assignee
    const tasksByAssignee = {};
    
    for (const taskDoc of tasksSnapshot.docs) {
      const task = { id: taskDoc.id, ...taskDoc.data() };
      const assigneeId = task.assignedTo;
      
      if (!tasksByAssignee[assigneeId]) {
        tasksByAssignee[assigneeId] = [];
      }
      
      tasksByAssignee[assigneeId].push(task);
    }
    
    // Process each assignee's tasks
    const reminderPromises = [];
    
    for (const [assigneeId, tasks] of Object.entries(tasksByAssignee)) {
      // Get assignee details
      const userDoc = await getDoc(doc(db, 'users', assigneeId));
      
      if (userDoc.exists()) {
        const user = userDoc.data();
        
        if (user.email) {
          // Create email content
          const emailContent = formatTaskReminderMessage(user, tasks, daysBeforeDue);
          
          // Add team information to tasks if applicable
          const tasksWithTeamInfo = await addTeamInfoToTasks(tasks);
          
          // Email configuration
          const mailOptions = {
            from: `"Deakin Task Board" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: `Task Reminder: ${tasks.length} task(s) due in ${daysBeforeDue} day(s)`,
            text: emailContent,
            html: formatHtmlReminderEmail(user, tasksWithTeamInfo, daysBeforeDue)
          };
          
          // Only send if email service is configured
          if (process.env.ENABLE_REMINDERS === 'true' && 
              process.env.EMAIL_USER && 
              process.env.EMAIL_PASSWORD) {
            
            try {
              // Send email
              reminderPromises.push(transporter.sendMail(mailOptions));
              console.log(`Reminder email queued for ${user.email}`);
            } catch (emailError) {
              console.error(`Failed to send reminder to ${user.email}:`, emailError);
            }
          } else {
            // Log for development/testing
            console.log(`[DEV] Would send reminder to ${user.email} about ${tasks.length} upcoming tasks`);
            console.log(emailContent);
          }
        }
      }
    }
    
    // Wait for all emails to be sent
    if (reminderPromises.length > 0) {
      await Promise.all(reminderPromises);
      console.log(`Sent ${reminderPromises.length} reminder emails.`);
    }
    
    console.log('Reminder check completed successfully.');
    return tasksCount;
  } catch (error) {
    console.error('Error checking upcoming deadlines:', error);
    throw error;
  }
};

/**
 * Add team information to tasks
 * @param {Array} tasks - The tasks to add team information to
 * @returns {Array} Tasks with team information
 */
const addTeamInfoToTasks = async (tasks) => {
  const tasksWithTeamInfo = [];
  
  for (const task of tasks) {
    if (task.teamId) {
      try {
        const teamDoc = await getDoc(doc(db, 'teams', task.teamId));
        if (teamDoc.exists()) {
          const teamData = teamDoc.data();
          tasksWithTeamInfo.push({
            ...task,
            teamName: teamData.name
          });
        } else {
          tasksWithTeamInfo.push(task);
        }
      } catch (error) {
        console.error(`Error getting team info for task ${task.id}:`, error);
        tasksWithTeamInfo.push(task);
      }
    } else {
      tasksWithTeamInfo.push(task);
    }
  }
  
  return tasksWithTeamInfo;
};

/**
 * Helper function to format task deadline reminder message
 */
const formatTaskReminderMessage = (user, tasks, daysBeforeDue) => {
  const { fullName } = user;
  
  const taskListText = tasks.map(task => {
    const dueDate = task.dueDate.toDate().toLocaleDateString();
    const teamInfo = task.teamName ? ` [Team: ${task.teamName}]` : '';
    return `- ${task.title} (Priority: ${task.priority}, Due: ${dueDate})${teamInfo}`;
  }).join('\n');
  
  return `
Hello ${fullName || "User"},

This is a friendly reminder that you have ${tasks.length} task(s) due in ${daysBeforeDue} day(s).

Your upcoming tasks:
${taskListText}

Please login to the Deakin Task Board to view and update these tasks.

Best regards,
Deakin Task Board Team
  `;
};

/**
 * Format HTML email for reminders
 */
const formatHtmlReminderEmail = (user, tasks, daysBeforeDue) => {
  const { fullName } = user;
  
  const taskListHtml = tasks.map(task => {
    const dueDate = task.dueDate.toDate().toLocaleDateString();
    const teamInfo = task.teamName ? ` <span style="color:#2e7d32;">[Team: ${task.teamName}]</span>` : '';
    
    // Priority color
    let priorityColor = '#2e7d32'; // green for low
    if (task.priority === 'high') {
      priorityColor = '#f44336'; // red
    } else if (task.priority === 'medium') {
      priorityColor = '#ff9800'; // orange
    }
    
    return `<li style="margin-bottom: 8px;">
      <strong>${task.title}</strong> 
      <span style="color:${priorityColor};">(Priority: ${task.priority})</span>
      <br><span style="color:#757575;">Due: ${dueDate}</span>${teamInfo}
    </li>`;
  }).join('');
  
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
      .header { background-color: #2e7d32; color: white; padding: 20px; text-align: center; }
      .content { padding: 20px; }
      .footer { background-color: #f1f8e9; padding: 15px; text-align: center; font-size: 12px; color: #757575; }
    </style>
  </head>
  <body>
    <div class="header">
      <h2>Deakin Task Board</h2>
      <p>Task Reminder Notification</p>
    </div>
    <div class="content">
      <p>Hello ${fullName || "User"},</p>
      <p>This is a friendly reminder that you have <strong>${tasks.length} task(s)</strong> due in ${daysBeforeDue} day(s).</p>
      
      <h3>Your upcoming tasks:</h3>
      <ul>
        ${taskListHtml}
      </ul>
      
      <p>Please <a href="${process.env.APP_URL || 'http://localhost:3000'}">login to the Deakin Task Board</a> to view and update these tasks.</p>
      
      <p>Best regards,<br>Deakin Task Board Team</p>
    </div>
    <div class="footer">
      <p>This is an automated reminder from the Deakin Task Board. Please do not reply to this email.</p>
    </div>
  </body>
  </html>
  `;
};

// Export functions
module.exports = {
  checkUpcomingDeadlines,
  formatTaskReminderMessage
}; 