// API Base URL
// Avoid redeclaring API_BASE_URL variable
if (typeof window.API_BASE_URL === 'undefined') {
    var API_BASE_URL = window.location.origin;
}

// Initialize task creation page
function initTaskCreate() {
    // Check if we're on the task create page
    const createTaskForm = document.getElementById('createTaskForm');
    if (!createTaskForm) return;
    
    console.log('Task creation page initialized');
    
    // Load teams for dropdown
    loadTeams();
    
    // Handle form submission
    createTaskForm.addEventListener('submit', function(event) {
        console.log('Form submit event triggered');
        event.preventDefault();
        createTask();
    });
}

// Load teams for the team dropdown
function loadTeams() {
    const teamDropdown = document.getElementById('teamId');
    if (!teamDropdown) return;
    
    console.log('Loading teams for dropdown');
    
    fetch(`${API_BASE_URL}/api/teams`)
        .then(response => {
            console.log('Teams API response status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('Teams data received:', data);
            if (data.success) {
                // Combine created and member teams
                const allTeams = [...(data.createdTeams || []), ...(data.memberTeams || [])];
                console.log('Total teams available:', allTeams.length);
                
                // Clear existing options except the default one
                teamDropdown.innerHTML = '<option value="">No Team</option>';
                
                // Add team options
                allTeams.forEach(team => {
                    const option = document.createElement('option');
                    option.value = team.id;
                    option.textContent = team.name;
                    teamDropdown.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('Error loading teams:', error);
        });
}

// Create a new task
function createTask() {
    console.log('Creating new task');
    
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const assignedTo = document.getElementById('assignedTo').value; // Empty = self
    const dueDate = document.getElementById('dueDate').value;
    const priority = document.getElementById('priority').value;
    const category = document.getElementById('category').value;
    const teamId = document.getElementById('teamId').value;
    const attachment = document.getElementById('attachment').files[0];
    
    console.log('Form data:', { 
        title, description, assignedTo, 
        dueDate, priority, category, 
        teamId, attachment: attachment ? attachment.name : 'none' 
    });
    
    // Create form data for file upload
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    if (assignedTo) formData.append('assignedTo', assignedTo);
    if (dueDate) formData.append('dueDate', dueDate);
    formData.append('priority', priority);
    formData.append('category', category);
    if (teamId) formData.append('teamId', teamId);
    if (attachment) formData.append('attachment', attachment);
    
    console.log('Sending API request to:', `${API_BASE_URL}/api/tasks/create`);
    
    fetch(`${API_BASE_URL}/api/tasks/create`, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        console.log('Create task API response status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('Create task API response:', data);
        if (data.success) {
            // Show notification
            console.log('Task created successfully, redirecting...');
            alert('Task created successfully!');
            
            // Redirect to task list instead of details for now
            window.location.href = '/tasks/index.html';
        } else {
            console.error('Task creation failed:', data.message);
            alert(data.message || 'Failed to create task. Please try again.');
        }
    })
    .catch(error => {
        console.error('Error creating task:', error);
        alert('An error occurred while creating the task. Please try again.');
    });
}

// Initialize task details page
function initTaskDetails() {
    // Get task ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get('id');
    
    if (taskId) {
        // Load task details
        loadTaskDetails(taskId);
    } else {
        // Redirect to tasks list if no ID provided
        window.location.href = '/tasks/index.html';
    }
}

// Load task details
function loadTaskDetails(taskId) {
    fetch(`${API_BASE_URL}/api/tasks/${taskId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Display task details
                displayTaskDetails(data.task, data.creator, data.assignee, data.team);
                
                // Setup edit/delete buttons if user has permission
                if (data.canEdit) {
                    setupTaskActions(data.task);
                    setupStatusActions(data.task);
                }
            } else {
                alert(data.message || 'Failed to load task details.');
                window.location.href = '/tasks/index.html';
            }
        })
        .catch(error => {
            console.error('Error loading task details:', error);
            alert('An error occurred while loading the task details.');
            window.location.href = '/tasks/index.html';
        });
}

// Initialize tasks list page
function initTasksList() {
    // Get team ID from URL if any
    const urlParams = new URLSearchParams(window.location.search);
    const teamId = urlParams.get('teamId');
    
    // Load tasks
    loadTasks(teamId);
}

// Load tasks (all or team-specific)
function loadTasks(teamId) {
    let url = `${API_BASE_URL}/api/tasks`;
    
    if (teamId) {
        url += `?teamId=${teamId}`;
    }
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Display tasks
                displayTasks(data.tasks, data.teamId);
            } else {
                alert(data.message || 'Failed to load tasks.');
            }
        })
        .catch(error => {
            console.error('Error loading tasks:', error);
            alert('An error occurred while loading tasks.');
        });
}

// Display task details
function displayTaskDetails(task, creator, assignee, team) {
    // Update task title and badges
    document.getElementById('taskTitle').textContent = task.title;
    document.getElementById('taskStatus').textContent = getStatusText(task.status || 'pending');
    document.getElementById('taskStatus').className = `badge ${getStatusClass(task.status || 'pending')}`;
    document.getElementById('taskPriority').textContent = task.priority || 'Medium';
    document.getElementById('taskCategory').textContent = task.category || 'General';
    
    // Update task info
    document.getElementById('taskDueDate').textContent = task.dueDate ? formatDate(task.dueDate) : 'No due date';
    document.getElementById('taskCreator').textContent = creator ? creator.fullName || creator.email : 'Unknown';
    document.getElementById('taskAssignee').textContent = assignee ? assignee.fullName || assignee.email : 'Unassigned';
    document.getElementById('taskTeam').textContent = team ? team.name : 'No team';
    
    // Update description
    document.getElementById('taskDescription').textContent = task.description || 'No description provided.';
    
    // Show attachment if exists
    if (task.attachmentURL) {
        document.getElementById('taskAttachment').style.display = 'block';
        document.getElementById('attachmentLink').href = task.attachmentURL;
        document.getElementById('attachmentName').textContent = task.attachmentName || 'Download attachment';
    } else {
        document.getElementById('taskAttachment').style.display = 'none';
    }
    
    // Show task details and hide loader
    document.getElementById('taskLoader').style.display = 'none';
    document.getElementById('taskDetails').style.display = 'block';
}

// Setup edit and delete buttons
function setupTaskActions(task) {
    const actionsContainer = document.getElementById('taskActions');
    if (!actionsContainer) return;
    
    // Show actions container
    actionsContainer.style.display = 'flex';
    
    // Setup edit button
    const editBtn = document.getElementById('editTaskBtn');
    if (editBtn) {
        editBtn.addEventListener('click', function() {
            window.location.href = `edit.html?id=${task.id}`;
        });
    }
    
    // Setup delete button
    const deleteBtn = document.getElementById('deleteTaskBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to delete this task?')) {
                deleteTask(task.id);
            }
        });
    }
}

// Setup status action buttons
function setupStatusActions(task) {
    const statusActionsContainer = document.getElementById('taskStatusActions');
    if (!statusActionsContainer) return;
    
    // Show status actions container
    statusActionsContainer.style.display = 'block';
    
    // Setup status buttons
    const markPendingBtn = document.getElementById('markPendingBtn');
    const markInProgressBtn = document.getElementById('markInProgressBtn');
    const markCompletedBtn = document.getElementById('markCompletedBtn');
    
    // Hide the button for current status
    if (task.status === 'pending' && markPendingBtn) {
        markPendingBtn.style.display = 'none';
    } else if (task.status === 'in-progress' && markInProgressBtn) {
        markInProgressBtn.style.display = 'none';
    } else if (task.status === 'completed' && markCompletedBtn) {
        markCompletedBtn.style.display = 'none';
    }
    
    // Add event listeners to buttons
    if (markPendingBtn) {
        markPendingBtn.addEventListener('click', function() {
            updateTaskStatus(task.id, 'pending');
        });
    }
    
    if (markInProgressBtn) {
        markInProgressBtn.addEventListener('click', function() {
            updateTaskStatus(task.id, 'in-progress');
        });
    }
    
    if (markCompletedBtn) {
        markCompletedBtn.addEventListener('click', function() {
            updateTaskStatus(task.id, 'completed');
        });
    }
}

// Update task status
function updateTaskStatus(taskId, status) {
    const statusText = getStatusText(status);
    
    if (confirm(`Are you sure you want to mark this task as "${statusText}"?`)) {
        // Show loading state
        document.getElementById('taskLoader').style.display = 'block';
        document.getElementById('taskDetails').style.display = 'none';
        
        fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Reload task details
                loadTaskDetails(taskId);
                // Show success message
                showNotification(`Task marked as ${statusText} successfully`, 'success');
            } else {
                alert(data.message || 'Failed to update task status.');
                // Hide loader and show details
                document.getElementById('taskLoader').style.display = 'none';
                document.getElementById('taskDetails').style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error updating task status:', error);
            alert('An error occurred while updating task status.');
            // Hide loader and show details
            document.getElementById('taskLoader').style.display = 'none';
            document.getElementById('taskDetails').style.display = 'block';
        });
    }
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

// Get status text
function getStatusText(status) {
    switch (status) {
        case 'pending': return 'Pending';
        case 'in-progress': return 'In Progress';
        case 'completed': return 'Completed';
        default: return 'Unknown';
    }
}

// Get status class for badge
function getStatusClass(status) {
    switch (status) {
        case 'pending': return 'bg-warning';
        case 'in-progress': return 'bg-primary';
        case 'completed': return 'bg-success';
        default: return 'bg-secondary';
    }
}

// Display tasks
function displayTasks(tasks, teamId) {
    const tasksList = document.getElementById('tasksList');
    if (!tasksList) return;
    
    // Clear existing tasks
    tasksList.innerHTML = '';
    
    // Handle empty tasks list
    if (!tasks || tasks.length === 0) {
        tasksList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tasks empty-icon"></i>
                <h3>No tasks found</h3>
                <p>${teamId ? 'This team doesn\'t have any tasks yet.' : 'You don\'t have any tasks yet.'}</p>
                <a href="create.html" class="btn btn-primary">Create a Task</a>
            </div>
        `;
        return;
    }
    
    // Sort tasks by due date (null/undefined dates last)
    tasks.sort((a, b) => {
        // Completed tasks at the bottom
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        if (a.status !== 'completed' && b.status === 'completed') return -1;
        
        // Sort by due date
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        
        const dateA = a.dueDate.seconds ? new Date(a.dueDate.seconds * 1000) : new Date(a.dueDate);
        const dateB = b.dueDate.seconds ? new Date(b.dueDate.seconds * 1000) : new Date(b.dueDate);
        
        return dateA - dateB;
    });
    
    // Render each task
    tasks.forEach(task => {
        // Create status badge
        const statusClass = getStatusClass(task.status);
        const statusText = getStatusText(task.status);
        
        // Format due date
        let dueDateText = task.dueDate ? formatDate(task.dueDate) : 'No due date';
        
        // Check if overdue (for non-completed tasks)
        const isOverdue = task.status !== 'completed' && task.dueDate && 
            (task.dueDate.seconds ? 
                new Date(task.dueDate.seconds * 1000) < new Date() : 
                new Date(task.dueDate) < new Date());
        
        // Create task element
        const taskElement = document.createElement('div');
        taskElement.className = `task-item ${isOverdue ? 'overdue' : ''} ${task.status === 'completed' ? 'completed-task' : ''}`;
        taskElement.innerHTML = `
            <div class="task-header">
                <span class="task-badge ${statusClass}">${statusText}</span>
                <span class="task-badge priority-${task.priority}">${task.priority}</span>
                ${task.teamId ? '<span class="task-badge team">Team</span>' : ''}
            </div>
            <div class="task-body">
                <h3 class="task-title ${task.status === 'completed' ? 'completed-title' : ''}">${task.title}</h3>
                <p class="task-description ${task.status === 'completed' ? 'completed-description' : ''}">${task.description || 'No description'}</p>
            </div>
            <div class="task-footer">
                <span class="task-date ${isOverdue ? 'overdue-date' : ''}">
                    <i class="far fa-calendar-alt"></i> ${dueDateText}
                </span>
                <a href="details.html?id=${task.id}" class="task-link">
                    View Details <i class="fas fa-chevron-right"></i>
                </a>
            </div>
        `;
        
        // Add task to the list
        tasksList.appendChild(taskElement);
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
}

// Delete task
function deleteTask(taskId) {
    fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Task deleted successfully!');
            window.location.href = '/tasks/index.html';
        } else {
            alert(data.message || 'Failed to delete task.');
        }
    })
    .catch(error => {
        console.error('Error deleting task:', error);
        alert('An error occurred while deleting the task.');
    });
}

// Format date helper
function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

// Run initialization on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Tasks.js loaded, current path:', window.location.pathname);
    
    // Check which page we're on
    if (window.location.pathname.includes('/tasks/create.html')) {
        initTaskCreate();
    } else if (window.location.pathname.includes('/tasks/details.html')) {
        initTaskDetails();
    } else if (window.location.pathname.includes('/tasks/index.html')) {
        initTasksList();
    } else {
        console.log('Not on a tasks page');
    }
}); 