const fileInput = document.getElementById('file-input');
const modalFileInput = document.getElementById('modal-file-input');
const viewer = document.getElementById('viewer');
const imageContainer = document.getElementById('image-container');
const topBar = document.getElementById('top-bar');
const mainContent = document.getElementById('main-content');
const uploadView = document.getElementById('upload-view');
const bookTitle = document.getElementById('book-title');
const clock = document.getElementById('clock');
const pageInfo = document.getElementById('page-info');
const progressBar = document.getElementById('progress-bar');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const prevNavOverlay = document.getElementById('prev-nav-overlay');
const nextNavOverlay = document.getElementById('next-nav-overlay');
const epubSettings = document.getElementById('epub-settings');
const decreaseFontSizeBtn = document.getElementById('decrease-font-size');
const increaseFontSizeBtn = document.getElementById('increase-font-size');
const fontSizeValue = document.getElementById('font-size-value');
const themeButtons = document.getElementById('theme-buttons');
const loadingContainer = document.getElementById('loading-container');
const loadingBar = document.getElementById('loading-bar');
const loadingText = document.getElementById('loading-text');
const cbzSettings = document.getElementById('cbz-settings');
const cbzModeScrollBtn = document.getElementById('cbz-mode-scroll');
const cbzModePageBtn = document.getElementById('cbz-mode-page');
const cbzPageDirectionContainer = document.getElementById('cbz-page-direction-container');
const cbzReverseDirectionCheckbox = document.getElementById('cbz-reverse-direction');
const epubPageInput = document.getElementById('epub-page-input');
const epubGotoBtn = document.getElementById('epub-goto-btn');
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

let book = null;
let rendition = null;
let zip = null;
let imageFiles = [];
let currentImageIndex = 0;
let totalPages = 0;
let currentFontSize = 100;
let cbzReadingMode = 'page'; // 'page' or 'scroll'
let cbzReverseDirection = false;

// Load settings from localStorage
document.addEventListener('DOMContentLoaded', () => {
    const savedCbzReadingMode = localStorage.getItem('cbzReadingMode');
    if (savedCbzReadingMode) {
        cbzReadingMode = savedCbzReadingMode;
    }
    cbzReverseDirection = localStorage.getItem('cbzReverseDirection') === 'true';
    cbzReverseDirectionCheckbox.checked = cbzReverseDirection;
    updateCbzModeButtons();
});

