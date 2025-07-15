const fileInput = document.getElementById('file-input');
const modalFileInput = document.getElementById('modal-file-input');
const viewer = document.getElementById('viewer');
const imageContainer = document.getElementById('image-container');
const topBar = document.getElementById('top-bar');
const mainContent = document.getElementById('main-content');
const importModal = document.getElementById('import-modal');
const fileInputLabel = document.getElementById('file-input-label');
const bookTitle = document.getElementById('book-title');
const clock = document.getElementById('clock');
const pageInfo = document.getElementById('page-info');
const progressBar = document.getElementById('progress-bar');
const settingsFab = document.getElementById('settings-fab');
const settingsModal = document.getElementById('settings-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const prevNavOverlay = document.getElementById('prev-nav-overlay');
const centerNavOverlay = document.getElementById('center-nav-overlay');
const nextNavOverlay = document.getElementById('next-nav-overlay');
const loadingContainer = document.getElementById('loading-container');
const cbzSettings = document.getElementById('cbz-settings');
const cbzModeScrollBtn = document.getElementById('cbz-mode-scroll');
const cbzModePageBtn = document.getElementById('cbz-mode-page');
const cbzPageDirectionContainer = document.getElementById('cbz-page-direction-container');
const cbzReverseDirectionCheckbox = document.getElementById('cbz-reverse-direction');
const cbzPageInput = document.getElementById('cbz-page-input');
const cbzGotoBtn = document.getElementById('cbz-goto-btn');

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

let zip = null;
let imageFiles = [];
let currentImageIndex = 0;
let totalPages = 0;
let cbzReadingMode = 'page'; // 'page' or 'scroll'
let cbzReverseDirection = false;
let currentFile = null;

// Load settings from localStorage
document.addEventListener('DOMContentLoaded', () => {
    const savedCbzReadingMode = localStorage.getItem('cbzReadingMode');
    if (savedCbzReadingMode) {
        cbzReadingMode = savedCbzReadingMode;
    }
    cbzReverseDirection = localStorage.getItem('cbzReverseDirection') === 'true';
    cbzReverseDirectionCheckbox.checked = cbzReverseDirection;
    updateCbzModeButtons();
    fileInputLabel.focus();
});

function handleFile(file) {
    if (!file) return;
    currentFile = file;

    importModal.classList.add('hidden');

    clearViewer();
    showLoading();

    if (file.name.endsWith('.cbz')) {
        bookTitle.textContent = file.name;
        handleCbz(file);
        cbzSettings.classList.remove('hidden');
    }
}

fileInput.addEventListener('change', (event) => handleFile(event.target.files[0]));
modalFileInput.addEventListener('change', (event) => {
    handleFile(event.target.files[0]);
    settingsModal.classList.add('hidden');
    mainContent.classList.remove('modal-open');
});

function clearViewer() {
    viewer.innerHTML = '';
    imageContainer.innerHTML = '';
    imageContainer.classList.add('hidden');
    viewer.classList.add('hidden');
    prevNavOverlay.classList.add('hidden');
    centerNavOverlay.classList.add('hidden');
    nextNavOverlay.classList.add('hidden');
    zip = null;
    imageFiles = [];
    currentImageIndex = 0;
    window.removeEventListener('keydown', handleKeydown);
    cbzSettings.classList.add('hidden');
}


async function handleCbz(file) {
    imageContainer.classList.remove('hidden');
    if (cbzReadingMode === 'scroll') {
        imageContainer.style.overflowY = 'scroll';
    } else {
        imageContainer.style.overflowY = 'hidden';
    }
    const jszip = new JSZip();
    zip = await jszip.loadAsync(file, {
    });
    imageFiles = Object.values(zip.files).filter(f => !f.dir && /\.(jpe?g|png|gif)$/i.test(f.name)).sort((a, b) => a.name.localeCompare(b.name));
    totalPages = imageFiles.length;

    if (imageFiles.length > 0) {
        const savedPage = loadProgress(file.name);
        let startPage = 0;
        if (savedPage && typeof savedPage.page === 'number') {
            startPage = savedPage.page;
        }

        if (cbzReadingMode === 'scroll') {
            displayAllImages();
            // Scrolling to a specific image is not implemented yet for scroll mode
        } else {
            displayImage(startPage);
        }
    }
    
    hideLoading();
    topBar.classList.add('hidden');
    settingsFab.classList.add('hidden');
    prevNavOverlay.classList.remove('hidden');
    centerNavOverlay.classList.remove('hidden');
    nextNavOverlay.classList.remove('hidden');

    window.addEventListener('keydown', handleKeydown);
}

async function displayImage(index) {
    currentImageIndex = index;
    const imageFile = imageFiles[index];
    const content = await imageFile.async('base64');
    const imageUrl = `data:image/${imageFile.name.split('.').pop()};base64,${content}`;
    imageContainer.innerHTML = `<img src="${imageUrl}" class="max-w-full max-h-full mx-auto">`;
    updatePageInfo(currentImageIndex + 1, totalPages);
    if (currentFile) {
        saveProgress(currentFile.name, { type: 'cbz', page: index });
    }
}

async function displayAllImages() {
    imageContainer.innerHTML = '';
    imageContainer.classList.add('scroll-mode');
    for (let i = 0; i < imageFiles.length; i++) {
        const imageFile = imageFiles[i];
        const content = await imageFile.async('base64');
        const imageUrl = `data:image/${imageFile.name.split('.').pop()};base64,${content}`;
        const img = document.createElement('img');
        img.src = imageUrl;
        img.className = "max-w-full mx-auto";
        imageContainer.appendChild(img);
    }
    updatePageInfo(1, 1); // Simplified for scroll mode
}

function updatePageInfo(current, total) {
    if (total > 0) {
        // CBZ
        pageInfo.textContent = `Page ${current} of ${total}`;
        updateProgressBar(current, total);
    } else {
        pageInfo.textContent = '';
        updateProgressBar(0, 0);
    }
}

function updateProgressBar(current, total) {
    if (total > 0) {
        let progress;
        // CBZ
        progress = (current / total) * 100;
        progressBar.style.width = `${progress}%`;
    } else {
        progressBar.style.width = '0%';
    }
}


function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    clock.textContent = `${hours}:${minutes}`;
}

