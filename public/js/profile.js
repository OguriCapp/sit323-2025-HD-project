// API Base URL
// Avoid redeclaring API_BASE_URL variable
if (typeof window.API_BASE_URL === 'undefined') {
    var API_BASE_URL = window.location.origin;
}

// Initialize profile page
function initProfilePage() {
    // Load user profile
    loadUserProfile();
    
    // Set up form submission
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', function(event) {
            event.preventDefault();
            updateProfile();
        });
    }
    
    // Set up settings form submission
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', function(event) {
            event.preventDefault();
            updateSettings();
        });
    }
    
    // Set up avatar upload
    const avatarUpload = document.getElementById('avatarUpload');
    if (avatarUpload) {
        avatarUpload.addEventListener('change', function(event) {
            previewAvatar(event);
        });
    }
    
    // Load user settings
    loadUserSettings();
}

// Load user profile data
function loadUserProfile() {
    fetch(`${API_BASE_URL}/api/users/profile`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayUserProfile(data.user);
            } else {
                console.error('Failed to load profile:', data.message);
                showNotification('Failed to load profile. Please try again.', 'error');
            }
        })
        .catch(error => {
            console.error('Error loading profile:', error);
            showNotification('An error occurred while loading profile.', 'error');
        });
}

// Display user profile
function displayUserProfile(user) {
    // Update form fields
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const courseInput = document.getElementById('course');
    const profileAvatar = document.getElementById('profileAvatar');
    
    if (fullNameInput) {
        fullNameInput.value = user.fullName || '';
    }
    
    if (emailInput) {
        emailInput.value = user.email || '';
    }
    
    if (courseInput) {
        courseInput.value = user.course || '';
    }
    
    // Update avatar
    if (profileAvatar) {
        if (user.photoURL) {
            profileAvatar.src = user.photoURL;
        } else {
            // Generate avatar from name
            const name = user.fullName || user.email.split('@')[0];
            profileAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2e7d32&color=fff`;
        }
    }
    
    // Also update the sidebar avatar and name
    const sidebarAvatar = document.getElementById('userAvatar');
    const sidebarName = document.getElementById('userName');
    const sidebarEmail = document.getElementById('userEmail');
    
    if (sidebarAvatar && user.photoURL) {
        sidebarAvatar.src = user.photoURL;
    } else if (sidebarAvatar) {
        const name = user.fullName || user.email.split('@')[0];
        sidebarAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2e7d32&color=fff`;
    }
    
    if (sidebarName) {
        sidebarName.textContent = user.fullName || 'User';
    }
    
    if (sidebarEmail) {
        sidebarEmail.textContent = user.email || '';
    }
}

// Load user settings from localStorage or server
function loadUserSettings() {
    // First try to get from localStorage
    let settings = getUserSettingsFromStorage();
    
    // Apply settings to form
    if (settings) {
        applySettingsToForm(settings);
    }
    
    // Then try to get from server (which will override local)
    fetch(`${API_BASE_URL}/api/users/settings`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.settings) {
                // Store in localStorage for offline access
                saveUserSettingsToStorage(data.settings);
                
                // Apply to form
                applySettingsToForm(data.settings);
            }
        })
        .catch(error => {
            console.log('Using local settings (server fetch failed):', error);
        });
}

// Apply settings to form
function applySettingsToForm(settings) {
    // Notification settings
    const emailReminders = document.getElementById('emailReminders');
    const reminderDays = document.getElementById('reminderDays');
    
    // Sync settings
    const enableSync = document.getElementById('enableSync');
    const offlineAccess = document.getElementById('offlineAccess');
    const dataSaver = document.getElementById('dataSaver');
    
    // Apply notification settings
    if (emailReminders && settings.notifications) {
        emailReminders.checked = settings.notifications.emailReminders !== false;
    }
    
    if (reminderDays && settings.notifications && settings.notifications.reminderDays) {
        reminderDays.value = settings.notifications.reminderDays;
    }
    
    // Apply sync settings
    if (enableSync && settings.sync) {
        enableSync.checked = settings.sync.enabled !== false;
    }
    
    if (offlineAccess && settings.sync) {
        offlineAccess.checked = settings.sync.offlineAccess !== false;
    }
    
    if (dataSaver && settings.sync) {
        dataSaver.checked = settings.sync.dataSaver === true;
    }
}

// Get user settings from localStorage
function getUserSettingsFromStorage() {
    const settingsJson = localStorage.getItem('userSettings');
    if (settingsJson) {
        try {
            return JSON.parse(settingsJson);
        } catch (e) {
            console.error('Error parsing settings from localStorage:', e);
            return null;
        }
    }
    return null;
}

