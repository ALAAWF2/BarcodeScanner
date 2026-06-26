/**
 * كود الربط البرمجي لـ Google Apps Script
 * ----------------------------------------------------
 * هذا الكود يوضع في محرر النصوص البرمجية الخاص بجوجل شيت الخاص بالعميل.
 * يقوم بتحويل جوجل شيت إلى API سريع يستقبل الطلبات من تطبيق الجوال ويقوم بالتحديث فوراً.
 * 
 * طريقة التركيب للعميل (بالخطوات التفصيلية):
 * 1. افتح جدول بيانات Google Sheet الخاص بك.
 * 2. تأكد من أن الصف الأول يحتوي على الأعمدة التالية:
 *    - العمود A: الباركود (Barcode)
 *    - العمود B: اسم المنتج (Name)
 *    - العمود C: الكمية الدفترية (Book Qty)
 *    - العمود D: الكمية الفعلية (Actual Qty)
 *    - العمود E: الحالة (Status)
 *    - العمود F: تاريخ التحديث (Last Updated)
 * 3. من القائمة العلوية، اضغط على "Extensions" (الإضافات) ثم اختر "Apps Script".
 * 4. احذف أي كود موجود في المحرر، والصق هذا الكود بالكامل.
 * 5. **مهم:** غيّر قيمة SECRET_TOKEN في السطر أدناه إلى أي رمز تختاره.
 *    ثم ضع نفس الرمز في إعدادات التطبيق (حقل Token).
 * 6. اضغط على زر حفظ (أيقونة القرص المرن 💾).
 * 7. اضغط على زر "Deploy" (نشر) في الأعلى ثم اختر "New deployment" (نشر جديد).
 * 8. اضغط على أيقونة الترس (⚙️) واختر "Web app" (تطبيق ويب).
 * 9. قم بضبط الخيارات التالية بدقة:
 *    - Description: اكتب "Inventory API"
 *    - Execute as: اختر "Me" (حسابك الشخصي في جوجل)
 *    - Who has access: اختر "Anyone" (أي شخص)
 * 10. اضغط على زر "Deploy". قد يطلب منك جوجل منح الصلاحيات، وافق عليها.
 * 11. بعد انتهاء النشر، سيظهر لك رابط طويل ينتهي بـ `/exec`. قم بنسخه ولصقه في إعدادات التطبيق!
 */

// 🔒 ضع هنا رمز سري تختاره — يجب أن يطابق الرمز في إعدادات التطبيق
var SECRET_TOKEN = "CHANGE_ME_TO_A_SECRET";

function doGet(e) {
  var action = e.parameter.action;
  var token = e.parameter.token || "";
  
  // Verify token for all requests
  if (token !== SECRET_TOKEN) {
    return createJsonResponse({ success: false, message: "رمز الحماية غير صحيح" });
  }
  
  // فتح الملف النشط
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  if (action === 'get') {
    return queryBarcode(sheet, e.parameter.barcode);
  } 
  else if (action === 'update') {
    return updateQuantity(sheet, e.parameter.barcode, e.parameter.qty);
  }
  else if (action === 'add') {
    return addNewProduct(sheet, e.parameter.barcode, e.parameter.name);
  }
  else if (action === 'all') {
    return getAllProducts(sheet);
  }
  else if (action === 'bulkUpdate') {
    return bulkUpdate(sheet);
  }
  
  return createJsonResponse({ success: false, message: "أمر غير صالح أو مفقود" });
}

/**
 * Handle POST requests for bulk update
 * The body should be a JSON array of { barcode, name, qty } objects
 */
function doPost(e) {
  var token = e.parameter.token || "";
  
  if (token !== SECRET_TOKEN) {
    return createJsonResponse({ success: false, message: "رمز الحماية غير صحيح" });
  }
  
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var action = e.parameter.action;
  
  if (action === 'bulkUpdate') {
    return bulkUpdate(sheet, e.postData ? e.postData.contents : "");
  }
  
  return createJsonResponse({ success: false, message: "أمر غير صالح" });
}

