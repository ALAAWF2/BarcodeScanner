// Mock Database (قاعدة بيانات افتراضية للمحاكاة)
const DEFAULT_PRODUCTS = [
    { barcode: "6281000000123", name: "عصير برتقال طبيعي المراعي 1 لتر", bookQty: 45, actualQty: null, status: "pending" },
    { barcode: "6281000000456", name: "حليب المراعي كامل الدسم 2 لتر", bookQty: 30, actualQty: null, status: "pending" },
    { barcode: "012000046450", name: "بيبسي علبة 320 مل", bookQty: 120, actualQty: null, status: "pending" },
    { barcode: "7622210406085", name: "بسكويت أوريو الأصلي 16 حبة", bookQty: 85, actualQty: null, status: "pending" },
    { barcode: "6281101530550", name: "مياه نوفا معدنية 500 مل", bookQty: 250, actualQty: null, status: "pending" }
];

let products = [];
let logs = [];
let html5QrcodeScanner = null;
let isScanning = false;
let currentlyScannedProduct = null;

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
    loadData();
    renderSheet();
    updateStats();
    setupEventListeners();
    registerServiceWorker();
});

// Load Data from LocalStorage or use Defaults
function loadData() {
    const savedProducts = localStorage.getItem("inventory_products");
    const savedLogs = localStorage.getItem("inventory_logs");
    
    if (savedProducts) {
        products = JSON.parse(savedProducts);
    } else {
        products = JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));
        saveToLocalStorage();
    }
    
    if (savedLogs) {
        logs = JSON.parse(savedLogs);
        renderLogs();
    }

    // Load Settings
    const defaultUrl = "https://script.google.com/macros/s/AKfycbxZPsBBfIef7zOaw88gaXajYNjVk0EvKmUwgar3RlxWxlAXmWvyGY88L2OTkYgYTVowKw/exec";
    const savedUrl = localStorage.getItem("google_app_url") || defaultUrl;
    const savedLiveSync = localStorage.getItem("google_live_sync") !== null ? localStorage.getItem("google_live_sync") : "true";
    
    document.getElementById("web-app-url").value = savedUrl;
    if (!localStorage.getItem("google_app_url")) {
        localStorage.setItem("google_app_url", defaultUrl);
    }
    
    if (savedLiveSync === "true") {
        document.getElementById("enable-live-sync").checked = true;
        updateConnectionBadge(true);
    } else {
        updateConnectionBadge(false);
    }
}

// Save Data to LocalStorage
function saveToLocalStorage() {
    localStorage.setItem("inventory_products", JSON.stringify(products));
    localStorage.setItem("inventory_logs", JSON.stringify(logs));
}

// Render Simulator Google Sheet Table
function renderSheet() {
    const tableBody = document.getElementById("sheet-table-body");
    tableBody.innerHTML = "";
    
    products.forEach(p => {
        const tr = document.createElement("tr");
        
        const statusClass = p.status === "checked" ? "status-checked" : "status-pending";
        const statusText = p.status === "checked" ? "تم الجرد" : "معلق";
        const actualQtyText = p.actualQty !== null ? p.actualQty : "-";
        
        tr.innerHTML = `
            <td class="code-cell">${p.barcode}</td>
            <td><strong>${p.name}</strong></td>
            <td>${p.bookQty}</td>
            <td style="font-weight: 700; color: ${p.actualQty !== null ? 'var(--accent-green)' : 'inherit'}">${actualQtyText}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        `;
        
        // Highlight row if currently selected/scanned
        if (currentlyScannedProduct && currentlyScannedProduct.barcode === p.barcode) {
            tr.style.backgroundColor = "rgba(99, 102, 241, 0.1)";
            tr.style.borderRight = "4px solid var(--primary)";
        }
        
        tableBody.appendChild(tr);
    });
}

