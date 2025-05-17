// API Base URL
// Avoid redeclaring API_BASE_URL variable
if (typeof window.API_BASE_URL === 'undefined') {
    var API_BASE_URL = window.location.origin;
}

// Initialize teams page
function initTeamsPage() {
    // Check if we're on the teams index page
    if (window.location.pathname.includes('/teams/index.html')) {
        console.log('Teams index page initialized');
        // Load teams
        loadTeams();
    }
}

// Initialize team create page
function initTeamCreate() {
    // Check if we're on the create team page
    const createTeamForm = document.getElementById('createTeamForm');
    if (createTeamForm) {
        console.log('Team creation page initialized');
        // Handle form submission
        createTeamForm.addEventListener('submit', function(event) {
            console.log('Team form submit triggered');
            event.preventDefault();
            createTeam();
        });
    }
}

// Initialize team details page
function initTeamDetails() {
    // Check if we're on the team details page
    if (window.location.pathname.includes('/teams/details.html')) {
        console.log('Team details page initialized');
        
        // Get team ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const teamId = urlParams.get('id');
        
        if (teamId) {
            // Load team details
            loadTeamDetails(teamId);
            
            // Setup invite member modal
            setupInviteMemberModal(teamId);
        } else {
            // Redirect to teams list if no ID provided
            window.location.href = '/teams/index.html';
        }
    }
}

// Setup invite member modal functionality
function setupInviteMemberModal(teamId) {
    const modal = document.getElementById('inviteMemberModal');
    const inviteBtn = document.getElementById('inviteMemberBtn');
    const closeBtn = document.querySelector('.modal-close');
    const cancelBtn = document.getElementById('cancelInviteBtn');
    const inviteForm = document.getElementById('inviteMemberForm');
    
    if (!modal || !inviteBtn) return;
    
    // Show modal when invite button is clicked
    inviteBtn.addEventListener('click', function() {
        modal.style.display = 'block';
    });
    
    // Close modal when close button is clicked
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
    
    // Close modal when cancel button is clicked
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside the modal content
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Handle form submission
    if (inviteForm) {
        inviteForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const memberEmail = document.getElementById('memberEmail').value;
            inviteMember(teamId, memberEmail);
        });
    }
}

// Invite a member to the team
function inviteMember(teamId, email) {
    console.log(`Inviting member with email: ${email} to team: ${teamId}`);
    
    // 构建完整的URL并输出以便调试
    const inviteUrl = `${API_BASE_URL}/api/teams/${teamId}/invite`;
    console.log('Sending invitation request to URL:', inviteUrl);
    
    fetch(inviteUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({ email }),
        credentials: 'include' // 包含cookies以确保身份验证
    })
    .then(response => {
        console.log('Invite member API response status:', response.status);
        console.log('Response headers:', [...response.headers].map(h => `${h[0]}: ${h[1]}`).join(', '));
        return response.json().catch(err => {
            console.error('Error parsing JSON response:', err);
            return { success: false, message: 'Invalid server response' };
        });
    })
    .then(data => {
        console.log('Invite member API response:', data);
        
        // Close modal
        const modal = document.getElementById('inviteMemberModal');
        if (modal) modal.style.display = 'none';
        
        // Clear form
        const emailInput = document.getElementById('memberEmail');
        if (emailInput) emailInput.value = '';
        
        if (data.success) {
            // Show success notification
            showNotification('Member invited successfully!', 'invitation-success');
            
            // Reload team details to update member list
            loadTeamDetails(teamId);
        } else {
            // Show error notification with detailed message
            const errorMsg = data.message || 'Failed to invite member.';
            console.error('Invitation failed:', errorMsg);
            showNotification(errorMsg, 'invitation-error');
        }
    })
    .catch(error => {
        console.error('Error inviting member:', error);
        showNotification('An error occurred while inviting the member. Please check console for details.', 'error');
    });
}

