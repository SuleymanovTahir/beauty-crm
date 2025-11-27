import { createContext, useContext, useState, ReactNode } from "react";

type Language = "ru" | "en" | "ar";

export const translations = {
  ru: {
    // Navigation
    nails: "Маникюр",
    hair: "Волосы и Ресницы",
    brows: "Брови и Ресницы",
    prices: "Цены",
    contact: "Контакты",
    dubai: "Дубай",
    abuDhabi: "Абу-Даби",
    
    // Hero Section
    heroTag: "Премиум салон красоты в Дубае",
    heroTitle: "ПОЛУЧИТЕ СКИДКУ 50%",
    heroSubtitle: "НА ВСЕ УСЛУГИ В САЛОНЕ",
    heroDescription: "Откройте для себя мир роскоши и красоты в M Le Diamant. Эксклюзивные услуги премиум-класса для вашего совершенства.",
    bookNow: "ЗАБРОНИРОВАТЬ",
    ourServices: "НАШИ УСЛУГИ",
    promoEnds: "Акция заканчивается через:",
    availableForNew: "Доступно только для новых клиентов",
    days: "дней",
    hours: "часов",
    minutes: "минут",
    seconds: "секунд",
    
    // Features
    whyUs: "Почему выбирают нас",
    whyTitle: "M LE DIAMANT - ЭТО ВОПЛОЩЕНИЕ РОСКОШИ И КАЧЕСТВА",
    feature1Title: "15+ ЛЕТ ОПЫТА",
    feature1Desc: "Наша команда профессионалов имеет богатый опыт работы в индустрии красоты",
    feature2Title: "ПРЕМИУМ МАТЕРИАЛЫ",
    feature2Desc: "Используем только топовые профессиональные бренды и материалы высочайшего качества",
    feature3Title: "ИНДИВИДУАЛЬНЫЙ ПОДХОД",
    feature3Desc: "Каждый клиент уникален. Мы создаем персонализированные решения",
    feature4Title: "УДОБНОЕ БРОНИРОВАНИЕ",
    feature4Desc: "Простая система онлайн-записи и гибкий график работы",
    
    // Services
    servicesTag: "Наши услуги",
    servicesTitle: "ЗАПИШИТЕСЬ НА ЛЮБУЮ ПРОЦЕДУРУ",
    servicesDesc: "В M Le Diamant мы предлагаем полный спектр услуг красоты премиум-класса",
    service1Title: "МАНИКЮР & ПЕДИКЮР",
    service1Desc: "Профессиональный уход за ногтями с использованием премиум-покрытий",
    service2Title: "СТРИЖКИ & УКЛАДКИ",
    service2Desc: "Эксклюзивные стрижки и профессиональные укладки от мастеров",
    service3Title: "МАКИЯЖ & БРОВИ",
    service3Desc: "Профессиональный макияж и оформление бровей для безупречного образа",
    learnMore: "ПОДРОБНЕЕ",
    
    // Portfolio
    portfolioTag: "Наши работы",
    portfolioTitle: "ГАЛЕРЕЯ НАШИХ РАБОТ",
    portfolioDesc: "Посмотрите примеры наших лучших работ и убедитесь в профессионализме наших мастеров",
    
    // Pricing
    pricingTag: "Специальная акция",
    pricingTitle: "ЦЕНЫ НА НАШИ УСЛУГИ",
    pricingDiscount: "Скидка 50% на все услуги до конца месяца",
    manucureCategory: "МАНИКЮР & УСЛУГИ ДЛЯ НОГТЕЙ",
    pedicureCategory: "ПЕДИКЮР",
    hairCategory: "УХОД ЗА ВОЛОСАМИ",
    spaCategory: "SPA & МАССАЖ",
    classicManicure: "Классический маникюр",
    gelManicure: "Гель-лак маникюр",
    nailExtension: "Наращивание ногтей",
    nailDesign: "Дизайн ногтей (за 1 ноготь)",
    classicPedicure: "Классический педикюр",
    spaPedicure: "SPA педикюр",
    medicalPedicure: "Медицинский педикюр",
    womenHaircut: "Женская стрижка",
    menHaircut: "Мужская стрижка",
    hairColoring: "Окрашивание волос",
    hairStyling: "Укладка",
    keratinTreatment: "Кератиновое восстановление",
    classicMassage: "Классический массаж",
    faceMassage: "Массаж лица",
    spaRitual: "SPA-ритуал для тела",
    aromatherapy: "Ароматерапия",
    bookNowBtn: "ЗАПИСАТЬСЯ СЕЙЧАС",
    
    // Booking
    bookingTag: "Онлайн запись",
    bookingTitle: "ЗАБРОНИРУЙТЕ ВИЗИТ В M LE DIAMANT",
    bookingDesc: "Оставьте заявку и наш администратор свяжется с вами для подтверждения времени визита. Мы работаем ежедневно с 9:00 до 21:00.",
    yourName: "Ваше имя",
    phone: "Телефон",
    email: "Email",
    selectService: "Выберите услугу",
    date: "Дата",
    time: "Время",
    submit: "ОТПРАВИТЬ ЗАЯВКУ",
    enterName: "Введите ваше имя",
    enterPhone: "+971 xx xxx xxxx",
    enterEmail: "your@email.com",
    chooseService: "Выберите услугу",
    serviceManicure: "Маникюр",
    servicePedicure: "Педикюр",
    serviceHaircut: "Стрижка",
    serviceColoring: "Окрашивание",
    serviceStyling: "Укладка",
    serviceMassage: "Массаж",
    serviceSpa: "SPA-процедуры",
    
    // Gallery
    galleryTag: "Наши локации",
    galleryTitle: "САЛОН M LE DIAMANT",
    galleryDesc: "Приглашаем вас в наш роскошный салон красоты, где каждая деталь создана для вашего комфорта",
    mainHall: "Основной зал",
    manicureZone: "Зона маникюра",
    hairZone: "Парикмахерская зона",
    spaZone: "SPA-зона",
    visitSalon: "Посетите наш салон",
    location: "Dubai Marina, Marina Plaza, Sheikh Zayed Road, Dubai, UAE",
    getDirections: "ПОСТРОИТЬ МАРШРУТ",
    callUs: "ПОЗВОНИТЬ НАМ",
    
    // Footer
    aboutSalon: "Премиум салон красоты в самом сердце Дубая. Ваша красота - наша миссия.",
    servicesTitle: "Услуги",
    infoTitle: "Информация",
    contactTitle: "Контакты",
    aboutUs: "О нас",
    ourTeam: "Наша команда",
    promotions: "Акции",
    reviews: "Отзывы",
    manicurePedicure: "Маникюр & Педикюр",
    haircutsStyling: "Стрижки & Укладки",
    coloring: "Окрашивание",
    spaMassage: "SPA & Массаж",
    cosmetology: "Косметология",
    allRightsReserved: "Все права защищены.",
    privacyPolicy: "Политика конфиденциальности",
    termsOfUse: "Условия использования",
  },
  en: {
    // Navigation
    nails: "Nails",
    hair: "Hair & Lashes",
    brows: "Brows & Lashes",
    prices: "Prices",
    contact: "Contact",
    dubai: "Dubai",
    abuDhabi: "Abu Dhabi",
    
    // Hero Section
    heroTag: "Premium beauty salon in Dubai",
    heroTitle: "GET 50% DISCOUNT",
    heroSubtitle: "ON ALL SALON SERVICES",
    heroDescription: "Discover the world of luxury and beauty at M Le Diamant. Exclusive premium services for your perfection.",
    bookNow: "BOOK NOW",
    ourServices: "OUR SERVICES",
    promoEnds: "Promotion ends in:",
    availableForNew: "Available for new customers only",
    days: "days",
    hours: "hours",
    minutes: "minutes",
    seconds: "seconds",
    
    // Features
    whyUs: "Why choose us",
    whyTitle: "M LE DIAMANT IS THE EMBODIMENT OF LUXURY AND QUALITY",
    feature1Title: "15+ YEARS EXPERIENCE",
    feature1Desc: "Our team of professionals has extensive experience in the beauty industry",
    feature2Title: "PREMIUM MATERIALS",
    feature2Desc: "We use only top professional brands and highest quality materials",
    feature3Title: "INDIVIDUAL APPROACH",
    feature3Desc: "Each client is unique. We create personalized solutions",
    feature4Title: "CONVENIENT BOOKING",
    feature4Desc: "Easy online booking system and flexible working hours",
    
    // Services
    servicesTag: "Our services",
    servicesTitle: "BOOK ANY PROCEDURE",
    servicesDesc: "At M Le Diamant we offer a full range of premium beauty services",
    service1Title: "MANICURE & PEDICURE",
    service1Desc: "Professional nail care using premium coatings",
    service2Title: "HAIRCUTS & STYLING",
    service2Desc: "Exclusive haircuts and professional styling from masters",
    service3Title: "MAKEUP & BROWS",
    service3Desc: "Professional makeup and brow shaping for a flawless look",
    learnMore: "LEARN MORE",
    
    // Portfolio
    portfolioTag: "Our works",
    portfolioTitle: "OUR WORKS GALLERY",
    portfolioDesc: "See examples of our best work and experience the professionalism of our masters",
    
    // Pricing
    pricingTag: "Special offer",
    pricingTitle: "OUR SERVICES PRICING",
    pricingDiscount: "50% discount on all services until the end of the month",
    manucureCategory: "MANICURE & NAIL SERVICES",
    pedicureCategory: "PEDICURE",
    hairCategory: "HAIR CARE",
    spaCategory: "SPA & MASSAGE",
    classicManicure: "Classic manicure",
    gelManicure: "Gel polish manicure",
    nailExtension: "Nail extension",
    nailDesign: "Nail design (per nail)",
    classicPedicure: "Classic pedicure",
    spaPedicure: "SPA pedicure",
    medicalPedicure: "Medical pedicure",
    womenHaircut: "Women's haircut",
    menHaircut: "Men's haircut",
    hairColoring: "Hair coloring",
    hairStyling: "Styling",
    keratinTreatment: "Keratin treatment",
    classicMassage: "Classic massage",
    faceMassage: "Face massage",
    spaRitual: "SPA body ritual",
    aromatherapy: "Aromatherapy",
    bookNowBtn: "BOOK NOW",
    
    // Booking
    bookingTag: "Online booking",
    bookingTitle: "BOOK YOUR VISIT TO M LE DIAMANT",
    bookingDesc: "Leave a request and our administrator will contact you to confirm the visit time. We work daily from 9:00 to 21:00.",
    yourName: "Your name",
    phone: "Phone",
    email: "Email",
    selectService: "Select service",
    date: "Date",
    time: "Time",
    submit: "SUBMIT REQUEST",
    enterName: "Enter your name",
    enterPhone: "+971 xx xxx xxxx",
    enterEmail: "your@email.com",
    chooseService: "Choose service",
    serviceManicure: "Manicure",
    servicePedicure: "Pedicure",
    serviceHaircut: "Haircut",
    serviceColoring: "Coloring",
    serviceStyling: "Styling",
    serviceMassage: "Massage",
    serviceSpa: "SPA procedures",
    
    // Gallery
    galleryTag: "Our locations",
    galleryTitle: "M LE DIAMANT SALON",
    galleryDesc: "We invite you to our luxurious beauty salon where every detail is created for your comfort",
    mainHall: "Main hall",
    manicureZone: "Manicure zone",
    hairZone: "Hair zone",
    spaZone: "SPA zone",
    visitSalon: "Visit our salon",
    location: "Dubai Marina, Marina Plaza, Sheikh Zayed Road, Dubai, UAE",
    getDirections: "GET DIRECTIONS",
    callUs: "CALL US",
    
    // Footer
    aboutSalon: "Premium beauty salon in the heart of Dubai. Your beauty is our mission.",
    servicesTitle: "Services",
    infoTitle: "Information",
    contactTitle: "Contacts",
    aboutUs: "About us",
    ourTeam: "Our team",
    promotions: "Promotions",
    reviews: "Reviews",
    manicurePedicure: "Manicure & Pedicure",
    haircutsStyling: "Haircuts & Styling",
    coloring: "Coloring",
    spaMassage: "SPA & Massage",
    cosmetology: "Cosmetology",
    allRightsReserved: "All rights reserved.",
    privacyPolicy: "Privacy Policy",
    termsOfUse: "Terms of Use",
  },
  ar: {
    // Navigation
    nails: "الأظافر",
    hair: "الشعر والرموش",
    brows: "الحواجب والرموش",
    prices: "الأسعار",
    contact: "اتصل بنا",
    dubai: "دبي",
    abuDhabi: "أبو ظبي",
    
    // Hero Section
    heroTag: "صالون تجميل فاخر في دبي",
    heroTitle: "احصل على خصم 50%",
    heroSubtitle: "على جميع خدمات الصالون",
    heroDescription: "اكتشف عالم الفخامة والجمال في M Le Diamant. خدمات حصرية فاخرة لكمالك.",
    bookNow: "احجز الآن",
    ourServices: "خدماتنا",
    promoEnds: "ينتهي العرض خلال:",
    availableForNew: "متاح للعملاء الجدد فقط",
    days: "أيام",
    hours: "ساعات",
    minutes: "دقائق",
    seconds: "ثواني",
    
    // Features
    whyUs: "لماذا تختارنا",
    whyTitle: "M LE DIAMANT هو تجسيد للفخامة والجودة",
    feature1Title: "15+ سنة خبرة",
    feature1Desc: "يتمتع فريقنا من المحترفين بخبرة واسعة في صناعة التجميل",
    feature2Title: "مواد فاخرة",
    feature2Desc: "نستخدم فقط العلامات التجارية الاحترافية الرائدة والمواد عالية الجودة",
    feature3Title: "نهج فردي",
    feature3Desc: "كل عميل فريد من نوعه. نحن نصنع حلول مخصصة",
    feature4Title: "حجز مريح",
    feature4Desc: "نظام حجز عبر الإنترنت سهل وساعات عمل مرنة",
    
    // Services
    servicesTag: "خدماتنا",
    servicesTitle: "احجز أي إجراء",
    servicesDesc: "في M Le Diamant نقدم مجموعة كاملة من خدمات التجميل الفاخرة",
    service1Title: "مانيكير وباديكير",
    service1Desc: "عناية احترافية بالأظافر باستخدام طلاءات فاخرة",
    service2Title: "قص وتصفيف",
    service2Desc: "قصات حصرية وتصفيف احترافي من الخبراء",
    service3Title: "مكياج وحواجب",
    service3Desc: "مكياج احترافي وتشكيل الحواجب لمظهر لا تشوبه شائبة",
    learnMore: "اعرف المزيد",
    
    // Portfolio
    portfolioTag: "أعمالنا",
    portfolioTitle: "معرض أعمالنا",
    portfolioDesc: "شاهد أمثلة على أفضل أعمالنا واختبر احترافية خبرائنا",
    
    // Pricing
    pricingTag: "عرض خاص",
    pricingTitle: "أسعار خدماتنا",
    pricingDiscount: "خصم 50% على جميع الخدمات حتى نهاية الشهر",
    manucureCategory: "مانيكير وخدمات الأظافر",
    pedicureCategory: "باديكير",
    hairCategory: "العناية بالشعر",
    spaCategory: "سبا ومساج",
    classicManicure: "مانيكير كلاسيكي",
    gelManicure: "مانيكير جل",
    nailExtension: "تمديد الأظافر",
    nailDesign: "تصميم الأظافر (لكل ظفر)",
    classicPedicure: "باديكير كلاسيكي",
    spaPedicure: "باديكير سبا",
    medicalPedicure: "باديكير طبي",
    womenHaircut: "قص شعر نسائي",
    menHaircut: "قص شعر رجالي",
    hairColoring: "صبغ الشعر",
    hairStyling: "تصفيف",
    keratinTreatment: "علاج الكيراتين",
    classicMassage: "مساج كلاسيكي",
    faceMassage: "مساج الوجه",
    spaRitual: "طقوس سبا للجسم",
    aromatherapy: "العلاج بالروائح",
    bookNowBtn: "احجز الآن",
    
    // Booking
    bookingTag: "الحجز عبر الإنترنت",
    bookingTitle: "احجز زيارتك إلى M LE DIAMANT",
    bookingDesc: "اترك طلبًا وسيتصل بك مسؤولنا لتأكيد وقت الزيارة. نحن نعمل يوميًا من 9:00 إلى 21:00.",
    yourName: "اسمك",
    phone: "الهاتف",
    email: "البريد الإلكتروني",
    selectService: "اختر الخدمة",
    date: "التاريخ",
    time: "الوقت",
    submit: "إرسال الطلب",
    enterName: "أدخل اسمك",
    enterPhone: "+971 xx xxx xxxx",
    enterEmail: "your@email.com",
    chooseService: "اختر الخدمة",
    serviceManicure: "مانيكير",
    servicePedicure: "باديكير",
    serviceHaircut: "قص الشعر",
    serviceColoring: "صبغ",
    serviceStyling: "تصفيف",
    serviceMassage: "مساج",
    serviceSpa: "إجراءات سبا",
    
    // Gallery
    galleryTag: "مواقعنا",
    galleryTitle: "صالون M LE DIAMANT",
    galleryDesc: "ندعوك إلى صالون التجميل الفاخر حيث تم إنشاء كل التفاصيل من أجل راحتك",
    mainHall: "القاعة الرئيسية",
    manicureZone: "منطقة المانيكير",
    hairZone: "منطقة الشعر",
    spaZone: "منطقة السبا",
    visitSalon: "قم بزيارة صالوننا",
    location: "Dubai Marina, Marina Plaza, Sheikh Zayed Road, Dubai, UAE",
    getDirections: "احصل على الاتجاهات",
    callUs: "اتصل بنا",
    
    // Footer
    aboutSalon: "صالون تجميل فاخر في قلب دبي. جمالك هو مهمتنا.",
    servicesTitle: "الخدمات",
    infoTitle: "معلومات",
    contactTitle: "جهات الاتصال",
    aboutUs: "معلومات عنا",
    ourTeam: "فريقنا",
    promotions: "العروض",
    reviews: "المراجعات",
    manicurePedicure: "مانيكير وباديكير",
    haircutsStyling: "قص وتصفيف",
    coloring: "صبغ",
    spaMassage: "سبا ومساج",
    cosmetology: "التجميل",
    allRightsReserved: "كل الحقوق محفوظة.",
    privacyPolicy: "سياسة الخصوصية",
    termsOfUse: "شروط الاستخدام",
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.ru;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("ru");

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}