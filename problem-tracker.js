// Initialize IndexedDB
const dbName = 'DSAProblemTracker';
const dbVersion = 1;
let db;

// Open the database
const request = indexedDB.open(dbName, dbVersion);

// Create object store if needed
request.onupgradeneeded = function(event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains('problems')) {
        const objectStore = db.createObjectStore('problems', { keyPath: 'id' });
        objectStore.createIndex('completed', 'completed', { unique: false });
    }
};

// Handle database open success
request.onsuccess = function(event) {
    db = event.target.result;
    console.log('Database opened successfully');
    loadProblemStatus();
};

// Handle database open error
request.onerror = function(event) {
    console.error('Error opening database:', event.target.error);
};

// Load problem status from IndexedDB
function loadProblemStatus() {
    const checkboxes = document.querySelectorAll('.problem-checkbox');

    const transaction = db.transaction(['problems'], 'readonly');
    const objectStore = transaction.objectStore('problems');

    checkboxes.forEach(checkbox => {
        const problemId = checkbox.id.replace('problem-', '');
        const request = objectStore.get(problemId);

        request.onsuccess = function(event) {
            const problem = event.target.result;
            if (problem && problem.completed) {
                checkbox.checked = true;
            }
        };
    });
}

// Save problem status to IndexedDB
function saveProblemStatus(problemId, completed) {
    const transaction = db.transaction(['problems'], 'readwrite');
    const objectStore = transaction.objectStore('problems');

    const problem = {
        id: problemId,
        completed: completed,
        timestamp: new Date().getTime()
    };

    const request = objectStore.put(problem);

    request.onsuccess = function() {
        console.log(`Problem ${problemId} status saved: ${completed}`);
    };

    request.onerror = function(event) {
        console.error('Error saving problem status:', event.target.error);
    };
}

// Add event listeners to checkboxes and buttons
document.addEventListener('DOMContentLoaded', function() {
    const checkboxes = document.querySelectorAll('.problem-checkbox');

    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const problemId = this.id.replace('problem-', '');
            saveProblemStatus(problemId, this.checked);

            // Update the row styling
            const row = this.closest('tr');
            if (this.checked) {
                row.classList.add('completed');
            } else {
                row.classList.remove('completed');
            }
        });
    });

    // Add progress tracking
    updateProgressStats();

    // Export progress button
    const exportBtn = document.getElementById('export-progress');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportProgress);
    }

    // Import progress button
    const importBtn = document.getElementById('import-progress');
    const importFile = document.getElementById('import-file');
    if (importBtn && importFile) {
        importBtn.addEventListener('click', function() {
            importFile.click();
        });

        importFile.addEventListener('change', function(event) {
            if (event.target.files.length > 0) {
                const file = event.target.files[0];
                importProgress(file);
            }
        });
    }
});

// Update progress statistics
function updateProgressStats() {
    const transaction = db.transaction(['problems'], 'readonly');
    const objectStore = transaction.objectStore('problems');
    const index = objectStore.index('completed');
    const countRequest = index.count(IDBKeyRange.only(true));

    countRequest.onsuccess = function() {
        const completedCount = countRequest.result;
        const totalCount = document.querySelectorAll('.problem-checkbox').length;
        const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        // Update progress display if it exists
        const progressElement = document.getElementById('progress-display');
        if (progressElement) {
            progressElement.textContent = `${completedCount}/${totalCount} problems completed (${progressPercent}%)`;
        }

        // Update progress bar
        const progressFill = document.getElementById('progress-fill');
        if (progressFill) {
            progressFill.style.width = `${progressPercent}%`;
        }
    };
}

// Export progress to a JSON file
function exportProgress() {
    const transaction = db.transaction(['problems'], 'readonly');
    const objectStore = transaction.objectStore('problems');
    const request = objectStore.getAll();

    request.onsuccess = function() {
        const problems = request.result;
        const dataStr = JSON.stringify(problems, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = 'dsa_progress.json';

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();

        showNotification('Progress exported successfully!');
    };

    request.onerror = function(event) {
        console.error('Error exporting progress:', event.target.error);
        showNotification('Error exporting progress. Please try again.', 'error');
    };
}

// Import progress from a JSON file
function importProgress(file) {
    const reader = new FileReader();

    reader.onload = function(event) {
        try {
            const problems = JSON.parse(event.target.result);

            if (!Array.isArray(problems)) {
                throw new Error('Invalid format: Expected an array of problems');
            }

            const transaction = db.transaction(['problems'], 'readwrite');
            const objectStore = transaction.objectStore('problems');

            // Clear existing data
            const clearRequest = objectStore.clear();

            clearRequest.onsuccess = function() {
                let count = 0;

                problems.forEach(problem => {
                    if (problem.id && typeof problem.completed === 'boolean') {
                        const request = objectStore.put(problem);
                        request.onsuccess = function() {
                            count++;
                            if (count === problems.length) {
                                // Update UI after all problems are imported
                                updateCheckboxes();
                                updateProgressStats();
                                showNotification(`Imported ${count} problem statuses successfully!`);
                            }
                        };
                    }
                });
            };

            clearRequest.onerror = function(event) {
                console.error('Error clearing existing data:', event.target.error);
                showNotification('Error importing progress. Please try again.', 'error');
            };
        } catch (error) {
            console.error('Error parsing import file:', error);
            showNotification('Invalid file format. Please select a valid JSON file.', 'error');
        }
    };

    reader.onerror = function() {
        console.error('Error reading file');
        showNotification('Error reading file. Please try again.', 'error');
    };

    reader.readAsText(file);
}

// Update checkboxes based on database
function updateCheckboxes() {
    const checkboxes = document.querySelectorAll('.problem-checkbox');

    checkboxes.forEach(checkbox => {
        const problemId = checkbox.id.replace('problem-', '');
        const row = checkbox.closest('tr');

        const transaction = db.transaction(['problems'], 'readonly');
        const objectStore = transaction.objectStore('problems');
        const request = objectStore.get(problemId);

        request.onsuccess = function(event) {
            const problem = event.target.result;
            if (problem && problem.completed) {
                checkbox.checked = true;
                if (row) row.classList.add('completed');
            } else {
                checkbox.checked = false;
                if (row) row.classList.remove('completed');
            }
        };
    });
}

// Show notification
function showNotification(message, type = 'success') {
    // Check if notification container exists, if not create it
    let notificationContainer = document.getElementById('notification-container');

    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.style.position = 'fixed';
        notificationContainer.style.bottom = '20px';
        notificationContainer.style.left = '20px';
        notificationContainer.style.zIndex = '1000';
        document.body.appendChild(notificationContainer);
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.backgroundColor = type === 'success' ? '#4CAF50' : '#F44336';
    notification.style.color = 'white';
    notification.style.padding = '12px 20px';
    notification.style.marginTop = '10px';
    notification.style.borderRadius = '4px';
    notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    notification.style.transition = 'all 0.3s ease';
    notification.style.opacity = '0';
    notification.textContent = message;

    notificationContainer.appendChild(notification);

    // Fade in
    setTimeout(() => {
        notification.style.opacity = '1';
    }, 10);

    // Fade out and remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notificationContainer.removeChild(notification);
        }, 300);
    }, 3000);
}