// Load team details
function loadTeamDetails(teamId) {
    console.log('Loading team details for ID:', teamId);
    fetch(`${API_BASE_URL}/api/teams/${teamId}`)
        .then(response => {
            console.log('Team details API response status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('Team details data received:', data);
            if (data.success) {
                // Display team details
                displayTeamDetails(data.team);
                
                // Display team members
                displayTeamMembers(data.members);
                
                // Display team tasks
                displayTeamTasks(data.tasks);
                
                // Show edit/delete buttons if user is the creator
                if (data.isCreator) {
                    setupTeamActions(data.team);
                }
            } else {
                console.error('Failed to load team details:', data.message);
                showNotification('Failed to load team details. Please try again.', 'error');
            }
        })
        .catch(error => {
            console.error('Error loading team details:', error);
            showNotification('An error occurred while loading team details.', 'error');
        });
}

// Display team details
function displayTeamDetails(team) {
    // Update team name and other details
    document.getElementById('teamName').textContent = team.name;
    document.getElementById('teamDescription').textContent = team.description || 'No description provided.';
    document.getElementById('memberCount').textContent = `${team.members.length} Members`;
    
    // Show team details and hide loader
    document.getElementById('teamLoader').style.display = 'none';
    document.getElementById('teamDetails').style.display = 'block';
}

// Display team members
function displayTeamMembers(members) {
    const membersContainer = document.getElementById('teamMembers');
    if (!membersContainer) return;
    
    // Clear current content
    membersContainer.innerHTML = '';
    
    if (members && members.length > 0) {
        // Create member list
        members.forEach(member => {
            const memberElement = document.createElement('div');
            memberElement.className = 'team-member';
            
            // Add creator badge if member is the creator
            const creatorBadge = member.isCreator ? '<span class="badge bg-success">Creator</span>' : '';
            
            // Set member avatar URL
            const avatarUrl = member.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.fullName || member.email)}&background=2e7d32&color=fff`;
            
            memberElement.innerHTML = `
                <div class="member-avatar">
                    <img src="${avatarUrl}" alt="${member.fullName || 'Member'}" class="avatar">
                </div>
                <div class="member-info">
                    <div class="member-name">${member.fullName || 'Unknown User'} ${creatorBadge}</div>
                    <div class="member-email">${member.email || ''}</div>
                </div>
            `;
            
            membersContainer.appendChild(memberElement);
        });
    } else {
        // Show empty state
        membersContainer.innerHTML = '<p>No members found.</p>';
    }
}

// Display team tasks
function displayTeamTasks(tasks) {
    // Display pending tasks
    displayTasksByStatus(tasks.pending, 'pendingTasks');
    
    // Display in-progress tasks
    displayTasksByStatus(tasks.inProgress, 'inProgressTasks');
    
    // Display completed tasks
    displayTasksByStatus(tasks.completed, 'completedTasks');
}

// Display tasks by status in the specified container
function displayTasksByStatus(tasks, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Clear current content
    container.innerHTML = '';
    
    if (tasks && tasks.length > 0) {
        // Create task cards
        tasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = 'task-card';
            
            // Format due date
            let dueDateText = 'No due date';
            if (task.dueDate) {
                dueDateText = formatDate(task.dueDate);
            }
            
            // Priority class
            const priorityClass = `priority-${task.priority || 'medium'}`;
            
            taskElement.innerHTML = `
                <div class="task-header">
                    <h4 class="task-title">${task.title}</h4>
                    <span class="task-priority ${priorityClass}">${task.priority || 'Medium'}</span>
                </div>
                <p class="task-description">${task.description ? task.description.substring(0, 100) + (task.description.length > 100 ? '...' : '') : 'No description'}</p>
                <div class="task-footer">
                    <span class="task-due-date"><i class="far fa-calendar"></i> ${dueDateText}</span>
                    <a href="../tasks/details.html?id=${task.id}" class="btn btn-sm">View Task</a>
                </div>
            `;
            
            container.appendChild(taskElement);
        });
    } else {
        // Show empty state
        container.innerHTML = '<p class="empty-message">No tasks</p>';
    }
}

// Setup team actions (edit/delete buttons)
function setupTeamActions(team) {
    const actionsContainer = document.getElementById('teamActions');
    if (!actionsContainer) return;
    
    // Show actions container
    actionsContainer.style.display = 'flex';
    
    // Setup edit button
    const editBtn = document.getElementById('editTeamBtn');
    if (editBtn) {
        editBtn.addEventListener('click', function() {
            // Redirect to edit page or show edit modal
            // This will depend on how you implement team editing
            alert('Edit team functionality will be implemented soon.');
        });
    }
    
    // Setup delete button
    const deleteBtn = document.getElementById('deleteTeamBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to delete this team? All associated tasks will also be deleted.')) {
                deleteTeam(team.id);
            }
        });
    }
}

// Delete team
function deleteTeam(teamId) {
    fetch(`${API_BASE_URL}/api/teams/${teamId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Team deleted successfully!', 'success');
            // Redirect to teams list
            setTimeout(() => {
                window.location.href = '/teams/index.html';
            }, 1000);
        } else {
            showNotification(data.message || 'Failed to delete team.', 'error');
        }
    })
    .catch(error => {
        console.error('Error deleting team:', error);
        showNotification('An error occurred while deleting the team.', 'error');
    });
}