// Settings Modal Logic
settingsFab.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
    mainContent.classList.add('modal-open');
});

closeModalBtn.addEventListener('click', () => {
   settingsModal.classList.add('hidden');
   mainContent.classList.remove('modal-open');
});

window.addEventListener('click', (event) => {
    if (event.target === settingsModal) {
        settingsModal.classList.add('hidden');
        mainContent.classList.remove('modal-open');
    }
});

// Init clock
setInterval(updateClock, 1000);
updateClock();

// Navigation
function nextPage() {
    if (zip && cbzReadingMode === 'page') {
        if (cbzReverseDirection) {
            if (currentImageIndex > 0) {
                displayImage(--currentImageIndex);
            }
        } else {
            if (currentImageIndex < imageFiles.length - 1) {
                displayImage(++currentImageIndex);
            }
        }
    }
}

function prevPage() {
    if (zip && cbzReadingMode === 'page') {
        if (cbzReverseDirection) {
            if (currentImageIndex < imageFiles.length - 1) {
                displayImage(++currentImageIndex);
            }
        } else {
            if (currentImageIndex > 0) {
                displayImage(--currentImageIndex);
            }
        }
    }
}

function handleKeydown(e) {
    if (e.key === 'ArrowLeft') {
        prevPage();
    } else if (e.key === 'ArrowRight') {
        nextPage();
    }
}



prevNavOverlay.addEventListener('click', prevPage);
nextNavOverlay.addEventListener('click', nextPage);
centerNavOverlay.addEventListener('click', () => {
    topBar.classList.toggle('hidden');
    settingsFab.classList.toggle('hidden');
});

function showLoading() {
    loadingContainer.classList.remove('hidden');
}

function hideLoading() {
    loadingContainer.classList.add('hidden');
}


function updateCbzModeButtons() {
    if (cbzReadingMode === 'scroll') {
        cbzModeScrollBtn.classList.add('bg-violet-600');
        cbzModeScrollBtn.classList.remove('bg-gray-600');
        cbzModePageBtn.classList.remove('bg-violet-600');
        cbzModePageBtn.classList.add('bg-gray-600');
        cbzPageDirectionContainer.classList.add('hidden');
        imageContainer.style.overflowY = 'scroll';
        imageContainer.classList.add('scroll-mode');
        prevNavOverlay.classList.add('hidden');
        centerNavOverlay.classList.add('hidden');
        nextNavOverlay.classList.add('hidden');
        if(zip) displayAllImages();
    } else {
        cbzModePageBtn.classList.add('bg-violet-600');
        cbzModePageBtn.classList.remove('bg-gray-600');
        cbzModeScrollBtn.classList.remove('bg-violet-600');
        cbzModeScrollBtn.classList.add('bg-gray-600');
        cbzPageDirectionContainer.classList.remove('hidden');
        imageContainer.style.overflowY = 'hidden';
        imageContainer.classList.remove('scroll-mode');
        prevNavOverlay.classList.remove('hidden');
        centerNavOverlay.classList.remove('hidden');
        nextNavOverlay.classList.remove('hidden');
        if(zip) displayImage(currentImageIndex);
    }
}

cbzModeScrollBtn.addEventListener('click', () => {
    cbzReadingMode = 'scroll';
    localStorage.setItem('cbzReadingMode', cbzReadingMode);
    updateCbzModeButtons();
});

cbzModePageBtn.addEventListener('click', () => {
    cbzReadingMode = 'page';
    localStorage.setItem('cbzReadingMode', cbzReadingMode);
    updateCbzModeButtons();
});

cbzReverseDirectionCheckbox.addEventListener('change', (e) => {
    cbzReverseDirection = e.target.checked;
    localStorage.setItem('cbzReverseDirection', cbzReverseDirection);
});

function goToCbzPage(page) {
    if (zip && page > 0 && page <= totalPages) {
        displayImage(page - 1);
    }
}


cbzGotoBtn.addEventListener('click', () => {
    const page = parseInt(cbzPageInput.value, 10);
    if (!isNaN(page)) {
        goToCbzPage(page);
    }
});

function saveProgress(filename, data) {
    try {
        let progress = JSON.parse(localStorage.getItem('liberMeaProgress')) || {};
        progress[filename] = data;
        localStorage.setItem('liberMeaProgress', JSON.stringify(progress));
    } catch (e) {
        console.error("Could not save progress", e);
    }
}

function loadProgress(filename) {
    try {
        const progress = JSON.parse(localStorage.getItem('liberMeaProgress'));
        if (progress && progress[filename]) {
            const fileProgress = progress[filename];
            if (fileProgress.type === 'cbz') {
                return fileProgress;
            }
        }
    } catch (e) {
        console.error("Could not load progress", e);
    }
    return null;
}