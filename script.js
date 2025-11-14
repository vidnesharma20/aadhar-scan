// ==========================================
// GLOBAL VARIABLES
// ==========================================
let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let capturedImage = document.getElementById('capturedImage');
let captureBtn = document.getElementById('captureBtn');
let retryBtn = document.getElementById('retryBtn');
let saveBtn = document.getElementById('saveBtn');
let statusDiv = document.getElementById('status');
let extractedDataDiv = document.getElementById('extractedData');
let progressContainer = document.getElementById('progressContainer');
let progressBar = document.getElementById('progressBar');
let progressText = document.getElementById('progressText');


let currentImageData = null;
let extractedInfo = null;
let todayCount = 0;
let totalCount = 0;


// ==========================================
// INITIALIZE CAMERA
// ==========================================
async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'environment'
            }
        });
        video.srcObject = stream;
        showStatus('✅ Camera ready! Position ID card in frame.', 'success');
        console.log('Camera initialized successfully');
    } catch (error) {
        showStatus('❌ Error accessing camera: ' + error.message, 'error');
        console.error('Camera error:', error);
    }
}


// ==========================================
// IMAGE ENHANCEMENT
// ==========================================
function enhanceImage(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
   
    for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const contrast = 1.5;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        const enhanced = factor * (gray - 128) + 128;
        data[i] = data[i + 1] = data[i + 2] = Math.max(0, Math.min(255, enhanced));
    }
   
    ctx.putImageData(imageData, 0, 0);
}


// ==========================================
// CAPTURE IMAGE (WITHOUT GRAYSCALE)
// ==========================================
function captureImage() {
    console.log('Capture button clicked!');
   
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
   
    // DON'T enhance for face photo - we want color!
    // if (CONFIG.ENHANCE_IMAGE) {
    //     enhanceImage(ctx, canvas.width, canvas.height);
    // }
   
    currentImageData = canvas.toDataURL('image/jpeg', 0.95);
   
    capturedImage.src = currentImageData;
    capturedImage.style.display = 'block';
    video.style.display = 'none';
   
    captureBtn.style.display = 'none';
    retryBtn.style.display = 'block';
   
    showStatus('🔄 Processing image with OCR...', 'processing');
    processImage(currentImageData);
}


// ==========================================
// PROCESS IMAGE WITH TESSERACT (WITH PHOTO)
// ==========================================
async function processImage(imageData) {
    if (CONFIG.USE_DEMO_MODE) {
        setTimeout(() => {
            extractedInfo = {
                name: 'RAJESH KUMAR SHARMA',
                gender: 'MALE',
                dob: '15/05/1990',
                idNumber: '1234 5678 9012',
                photoUrl: 'https://via.placeholder.com/150',
                timestamp: new Date().toLocaleString()
            };
            displayExtractedData(extractedInfo);
            showStatus('✅ Data extracted! (Demo Mode)', 'success');
            saveBtn.disabled = false;
        }, 1500);
        return;
    }


    try {
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressText.textContent = 'Extracting face photo...';
       
        // Step 1: Crop face photo
        const facePhoto = await cropFacePhoto(imageData);
       
        // Step 2: Upload photo to ImgBB
        progressText.textContent = 'Uploading photo...';
        const photoUrl = await uploadImageToImgBB(facePhoto);
       
        // Step 3: OCR processing
        progressText.textContent = 'Initializing OCR...';
        console.log('Starting Tesseract.js OCR...');
       
        const result = await Tesseract.recognize(
            imageData,
            CONFIG.OCR_LANGUAGE,
            {
                logger: info => {
                    if (info.status === 'recognizing text') {
                        const progress = Math.round(info.progress * 100);
                        progressBar.style.width = progress + '%';
                        progressText.textContent = `Processing: ${progress}%`;
                    }
                }
            }
        );


        progressContainer.style.display = 'none';
       
        const extractedText = result.data.text;
        console.log('EXTRACTED TEXT:', extractedText);
        console.log('PHOTO URL:', photoUrl);


        if (!extractedText || extractedText.trim().length < 10) {
            throw new Error('No text detected. Please ensure good lighting and hold card steady.');
        }


        extractedInfo = parseIDCard(extractedText);
        extractedInfo.photoUrl = photoUrl || 'No photo'; // Add photo URL
       
        displayExtractedData(extractedInfo);
        showStatus('✅ Data extracted successfully!', 'success');
        saveBtn.disabled = false;


    } catch (error) {
        console.error('Processing ERROR:', error);
        progressContainer.style.display = 'none';
        showStatus('❌ Error: ' + error.message, 'error');
        saveBtn.disabled = true;
    }
}