// Load teams
function loadTeams() {
    console.log('Loading teams data');
    fetch(`${API_BASE_URL}/api/teams`)
        .then(response => {
            console.log('Teams API response status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('Teams data received:', data);
            if (data.success) {
                // Display created teams
                displayTeams(data.createdTeams || [], 'createdTeamsList');
                
                // Display member teams
                displayTeams(data.memberTeams || [], 'memberTeamsList');
            } else {
                console.error('Failed to load teams:', data.message);
                showNotification('Failed to load teams. Please try again.', 'error');
            }
        })
        .catch(error => {
            console.error('Error loading teams:', error);
            showNotification('An error occurred while loading teams.', 'error');
        });
}

// Display teams in the specified container
function displayTeams(teams, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    console.log(`Displaying teams in ${containerId}, count:`, teams.length);
    
    // Clear loading indicator
    container.innerHTML = '';
    
    if (teams.length === 0) {
        // Show empty state
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <i class="fas fa-users"></i>
            <p>No teams found.</p>
            ${containerId === 'createdTeamsList' ? 
                '<a href="create.html" class="btn btn-primary">Create Team</a>' : 
                ''}
        `;
        container.appendChild(emptyState);
        return;
    }
    
    // Create team cards
    teams.forEach(team => {
        const teamCard = document.createElement('div');
        teamCard.className = 'team-card';
        
        teamCard.innerHTML = `
            <div class="team-header">
                <h4>${team.name}</h4>
                <span class="member-count">${team.memberCount || 0} members</span>
            </div>
            <p class="team-description">${team.description || 'No description'}</p>
            <div class="team-footer">
                <span class="team-created">Created: ${formatDate(team.createdAt)}</span>
                <a href="details.html?id=${team.id}" class="btn btn-sm">View Details</a>
            </div>
        `;
        
        container.appendChild(teamCard);
    });
}

// Create a new team
function createTeam() {
    console.log('Creating new team');
    const name = document.getElementById('name').value;
    const description = document.getElementById('description').value;
    
    console.log('Team data:', { name, description });
    
    // Validate
    if (!name) {
        console.warn('Team name is required');
        showNotification('Team name is required.', 'warning');
        return;
    }
    
    console.log('Sending API request to:', `${API_BASE_URL}/api/teams/create`);
    
    // Send request
    fetch(`${API_BASE_URL}/api/teams/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name,
            description
        })
    })
    .then(response => {
        console.log('Create team API response status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('Create team API response:', data);
        if (data.success) {
            // Show success notification
            console.log('Team created successfully with ID:', data.teamId);
            showNotification('Team created successfully!', 'success');
            
            // Redirect to team details
            setTimeout(() => {
                window.location.href = `details.html?id=${data.teamId}`;
            }, 1000);
        } else {
            console.error('Team creation failed:', data.message);
            showNotification(data.message || 'Failed to create team.', 'error');
        }
    })
    .catch(error => {
        console.error('Error creating team:', error);
        showNotification('An error occurred while creating the team.', 'error');
    });
}

// Format date helper
function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

// Show notification
function showNotification(message, type = 'info') {
    console.log(`Showing notification: ${message} (${type})`);
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Teams.js loaded, current path:', window.location.pathname);
    initTeamsPage();
    initTeamCreate();
    initTeamDetails();
}); 