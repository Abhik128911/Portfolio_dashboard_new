document.addEventListener('DOMContentLoaded', () => {

    const select = (selector) => document.querySelector(selector);

    // --- Element Selections ---
    const fileInput = select('#file-input');
    const browseFileBtn = select('#browse-file-btn');
    const fileDropArea = select('.file-drop-area');
    const imageEditor = select('#image-editor');
    const imagePreview = select('#image-preview');
    const originalSizeInfo = select('#original-size-info');
    
    const removeBgBtn = select('#remove-bg-btn');
    const fillBgControls = select('#fill-bg-controls');
    const fillColorInput = select('#fill-color-input');

    const resizeWidthInput = select('#resize-width');
    const compressionGroup = select('#compression-group');
    const targetSizeInput = select('#target-size');
    const targetSizeValueSpan = select('#target-size-value');
    const convertFormatSelect = select('#convert-format');
    
    const processImageBtn = select('#process-image-btn');
    const resultArea = select('#result-area');
    const resultSizeInfo = select('#result-size-info');
    const downloadLink = select('#download-link');
    const startOverBtn = select('#start-over-btn');

    let currentFile = null;
    let processedBlob = null;
    const { jsPDF } = window.jspdf;

    // --- File Input Handling ---
    browseFileBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
    fileDropArea.addEventListener('dragover', (e) => { e.preventDefault(); fileDropArea.classList.add('dragover'); });
    fileDropArea.addEventListener('dragleave', () => fileDropArea.classList.remove('dragover'));
    fileDropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileDropArea.classList.remove('dragover');
        handleFile(e.dataTransfer.files[0]);
    });

    function handleFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            alert('Please select an image file (JPG, PNG, WebP).');
            return;
        }
        currentFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            fileDropArea.classList.add('hidden');
            imageEditor.classList.remove('hidden');
            resultArea.classList.add('hidden');
            fillBgControls.classList.add('hidden');
            removeBgBtn.disabled = false;
            originalSizeInfo.textContent = `Original size: ${formatFileSize(currentFile.size)}`;
        };
        reader.readAsDataURL(file);
    }

    // --- Background Removal & Fill Logic ---
    removeBgBtn.addEventListener('click', async () => {
        if (!currentFile) return;
        removeBgBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Removing...';
        removeBgBtn.disabled = true;
        try {
            // FIXED: Explicitly provide the path to the library's assets to prevent loading errors.
            const config = {
                publicPath: '//cdn.jsdelivr.net/npm/@imgly/background-removal/dist/assets/'
            };
            const blob = await removeBackground(currentFile, config);
            currentFile = new File([blob], "background-removed.png", { type: "image/png" });
            imagePreview.src = URL.createObjectURL(currentFile);
            fillBgControls.classList.remove('hidden');
        } catch (error) {
            // IMPROVED: Show a more specific error message.
            console.error("Background removal failed:", error);
            alert(`Background removal failed: ${error.message || 'Please try another image or check the browser console.'}`);
        } finally {
            removeBgBtn.disabled = false;
            removeBgBtn.innerHTML = '<i class="fas fa-eraser"></i> Remove Background';
        }
    });
    
    fillColorInput.addEventListener('input', () => {
        if (!currentFile || !currentFile.name.includes("background-removed")) return;
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = fillColorInput.value;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            imagePreview.src = canvas.toDataURL('image/png');
        };
        img.src = URL.createObjectURL(currentFile);
    });

    // --- Options Handling ---
    targetSizeInput.addEventListener('input', () => {
        targetSizeValueSpan.textContent = `${targetSizeInput.value} KB`;
    });

    convertFormatSelect.addEventListener('change', () => {
        if (convertFormatSelect.value === 'application/pdf') {
            compressionGroup.classList.add('hidden');
        } else {
            compressionGroup.classList.remove('hidden');
        }
    });

    // --- Main Processing Logic ---
    async function processImage() {
        const selectedFormat = convertFormatSelect.value;
        if (selectedFormat === 'application/pdf') {
            await createPdf();
        } else {
            await compressImage();
        }
    }

    async function createPdf() {
        processImageBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating PDF...';
        processImageBtn.disabled = true;
        
        const imgData = imagePreview.src;
        const doc = new jsPDF();
        const imgProps = doc.getImageProperties(imgData);
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        processedBlob = doc.output('blob');
        
        resultSizeInfo.textContent = `New size: ${formatFileSize(processedBlob.size)}`;
        downloadLink.href = URL.createObjectURL(processedBlob);
        downloadLink.download = `${getFileName()}-processed.pdf`;
        
        resultArea.classList.remove('hidden');
        processImageBtn.innerHTML = '<i class="fas fa-cogs"></i> Process Image';
        processImageBtn.disabled = false;
    }

    async function compressImage() {
        const blob = await fetch(imagePreview.src).then(res => res.blob());
        if (!blob) return;

        processImageBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Compressing...';
        processImageBtn.disabled = true;

        const options = {
            maxSizeMB: parseInt(targetSizeInput.value) / 1024,
            useWebWorker: true,
        };
        if (resizeWidthInput.value) options.maxWidthOrHeight = parseInt(resizeWidthInput.value);
        if (convertFormatSelect.value) options.fileType = convertFormatSelect.value;

        try {
            processedBlob = await imageCompression(blob, options);
            const sizeReduction = Math.round(((blob.size - processedBlob.size) / blob.size) * 100);
            resultSizeInfo.textContent = `New size: ${formatFileSize(processedBlob.size)} (${sizeReduction}% smaller)`;
            downloadLink.href = URL.createObjectURL(processedBlob);
            const newExtension = processedBlob.type.split('/')[1];
            downloadLink.download = `${getFileName()}-processed.${newExtension}`;
            resultArea.classList.remove('hidden');
        } catch (error) {
            resultSizeInfo.textContent = `Could not compress to target size. Try a larger target.`;
            resultArea.classList.remove('hidden');
        } finally {
            processImageBtn.innerHTML = '<i class="fas fa-cogs"></i> Process Image';
            processImageBtn.disabled = false;
        }
    }

    processImageBtn.addEventListener('click', processImage);

    // --- Utility and Reset Logic ---
    const formatFileSize = (bytes) => {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileName = () => {
        return (currentFile?.name.split('.').slice(0, -1).join('.')) || 'image';
    }

    startOverBtn.addEventListener('click', () => {
        currentFile = null;
        processedBlob = null;
        fileInput.value = '';
        fileDropArea.classList.remove('hidden');
        imageEditor.classList.add('hidden');
        resultArea.classList.add('hidden');
        fillBgControls.classList.add('hidden');
        compressionGroup.classList.remove('hidden');
        removeBgBtn.disabled = false;
    });
});

// ===== Removebackground Functionality =====//

async function removeBackground(file, config) {
    if (!file || !file.type.startsWith('image/')) {
        throw new Error('Invalid file type. Please provide an image file.');
    }
    
    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: {
            'X-Api-Key': 'YOUR_API_KEY_HERE', // Replace with your actual API key
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            image_file_b64: await fileToBase64(file),
            ...config
        })
    });

    if (!response.ok) {
        throw new Error(`Background removal failed: ${response.statusText}`);
    }

    const data = await response.blob();
    return data;
}

async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}