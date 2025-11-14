// ==========================================
// CONFIGURATION
// ==========================================
const CONFIG = {
    // Google Sheets (for saving data - optional for now)
    SPREADSHEET_ID: "1PUW7gL4eSOHbWwqRupmU6sS9G1CjoHyoS9ZM6-hH8p4",
    APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxm-DGZaTGP-fOj7zmTbCwBGIQZ_SAqi1Wk6mzI-a4Nqn36M0p0VuCBCL99qVX6kO2qSw/exec", // Add Google Apps Script URL when ready
    
    // OCR Settings
    USE_DEMO_MODE: false, // Set to true to test with dummy data
    OCR_LANGUAGE: 'eng', // English text
    
    // ImgBB API Key for photo upload
    IMGBB_API_KEY: "4696d2678ce1b24a9d1d9fe1d940e9cc",

    // Image preprocessing
    ENHANCE_IMAGE: true // Improves OCR accuracy
};