// ==========================================
// PROCESS IMAGE (WITH DETAILED LOGGING)
// ==========================================
async function processImage(imageData) {
    if (CONFIG.USE_DEMO_MODE) {
        setTimeout(() => {
            extractedInfo = {
                name: 'RAJESH KUMAR SHARMA',
                gender: 'MALE',
                dob: '15/05/1990',
                idNumber: '1234 5678 9012',
                photoUrl: 'https://via.placeholder.com/236x295',
                timestamp: new Date().toLocaleString()
            };
            displayExtractedData(extractedInfo);
            showStatus('✅ Data extracted! (Demo Mode)', 'success');
            saveBtn.disabled = false;
        }, 1500);
        return;
    }


    try {
        progressContainer.style.display = 'block';
        progressBar.style.width = '10%';
        progressText.textContent = 'Extracting face photo...';
       
        // Step 1: Crop face photo
        console.log('Step 1: Cropping face photo...');
        const facePhoto = await cropFacePhoto(imageData);
        console.log('✓ Face photo cropped');
       
        // Step 2: Upload photo to ImgBB
        progressBar.style.width = '30%';
        progressText.textContent = 'Uploading photo to cloud...';
        console.log('Step 2: Uploading to ImgBB...');
       
        const photoUrl = await uploadImageToImgBB(facePhoto);
        console.log('✓ Photo uploaded:', photoUrl);
       
        if (!photoUrl) {
            console.warn('⚠️ Photo upload failed, continuing without photo');
        }
       
        // Step 3: OCR processing
        progressBar.style.width = '50%';
        progressText.textContent = 'Reading text from card...';
        console.log('Step 3: Starting OCR...');
       
        // Create enhanced version ONLY for OCR (not for photo)
        const ocrCanvas = document.createElement('canvas');
        const ocrCtx = ocrCanvas.getContext('2d');
        const ocrImg = new Image();
       
        await new Promise((resolve) => {
            ocrImg.onload = resolve;
            ocrImg.src = imageData;
        });
       
        ocrCanvas.width = ocrImg.width;
        ocrCanvas.height = ocrImg.height;
        ocrCtx.drawImage(ocrImg, 0, 0);
       
        // Enhance for better OCR
        if (CONFIG.ENHANCE_IMAGE) {
            enhanceImage(ocrCtx, ocrCanvas.width, ocrCanvas.height);
        }
       
        const enhancedImageData = ocrCanvas.toDataURL('image/jpeg', 0.95);
       
        const result = await Tesseract.recognize(
            enhancedImageData,  // Use enhanced version for OCR
            CONFIG.OCR_LANGUAGE,
            {
                logger: info => {
                    if (info.status === 'recognizing text') {
                        const progress = 50 + Math.round(info.progress * 40);
                        progressBar.style.width = progress + '%';
                        progressText.textContent = `Reading text: ${Math.round(info.progress * 100)}%`;
                    }
                }
            }
        );


        progressBar.style.width = '100%';
        progressContainer.style.display = 'none';
       
        const extractedText = result.data.text;
        console.log('✓ OCR complete');
        console.log('EXTRACTED TEXT:', extractedText);


        if (!extractedText || extractedText.trim().length < 10) {
            throw new Error('No text detected. Please ensure good lighting.');
        }


        extractedInfo = parseIDCard(extractedText);
        extractedInfo.photoUrl = photoUrl || 'No photo';
       
        console.log('=== FINAL EXTRACTED INFO ===');
        console.log('Name:', extractedInfo.name);
        console.log('Gender:', extractedInfo.gender);
        console.log('DOB:', extractedInfo.dob);
        console.log('ID:', extractedInfo.idNumber);
        console.log('Photo URL:', extractedInfo.photoUrl);
        console.log('Timestamp:', extractedInfo.timestamp);
       
        displayExtractedData(extractedInfo);
        showStatus('✅ Data extracted successfully!', 'success');
        saveBtn.disabled = false;


    } catch (error) {
        console.error('❌ Processing ERROR:', error);
        progressContainer.style.display = 'none';
        showStatus('❌ Error: ' + error.message, 'error');
        saveBtn.disabled = true;
    }
}


