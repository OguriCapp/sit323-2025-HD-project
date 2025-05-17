// Main JavaScript functions for Deakin Task Board

document.addEventListener('DOMContentLoaded', function() {
  // Initialize tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });

  // Initialize popovers
  const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
  popoverTriggerList.map(function (popoverTriggerEl) {
    return new bootstrap.Popover(popoverTriggerEl);
  });

  // Task status update functionality
  const statusButtons = document.querySelectorAll('.task-status-btn');
  if (statusButtons.length > 0) {
    statusButtons.forEach(button => {
      button.addEventListener('click', function() {
        const taskId = this.dataset.taskId;
        const newStatus = this.dataset.status;
        updateTaskStatus(taskId, newStatus);
      });
    });
  }

  // Avatar preview for profile upload
  const avatarInput = document.getElementById('avatar');
  if (avatarInput) {
    avatarInput.addEventListener('change', function() {
      const file = this.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          document.getElementById('avatarPreview').src = e.target.result;
        }
        reader.readAsDataURL(file);
      }
    });
  }

  // File upload preview and name display
  const fileInput = document.getElementById('attachment');
  if (fileInput) {
    fileInput.addEventListener('change', function() {
      const fileName = this.files[0]?.name;
      document.getElementById('file-name').textContent = fileName || 'No file selected';
    });
    
    // Ensure English text for file input
    if (fileInput.getAttribute('lang') !== 'en') {
      fileInput.setAttribute('lang', 'en');
    }
  }

  // Team member search functionality
  const memberSearchInput = document.getElementById('member-search');
  if (memberSearchInput) {
    memberSearchInput.addEventListener('input', debounce(function() {
      searchTeamMembers(this.value);
    }, 500));
  }

  // Task filter functionality
  const taskFilters = document.querySelectorAll('.task-filter');
  if (taskFilters.length > 0) {
    taskFilters.forEach(filter => {
      filter.addEventListener('click', function() {
        const filterType = this.dataset.filter;
        filterTasks(filterType);
      });
    });
  }
});

// Update task status via AJAX
function updateTaskStatus(taskId, status) {
  fetch(`/tasks/${taskId}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Update UI
      document.querySelector(`.task-item-${taskId} .task-status-badge`).textContent = getStatusText(status);
      document.querySelector(`.task-item-${taskId} .task-status-badge`).className = `badge task-status-badge ${getStatusClass(status)}`;
      
      // Show success message
      showAlert('Task status updated successfully', 'success');
      
      // If on kanban board view, move the task
      const taskElement = document.querySelector(`.kanban-item[data-task-id="${taskId}"]`);
      if (taskElement) {
        const targetColumn = document.querySelector(`.kanban-column[data-status="${status}"]`);
        if (targetColumn) {
          taskElement.remove();
          targetColumn.querySelector('.kanban-items').appendChild(taskElement);
        }
      }
    } else {
      showAlert('Failed to update task status', 'danger');
    }
  })
  .catch(error => {
    console.error('Error updating task status:', error);
    handleFirebaseError(error);
  });
}

// Helper function to get status text
function getStatusText(status) {
  switch (status) {
    case 'pending': return 'Pending';
    case 'in-progress': return 'In Progress';
    case 'completed': return 'Completed';
    default: return 'Unknown';
  }
}

// Helper function to get status class
function getStatusClass(status) {
  switch (status) {
    case 'pending': return 'bg-warning';
    case 'in-progress': return 'bg-primary';
    case 'completed': return 'bg-success';
    default: return 'bg-secondary';
  }
}

// Show alert message
function showAlert(message, type = 'info') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
  alertDiv.setAttribute('role', 'alert');
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  document.body.appendChild(alertDiv);
  
  // Auto dismiss after 5 seconds
  setTimeout(() => {
    const bsAlert = new bootstrap.Alert(alertDiv);
    bsAlert.close();
  }, 5000);
}

// Handle Firebase errors in a user-friendly way
function handleFirebaseError(error) {
  console.error('Firebase error:', error);
  
  // Map Firebase error codes to user-friendly messages
  const errorMessages = {
    'permission-denied': 'Access denied. You might not have permission to perform this action.',
    'unavailable': 'The service is temporarily unavailable. Please try again later.',
    'not-found': 'The requested data was not found.',
    'unauthenticated': 'Your session has expired. Please login again.',
    'data-loss': 'Data loss occurred. Please refresh the page and try again.',
    'cancelled': 'Operation was cancelled. Please try again.',
    'network-request-failed': 'Network error. Please check your internet connection.'
  };
  
  // Extract error code from Firebase error
  const errorCode = error.code ? error.code.replace('firestore/', '') : 'unknown';
  const errorMessage = errorMessages[errorCode] || 'An unexpected error occurred. Please try again later.';
  
  // Show error alert
  showAlert(errorMessage, 'danger');
  
  // Redirect to login page if authentication error
  if (errorCode === 'unauthenticated') {
    setTimeout(() => {
      window.location.href = '/auth/login';
    }, 2000);
  }
}

// Search team members
function searchTeamMembers(query) {
  if (!query || query.length < 2) {
    document.getElementById('search-results').innerHTML = '';
    return;
  }
  
  fetch(`/users/search?email=${encodeURIComponent(query)}`)
    .then(response => response.json())
    .then(data => {
      const resultsContainer = document.getElementById('search-results');
      resultsContainer.innerHTML = '';
      
      if (data.users && data.users.length > 0) {
        data.users.forEach(user => {
          const userElement = document.createElement('div');
          userElement.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
          userElement.innerHTML = `
            <div>
              <strong>${user.fullName}</strong>
              <small class="d-block text-muted">${user.email}</small>
            </div>
            <button class="btn btn-sm btn-outline-success add-member-btn" data-user-id="${user.id}" data-user-email="${user.email}">
              <i class="fas fa-plus-circle"></i> Add
            </button>
          `;
          resultsContainer.appendChild(userElement);
          
          // Add event listener to the button
          userElement.querySelector('.add-member-btn').addEventListener('click', function() {
            document.getElementById('email').value = this.dataset.userEmail;
            resultsContainer.innerHTML = '';
          });
        });
      } else {
        resultsContainer.innerHTML = '<div class="list-group-item">No users found</div>';
      }
    })
    .catch(error => {
      console.error('Error searching users:', error);
      handleFirebaseError(error);
    });
}

// Filter tasks
function filterTasks(filterType) {
  const taskItems = document.querySelectorAll('.task-item');
  
  taskItems.forEach(item => {
    if (filterType === 'all') {
      item.style.display = '';
    } else if (filterType === 'priority-high' && item.classList.contains('task-priority-high')) {
      item.style.display = '';
    } else if (filterType === 'priority-medium' && item.classList.contains('task-priority-medium')) {
      item.style.display = '';
    } else if (filterType === 'priority-low' && item.classList.contains('task-priority-low')) {
      item.style.display = '';
    } else if (filterType === 'status-pending' && item.querySelector('.task-status-badge').textContent.trim() === 'Pending') {
      item.style.display = '';
    } else if (filterType === 'status-in-progress' && item.querySelector('.task-status-badge').textContent.trim() === 'In Progress') {
      item.style.display = '';
    } else if (filterType === 'status-completed' && item.querySelector('.task-status-badge').textContent.trim() === 'Completed') {
      item.style.display = '';
    } else {
      item.style.display = 'none';
    }
  });
}

// Debounce function for search input
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}; 