function handleFile(file) {
    if (!file) return;

    clearViewer();
    showLoading();

    if (file.name.endsWith('.epub')) {
        bookTitle.textContent = file.name;
        handleEpub(file);
        updateFontSize(100);
        epubSettings.classList.remove('hidden');
    } else if (file.name.endsWith('.cbz')) {
        bookTitle.textContent = file.name;
        handleCbz(file);
        epubSettings.classList.add('hidden');
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
    nextNavOverlay.classList.add('hidden');
    book = null;
    rendition = null;
    zip = null;
    imageFiles = [];
    currentImageIndex = 0;
    window.removeEventListener('keydown', handleKeydown);
    epubSettings.classList.add('hidden');
    cbzSettings.classList.add('hidden');
}

function handleEpub(file) {
    viewer.classList.remove('hidden');
    const reader = new FileReader();

    reader.onprogress = function(e) {
        if (e.lengthComputable) {
            const percentLoaded = Math.round((e.loaded / e.total) * 100);
            updateLoading(percentLoaded);
        }
    };

    reader.onload = function(e) {
        const bookData = e.target.result;
        book = ePub(bookData);
        rendition = book.renderTo(viewer, {
            width: "100%",
            height: "100%",
            flow: "paginated",
        });
        
        rendition.display().then(() => {
            hideLoading();
            uploadView.classList.add('hidden');
            topBar.classList.remove('hidden');
            prevNavOverlay.classList.remove('hidden');
            nextNavOverlay.classList.remove('hidden');
        });

        book.ready.then(() => {
            rendition.themes.register("dark", { "body": { "background": "#000000", "color": "#ffffff" } });
            rendition.themes.register("white", { "body": { "background": "#ffffff", "color": "#000000" } });
            rendition.themes.register("sepia", { "body": { "background": "#fbf0d9", "color": "#5b4636" } });
            rendition.themes.register("gray", { "body": { "background": "#555555", "color": "#ffffff" } });
            rendition.themes.select("dark");

            const locations = book.locations.generate(1024);
            totalPages = book.locations.length();

            rendition.on("relocated", (location) => {
                const progress = location.end.percentage;
                updatePageInfo(progress, 1); // Total is 1 for percentage
            });

            rendition.on("displayed", () => {
                const location = rendition.currentLocation();
                const progress = location.end.percentage;
                updatePageInfo(progress, 1); // Total is 1 for percentage
            });

            // Attach keyboard listener to rendition
            rendition.on('keyup', handleKeydown);
            // Also listen on window as a fallback
            window.addEventListener('keydown', handleKeydown);
        });
    };

    reader.readAsArrayBuffer(file);
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
        update: function (metadata) {
            updateLoading(metadata.percent);
        }
    });
    imageFiles = Object.values(zip.files).filter(f => !f.dir && /\.(jpe?g|png|gif)$/i.test(f.name)).sort((a, b) => a.name.localeCompare(b.name));
    totalPages = imageFiles.length;

    if (imageFiles.length > 0) {
        if (cbzReadingMode === 'scroll') {
            displayAllImages();
        } else {
            displayImage(0);
        }
    }
    
    hideLoading();
    uploadView.classList.add('hidden');
    topBar.classList.remove('hidden');
    prevNavOverlay.classList.remove('hidden');
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
        if (rendition) { // EPUB
            const percentage = Math.round(current * 100);
            pageInfo.textContent = `${percentage}%`;
            updateProgressBar(current, total);
        } else { // CBZ
            pageInfo.textContent = `Page ${current} of ${total}`;
            updateProgressBar(current, total);
        }
    } else {
        pageInfo.textContent = '';
        updateProgressBar(0, 0);
    }
}

function updateProgressBar(current, total) {
    if (total > 0) {
        let progress;
        if (rendition) { // EPUB
            progress = current * 100;
        } else { // CBZ
            progress = (current / total) * 100;
        }
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
settingsBtn.addEventListener('click', () => {
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
    if (rendition) {
        rendition.next();
    } else if (zip && cbzReadingMode === 'page') {
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
    if (rendition) {
        rendition.prev();
    } else if (zip && cbzReadingMode === 'page') {
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

function updateFontSize(newSize) {
    currentFontSize = Math.max(80, Math.min(200, newSize)); // Clamp between 80% and 200%
    fontSizeValue.textContent = `${currentFontSize}%`;
    if (rendition) {
        rendition.themes.fontSize(`${currentFontSize}%`);
    }
}

decreaseFontSizeBtn.addEventListener('click', () => {
    updateFontSize(currentFontSize - 10);
});

increaseFontSizeBtn.addEventListener('click', () => {
    updateFontSize(currentFontSize + 10);
});

const debouncedThemeChange = debounce((theme) => {
    if (rendition) {
        rendition.themes.select(theme).catch((err) => {
            console.error("Theme change failed:", err);
        });
    }
}, 250);

themeButtons.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (button && button.dataset.theme) {
        debouncedThemeChange(button.dataset.theme);
    }
});


prevNavOverlay.addEventListener('click', prevPage);
nextNavOverlay.addEventListener('click', nextPage);

function showLoading() {
    loadingContainer.classList.remove('hidden');
    updateLoading(0);
}

function hideLoading() {
    loadingContainer.classList.add('hidden');
}

function updateLoading(percent) {
    const percentage = Math.floor(percent);
    loadingBar.style.width = `${percentage}%`;
    loadingText.textContent = `Loading... ${percentage}%`;
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

epubGotoBtn.addEventListener('click', () => {
    const percentage = parseInt(epubPageInput.value, 10);
    if (!isNaN(percentage) && rendition && percentage >= 0 && percentage <= 100) {
        const cfi = book.locations.cfiFromPercentage(percentage / 100);
        rendition.display(cfi);
    }
});

cbzGotoBtn.addEventListener('click', () => {
    const page = parseInt(cbzPageInput.value, 10);
    if (!isNaN(page)) {
        goToCbzPage(page);
    }
});