// ==========================================
// PARSE ID CARD DATA (WITH BETTER LOGGING)
// ==========================================
function parseIDCard(text) {
    console.log('========== PARSING AADHAR ==========');
    console.log('Raw text length:', text.length);
    console.log('Raw text:', text);
   
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    console.log('Total lines:', lines.length);
    console.log('Lines array:', lines);
   
    const data = {
        name: '',
        gender: '',
        dob: '',
        idNumber: '',
        timestamp: new Date().toLocaleString()
    };


    // Extract Aadhar number
    const aadharPatterns = [
        /(\d{4}\s?\d{4}\s?\d{4})/,
        /(\d{4}-\d{4}-\d{4})/,
        /(\d{12})/
    ];
   
    for (let pattern of aadharPatterns) {
        const match = text.match(pattern);
        if (match) {
            data.idNumber = match[1];
            console.log('✓ Found Aadhar:', data.idNumber);
            break;
        }
    }


    // Extract DOB
    const dobPatterns = [
        /(?:DOB|Birth|YOB)[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
        /(\d{2}[\/\-]\d{2}[\/\-]\d{4})/,
        /(\d{2}\s+\d{2}\s+\d{4})/
    ];
   
    for (let pattern of dobPatterns) {
        const match = text.match(pattern);
        if (match) {
            data.dob = match[1];
            console.log('✓ Found DOB:', data.dob);
            break;
        }
    }


    // Extract Gender
    const genderPatterns = [
        /\b(MALE|FEMALE|Male|Female)\b/i,
        /(?:Gender|Sex)[:\s]*(MALE|FEMALE|M|F)\b/i
    ];
   
    for (let pattern of genderPatterns) {
        const match = text.match(pattern);
        if (match) {
            let gender = match[1].toUpperCase();
            if (gender === 'M') gender = 'MALE';
            if (gender === 'F') gender = 'FEMALE';
            data.gender = gender;
            console.log('✓ Found Gender:', data.gender);
            break;
        }
    }


    // Extract Name - IMPROVED
    const skipWords = [
        'GOVERNMENT', 'INDIA', 'AADHAAR', 'UNIQUE', 'IDENTIFICATION',
        'AUTHORITY', 'ENROLMENT', 'NUMBER', 'MALE', 'FEMALE', 'DOB',
        'BIRTH', 'DATE', 'YEAR', 'ADDRESS', 'VID'
    ];
   
    console.log('--- Searching for name ---');
   
    // Find DOB line index
    let dobLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (data.dob && lines[i].includes(data.dob)) {
            dobLineIndex = i;
            console.log('DOB found at line index:', i);
            break;
        }
    }
   
    const searchLimit = dobLineIndex > 0 ? dobLineIndex : Math.min(20, lines.length);
    console.log('Searching first', searchLimit, 'lines for name');
   
// =====================
// FIXED NAME EXTRACTION
// =====================


// ✅ NEW NAME DETECTION — Aadhaar Reliable Version
console.log("----- NAME DETECTION START -----");


let nameFound = false;


// ✅ Identify DOB index (to limit search range)
let dobIndex = lines.findIndex(line =>
    line.toLowerCase().includes("dob") ||
    line.match(/\b\d{2}\/\d{2}\/\d{4}\b/)
);


if (dobIndex === -1) dobIndex = 15; // fallback search limit


for (let i = 0; i < dobIndex; i++) {
    let line = lines[i].trim();


    // ✅ Skip empty lines
    if (!line) continue;


    // ✅ Skip Hindi lines
    if (/[^\u0000-\u007F]/.test(line)) continue;


    // ✅ Skip Aadhaar headers
    if (
        line.toUpperCase().includes("GOVERNMENT") ||
        line.toUpperCase().includes("UNIQUE") ||
        line.toUpperCase().includes("INDIA") ||
        line.toUpperCase().includes("AUTHORITY")
    ) {
        continue;
    }


    // ✅ Skip Gender & DOB lines
    if (line.toLowerCase().includes("male") ||
        line.toLowerCase().includes("female") ||
        line.toLowerCase().includes("dob") ||
        line.match(/\d{4}/)) {
        continue;
    }


    // ✅ VALID NAME CHECK:
    // - only alphabets + spaces allowed
    // - 2 to 4 words
    // - return EXACT TEXT
    let words = line.split(/\s+/);


    if (
        words.length >= 2 &&
        words.length <= 4 &&
        /^[A-Za-z\s]+$/.test(line)
    ) {
        data.name = line;   // ✅ EXACT OCR TEXT
        console.log("✅ NAME FOUND:", data.name);
        nameFound = true;
        break;
    }
}


if (!nameFound) {
    console.log("❌ Name not detected");
}


console.log("----- NAME DETECTION END -----");




   
    // Alternative name search if not found
    if (!data.name) {
        console.log('⚠️ Name not found with primary method, trying alternatives...');
        for (let i = 0; i < searchLimit; i++) {
            const line = lines[i].trim();
           
            // Look for any line with 2-4 capital words
            if (line.match(/^[A-Z][A-Z\s]{8,35}$/)) {
                const words = line.split(/\s+/);
                if (words.length >= 2 && words.length <= 4 && !words.every(w => w.length === 1)) {
                    data.name = line;
                    console.log('✓ Found Name (alternative):', data.name);
                    break;
                }
            }
        }
    }
   
    if (!data.name) {
        console.log('❌ Name still not found!');
        console.log('First 10 lines for manual check:');
        lines.slice(0, 10).forEach((line, idx) => {
            console.log(`  ${idx}: ${line}`);
        });
    }


    console.log('========== FINAL PARSED DATA ==========');
    console.log('Name:', data.name || 'NOT DETECTED');
    console.log('Gender:', data.gender || 'NOT DETECTED');
    console.log('DOB:', data.dob || 'NOT DETECTED');
    console.log('ID Number:', data.idNumber || 'NOT DETECTED');
    console.log('Timestamp:', data.timestamp);
    console.log('======================================');
   
    return data;
}