// Render Recent Logs
function renderLogs() {
    const logList = document.getElementById("log-list");
    const emptyMsg = document.getElementById("empty-logs-msg");
    
    // Remove all logs first, keeping the placeholder if empty
    const logItems = logList.querySelectorAll(".log-item");
    logItems.forEach(item => item.remove());
    
    if (logs.length === 0) {
        emptyMsg.style.display = "block";
        return;
    }
    
    emptyMsg.style.display = "none";
    
    // Render top 5 logs
    logs.slice(-5).reverse().forEach(log => {
        const item = document.createElement("div");
        item.className = "log-item";
        
        const timeFormatted = new Date(log.timestamp).toLocaleTimeString("ar-SA", {hour: '2-digit', minute:'2-digit', second:'2-digit'});
        
        item.innerHTML = `
            <div class="log-info">
                <span class="log-title">${log.productName}</span>
                <span class="log-time">${timeFormatted} - باركود: ${log.barcode}</span>
            </div>
            <div class="log-changes">
                <span class="log-old-val">${log.oldQty !== null ? log.oldQty : '0'}</span>
                <span class="log-arrow"><i class="bi bi-arrow-left-short"></i></span>
                <span class="log-new-val">${log.newQty}</span>
            </div>
        `;
        logList.appendChild(item);
    });
}

// Update App Header stats
function updateStats() {
    const checkedCount = products.filter(p => p.status === "checked").length;
    document.getElementById("app-checked-count").innerText = `${checkedCount} / ${products.length}`;
}

// Update Connection status badge
function updateConnectionBadge(isLive) {
    const badge = document.getElementById("connection-status");
    const badgeDot = document.querySelector(".badge-dot");
    
    if (isLive) {
        badge.innerText = "متصل بجوجل شيت الحقيقي مباشر";
        badge.style.color = "#60a5fa";
        badgeDot.style.backgroundColor = "#3b82f6";
        badgeDot.style.boxShadow = "0 0 8px #3b82f6";
    } else {
        badge.innerText = "وضع محاكاة البيانات النشط";
        badge.style.color = "#a5b4fc";
        badgeDot.style.backgroundColor = "var(--accent-green)";
        badgeDot.style.boxShadow = "0 0 8px var(--accent-green)";
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Scan Toggle Button
    document.getElementById("btn-toggle-scan").addEventListener("click", toggleScanner);
    
    // Settings Toggle
    document.getElementById("settings-toggle").addEventListener("click", () => {
        const settingsCard = document.getElementById("settings-card");
        if (settingsCard.style.display === "none") {
            settingsCard.style.display = "block";
            settingsCard.scrollIntoView({ behavior: 'smooth' });
        } else {
            settingsCard.style.display = "none";
        }
    });

    // Qty plus/minus buttons
    document.getElementById("btn-qty-plus").addEventListener("click", () => {
        const input = document.getElementById("qty-input");
        input.value = parseInt(input.value) + 1;
    });

    document.getElementById("btn-qty-minus").addEventListener("click", () => {
        const input = document.getElementById("qty-input");
        const val = parseInt(input.value);
        if (val > 0) input.value = val - 1;
    });

    // Cancel Qty Update
    document.getElementById("btn-cancel-qty").addEventListener("click", () => {
        document.getElementById("product-details-card").style.display = "none";
        document.getElementById("scanner-section").style.display = "flex";
        currentlyScannedProduct = null;
        renderSheet();
    });

    // Submit Qty Update
    document.getElementById("btn-submit-qty").addEventListener("click", submitQuantity);

    // Manual Barcode Submit
    document.getElementById("btn-manual-submit").addEventListener("click", handleManualBarcode);
    document.getElementById("manual-barcode").addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            handleManualBarcode();
        }
    });

    // Reset Sheet Simulator
    document.getElementById("btn-reset-sheet").addEventListener("click", () => {
        if (confirm("هل أنت متأكد من إعادة ضبط جميع بيانات الجرد والمحاكاة؟")) {
            products = JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));
            logs = [];
            saveToLocalStorage();
            renderSheet();
            renderLogs();
            updateStats();
            document.getElementById("product-details-card").style.display = "none";
            document.getElementById("scanner-section").style.display = "flex";
            currentlyScannedProduct = null;
            showNotification("تمت إعادة ضبط البيانات بنجاح", "success");
        }
    });

    // Live Sync Checkbox & URL changes
    document.getElementById("enable-live-sync").addEventListener("change", (e) => {
        const isChecked = e.target.checked;
        const url = document.getElementById("web-app-url").value.trim();
        
        if (isChecked && !url) {
            alert("يرجى إدخال رابط Google Apps Script أولاً للتفعيل!");
            e.target.checked = false;
            return;
        }
        
        localStorage.setItem("google_live_sync", isChecked ? "true" : "false");
        updateConnectionBadge(isChecked);
        showNotification(isChecked ? "تم تفعيل الربط المباشر بجوجل شيت" : "تم الانتقال لوضع المحاكاة المحلي", "info");
    });

    document.getElementById("web-app-url").addEventListener("input", (e) => {
        localStorage.setItem("google_app_url", e.target.value.trim());
    });
}