// 1. البحث عن منتج بالباركود
function queryBarcode(sheet, barcode) {
  if (!barcode) {
    return createJsonResponse({ success: false, message: "الباركود مطلوب" });
  }
  
  var data = sheet.getDataRange().getDisplayValues();
  
  // البحث في العمود الأول (الباركود)
  for (var i = 1; i < data.length; i++) {
    var sheetBarcode = String(data[i][0]).trim();
    if (sheetBarcode === String(barcode).trim()) {
      return createJsonResponse({
        success: true,
        row: i + 1,
        barcode: sheetBarcode,
        name: data[i][1],
        bookQty: data[i][2],
        actualQty: data[i][3] === "" ? null : data[i][3],
        status: data[i][4] || "pending"
      });
    }
  }
  
  return createJsonResponse({ success: false, message: "not_found" });
}

// 2. تحديث الكمية الفعلية وتغيير الحالة
function updateQuantity(sheet, barcode, qty) {
  if (!barcode || qty === undefined) {
    return createJsonResponse({ success: false, message: "الباركود والكمية مطلوبان" });
  }
  
  var data = sheet.getDataRange().getDisplayValues();
  
  for (var i = 1; i < data.length; i++) {
    var sheetBarcode = String(data[i][0]).trim();
    if (sheetBarcode === String(barcode).trim()) {
      var rowNum = i + 1;
      
      sheet.getRange(rowNum, 4).setValue(Number(qty));
      sheet.getRange(rowNum, 5).setValue("checked");
      sheet.getRange(rowNum, 6).setValue(new Date());
      
      return createJsonResponse({ success: true, message: "تم تحديث الكمية بنجاح" });
    }
  }
  
  return createJsonResponse({ success: false, message: "المنتج غير موجود لتعديل كميته" });
}

// 3. إضافة منتج جديد للجدول مباشرة
function addNewProduct(sheet, barcode, name) {
  if (!barcode || !name) {
    return createJsonResponse({ success: false, message: "الباركود والاسم مطلوبان" });
  }
  
  var data = sheet.getDataRange().getDisplayValues();
  
  // التأكد أولاً من عدم تكراره
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(barcode).trim()) {
      return createJsonResponse({ success: false, message: "المنتج مضاف مسبقاً" });
    }
  }
  
  sheet.appendRow([
    "'" + String(barcode).trim(),
    name,
    0,
    "",
    "pending",
    new Date()
  ]);
  
  return createJsonResponse({ success: true, message: "تمت إضافة المنتج الجديد للجدول" });
}

// 4. جلب جميع المنتجات في الشيت
function getAllProducts(sheet) {
  var data = sheet.getDataRange().getDisplayValues();
  var productsList = [];
  
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === "") continue;
    productsList.push({
      barcode: String(data[i][0]).trim(),
      name: data[i][1],
      bookQty: data[i][2],
      actualQty: data[i][3] === "" ? null : data[i][3],
      status: data[i][4] || "pending"
    });
  }
  
  return createJsonResponse({ success: true, products: productsList });
}

// 5. Bulk Update — تحديث عدة منتجات دفعة واحدة
function bulkUpdate(sheet, postData) {
  var items;
  
  try {
    items = JSON.parse(postData || "[]");
  } catch (e) {
    return createJsonResponse({ success: false, message: "بيانات غير صالحة" });
  }
  
  if (!items || items.length === 0) {
    return createJsonResponse({ success: false, message: "قائمة فارغة" });
  }
  
  var data = sheet.getDataRange().getDisplayValues();
  var updated = 0;
  var added = 0;
  
  items.forEach(function(item) {
    var found = false;
    
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(item.barcode).trim()) {
        var rowNum = i + 1;
        sheet.getRange(rowNum, 4).setValue(Number(item.qty));
        sheet.getRange(rowNum, 5).setValue("checked");
        sheet.getRange(rowNum, 6).setValue(new Date());
        updated++;
        found = true;
        break;
      }
    }
    
    if (!found && item.name) {
      sheet.appendRow([
        "'" + String(item.barcode).trim(),
        item.name,
        0,
        Number(item.qty),
        "checked",
        new Date()
      ]);
      added++;
    }
  });
  
  return createJsonResponse({ 
    success: true, 
    message: "تم تحديث " + updated + " منتج وإضافة " + added + " منتج جديد",
    updated: updated,
    added: added
  });
}

// دالة مساعدة لإنشاء رد بصيغة JSON
function createJsonResponse(data) {
  var JSONString = JSON.stringify(data);
  return ContentService.createTextOutput(JSONString)
    .setMimeType(ContentService.MimeType.JSON);
}