// ==========================================
// PARSE ID CARD DATA
// ==========================================
function parseIDCard(text) {
    console.log('=== PARSING AADHAR CARD ===');
    console.log('Raw text:', text);
   
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    console.log('Lines:', lines);
   
    const data = {
        name: '',
        gender: '',
        dob: '',
        idNumber: '',
        timestamp: new Date().toLocaleString()
    };


    // Extract Aadhar number
    const aadharPatterns = [
        /(\d{4}\s?\d{4}\s?\d{4})/,
        /(\d{4}-\d{4}-\d{4})/,
        /(\d{12})/
    ];
   
    for (let pattern of aadharPatterns) {
        const match = text.match(pattern);
        if (match) {
            data.idNumber = match[1];
            console.log('✓ Found Aadhar:', data.idNumber);
            break;
        }
    }


    // Extract DOB
    const dobPatterns = [
        /(?:DOB|Birth|YOB)[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
        /(\d{2}[\/\-]\d{2}[\/\-]\d{4})/,
        /(\d{2}\s+\d{2}\s+\d{4})/
    ];
   
    for (let pattern of dobPatterns) {
        const match = text.match(pattern);
        if (match) {
            data.dob = match[1];
            console.log('✓ Found DOB:', data.dob);
            break;
        }
    }


   // Extract Gender - IMPROVED
const genderMatch = text.match(/\b(MALE|FEMALE)\b/i);
if (genderMatch) {
    data.gender = genderMatch[1].toUpperCase();
    console.log('✓ Found Gender:', data.gender);
} else {
    // Fallback: look for M or F near DOB/Name
    const singleLetterMatch = text.match(/\b(M|F)\b(?!\d)/);
    if (singleLetterMatch) {
        data.gender = singleLetterMatch[1] === 'M' ? 'MALE' : 'FEMALE';
        console.log('✓ Found Gender (single letter):', data.gender);
    } else {
        // Check for common OCR mistakes
        const cleanedText = text.replace(/[^A-Z]/g, '');
        if (cleanedText.includes('MALE') && !cleanedText.includes('FEMALE')) {
            data.gender = 'MALE';
            console.log('✓ Found Gender (cleaned):', data.gender);
        } else if (cleanedText.includes('FEMALE')) {
            data.gender = 'FEMALE';
            console.log('✓ Found Gender (cleaned):', data.gender);
        }
    }
}


    // Extract Name - Improved Logic
    const skipWords = [
        'GOVERNMENT', 'INDIA', 'AADHAAR', 'UNIQUE', 'IDENTIFICATION',
        'AUTHORITY', 'ENROLMENT', 'NUMBER', 'MALE', 'FEMALE', 'DOB', 'BIRTH'
    ];
   
    let dobLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (data.dob && lines[i].includes(data.dob)) {
            dobLineIndex = i;
            break;
        }
    }
   
    const searchLimit = dobLineIndex > 0 ? dobLineIndex : Math.min(20, lines.length);
   
    for (let i = 0; i < searchLimit; i++) {
        const line = lines[i].toUpperCase().trim();
       
        if (skipWords.some(word => line.includes(word))) continue;
        if (line.match(/\d{2,}/)) continue;
        if (line.match(/[^A-Z\s\-]/)) continue;
       
        const words = line.split(/\s+/).filter(w => w.length > 1);
       
        if (words.length >= 2 && words.length <= 4 && line.length >= 6 && line.length <= 40) {
            data.name = line;
            console.log('✓ Found Name:', data.name);
            break;
        }
    }
   
    if (!data.name) {
        console.log('⚠ Name not found, trying alternative...');
        for (let i = 0; i < searchLimit; i++) {
            const line = lines[i].trim();
            if (line.match(/^[A-Z][A-Z\s]{8,35}$/)) {
                const words = line.split(/\s+/);
                if (words.length >= 2 && words.length <= 4 && !words.every(w => w.length === 1)) {
                    data.name = line;
                    console.log('✓ Found Name (alternative):', data.name);
                    break;
                }
            }
        }
    }


    console.log('=== FINAL EXTRACTED DATA ===');
    console.log(data);
   
    return data;
}