// Synthesizer POS Beep
function playBeep() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime); // High pitch beep
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
        
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
        console.warn("Audio Context not allowed or supported", e);
    }
}

// Trigger Mobile Vibration
function triggerVibrate() {
    if (navigator.vibrate) {
        navigator.vibrate(100);
    }
}

// Notification Banner Helper
function showNotification(text, type = "info") {
    let color = "var(--primary)";
    if (type === "success") color = "var(--accent-green)";
    if (type === "error") color = "var(--accent-red)";
    
    // Custom snackbar animation in phone app
    const screen = document.getElementById("phone-screen");
    const banner = document.createElement("div");
    banner.style.position = "absolute";
    banner.style.top = "60px";
    banner.style.left = "15px";
    banner.style.right = "15px";
    banner.style.backgroundColor = "#1e293b";
    banner.style.borderRight = `4px solid ${color}`;
    banner.style.padding = "0.75rem 1rem";
    banner.style.borderRadius = "8px";
    banner.style.boxShadow = "0 10px 15px -3px rgba(0,0,0,0.5)";
    banner.style.fontSize = "0.8rem";
    banner.style.zIndex = "100";
    banner.style.display = "flex";
    banner.style.justifyContent = "space-between";
    banner.style.alignItems = "center";
    banner.style.animation = "slideDown 0.3s forwards";
    banner.innerHTML = `<span>${text}</span> <i class="bi bi-info-circle-fill" style="color: ${color}"></i>`;
    
    screen.appendChild(banner);
    
    setTimeout(() => {
        banner.style.animation = "slideUp 0.3s forwards";
        setTimeout(() => {
            banner.remove();
        }, 300);
    }, 2500);
}

// Handle scanned/found product display
function processBarcode(barcode) {
    playBeep();
    triggerVibrate();
    
    // Visual flash
    const indicator = document.getElementById("scan-success-indicator");
    indicator.classList.add("active");
    setTimeout(() => indicator.classList.remove("active"), 400);

    document.getElementById("app-last-scan").innerText = barcode;
    
    const isLive = document.getElementById("enable-live-sync").checked;
    const url = document.getElementById("web-app-url").value.trim();
    
    // Stop scanning to display product
    if (isScanning) {
        stopScanning();
    }
    
    if (isLive && url) {
        queryLiveProduct(barcode);
    } else {
        queryMockProduct(barcode);
    }
}

// Local Database Query
function queryMockProduct(barcode) {
    const product = products.find(p => p.barcode === barcode);
    
    if (product) {
        currentlyScannedProduct = product;
        renderSheet(); // refresh table highlights
        showProductCard(product.name, product.barcode, product.bookQty, product.actualQty, product.status);
    } else {
        // Product not found in local sheet - offer to create it
        const newProduct = {
            barcode: barcode,
            name: `منتج جديد (رمز: ${barcode.slice(-4)})`,
            bookQty: 0,
            actualQty: null,
            status: "pending"
        };
        products.push(newProduct);
        saveToLocalStorage();
        currentlyScannedProduct = newProduct;
        renderSheet();
        showProductCard(newProduct.name, newProduct.barcode, newProduct.bookQty, newProduct.actualQty, newProduct.status);
        showNotification("منتج جديد غير مسجل، تم إنشاؤه تلقائياً", "info");
    }
}

