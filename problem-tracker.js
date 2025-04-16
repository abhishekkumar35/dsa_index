// Initialize IndexedDB
const dbName = 'DSAProblemTracker';
const dbVersion = 1;
let db;
let dbReady = false;

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
    dbReady = true;
    console.log('Database opened successfully');
    loadProblemStatus();
    initializeEventListeners();
};

// Handle database open error
request.onerror = function(event) {
    console.error('Error opening database:', event.target.error);
    showNotification('Error opening database. Some features may not work.', 'error');
};

// Load problem status from IndexedDB
function loadProblemStatus() {
    if (!dbReady) {
        console.log('Database not ready yet, will retry loading problem status');
        setTimeout(loadProblemStatus, 100);
        return;
    }

    const checkboxes = document.querySelectorAll('.problem-checkbox');

    const transaction = db.transaction(['problems'], 'readonly');
    const objectStore = transaction.objectStore('problems');

    checkboxes.forEach(checkbox => {
        const problemId = checkbox.id.replace('problem-', '');
        const row = checkbox.closest('tr');
        const request = objectStore.get(problemId);

        request.onsuccess = function(event) {
            const problem = event.target.result;
            if (problem && problem.completed) {
                checkbox.checked = true;
                if (row) row.classList.add('completed');
            }
        };

        request.onerror = function(event) {
            console.error(`Error loading status for problem ${problemId}:`, event.target.error);
        };
    });

    // Update progress stats after loading
    updateProgressStats();
}

// Save problem status to IndexedDB
function saveProblemStatus(problemId, completed) {
    if (!dbReady) {
        console.log('Database not ready yet, will retry saving problem status');
        setTimeout(() => saveProblemStatus(problemId, completed), 100);
        return;
    }

    try {
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
            // Force an immediate update of the progress display
            updateProgressStats();
        };

        request.onerror = function(event) {
            console.error('Error saving problem status:', event.target.error);
        };

        transaction.oncomplete = function() {
            console.log('Transaction completed successfully');
        };

        transaction.onerror = function(event) {
            console.error('Transaction error:', event.target.error);
        };
    } catch (error) {
        console.error('Error in saveProblemStatus:', error);
    }
}

// Initialize event listeners after database is ready
function initializeEventListeners() {
    const checkboxes = document.querySelectorAll('.problem-checkbox');

    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const problemId = this.id.replace('problem-', '');

            // Update the row styling immediately
            const row = this.closest('tr');
            if (this.checked) {
                row.classList.add('completed');
            } else {
                row.classList.remove('completed');
            }

            // Update progress display immediately for instant feedback
            const allCheckboxes = document.querySelectorAll('.problem-checkbox');
            let checkedCount = 0;
            allCheckboxes.forEach(cb => {
                if (cb.checked) checkedCount++;
            });

            const totalCount = allCheckboxes.length;
            const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

            // Update progress text
            const progressElement = document.getElementById('progress-display');
            if (progressElement) {
                progressElement.textContent = `${checkedCount}/${totalCount} problems completed (${progressPercent}%)`;
            }

            // Update progress bar
            const progressFill = document.getElementById('progress-fill');
            if (progressFill) {
                progressFill.style.width = `${progressPercent}%`;
            }

            // Save to database (this will also update progress stats again)
            saveProblemStatus(problemId, this.checked);
        });
    });

    // Add progress tracking
    updateProgressStats();

    // Export progress button
    const exportBtn = document.getElementById('export-progress');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            if (!dbReady) {
                showNotification('Database not ready yet. Please try again in a moment.', 'error');
                return;
            }
            exportProgress();
        });
    }

    // Import progress button
    const importBtn = document.getElementById('import-progress');
    const importFile = document.getElementById('import-file');
    if (importBtn && importFile) {
        importBtn.addEventListener('click', function() {
            if (!dbReady) {
                showNotification('Database not ready yet. Please try again in a moment.', 'error');
                return;
            }
            importFile.click();
        });

        importFile.addEventListener('change', function(event) {
            if (event.target.files.length > 0) {
                const file = event.target.files[0];
                importProgress(file);
            }
        });
    }
}

// Add basic event listeners on DOM content loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize progress bar to 0% immediately for visual feedback
    const progressFill = document.getElementById('progress-fill');
    if (progressFill) {
        progressFill.style.width = '0%';
    }

    // If database is already ready, initialize event listeners
    if (dbReady) {
        initializeEventListeners();
    }
    // Otherwise, they'll be initialized when the database is ready
});

