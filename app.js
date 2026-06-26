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
let isProcessingScan = false;
let batchMode = false;
let batchQueue = [];
let searchFilter = "";

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
    loadData();
    renderSheet();
    updateStats();
    updateProgress();
    updateSummaryStats();
    setupEventListeners();
    registerServiceWorker();
    loadDarkModePreference();
});

// Load Data from LocalStorage or use Defaults
function loadData() {
    const savedProducts = localStorage.getItem("inventory_products");
    const savedLogs = localStorage.getItem("inventory_logs");
    const savedBatch = localStorage.getItem("inventory_batch_queue");
    
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

    if (savedBatch) {
        batchQueue = JSON.parse(savedBatch);
        if (batchQueue.length > 0) {
            updateBatchUI();
        }
    }

    // Load Settings — NO default URL hardcoded for security
    const savedUrl = localStorage.getItem("google_app_url") || "";
    const savedToken = localStorage.getItem("api_token") || "";
    const savedLiveSync = localStorage.getItem("google_live_sync") !== null ? localStorage.getItem("google_live_sync") : "false";
    
    document.getElementById("web-app-url").value = savedUrl;
    document.getElementById("api-token").value = savedToken;
    
    if (savedLiveSync === "true" && savedUrl) {
        document.getElementById("enable-live-sync").checked = true;
        updateConnectionBadge(true);
        fetchLiveProducts();
    } else {
        updateConnectionBadge(false);
    }
}

// Save Data to LocalStorage
function saveToLocalStorage() {
    localStorage.setItem("inventory_products", JSON.stringify(products));
    localStorage.setItem("inventory_logs", JSON.stringify(logs));
}

// Save batch queue
function saveBatchQueue() {
    localStorage.setItem("inventory_batch_queue", JSON.stringify(batchQueue));
}

// Fetch all products from Google Sheets
async function fetchLiveProducts() {
    const isLive = document.getElementById("enable-live-sync").checked;
    const url = document.getElementById("web-app-url").value.trim();
    const token = document.getElementById("api-token").value.trim();
    
    if (!isLive || !url) return;
    
    const tableBody = document.getElementById("sheet-table-body");
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--primary);">⏱️ جاري تحميل البيانات من جوجل شيت الحقيقي...</td></tr>`;
    
    try {
        let fetchUrl = `${url}?action=all`;
        if (token) fetchUrl += `&token=${encodeURIComponent(token)}`;
        const response = await fetch(fetchUrl);
        const data = await response.json();
        
        if (data.success && data.products) {
            products = data.products;
            renderSheet();
            updateStats();
            updateProgress();
            updateSummaryStats();
            showNotification("تم تحديث قائمة المنتجات من جوجل شيت", "success");
        } else {
            showNotification("خطأ في جلب بيانات جوجل شيت", "error");
            loadFallbackMockData();
        }
    } catch (error) {
        console.error("Live products fetch error:", error);
        showNotification("تعذر الاتصال بجوجل شيت لجلب المنتجات", "error");
        loadFallbackMockData();
    }
}

function loadFallbackMockData() {
    const savedProducts = localStorage.getItem("inventory_products");
    products = savedProducts ? JSON.parse(savedProducts) : JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));
    renderSheet();
    updateStats();
    updateProgress();
    updateSummaryStats();
}

