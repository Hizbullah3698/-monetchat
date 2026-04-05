// i18n Translation System
// Lightweight bilingual (Arabic/English) translation for PickPic Kuwait

export type Locale = "en" | "ar";

export const defaultLocale: Locale = "en";

// Direction for each locale
export const localeDirection: Record<Locale, "ltr" | "rtl"> = {
  en: "ltr",
  ar: "rtl",
};

export const localeNames: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
};

// Translation dictionary
const translations = {
  // ========================
  // Navigation & Header
  // ========================
  "nav.marketplace": { en: "Marketplace", ar: "السوق" },
  "nav.sell": { en: "Sell", ar: "بيع" },
  "nav.howItWorks": { en: "How it Works", ar: "كيف يعمل" },
  "nav.support": { en: "Support", ar: "الدعم" },
  "nav.login": { en: "Log in", ar: "تسجيل الدخول" },
  "nav.signup": { en: "Sign up", ar: "إنشاء حساب" },
  "nav.account": { en: "Account Settings", ar: "إعدادات الحساب" },
  "nav.billing": { en: "Billing", ar: "الفواتير" },
  "nav.messages": { en: "Messages", ar: "الرسائل" },
  "nav.logout": { en: "Log out", ar: "تسجيل الخروج" },

  // ========================
  // Chat Interface
  // ========================
  "chat.welcome": { en: "Welcome to PickPic!", ar: "مرحباً بكم في بيك بيك!" },
  "chat.subtitle": { en: "Tell me what you're looking for", ar: "أخبرني عما تبحث عنه" },
  "chat.buyWelcome": { en: "How can I help you find things to buy in Kuwait?", ar: "كيف يمكنني مساعدتك في العثور على أشياء لشرائها في الكويت؟" },
  "chat.placeholder": { en: "Search for anything...", ar: "...ابحث عن أي شيء" },
  "chat.imageSearch": { en: "Image search", ar: "البحث بالصورة" },
  "chat.voiceSearch": { en: "Voice search", ar: "البحث الصوتي" },
  "chat.stopRecording": { en: "Stop recording", ar: "إيقاف التسجيل" },
  "chat.found": { en: "Here's what I found.", ar: ".إليك ما وجدته" },
  "chat.error": { en: "Sorry, something went wrong. Please try again.", ar: ".عذراً، حدث خطأ. يرجى المحاولة مرة أخرى" },
  "chat.aiSearch": { en: "PickPic AI Search", ar: "بحث بيك بيك الذكي" },

  // Chat mode buttons (replace old suggestion chips)
  "chat.mode.buy": { en: "Buy", ar: "شراء" },
  "chat.mode.sell": { en: "Sell", ar: "بيع" },
  "chat.mode.uploadPhoto": { en: "Upload a photo", ar: "تحميل صورة" },
  "chat.mode.searchChat": { en: "Search by Chat", ar: "البحث عن طريق الدردشة" },
  "chat.mode.describeItem": { en: "Describe your item", ar: "صف منتجك" },
  "chat.sellDescribePrompt": { en: "I want to sell: ", ar: "أريد بيع: " },
  "chat.buySearchPrompt": { en: "I'm looking for ", ar: "أبحث عن " },

  // Seller profile required modal
  "seller.profileRequired": { en: "Complete your seller profile", ar: "أكمل ملف البائع الخاص بك" },
  "seller.profileRequiredDesc": { en: "You need to set up your seller profile before creating listings. It only takes a minute!", ar: "!تحتاج إلى إعداد ملف البائع الخاص بك قبل إنشاء الإعلانات. يستغرق ذلك دقيقة فقط" },
  "seller.goToProfile": { en: "Complete Profile", ar: "إكمال الملف الشخصي" },
  "seller.dismiss": { en: "Not now", ar: "ليس الآن" },

  // ========================
  // Product Card & Contact
  // ========================
  "product.call": { en: "Call", ar: "اتصال" },
  "product.whatsapp": { en: "WhatsApp", ar: "واتساب" },
  "product.callSeller": { en: "Call Seller", ar: "اتصل بالبائع" },
  "product.whatsappSeller": { en: "WhatsApp Seller", ar: "واتساب البائع" },
  "product.messageSeller": { en: "Message Seller", ar: "مراسلة البائع" },
  "product.save": { en: "Save", ar: "حفظ" },
  "product.viewProfile": { en: "View Profile", ar: "عرض الملف الشخصي" },
  "product.details": { en: "Details", ar: "التفاصيل" },
  "product.reviews": { en: "Reviews", ar: "التقييمات" },
  "product.noDescription": { en: "No description provided.", ar: ".لم يتم تقديم وصف" },
  "product.negotiable": { en: "Negotiable", ar: "قابل للتفاوض" },
  "product.notFound": { en: "Product not found", ar: "المنتج غير موجود" },
  "product.whatsappMessage": { en: "Hi, I'm interested in:", ar: "مرحباً، أنا مهتم بـ:" },

  // Conditions
  "condition.new": { en: "New", ar: "جديد" },
  "condition.like_new": { en: "Like New", ar: "شبه جديد" },
  "condition.good": { en: "Good", ar: "جيد" },
  "condition.fair": { en: "Fair", ar: "مقبول" },
  "condition.poor": { en: "Poor", ar: "ضعيف" },

  // Categories
  "category.vehicles": { en: "Vehicles", ar: "مركبات" },
  "category.electronics": { en: "Electronics", ar: "إلكترونيات" },
  "category.property": { en: "Property", ar: "عقارات" },
  "category.fashion": { en: "Fashion", ar: "أزياء" },
  "category.furniture": { en: "Furniture", ar: "أثاث" },
  "category.services": { en: "Services", ar: "خدمات" },
  "category.jobs": { en: "Jobs", ar: "وظائف" },
  "category.pets": { en: "Pets", ar: "حيوانات أليفة" },
  "category.sports": { en: "Sports", ar: "رياضة" },
  "category.books": { en: "Books", ar: "كتب" },
  "category.baby_kids": { en: "Baby & Kids", ar: "أطفال ورضع" },
  "category.health_beauty": { en: "Health & Beauty", ar: "صحة وجمال" },
  "category.home_garden": { en: "Home & Garden", ar: "منزل وحديقة" },
  "category.collectibles": { en: "Collectibles", ar: "مقتنيات" },
  "category.gaming": { en: "Gaming", ar: "ألعاب إلكترونية" },
  "category.other": { en: "Other", ar: "أخرى" },

  // ========================
  // Seller Flow
  // ========================
  "sell.title": { en: "Create New Listing", ar: "إنشاء إعلان جديد" },
  "sell.subtitle": { en: "Upload a photo to get started with our AI assistant.", ar: ".قم بتحميل صورة للبدء مع مساعدنا الذكي" },
  "sell.uploading": { en: "Uploading image...", ar: "...جاري تحميل الصورة" },
  "sell.uploadingDesc": { en: "Securely uploading to cloud storage", ar: "تحميل آمن إلى التخزين السحابي" },
  "sell.analyzing": { en: "AI is analyzing your item...", ar: "...الذكاء الاصطناعي يحلل منتجك" },
  "sell.analyzingDesc": { en: "Identifying category, price, and condition", ar: "تحديد الفئة والسعر والحالة" },
  "sell.aiComplete": { en: "AI Analysis Complete", ar: "اكتمل التحليل الذكي" },
  "sell.aiCompleteDesc": { en: "We've pre-filled the form based on your image!", ar: "!قمنا بملء النموذج بناءً على صورتك" },
  "sell.addMore": { en: "Add More", ar: "إضافة المزيد" },
  "sell.photosCount": { en: "photos", ar: "صور" },
  "sell.coverImage": { en: "First photo is the cover image", ar: "الصورة الأولى هي صورة الغلاف" },
  "sell.main": { en: "Main", ar: "رئيسية" },
  "sell.startOver": { en: "Start Over with New Photo", ar: "البدء من جديد بصورة جديدة" },
  "sell.maxImages": { en: "Maximum 8 images", ar: "الحد الأقصى 8 صور" },
  "sell.published": { en: "Listing Published!", ar: "!تم نشر الإعلان" },
  "sell.publishedDesc": { en: "Your item is now live on PickPic.", ar: ".منتجك الآن متاح على بيك بيك" },
  "sell.rejected": { en: "Content Rejected", ar: "تم رفض المحتوى" },

  // Listing Form
  "form.title": { en: "Title", ar: "العنوان" },
  "form.titlePlaceholder": { en: "Item title", ar: "عنوان المنتج" },
  "form.price": { en: "Price", ar: "السعر" },
  "form.category": { en: "Category", ar: "الفئة" },
  "form.selectCategory": { en: "Select a category", ar: "اختر فئة" },
  "form.condition": { en: "Condition", ar: "الحالة" },
  "form.selectCondition": { en: "Select condition", ar: "اختر الحالة" },
  "form.description": { en: "Description", ar: "الوصف" },
  "form.descriptionPlaceholder": { en: "Describe your item...", ar: "...صف منتجك" },
  "form.createListing": { en: "Create Listing", ar: "إنشاء الإعلان" },

  // Listing Preview
  "preview.title": { en: "Preview Your Listing", ar: "معاينة إعلانك" },
  "preview.draft": { en: "Draft", ar: "مسودة" },
  "preview.edit": { en: "Edit", ar: "تعديل" },
  "preview.publish": { en: "Publish Listing", ar: "نشر الإعلان" },
  "preview.publishing": { en: "Publishing...", ar: "...جاري النشر" },

  // Seller Dashboard
  "dashboard.title": { en: "Seller Dashboard", ar: "لوحة تحكم البائع" },
  "dashboard.products": { en: "Products", ar: "المنتجات" },
  "dashboard.customers": { en: "Customers", ar: "العملاء" },
  "dashboard.analytics": { en: "Analytics", ar: "التحليلات" },
  "dashboard.addProduct": { en: "Add Product", ar: "إضافة منتج" },
  "dashboard.yourProducts": { en: "Your Products", ar: "منتجاتك" },
  "dashboard.manageDesc": { en: "Manage your inventory and view product performance.", ar: ".إدارة مخزونك وعرض أداء المنتجات" },
  "dashboard.noProducts": { en: "No products yet", ar: "لا توجد منتجات بعد" },
  "dashboard.noProductsDesc": { en: "Create your first listing to start selling.", ar: ".أنشئ إعلانك الأول لبدء البيع" },
  "dashboard.createListing": { en: "Create Listing", ar: "إنشاء إعلان" },
  "dashboard.edit": { en: "Edit", ar: "تعديل" },
  "dashboard.delete": { en: "Delete", ar: "حذف" },
  "dashboard.deleting": { en: "Deleting...", ar: "...جاري الحذف" },
  "dashboard.markSold": { en: "Mark as Sold", ar: "تعليم كمباع" },
  "dashboard.editProduct": { en: "Edit Product", ar: "تعديل المنتج" },
  "dashboard.editDesc": { en: "Update your product details.", ar: ".تحديث تفاصيل منتجك" },
  "dashboard.save": { en: "Save Changes", ar: "حفظ التغييرات" },
  "dashboard.saving": { en: "Saving...", ar: "...جاري الحفظ" },
  "dashboard.cancel": { en: "Cancel", ar: "إلغاء" },
  "dashboard.name": { en: "Name", ar: "الاسم" },
  "dashboard.status": { en: "Status", ar: "الحالة" },
  "dashboard.views": { en: "Views", ar: "المشاهدات" },
  "dashboard.contacts": { en: "Contacts", ar: "الاتصالات" },
  "dashboard.actions": { en: "Actions", ar: "الإجراءات" },
  "dashboard.logout": { en: "Logout", ar: "تسجيل الخروج" },

  // ========================
  // Sidebar
  // ========================
  "sidebar.newChat": { en: "New Chat", ar: "محادثة جديدة" },
  "sidebar.buyMode": { en: "Buy", ar: "شراء" },
  "sidebar.sellMode": { en: "Sell", ar: "بيع" },
  "sidebar.noChats": { en: "No conversations yet", ar: "لا توجد محادثات بعد" },
  "sidebar.today": { en: "Today", ar: "اليوم" },
  "sidebar.yesterday": { en: "Yesterday", ar: "أمس" },
  "sidebar.thisWeek": { en: "This week", ar: "هذا الأسبوع" },
  "sidebar.older": { en: "Older", ar: "أقدم" },
  "sidebar.myListings": { en: "My Listings", ar: "إعلاناتي" },
  "sidebar.settings": { en: "Settings", ar: "الإعدادات" },

  // ========================
  // Sell Chat
  // ========================
  "sell.chatWelcome": { en: "Ready to sell?", ar: "مستعد للبيع؟" },
  "sell.chatSubtitle": { en: "Upload a photo of your item and I'll help you create a listing", ar: "قم بتحميل صورة منتجك وسأساعدك في إنشاء إعلان" },
  "sell.uploadPhoto": { en: "Upload Photo", ar: "تحميل صورة" },
  "sell.uploadItem": { en: "I want to sell this item", ar: "أريد بيع هذا المنتج" },
  "sell.aiAnalyzed": { en: "I analyzed your item! Edit the details below and publish when ready.", ar: "!لقد حللت منتجك! عدّل التفاصيل أدناه وانشر عندما تكون جاهزاً" },
  "sell.analysisFailed": { en: "Sorry, I had trouble analyzing your image. Please try again.", ar: ".عذراً، واجهت مشكلة في تحليل صورتك. يرجى المحاولة مرة أخرى" },
  "sell.loginRequired": { en: "You need to log in to publish a listing.", ar: ".يجب تسجيل الدخول لنشر إعلان" },
  "sell.publishSuccess": { en: "Your listing is now live on PickPic!", ar: "!إعلانك الآن متاح على بيك بيك" },
  "sell.publishFailed": { en: "Failed to publish", ar: "فشل النشر" },
  "sell.uploadPrompt": { en: "To create a listing, please upload a photo of your item. I'll analyze it and help you set up the details!", ar: "!لإنشاء إعلان، يرجى تحميل صورة لمنتجك. سأحللها وأساعدك في إعداد التفاصيل" },
  "sell.inputPlaceholder": { en: "Describe your item or upload a photo...", ar: "...صف منتجك أو قم بتحميل صورة" },

  // ========================
  // Settings Panel
  // ========================
  "settings.backToChat": { en: "Back to chat", ar: "العودة إلى المحادثة" },
  "settings.name": { en: "Name", ar: "الاسم" },
  "settings.namePlaceholder": { en: "Your name", ar: "اسمك" },
  "settings.email": { en: "Email", ar: "البريد الإلكتروني" },
  "settings.emailHint": { en: "Email cannot be changed", ar: "لا يمكن تغيير البريد الإلكتروني" },
  "settings.phone": { en: "Phone", ar: "الهاتف" },
  "settings.language": { en: "Language", ar: "اللغة" },
  "settings.saved": { en: "Saved!", ar: "!تم الحفظ" },
  "settings.verified": { en: "Verified Seller", ar: "بائع موثق" },
  "settings.sellerInfo": { en: "Seller Stats", ar: "إحصائيات البائع" },
  "settings.totalSales": { en: "Total Sales", ar: "إجمالي المبيعات" },
  "settings.rating": { en: "Rating", ar: "التقييم" },
  "settings.sellerProfile": { en: "Seller Profile", ar: "ملف البائع" },
  "settings.sellerProfileDesc": { en: "Your public info shown on listings", ar: "معلوماتك العامة المعروضة في الإعلانات" },
  "settings.nationalId": { en: "Civil / National ID", ar: "الرقم المدني" },
  "settings.businessName": { en: "Business Name (optional)", ar: "اسم النشاط التجاري (اختياري)" },
  "settings.publicPhone": { en: "Public Phone", ar: "رقم الهاتف العام" },
  "settings.whatsapp": { en: "WhatsApp Number", ar: "رقم الواتساب" },
  "settings.sellerDashboard": { en: "Seller Dashboard", ar: "لوحة تحكم البائع" },
  "settings.sellerDashboardDesc": { en: "View your listings, analytics, and more", ar: "عرض إعلاناتك وإحصائياتك والمزيد" },
  "settings.profileComplete": { en: "Profile complete — ready to sell", ar: "الملف مكتمل — جاهز للبيع" },
  "settings.profileIncomplete": { en: "Complete your profile to start listing", ar: "أكمل ملفك للبدء في نشر الإعلانات" },
  "settings.sellerSaved": { en: "Seller profile saved!", ar: "تم حفظ ملف البائع!" },

  // ========================
  // My Listings Panel
  // ========================
  "listings.newListing": { en: "New Listing", ar: "إعلان جديد" },

  // ========================
  // Common
  // ========================
  "common.error": { en: "Error", ar: "خطأ" },
  "common.loading": { en: "Loading...", ar: "...جاري التحميل" },
  "common.somethingWrong": { en: "Something went wrong. Please try again.", ar: ".حدث خطأ ما. يرجى المحاولة مرة أخرى" },
  "common.image": { en: "Image", ar: "صورة" },
  "common.price": { en: "Price", ar: "السعر" },
  "common.more": { en: "more", ar: "المزيد" },

  // Product Detail Dialog
  "product.seller": { en: "Seller", ar: "البائع" },
  "product.location": { en: "Location", ar: "الموقع" },
  "product.close": { en: "Close", ar: "إغلاق" },

  // Camera / Recording
  "chat.camera": { en: "Camera", ar: "كاميرا" },
  "chat.recording": { en: "Recording...", ar: "...جاري التسجيل" },
  "chat.tapToStop": { en: "Tap to stop", ar: "اضغط للإيقاف" },

  // Auth
  "auth.phone": { en: "Phone Number", ar: "رقم الهاتف" },
  "auth.phonePlaceholder": { en: "+965 XXXX XXXX", ar: "+965 XXXX XXXX" },
} as const;

export type TranslationKey = keyof typeof translations;

export function getTranslation(key: TranslationKey, locale: Locale): string {
  const entry = translations[key];
  return entry?.[locale] ?? entry?.en ?? key;
}

export { translations };
