// API Base URL
// Avoid redeclaring API_BASE_URL variable
if (typeof window.API_BASE_URL === 'undefined') {
    var API_BASE_URL = window.location.origin;
}

// Fetch dashboard data
function fetchDashboardData() {
    fetch(`${API_BASE_URL}/api/dashboard`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Update stats counters
                updateStats(data.stats);
                
                // Update recent tasks
                updateRecentTasks(data.recentTasks);
                
                // Update user info (fallback if auth.js didn't do it)
                if (data.user) {
                    updateUserInfo(data.user);
                }
            } else {
                console.error('Failed to fetch dashboard data:', data.message);
                showNotification('Failed to fetch dashboard data', 'error');
            }
        })
        .catch(error => {
            console.error('Error fetching dashboard data:', error);
            showNotification('Error connecting to server', 'error');
        });
}

// Update dashboard statistics
function updateStats(stats) {
    if (stats) {
        // Update completed tasks count
        const completedTasksElement = document.getElementById('completedTasksCount');
        if (completedTasksElement) {
            completedTasksElement.textContent = stats.completedTasks || 0;
        }
        
        // Update pending tasks count (assigned - completed)
        const pendingTasksElement = document.getElementById('pendingTasksCount');
        if (pendingTasksElement) {
            const pendingCount = (stats.totalAssignedTasks || 0) - (stats.completedTasks || 0);
            pendingTasksElement.textContent = pendingCount > 0 ? pendingCount : 0;
        }
        
        // Update teams count
        const teamsElement = document.getElementById('teamsCount');
        if (teamsElement) {
            teamsElement.textContent = stats.totalTeams || 0;
        }
    }
}

// Update user information
function updateUserInfo(user) {
    const userNameElement = document.getElementById('userName');
    const userEmailElement = document.getElementById('userEmail');
    const userAvatarElement = document.getElementById('userAvatar');
    
    if (userNameElement && user.fullName) {
        userNameElement.textContent = user.fullName;
    }
    
    if (userEmailElement && user.email) {
        userEmailElement.textContent = user.email;
    }
    
    if (userAvatarElement) {
        if (user.photoURL) {
            userAvatarElement.src = user.photoURL;
        } else if (user.fullName) {
            // Generate avatar from name
            userAvatarElement.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=2e7d32&color=fff`;
        }
    }
}

// Update recent tasks list
function updateRecentTasks(tasks) {
    const tasksListElement = document.getElementById('recentTasksList');
    
    if (tasksListElement) {
        // Clear current content
        tasksListElement.innerHTML = '';
        
        if (tasks && tasks.length > 0) {
            // Create task items
            tasks.forEach(task => {
                const taskElement = createTaskElement(task);
                tasksListElement.appendChild(taskElement);
            });
            
            // Check for task reminders if the function exists
            if (window.taskReminder && typeof window.taskReminder.checkTaskReminders === 'function') {
                // Get user settings from localStorage
                let userSettings = {};
                try {
                    const settingsJson = localStorage.getItem('userSettings');
                    if (settingsJson) {
                        userSettings = JSON.parse(settingsJson);
                    }
                } catch (error) {
                    console.error('Error parsing user settings:', error);
                }
                
                // Check for reminders
                window.taskReminder.checkTaskReminders(tasks, userSettings);
            }
        } else {
            // Show empty state
            const emptyStateElement = document.createElement('div');
            emptyStateElement.className = 'empty-state';
            emptyStateElement.innerHTML = `
                <i class="fas fa-tasks"></i>
                <p>No tasks available. Create a new task to get started.</p>
                <a href="tasks/create.html" class="btn btn-primary">Create Task</a>
            `;
            tasksListElement.appendChild(emptyStateElement);
        }
    }
}

// Create a task list item element
function createTaskElement(task) {
    const taskElement = document.createElement('div');
    taskElement.className = `task-item ${task.status} ${task.isOverdue ? 'overdue' : ''}`;
    
    // Format due date
    let dueDateText = 'No due date';
    if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        dueDateText = dueDate.toLocaleDateString();
        
        // Check if overdue
        if (task.isOverdue) {
            dueDateText = `Overdue: ${dueDateText}`;
        }
    }
    
    // Priority class
    const priorityClass = `priority-${task.priority || 'medium'}`;
    
    taskElement.innerHTML = `
        <div class="task-header">
            <h4 class="task-title">${task.title}</h4>
            <span class="task-priority ${priorityClass}">${task.priority || 'Medium'}</span>
        </div>
        <p class="task-description">${task.description || 'No description'}</p>
        <div class="task-footer">
            <span class="task-due-date"><i class="far fa-calendar"></i> ${dueDateText}</span>
            <a href="tasks/details.html?id=${task.id}" class="btn btn-sm">View Details</a>
        </div>
    `;
    
    return taskElement;
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        document.body.appendChild(notification);
    }
    
    // Set notification class based on type
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Show notification
    notification.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', function() {
    // Fetch dashboard data
    fetchDashboardData();
}); 