// Google Sheets Live Query
async function queryLiveProduct(barcode) {
    const url = document.getElementById("web-app-url").value.trim();
    showNotification("جاري البحث في جوجل شيت...", "info");
    
    try {
        const fetchUrl = `${url}?action=get&barcode=${encodeURIComponent(barcode)}`;
        const response = await fetch(fetchUrl);
        const data = await response.json();
        
        if (data.success) {
            currentlyScannedProduct = {
                barcode: barcode,
                name: data.name,
                bookQty: data.bookQty || 0,
                actualQty: data.actualQty || null,
                status: data.status || "pending"
            };
            
            // Sync with local list just for preview display
            let localIdx = products.findIndex(p => p.barcode === barcode);
            if (localIdx !== -1) {
                products[localIdx] = currentlyScannedProduct;
            } else {
                products.push(currentlyScannedProduct);
            }
            saveToLocalStorage();
            renderSheet();
            
            showProductCard(data.name, barcode, data.bookQty, data.actualQty, data.status);
        } else {
            // Create a new product option
            const newName = prompt("المنتج غير موجود في الشيت. أدخل اسم المنتج الجديد لإضافته:");
            if (newName) {
                addNewProductToLive(barcode, newName);
            } else {
                resetToScanMode();
            }
        }
    } catch (error) {
        console.error("Fetch error:", error);
        showNotification("فشل الاتصال بجوجل شيت. تحقق من الرابط وصلاحيات النشر.", "error");
        // Fallback to local
        queryMockProduct(barcode);
    }
}

async function addNewProductToLive(barcode, name) {
    const url = document.getElementById("web-app-url").value.trim();
    showNotification("جاري إضافة المنتج الجديد للشيت...", "info");
    
    try {
        const fetchUrl = `${url}?action=add&barcode=${encodeURIComponent(barcode)}&name=${encodeURIComponent(name)}`;
        const response = await fetch(fetchUrl);
        const data = await response.json();
        
        if (data.success) {
            showNotification("تمت إضافة المنتج بنجاح", "success");
            queryLiveProduct(barcode);
        } else {
            showNotification("فشل إضافة المنتج", "error");
            resetToScanMode();
        }
    } catch (e) {
        showNotification("خطأ في الربط: " + e.message, "error");
        resetToScanMode();
    }
}

// Display product adjustment card
function showProductCard(name, barcode, bookQty, actualQty, status) {
    document.getElementById("det-product-name").innerText = name;
    document.getElementById("det-barcode").innerText = `رمز الباركود: ${barcode}`;
    document.getElementById("det-current-qty").innerText = bookQty;
    
    // Set status badge in card
    const statusBadge = document.getElementById("det-status");
    if (status === "checked") {
        statusBadge.className = "status-badge status-checked";
        statusBadge.innerText = "تم الجرد";
    } else {
        statusBadge.className = "status-badge status-pending";
        statusBadge.innerText = "معلق";
    }

    // Set input value
    const input = document.getElementById("qty-input");
    input.value = actualQty !== null ? actualQty : bookQty; // default to book qty or previous count

    // Switch panels
    document.getElementById("scanner-section").style.display = "none";
    document.getElementById("product-details-card").style.display = "flex";
}

