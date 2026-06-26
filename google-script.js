/**
 * كود الربط البرمجي لـ Google Apps Script
 * ----------------------------------------------------
 * هذا الكود يوضع في محرر النصوص البرمجية الخاص بجوجل شيت الخاص بالعميل.
 * يقوم بتحويل جوجل شيت إلى API سريع يستقبل الطلبات من تطبيق الجوال ويقوم بالتحديث فوراً.
 * 
 * طريقة التركيب للعميل (بالخطوات التفصيلية):
 * 1. افتح جدول بيانات Google Sheet الخاص بك.
 * 2. تأكد من أن الصف الأول يحتوي على الأعمدة التالية (من اليمين إلى اليسار أو العكس):
 *    - العمود A: الباركود (Barcode)
 *    - العمود B: اسم المنتج (Name)
 *    - العمود C: الكمية الدفترية (Book Qty)
 *    - العمود D: الكمية الفعلية (Actual Qty)
 *    - العمود E: الحالة (Status)
 *    - العمود F: تاريخ التحديث (Last Updated)
 * 3. من القائمة العلوية، اضغط على "Extensions" (الإضافات) ثم اختر "Apps Script".
 * 4. احذف أي كود موجود في المحرر، والصق هذا الكود بالكامل.
 * 5. اضغط على زر حفظ (أيقونة القرص المرن 💾).
 * 6. اضغط على زر "Deploy" (نشر) في الأعلى ثم اختر "New deployment" (نشر جديد).
 * 7. اضغط على أيقونة الترس (⚙️) واختر "Web app" (تطبيق ويب).
 * 8. قم بضبط الخيارات التالية بدقة:
 *    - Description: اكتب "Inventory API"
 *    - Execute as: اختر "Me" (حسابك الشخصي في جوجل)
 *    - Who has access: اختر "Anyone" (أي شخص - وهذا ضروري لكي يتمكن تطبيق الجوال من الاتصال دون تسجيل دخول معقد).
 * 9. اضغط على زر "Deploy". قد يطلب منك جوجل منح الصلاحيات لجداول البيانات الخاصة بك، وافق عليها.
 * 10. بعد انتهاء النشر، سيظهر لك رابط طويل ينتهي بـ `/exec`. قم بنسخه ولصقه في إعدادات تطبيق الجوال!
 */

function doGet(e) {
  var action = e.parameter.action;
  
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
  
  return createJsonResponse({ success: false, message: "أمر غير صالح أو مفقود" });
}

// 1. البحث عن منتج بالباركود
function queryBarcode(sheet, barcode) {
  if (!barcode) {
    return createJsonResponse({ success: false, message: "الباركود مطلوب" });
  }
  
  var data = sheet.getDataRange().getValues();
  
  // البحث في العمود الأول (الباركود)
  for (var i = 1; i < data.length; i++) {
    var sheetBarcode = String(data[i][0]).trim();
    if (sheetBarcode === String(barcode).trim()) {
      return createJsonResponse({
        success: true,
        row: i + 1, // رقم الصف في جوجل شيت (1-indexed)
        barcode: sheetBarcode,
        name: data[i][1],
        bookQty: data[i][2],
        actualQty: data[i][3] === "" ? null : data[i][3],
        status: data[i][4] || "pending"
      });
    }
  }
  
  // إذا لم يتم العثور على المنتج
  return createJsonResponse({ success: false, message: "not_found" });
}

// 2. تحديث الكمية الفعلية وتغيير الحالة
function updateQuantity(sheet, barcode, qty) {
  if (!barcode || qty === undefined) {
    return createJsonResponse({ success: false, message: "الباركود والكمية مطلوبان" });
  }
  
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    var sheetBarcode = String(data[i][0]).trim();
    if (sheetBarcode === String(barcode).trim()) {
      var rowNum = i + 1;
      
      // تحديث الكمية الفعلية (العمود D) والحالة (العمود E) وتاريخ آخر تحديث (العمود F)
      sheet.getRange(rowNum, 4).setValue(Number(qty));
      sheet.getRange(rowNum, 5).setValue("checked"); // الحالة
      sheet.getRange(rowNum, 6).setValue(new Date()); // التاريخ والوقت
      
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
  
  var data = sheet.getDataRange().getValues();
  
  // التأكد أولاً من عدم تكراره
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(barcode).trim()) {
      return createJsonResponse({ success: false, message: "المنتج مضاف مسبقاً" });
    }
  }
  
  // إضافة صف جديد بالقيم الأساسية
  sheet.appendRow([
    String(barcode).trim(), // A: الباركود
    name,                  // B: الاسم
    0,                     // C: الكمية الدفترية الافتراضية
    "",                    // D: الكمية الفعلية فارغة بانتظار الجرد
    "pending",             // E: الحالة معلق
    new Date()             // F: وقت الإضافة
  ]);
  
  return createJsonResponse({ success: true, message: "تمت إضافة المنتج الجديد للجدول" });
}

// دالة مساعدة لإنشاء رد بصيغة JSON مع معالجة CORS
function createJsonResponse(data) {
  var JSONString = JSON.stringify(data);
  return ContentService.createTextOutput(JSONString)
    .setMimeType(ContentService.MimeType.JSON);
}

// 4. جلب جميع المنتجات في الشيت لعرضها بالجدول
function getAllProducts(sheet) {
  var data = sheet.getDataRange().getValues();
  var productsList = [];
  
  for (var i = 1; i < data.length; i++) {
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