// Render Simulator Google Sheet Table
function renderSheet() {
    const tableBody = document.getElementById("sheet-table-body");
    tableBody.innerHTML = "";
    
    const filteredProducts = products.filter(p => {
        if (!searchFilter) return true;
        const q = searchFilter.toLowerCase();
        return p.barcode.toLowerCase().includes(q) || p.name.toLowerCase().includes(q);
    });
    
    if (filteredProducts.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">لا توجد نتائج مطابقة للبحث</td></tr>`;
        return;
    }
    
    filteredProducts.forEach(p => {
        const tr = document.createElement("tr");
        
        const statusClass = p.status === "checked" ? "status-checked" : "status-pending";
        const statusText = p.status === "checked" ? "تم الجرد" : "معلق";
        const actualQtyText = p.actualQty !== null ? p.actualQty : "-";
        const diff = (p.actualQty !== null && p.bookQty !== null) ? (parseInt(p.actualQty) - parseInt(p.bookQty)) : null;
        let diffText = "-";
        let diffColor = "inherit";
        if (diff !== null) {
            diffText = diff > 0 ? `+${diff}` : `${diff}`;
            diffColor = diff === 0 ? "var(--accent-green)" : (diff < 0 ? "var(--accent-red)" : "var(--accent-green)");
        }
        
        tr.innerHTML = `
            <td class="code-cell">${p.barcode}</td>
            <td><strong>${p.name}</strong></td>
            <td>${p.bookQty}</td>
            <td style="font-weight: 700; color: ${p.actualQty !== null ? 'var(--accent-green)' : 'inherit'}">${actualQtyText}</td>
            <td style="font-weight: 700; color: ${diffColor}">${diffText}</td>
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
    
    // Render top 10 logs
    logs.slice(-10).reverse().forEach(log => {
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

// Update Progress Bar
function updateProgress() {
    const checkedCount = products.filter(p => p.status === "checked").length;
    const total = products.length;
    const percent = total > 0 ? Math.round((checkedCount / total) * 100) : 0;
    
    document.getElementById("progress-percent").innerText = `${percent}%`;
    document.getElementById("progress-bar-fill").style.width = `${percent}%`;
}

// Update Summary Stats (dashboard cards)
function updateSummaryStats() {
    const total = products.length;
    const checked = products.filter(p => p.status === "checked").length;
    const pending = total - checked;
    let discrepancies = 0;
    
    products.forEach(p => {
        if (p.actualQty !== null && p.bookQty !== null) {
            if (parseInt(p.actualQty) !== parseInt(p.bookQty)) {
                discrepancies++;
            }
        }
    });
    
    document.getElementById("summary-total").innerText = total;
    document.getElementById("summary-checked").innerText = checked;
    document.getElementById("summary-pending").innerText = pending;
    document.getElementById("summary-discrepancy").innerText = discrepancies;
}

// Update Connection status badge
function updateConnectionBadge(isLive) {
    const badge = document.getElementById("connection-status");
    const badgeDot = document.querySelector(".badge-dot");
    const mobSub = document.getElementById("app-connection-indicator");
    
    if (isLive) {
        badge.innerText = "متصل بجوجل شيت الحقيقي مباشر";
        badge.style.color = "#60a5fa";
        badgeDot.style.backgroundColor = "#3b82f6";
        badgeDot.style.boxShadow = "0 0 8px #3b82f6";
        if (mobSub) {
            mobSub.innerHTML = '🟢 شيت جوجل متصل';
            mobSub.style.color = '#10b981';
        }
    } else {
        badge.innerText = "وضع محاكاة البيانات النشط";
        badge.style.color = "var(--accent-green)";
        badgeDot.style.backgroundColor = "var(--accent-green)";
        badgeDot.style.boxShadow = "0 0 8px var(--accent-green)";
        if (mobSub) {
            mobSub.innerHTML = '⚪ وضع المحاكاة المحلي';
            mobSub.style.color = '#64748b';
        }
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Scan Toggle Button
    document.getElementById("btn-toggle-scan").addEventListener("click", toggleScanner);
    
    // Batch Mode Toggle
    document.getElementById("btn-toggle-batch").addEventListener("click", toggleBatchMode);
    
    // Batch Upload Button
    document.getElementById("btn-batch-upload").addEventListener("click", uploadBatchQueue);
    
    // Dark Mode Toggle
    document.getElementById("btn-dark-mode").addEventListener("click", toggleDarkMode);
    
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
        isProcessingScan = false;
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
            batchQueue = [];
            saveToLocalStorage();
            saveBatchQueue();
            renderSheet();
            renderLogs();
            updateStats();
            updateProgress();
            updateSummaryStats();
            updateBatchUI();
            document.getElementById("product-details-card").style.display = "none";
            document.getElementById("new-product-card").style.display = "none";
            document.getElementById("scanner-section").style.display = "flex";
            currentlyScannedProduct = null;
            showNotification("تمت إعادة ضبط البيانات بنجاح", "success");
        }
    });

    // Clear Logs
    document.getElementById("btn-clear-logs").addEventListener("click", () => {
        if (logs.length === 0) return;
        logs = [];
        saveToLocalStorage();
        renderLogs();
        showNotification("تم مسح سجل العمليات", "info");
    });

    // Export CSV
    document.getElementById("btn-export-csv").addEventListener("click", exportCSV);

    // Search Filter
    document.getElementById("search-input").addEventListener("input", (e) => {
        searchFilter = e.target.value.trim();
        renderSheet();
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
        
        if (isChecked) {
            fetchLiveProducts();
        } else {
            loadFallbackMockData();
        }
    });

    document.getElementById("web-app-url").addEventListener("input", (e) => {
        localStorage.setItem("google_app_url", e.target.value.trim());
    });

    document.getElementById("api-token").addEventListener("input", (e) => {
        localStorage.setItem("api_token", e.target.value.trim());
    });

    // Inline New Product Form
    document.getElementById("btn-confirm-new-product").addEventListener("click", handleConfirmNewProduct);
    document.getElementById("btn-cancel-new-product").addEventListener("click", () => {
        document.getElementById("new-product-card").style.display = "none";
        document.getElementById("scanner-section").style.display = "flex";
        isProcessingScan = false;
        if (batchMode) {
            // Resume scanning in batch mode
        }
    });
    document.getElementById("new-product-name").addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            handleConfirmNewProduct();
        }
    });
}

// Synthesizer POS Beep — Success
function playBeep(type = "success") {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        if (type === "error") {
            // Low double-beep for errors / not found
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.1);
            // Second beep
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(350, audioCtx.currentTime + 0.12);
            gain2.gain.setValueAtTime(0.08, audioCtx.currentTime + 0.12);
            gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
            osc2.start(audioCtx.currentTime + 0.12);
            osc2.stop(audioCtx.currentTime + 0.22);
        } else {
            // High pitch beep for success
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.12);
        }
    } catch (e) {
        console.warn("Audio Context not allowed or supported", e);
    }
}

// Trigger Mobile Vibration
function triggerVibrate(pattern = 100) {
    if (navigator.vibrate) {
        navigator.vibrate(pattern);
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
    banner.style.backgroundColor = document.body.classList.contains("dark-mode") ? "#1e293b" : "#1e293b";
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
    if (isProcessingScan && !batchMode) return;
    
    playBeep("success");
    triggerVibrate(100);
    
    // Visual flash
    const indicator = document.getElementById("scan-success-indicator");
    indicator.classList.add("active");
    setTimeout(() => indicator.classList.remove("active"), 400);
    
    document.getElementById("app-last-scan").innerText = barcode;
    
    const isLive = document.getElementById("enable-live-sync").checked;
    const url = document.getElementById("web-app-url").value.trim();
    
    // In batch mode: don't stop scanning, just queue the product
    if (batchMode) {
        handleBatchScan(barcode);
        return;
    }
    
    // Stop scanning to display product (normal mode)
    if (isScanning) {
        stopScanning();
    }
    
    isProcessingScan = true;
    
    if (isLive && url) {
        queryLiveProduct(barcode);
    } else {
        queryMockProduct(barcode);
    }
}

// Batch Mode: Handle scan in batch
function handleBatchScan(barcode) {
    // Check if already in queue
    const existingIdx = batchQueue.findIndex(item => item.barcode === barcode);
    
    if (existingIdx !== -1) {
        // Already scanned before — increment quantity
        batchQueue[existingIdx].qty += 1;
        showNotification(`تم زيادة كمية: ${batchQueue[existingIdx].name} (${batchQueue[existingIdx].qty})`, "info");
    } else {
        // Find product in local list
        const product = products.find(p => p.barcode === barcode);
        if (product) {
            batchQueue.push({
                barcode: barcode,
                name: product.name,
                qty: 1,
                bookQty: product.bookQty
            });
            showNotification(`أضيف للقائمة: ${product.name}`, "success");
        } else {
            // New product
            batchQueue.push({
                barcode: barcode,
                name: `منتج جديد (${barcode.slice(-4)})`,
                qty: 1,
                bookQty: 0
            });
            showNotification(`منتج جديد أضيف للقائمة: ${barcode.slice(-4)}`, "info");
        }
    }
    
    saveBatchQueue();
    updateBatchUI();
}

// Update batch UI
function updateBatchUI() {
    const batchBox = document.getElementById("batch-mode-box");
    const batchCount = document.getElementById("batch-count");
    
    if (batchQueue.length > 0) {
        batchBox.style.display = "flex";
        batchCount.innerText = batchQueue.length;
    } else {
        batchBox.style.display = "none";
    }
}

// Toggle Batch Mode
function toggleBatchMode() {
    batchMode = !batchMode;
    const btn = document.getElementById("btn-toggle-batch");
    
    if (batchMode) {
        btn.classList.add("btn-active-batch");
        showNotification("وضع المسح المتتابع مفعّل — امسح بدون توقف، ارفع لاحقاً", "info");
        // Auto-start scanner if not already scanning
        if (!isScanning) {
            startScanning();
        }
    } else {
        btn.classList.remove("btn-active-batch");
        showNotification("وضع المسح المتتابع متوقف", "info");
    }
}

// Upload Batch Queue
async function uploadBatchQueue() {
    if (batchQueue.length === 0) {
        showNotification("قائمة المسح المتتابع فارغة", "error");
        return;
    }
    
    const isLive = document.getElementById("enable-live-sync").checked;
    const url = document.getElementById("web-app-url").value.trim();
    const token = document.getElementById("api-token").value.trim();
    
    if (isLive && url) {
        // Live bulk upload
        showNotification(`جاري رفع ${batchQueue.length} عنصر لجوجل شيت...`, "info");
        try {
            const batchData = JSON.stringify(batchQueue.map(item => ({
                barcode: item.barcode,
                name: item.name,
                qty: item.qty
            })));
            
            let uploadUrl = `${url}?action=bulkUpdate`;
            if (token) uploadUrl += `&token=${encodeURIComponent(token)}`;
            
            const response = await fetch(uploadUrl, {
                method: 'POST',
                body: batchData
            });
            const data = await response.json();
            
            if (data.success) {
                // Add logs for each item
                batchQueue.forEach(item => {
                    logs.push({
                        barcode: item.barcode,
                        productName: item.name,
                        oldQty: null,
                        newQty: item.qty,
                        timestamp: new Date().toISOString()
                    });
                });
                
                saveToLocalStorage();
                renderLogs();
                batchQueue = [];
                saveBatchQueue();
                updateBatchUI();
                fetchLiveProducts();
                showNotification(`تم رفع ${batchQueue.length} عنصر بنجاح!`, "success");
            } else {
                showNotification("فشل رفع الدفعة لجوجل شيت", "error");
            }
        } catch (error) {
            console.error("Batch upload error:", error);
            showNotification("خطأ في رفع الدفعة", "error");
        }
    } else {
        // Mock batch update
        batchQueue.forEach(item => {
            const idx = products.findIndex(p => p.barcode === item.barcode);
            if (idx !== -1) {
                products[idx].actualQty = item.qty;
                products[idx].status = "checked";
            } else {
                products.push({
                    barcode: item.barcode,
                    name: item.name,
                    bookQty: 0,
                    actualQty: item.qty,
                    status: "checked"
                });
            }
            
            logs.push({
                barcode: item.barcode,
                productName: item.name,
                oldQty: null,
                newQty: item.qty,
                timestamp: new Date().toISOString()
            });
        });
        
        saveToLocalStorage();
        renderSheet();
        renderLogs();
        updateStats();
        updateProgress();
        updateSummaryStats();
        
        batchQueue = [];
        saveBatchQueue();
        updateBatchUI();
        
        showNotification(`تم حفظ ${batchQueue.length} عنصر محلياً (المحاكاة)`, "success");
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
        // Product not found in local sheet — show inline new product form
        showNewProductCard(barcode);
        playBeep("error");
        triggerVibrate(200);
    }
}

// Google Sheets Live Query
async function queryLiveProduct(barcode) {
    const url = document.getElementById("web-app-url").value.trim();
    const token = document.getElementById("api-token").value.trim();
    showNotification("جاري البحث في جوجل شيت...", "info");
    
    try {
        let fetchUrl = `${url}?action=get&barcode=${encodeURIComponent(barcode)}`;
        if (token) fetchUrl += `&token=${encodeURIComponent(token)}`;
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
            // Show inline new product form instead of prompt
            showNewProductCard(barcode);
            playBeep("error");
            triggerVibrate(200);
        }
    } catch (error) {
        console.error("Fetch error:", error);
        showNotification("فشل الاتصال بجوجل شيت. تحقق من الرابط وصلاحيات النشر.", "error");
        // Fallback to local
        queryMockProduct(barcode);
    }
}

// Show inline new product form
function showNewProductCard(barcode) {
    document.getElementById("scanner-section").style.display = "none";
    document.getElementById("product-details-card").style.display = "none";
    document.getElementById("new-product-card").style.display = "flex";
    document.getElementById("new-product-barcode").innerText = `رمز الباركود: ${barcode}`;
    document.getElementById("new-product-name").value = "";
    document.getElementById("new-product-name").focus();
}

// Handle confirm new product
function handleConfirmNewProduct() {
    const name = document.getElementById("new-product-name").value.trim();
    if (!name) {
        showNotification("يرجى إدخال اسم المنتج", "error");
        return;
    }
    
    // Get barcode from the displayed text
    const barcodeText = document.getElementById("new-product-barcode").innerText;
    const barcode = barcodeText.replace("رمز الباركود: ", "");
    
    const isLive = document.getElementById("enable-live-sync").checked;
    const url = document.getElementById("web-app-url").value.trim();
    
    if (isLive && url) {
        addNewProductToLive(barcode, name);
    } else {
        // Mock add
        const newProduct = {
            barcode: barcode,
            name: name,
            bookQty: 0,
            actualQty: null,
            status: "pending"
        };
        products.push(newProduct);
        saveToLocalStorage();
        currentlyScannedProduct = newProduct;
        renderSheet();
        
        document.getElementById("new-product-card").style.display = "none";
        document.getElementById("scanner-section").style.display = "flex";
        isProcessingScan = false;
        
        showNotification("تمت إضافة المنتج الجديد", "success");
    }
}

async function addNewProductToLive(barcode, name) {
    const url = document.getElementById("web-app-url").value.trim();
    const token = document.getElementById("api-token").value.trim();
    showNotification("جاري إضافة المنتج الجديد للشيت...", "info");
    
    try {
        let fetchUrl = `${url}?action=add&barcode=${encodeURIComponent(barcode)}&name=${encodeURIComponent(name)}`;
        if (token) fetchUrl += `&token=${encodeURIComponent(token)}`;
        const response = await fetch(fetchUrl);
        const data = await response.json();
        
        if (data.success) {
            showNotification("تمت إضافة المنتج بنجاح", "success");
            
            currentlyScannedProduct = {
                barcode: barcode,
                name: name,
                bookQty: 0,
                actualQty: null,
                status: "pending"
            };
            
            let localIdx = products.findIndex(p => p.barcode === barcode);
            if (localIdx !== -1) {
                products[localIdx] = currentlyScannedProduct;
            } else {
                products.push(currentlyScannedProduct);
            }
            saveToLocalStorage();
            renderSheet();
            
            document.getElementById("new-product-card").style.display = "none";
            document.getElementById("scanner-section").style.display = "flex";
            isProcessingScan = false;
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
    const token = document.getElementById("api-token").value.trim();
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
            let updateUrl = `${url}?action=update&barcode=${encodeURIComponent(barcode)}&qty=${newQty}`;
            if (token) updateUrl += `&token=${encodeURIComponent(token)}`;
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
                renderLogs();
                fetchLiveProducts();
                
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
            updateProgress();
            updateSummaryStats();
            
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
    document.getElementById("new-product-card").style.display = "none";
    document.getElementById("scanner-section").style.display = "flex";
    currentlyScannedProduct = null;
    isProcessingScan = false;
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

// Dark Mode
function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    const icon = document.getElementById("dark-mode-icon");
    
    if (isDark) {
        icon.className = "bi bi-sun-fill";
        localStorage.setItem("dark_mode", "true");
    } else {
        icon.className = "bi bi-moon-stars-fill";
        localStorage.setItem("dark_mode", "false");
    }
}

function loadDarkModePreference() {
    const isDark = localStorage.getItem("dark_mode") === "true";
    if (isDark) {
        document.body.classList.add("dark-mode");
        document.getElementById("dark-mode-icon").className = "bi bi-sun-fill";
    }
}

// Export CSV
function exportCSV() {
    let csv = "\uFEFF"; // BOM for Arabic support in Excel
    csv += "الباركود,اسم المنتج,الكمية الدفترية,الكمية الفعلية,الفرق,الحالة\n";
    
    products.forEach(p => {
        const actualQty = p.actualQty !== null ? p.actualQty : "";
        const diff = (p.actualQty !== null && p.bookQty !== null) ? (parseInt(p.actualQty) - parseInt(p.bookQty)) : "";
        const status = p.status === "checked" ? "تم الجرد" : "معلق";
        
        // Escape commas in names
        const safeName = p.name.includes(",") ? `"${p.name}"` : p.name;
        
        csv += `${p.barcode},${safeName},${p.bookQty},${actualQty},${diff},${status}\n`;
    });
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `inventory_report_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification("تم تصدير التقرير بصيغة CSV", "success");
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
