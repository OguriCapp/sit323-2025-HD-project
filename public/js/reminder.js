// Task reminder functionality
// This script checks for upcoming tasks and displays reminders

/**
 * Check for upcoming tasks and display reminders
 * @param {Array} tasks - Array of task objects
 * @param {Object} settings - User settings with reminder preferences
 */
function checkTaskReminders(tasks, settings) {
  // Default to 3 days if reminderDays not set
  const reminderDays = settings?.notifications?.reminderDays || 3;
  const showReminders = settings?.notifications?.emailReminders !== false;
  
  // If reminders are disabled, exit early
  if (!showReminders) return;
  
  // Get current date
  const now = new Date();
  
  // Calculate the target date for reminders
  const targetDate = new Date();
  targetDate.setDate(now.getDate() + reminderDays);
  
  // Set to beginning of day
  targetDate.setHours(0, 0, 0, 0);
  
  // Find tasks due within the reminder period
  const upcomingTasks = tasks.filter(task => {
    // Skip completed tasks
    if (task.status === 'completed') return false;
    
    // Convert task due date to Date object if it's a timestamp
    const dueDate = task.dueDate instanceof Date ? task.dueDate : 
                   (task.dueDate?.toDate ? task.dueDate.toDate() : new Date(task.dueDate));
    
    // Set to beginning of day for comparison
    dueDate.setHours(0, 0, 0, 0);
    
    // Check if due date is within reminder period
    const daysUntilDue = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));
    return daysUntilDue >= 0 && daysUntilDue <= reminderDays;
  });
  
  // If there are upcoming tasks, show reminder
  if (upcomingTasks.length > 0) {
    showTaskReminder(upcomingTasks);
  }
}

/**
 * Display task reminder notification
 * @param {Array} tasks - Array of upcoming task objects
 */
function showTaskReminder(tasks) {
  // Create container for reminder
  const reminderContainer = document.createElement('div');
  reminderContainer.className = 'reminder-container';
  
  // Create reminder content
  let reminderHTML = `
    <div class="reminder-header">
      <i class="fas fa-bell"></i>
      <h3>Task Reminder</h3>
      <button class="reminder-close">&times;</button>
    </div>
    <div class="reminder-content">
      <p>You have <strong>${tasks.length}</strong> task(s) coming due soon:</p>
      <ul>
  `;
  
  // Add each task to the reminder
  tasks.forEach(task => {
    const dueDate = task.dueDate instanceof Date ? task.dueDate : 
                   (task.dueDate?.toDate ? task.dueDate.toDate() : new Date(task.dueDate));
    
    reminderHTML += `
      <li>
        <strong>${task.title}</strong>
        <span class="reminder-due-date">Due: ${dueDate.toLocaleDateString()}</span>
      </li>
    `;
  });
  
  // Close the reminder HTML
  reminderHTML += `
      </ul>
    </div>
  `;
  
  // Set the HTML content
  reminderContainer.innerHTML = reminderHTML;
  
  // Add the reminder to the page
  document.body.appendChild(reminderContainer);
  
  // Add CSS for the reminder
  addReminderStyles();
  
  // Add close button functionality
  const closeButton = reminderContainer.querySelector('.reminder-close');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      reminderContainer.classList.add('hiding');
      setTimeout(() => {
        reminderContainer.remove();
      }, 300);
    });
  }
  
  // Auto-hide after 15 seconds
  setTimeout(() => {
    if (document.body.contains(reminderContainer)) {
      reminderContainer.classList.add('hiding');
      setTimeout(() => {
        if (document.body.contains(reminderContainer)) {
          reminderContainer.remove();
        }
      }, 300);
    }
  }, 15000);
}

/**
 * Add CSS styles for the reminder
 */
function addReminderStyles() {
  // Check if styles already exist
  if (document.getElementById('reminder-styles')) return;
  
  // Create style element
  const styleElement = document.createElement('style');
  styleElement.id = 'reminder-styles';
  
  // Set the CSS content
  styleElement.textContent = `
    .reminder-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 350px;
      background-color: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      overflow: hidden;
      animation: slide-in 0.3s ease-out;
    }
    
    .reminder-container.hiding {
      animation: slide-out 0.3s ease-in forwards;
    }
    
    @keyframes slide-in {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slide-out {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
    
    .reminder-header {
      display: flex;
      align-items: center;
      padding: 12px 15px;
      background-color: var(--primary-color, #2e7d32);
      color: white;
    }
    
    .reminder-header i {
      margin-right: 10px;
    }
    
    .reminder-header h3 {
      flex: 1;
      margin: 0;
      font-size: 16px;
    }
    
    .reminder-close {
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .reminder-content {
      padding: 15px;
    }
    
    .reminder-content ul {
      margin: 10px 0 0;
      padding: 0 0 0 10px;
      list-style-type: none;
    }
    
    .reminder-content li {
      padding: 8px 0;
      border-bottom: 1px solid #eee;
      display: flex;
      flex-direction: column;
    }
    
    .reminder-content li:last-child {
      border-bottom: none;
    }
    
    .reminder-due-date {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }
  `;
  
  // Add the styles to the document
  document.head.appendChild(styleElement);
}

// Export functions for use in other modules
window.taskReminder = {
  checkTaskReminders,
  showTaskReminder
}; 