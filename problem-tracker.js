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

// Add event listeners to checkboxes
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