// ==========================================
// CROP FACE PHOTO FROM AADHAR CARD (IMPROVED)
// ==========================================
function cropFacePhoto(imageData) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            const tempCanvas = document.createElement('canvas');
            const ctx = tempCanvas.getContext('2d');
           
            const cardWidth = img.width;
            const cardHeight = img.height;
           
            console.log('Card dimensions:', cardWidth, 'x', cardHeight);
           
            // Aadhaar card face photo location (more precise)
            // Standard Aadhaar: photo is on left side
            // Adjust these if needed based on your card layout
            const cropX = cardWidth * 0.03;       // 3% from left
            const cropY = cardHeight * 0.25;      // 25% from top
            const cropWidth = cardWidth * 0.18;   // 18% of card width
            const cropHeight = cardHeight * 0.35; // 35% of card height
           
            console.log('Crop area:', {
                x: cropX,
                y: cropY,
                width: cropWidth,
                height: cropHeight
            });
           
            // Set output size to 4:5 ratio (236x295)
            tempCanvas.width = 236;
            tempCanvas.height = 295;
           
            // Draw with high quality
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
           
            // Crop and resize to exact dimensions
            ctx.drawImage(
                img,
                cropX, cropY, cropWidth, cropHeight,  // Source crop area
                0, 0, 236, 295                         // Destination (236x295)
            );
           
            // Convert to base64 JPEG with high quality (color preserved)
            const croppedImage = tempCanvas.toDataURL('image/jpeg', 0.92);
            console.log('✓ Face photo cropped (color, 236x295px)');
            resolve(croppedImage);
        };
       
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageData;
    });
}