// Update progress statistics
function updateProgressStats() {
    if (!dbReady) {
        console.log('Database not ready yet, will retry updating progress stats');
        setTimeout(updateProgressStats, 100);
        return;
    }

    try {
        // First, let's manually count the checked checkboxes for a direct approach
        const checkboxes = document.querySelectorAll('.problem-checkbox');
        let checkedCount = 0;
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                checkedCount++;
            }
        });

        const totalCount = checkboxes.length;
        const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

        console.log(`Direct count: ${checkedCount}/${totalCount} problems completed (${progressPercent}%)`);

        // Update progress display with the direct count
        const progressElement = document.getElementById('progress-display');
        if (progressElement) {
            progressElement.textContent = `${checkedCount}/${totalCount} problems completed (${progressPercent}%)`;
        }

        // Update progress bar with the direct count
        const progressFill = document.getElementById('progress-fill');
        if (progressFill) {
            console.log(`Setting progress bar width to ${progressPercent}%`);
            progressFill.style.width = `${progressPercent}%`;
        } else {
            console.error('Progress fill element not found!');
        }

        // Also update the database count for verification
        const transaction = db.transaction(['problems'], 'readonly');
        const objectStore = transaction.objectStore('problems');
        const getAllRequest = objectStore.getAll();

        getAllRequest.onsuccess = function() {
            const problems = getAllRequest.result;
            let dbCompletedCount = 0;

            if (problems && problems.length > 0) {
                problems.forEach(problem => {
                    if (problem.completed) {
                        dbCompletedCount++;
                    }
                });
            }

            console.log(`Database count: ${dbCompletedCount}/${problems.length} problems completed`);

            // If there's a mismatch between UI and database, update the database
            if (dbCompletedCount !== checkedCount) {
                console.log('Mismatch between UI and database counts, updating database...');
                updateDatabaseFromUI();
            }
        };

        getAllRequest.onerror = function(event) {
            console.error('Error getting all problems:', event.target.error);
        };
    } catch (error) {
        console.error('Error updating progress stats:', error);
    }
}

// Update database from UI state
function updateDatabaseFromUI() {
    if (!dbReady) return;

    const checkboxes = document.querySelectorAll('.problem-checkbox');
    const transaction = db.transaction(['problems'], 'readwrite');
    const objectStore = transaction.objectStore('problems');

    checkboxes.forEach(checkbox => {
        const problemId = checkbox.id.replace('problem-', '');
        const isCompleted = checkbox.checked;

        const problem = {
            id: problemId,
            completed: isCompleted,
            timestamp: new Date().getTime()
        };

        objectStore.put(problem);
    });

    transaction.oncomplete = function() {
        console.log('Database updated from UI state');
    };

    transaction.onerror = function(event) {
        console.error('Error updating database from UI:', event.target.error);
    };
}

// Export progress to a JSON file
function exportProgress() {
    if (!dbReady) {
        showNotification('Database not ready yet. Please try again in a moment.', 'error');
        return;
    }

    try {
        const transaction = db.transaction(['problems'], 'readonly');
        const objectStore = transaction.objectStore('problems');
        const request = objectStore.getAll();

        request.onsuccess = function() {
            try {
                const problems = request.result;

                if (!problems || problems.length === 0) {
                    showNotification('No progress to export. Complete some problems first!', 'error');
                    return;
                }

                const dataStr = JSON.stringify(problems, null, 2);
                const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

                const exportFileDefaultName = 'dsa_progress.json';

                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportFileDefaultName);
                document.body.appendChild(linkElement); // Needed for Firefox
                linkElement.click();
                document.body.removeChild(linkElement); // Clean up

                showNotification(`Progress exported successfully! (${problems.length} items)`);
            } catch (error) {
                console.error('Error processing export data:', error);
                showNotification('Error processing export data. Please try again.', 'error');
            }
        };

        request.onerror = function(event) {
            console.error('Error exporting progress:', event.target.error);
            showNotification('Error exporting progress. Please try again.', 'error');
        };
    } catch (error) {
        console.error('Error starting export transaction:', error);
        showNotification('Error exporting progress. Please try again.', 'error');
    }
}

// Import progress from a JSON file
function importProgress(file) {
    if (!dbReady) {
        showNotification('Database not ready yet. Please try again in a moment.', 'error');
        return;
    }

    const reader = new FileReader();

    reader.onload = function(event) {
        try {
            const problems = JSON.parse(event.target.result);

            if (!Array.isArray(problems)) {
                throw new Error('Invalid format: Expected an array of problems');
            }

            if (problems.length === 0) {
                showNotification('The imported file contains no problem data.', 'error');
                return;
            }

            // Validate the structure of at least the first problem
            const firstProblem = problems[0];
            if (!firstProblem.hasOwnProperty('id') || !firstProblem.hasOwnProperty('completed')) {
                throw new Error('Invalid problem format: Missing required fields');
            }

            try {
                const transaction = db.transaction(['problems'], 'readwrite');
                const objectStore = transaction.objectStore('problems');

                // Clear existing data
                const clearRequest = objectStore.clear();

                clearRequest.onsuccess = function() {
                    let count = 0;
                    let validProblems = 0;

                    // Count valid problems first
                    problems.forEach(problem => {
                        if (problem.id && typeof problem.completed === 'boolean') {
                            validProblems++;
                        }
                    });

                    if (validProblems === 0) {
                        showNotification('No valid problems found in the import file.', 'error');
                        return;
                    }

                    problems.forEach(problem => {
                        if (problem.id && typeof problem.completed === 'boolean') {
                            const request = objectStore.put(problem);
                            request.onsuccess = function() {
                                count++;
                                if (count === validProblems) {
                                    // Update UI after all problems are imported
                                    updateCheckboxes();
                                    updateProgressStats();
                                    showNotification(`Imported ${count} problem statuses successfully!`);
                                }
                            };

                            request.onerror = function(event) {
                                console.error(`Error importing problem ${problem.id}:`, event.target.error);
                            };
                        }
                    });
                };

                clearRequest.onerror = function(event) {
                    console.error('Error clearing existing data:', event.target.error);
                    showNotification('Error importing progress. Please try again.', 'error');
                };
            } catch (dbError) {
                console.error('Database error during import:', dbError);
                showNotification('Database error during import. Please try again.', 'error');
            }
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