// Submit counted quantity
async function submitQuantity() {
    if (!currentlyScannedProduct) return;
    
    const qtyInput = document.getElementById("qty-input");
    const newQty = parseInt(qtyInput.value);
    
    if (isNaN(newQty) || newQty < 0) {
        alert("يرجى إدخال كمية صحيحة!");
        return;
    }

    const isLive = document.getElementById("enable-live-sync").checked;
    const url = document.getElementById("web-app-url").value.trim();
    const barcode = currentlyScannedProduct.barcode;
    const oldQty = currentlyScannedProduct.actualQty;

    // Show loading spinner/status
    const submitBtn = document.getElementById("btn-submit-qty");
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="bi bi-hourglass-split"></i> جاري الحفظ...`;

    if (isLive && url) {
        // Live Update in Google Sheets
        try {
            const updateUrl = `${url}?action=update&barcode=${encodeURIComponent(barcode)}&qty=${newQty}`;
            const response = await fetch(updateUrl);
            const data = await response.json();
            
            if (data.success) {
                currentlyScannedProduct.actualQty = newQty;
                currentlyScannedProduct.status = "checked";
                
                // update local table cache
                const idx = products.findIndex(p => p.barcode === barcode);
                if (idx !== -1) {
                    products[idx].actualQty = newQty;
                    products[idx].status = "checked";
                }
                
                // Add Log
                logs.push({
                    barcode: barcode,
                    productName: currentlyScannedProduct.name,
                    oldQty: oldQty,
                    newQty: newQty,
                    timestamp: new Date().toISOString()
                });
                
                saveToLocalStorage();
                renderSheet();
                renderLogs();
                updateStats();
                
                showNotification("تم تحديث جوجل شيت بنجاح!", "success");
                resetToScanMode();
            } else {
                showNotification("فشل في تحديث جوجل شيت", "error");
            }
        } catch (error) {
            console.error("Submit error:", error);
            showNotification("خطأ في الاتصال بجوجل شيت لحفظ البيانات", "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    } else {
        // Mock Update
        setTimeout(() => {
            currentlyScannedProduct.actualQty = newQty;
            currentlyScannedProduct.status = "checked";
            
            // Add Log
            logs.push({
                barcode: barcode,
                productName: currentlyScannedProduct.name,
                oldQty: oldQty,
                newQty: newQty,
                timestamp: new Date().toISOString()
            });
            
            saveToLocalStorage();
            renderSheet();
            renderLogs();
            updateStats();
            
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            
            showNotification("تم حفظ التعديل محلياً (المحاكاة)", "success");
            resetToScanMode();
        }, 400); // Simulate network delay
    }
}

// Reset view back to scanning mode
function resetToScanMode() {
    document.getElementById("product-details-card").style.display = "none";
    document.getElementById("scanner-section").style.display = "flex";
    currentlyScannedProduct = null;
    renderSheet(); // clear highlights
}

// Handle manually typed barcodes
function handleManualBarcode() {
    const input = document.getElementById("manual-barcode");
    const barcode = input.value.trim();
    
    if (!barcode) {
        showNotification("يرجى إدخال رمز باركود صالح", "error");
        return;
    }
    
    input.value = "";
    processBarcode(barcode);
}

// Toggle Camera Scanner State
function toggleScanner() {
    if (isScanning) {
        stopScanning();
    } else {
        startScanning();
    }
}

// Start html5qrcode scanner
function startScanning() {
    const readerDiv = document.getElementById("reader");
    const placeholder = document.getElementById("scan-placeholder");
    const container = document.getElementById("scanner-container");
    const btnText = document.getElementById("scan-btn-text");
    
    placeholder.style.display = "none";
    readerDiv.style.display = "block";
    container.classList.add("scanning");
    
    btnText.innerText = "إيقاف كاميرا المسح";
    isScanning = true;

    html5QrcodeScanner = new Html5Qrcode("reader");
    
    const config = { 
        fps: 15, 
        qrbox: (width, height) => {
            return { width: width * 0.8, height: height * 0.4 }; // Wide for barcode
        },
        aspectRatio: 1.0
    };

    html5QrcodeScanner.start(
        { facingMode: "environment" }, 
        config,
        (decodedText) => {
            // Success callback
            processBarcode(decodedText);
        },
        (errorMessage) => {
            // Verbose error, ignore to avoid spamming console
        }
    ).catch(err => {
        console.error("Camera start failed:", err);
        showNotification("تعذر تشغيل الكاميرا. يرجى التحقق من الصلاحيات", "error");
        stopScanning();
    });
}

// Stop html5qrcode scanner
function stopScanning() {
    const readerDiv = document.getElementById("reader");
    const placeholder = document.getElementById("scan-placeholder");
    const container = document.getElementById("scanner-container");
    const btnText = document.getElementById("scan-btn-text");

    isScanning = false;
    btnText.innerText = "افتح الكاميرا وابدأ المسح";
    container.classList.remove("scanning");
    
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => {
            readerDiv.style.display = "none";
            placeholder.style.display = "flex";
            html5QrcodeScanner = null;
        }).catch(err => {
            console.error("Camera stop error:", err);
            readerDiv.style.display = "none";
            placeholder.style.display = "flex";
            html5QrcodeScanner = null;
        });
    } else {
        readerDiv.style.display = "none";
        placeholder.style.display = "flex";
    }
}

// Register PWA Service Worker for mobile installability
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('Service Worker registered successfully:', reg.scope))
                .catch(err => console.warn('Service Worker registration failed:', err));
        });
    }
}