// ==========================================
// UPLOAD IMAGE TO IMGBB
// ==========================================
async function uploadImageToImgBB(imageData) {
    try {
        console.log('Uploading photo to ImgBB...');
       
        // Remove data:image/jpeg;base64, prefix
        const base64Image = imageData.split(',')[1];
       
        // Create form data
        const formData = new FormData();
        formData.append('image', base64Image);
       
        // Upload to ImgBB
        const response = await fetch(
            `https://api.imgbb.com/1/upload?key=${CONFIG.IMGBB_API_KEY}`,
            {
                method: 'POST',
                body: formData
            }
        );
       
        const result = await response.json();
       
        if (result.success) {
            console.log('✓ Photo uploaded successfully:', result.data.url);
            return result.data.url; // Direct image URL
        } else {
            throw new Error('ImgBB upload failed');
        }
       
    } catch (error) {
        console.error('Photo upload error:', error);
        return null; // Return null if upload fails
    }
}


// ==========================================
// DISPLAY EXTRACTED DATA (WITH PHOTO)
// ==========================================
function displayExtractedData(data) {
    const photoHTML = data.photoUrl && data.photoUrl !== 'No photo'
        ? `<img src="${data.photoUrl}" style="width: 120px; height: 150px; object-fit: cover; border-radius: 8px; border: 2px solid #667eea;">`
        : '<div style="width: 120px; height: 150px; background: #f0f0f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999;">No Photo</div>';
   
    extractedDataDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            ${photoHTML}
        </div>
        <div class="data-field">
            <label>👤 Name</label>
            <div class="value" style="font-size: 1.2em; font-weight: 600;">${data.name || '❌ Not detected'}</div>
        </div>
        <div class="data-field">
            <label>⚧ Gender</label>
            <div class="value">${data.gender || '❌ Not detected'}</div>
        </div>
        <div class="data-field">
            <label>🎂 Date of Birth</label>
            <div class="value">${data.dob || '❌ Not detected'}</div>
        </div>
        <div class="data-field">
            <label>🆔 ID Number</label>
            <div class="value">${data.idNumber || '❌ Not detected'}</div>
        </div>
        <div class="data-field">
            <label>📸 Photo Link</label>
            <div class="value"><a href="${data.photoUrl}" target="_blank" style="color: #667eea;">View Photo</a></div>
        </div>
        <div class="data-field">
            <label>⏰ Timestamp</label>
            <div class="value">${data.timestamp}</div>
        </div>
    `;
}


// ==========================================
// SAVE TO GOOGLE SHEETS (FIXED - NO CORS MODE)
// ==========================================
async function saveToSheets() {
    if (!extractedInfo) {
        showStatus('❌ No data to save!', 'error');
        return;
    }
   
    console.log('========== SAVING TO SHEETS ==========');
    console.log('Photo URL to save:', extractedInfo.photoUrl);
   
    showStatus('💾 Saving to Google Sheets...', 'processing');
    saveBtn.disabled = true;


    if (CONFIG.USE_DEMO_MODE || !CONFIG.APPS_SCRIPT_URL) {
        setTimeout(() => {
            todayCount++;
            totalCount++;
            updateCounters();
            showStatus('✅ Saved! (Demo Mode)', 'success');
            setTimeout(resetCapture, 2000);
        }, 800);
        return;
    }


    try {
        const dataToSave = {
            srNo: todayCount + 1,
            name: extractedInfo.name || '',
            gender: extractedInfo.gender || '',
            dob: extractedInfo.dob || '',
            idNumber: extractedInfo.idNumber || '',
            photoUrl: extractedInfo.photoUrl || '',
            timestamp: extractedInfo.timestamp || ''
        };
       
        console.log('Data object:', dataToSave);
       
        const jsonString = JSON.stringify(dataToSave);
        console.log('JSON to send:', jsonString);


        // IMPORTANT: Remove mode: 'no-cors'
        const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'  // Changed header
            },
            body: jsonString,
            redirect: 'follow'
        });


        console.log('Response status:', response.status);
       
        // Try to read response (might fail due to CORS, but that's OK)
        try {
            const result = await response.text();
            console.log('Response:', result);
        } catch (e) {
            console.log('Could not read response (normal for CORS)');
        }
       
        todayCount++;
        totalCount++;
        updateCounters();
       
        showStatus('✅ Data saved to Google Sheets!', 'success');
        console.log('✓ Save completed');
       
        // Wait 2 seconds to check sheet
        setTimeout(() => {
            console.log('Check your Google Sheet now!');
            resetCapture();
        }, 2000);
       
    } catch (error) {
        console.error('❌ Save error:', error);
       
        // Even if fetch throws error, data might still be saved
        // Check your sheet anyway!
        todayCount++;
        totalCount++;
        updateCounters();
       
        showStatus('⚠️ Request sent (check sheet)', 'success');
        setTimeout(resetCapture, 2000);
    }
}


// ==========================================
// RESET CAPTURE
// ==========================================
function resetCapture() {
    capturedImage.style.display = 'none';
    video.style.display = 'block';
    captureBtn.style.display = 'block';
    retryBtn.style.display = 'none';
    saveBtn.disabled = true;
    extractedInfo = null;
    progressContainer.style.display = 'none';
    extractedDataDiv.innerHTML = `
        <p style="text-align:center;color:#999;padding:40px;">
        Captured data will appear here...
        </p>`;
    showStatus('✅ Ready for next scan', 'success');
}


// ==========================================
// HELPER FUNCTIONS
// ==========================================
function showStatus(msg, type) {
    statusDiv.textContent = msg;
    statusDiv.className = 'status ' + type;
}


function updateCounters() {
    document.getElementById('todayCount').textContent = todayCount;
    document.getElementById('totalCount').textContent = totalCount;
}


// ==========================================
// EVENT LISTENERS
// ==========================================
console.log('Setting up event listeners...');


captureBtn.addEventListener('click', function() {
    console.log('Capture button clicked!');
    captureImage();
});


retryBtn.addEventListener('click', function() {
    console.log('Retry button clicked!');
    resetCapture();
});


saveBtn.addEventListener('click', function() {
    console.log('Save button clicked!');
    saveToSheets();
});




// ==========================================
// INITIALIZE
// ==========================================
console.log('ID Scanner initialized with Tesseract.js');
console.log('Config:', CONFIG);


// Wait for page to fully load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCamera);
} else {
    initCamera();
}
async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: "environment" },
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });

        video.srcObject = stream;
        await video.play();

        console.log("Camera started");
    } catch (err) {
        console.error("Camera error:", err);
        alert("Camera access denied. Please allow camera permission.");
    }
}