// Save user settings to localStorage
function saveUserSettingsToStorage(settings) {
    try {
        localStorage.setItem('userSettings', JSON.stringify(settings));
    } catch (e) {
        console.error('Error saving settings to localStorage:', e);
    }
}

// Update user settings
function updateSettings() {
    // Get settings values from form
    const emailReminders = document.getElementById('emailReminders').checked;
    const reminderDays = document.getElementById('reminderDays').value;
    const enableSync = document.getElementById('enableSync').checked;
    const offlineAccess = document.getElementById('offlineAccess').checked;
    const dataSaver = document.getElementById('dataSaver').checked;
    
    // Create settings object
    const settings = {
        notifications: {
            emailReminders,
            reminderDays: parseInt(reminderDays) || 3
        },
        sync: {
            enabled: enableSync,
            offlineAccess,
            dataSaver
        }
    };
    
    // Save to localStorage immediately for offline access
    saveUserSettingsToStorage(settings);
    
    // Apply sync settings immediately
    applySyncSettings(settings.sync);
    
    // If Firebase is available, save settings to Firestore database
    if (typeof firebase !== 'undefined' && firebase.firestore) {
        const user = firebase.auth().currentUser;
        if (user) {
            // Save to user document in Firestore
            firebase.firestore().collection('users').doc(user.uid).update({
                emailReminders: emailReminders,
                reminderDays: parseInt(reminderDays) || 3,
                email: user.email,  // Ensure email is available for reminders
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                console.log('User reminder settings updated in Firestore');
                showNotification('Settings updated successfully!', 'success');
                
                // Check for task reminders with the new settings if possible
                if (window.taskReminder && typeof window.taskReminder.checkTaskReminders === 'function') {
                    // Use window.location to navigate to tasks page to trigger reminder check
                    setTimeout(() => {
                        window.location.href = '../tasks/index.html';
                    }, 1500);
                }
            })
            .catch(error => {
                console.error('Error updating settings in Firestore:', error);
                showNotification('Settings saved locally but failed to update on server.', 'warning');
            });
            
            return; // Return early as we've handled the notification
        }
    }
    
    // Original API approach as fallback
    fetch(`${API_BASE_URL}/api/users/settings`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Settings updated successfully!', 'success');
        } else {
            showNotification(data.message || 'Settings saved locally but failed to update on server.', 'warning');
        }
        
        // Check for task reminders with the new settings if possible
        if (window.taskReminder && typeof window.taskReminder.checkTaskReminders === 'function') {
            // Use window.location to navigate to tasks page to trigger reminder check
            setTimeout(() => {
                window.location.href = '../tasks/index.html';
            }, 1500);
        }
    })
    .catch(error => {
        console.error('Error updating settings on server:', error);
        showNotification('Settings saved locally but failed to update on server.', 'warning');
    });
}

// Apply sync settings to the application
function applySyncSettings(syncSettings) {
    // Store settings in localStorage for app.js to use
    localStorage.setItem('syncEnabled', syncSettings.enabled);
    localStorage.setItem('offlineAccessEnabled', syncSettings.offlineAccess);
    localStorage.setItem('dataSaverEnabled', syncSettings.dataSaver);
    
    // Potentially refresh the page or notify app.js to apply changes
    // This depends on how your application is structured
    if (window.updateSyncSettings) {
        window.updateSyncSettings(syncSettings);
    }
}

// Preview avatar before upload
function previewAvatar(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        const profileAvatar = document.getElementById('profileAvatar');
        
        reader.onload = function(e) {
            profileAvatar.src = e.target.result;
        }
        
        reader.readAsDataURL(file);
    }
}

// Update user profile
function updateProfile() {
    const fullName = document.getElementById('fullName').value;
    const course = document.getElementById('course').value;
    const avatarFile = document.getElementById('avatarUpload').files[0];
    
    // Create form data for file upload
    const formData = new FormData();
    formData.append('fullName', fullName);
    formData.append('course', course || '');
    if (avatarFile) {
        formData.append('avatar', avatarFile);
    }
    
    // Send request
    fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Profile updated successfully!', 'success');
            
            // Reload user profile after a short delay
            setTimeout(() => {
                loadUserProfile();
            }, 1000);
        } else {
            showNotification(data.message || 'Failed to update profile.', 'error');
        }
    })
    .catch(error => {
        console.error('Error updating profile:', error);
        showNotification('An error occurred while updating profile.', 'error');
    });
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initProfilePage();
}); 