/**
 * Утилиты для безопасной работы с данными из БД без хардкода и ||
 * Все значения должны приходить из API/БД, без фолбэков на константы
 */

/**
 * Получить локализованное имя услуги из данных БД
 * Используется только canonical поле name.
 */
export function getLocalizedServiceName(
  service: any,
  _language: string
): string {
  if (!service || typeof service !== "object") {
    return "";
  }

  if (typeof service.name === "string") {
    const trimmed = service.name.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  return "";
}

/**
 * Получить локализованное описание услуги из данных БД
 */
export function getLocalizedServiceDescription(
  service: any,
  _language: string
): string {
  if (!service || typeof service !== "object") {
    return "";
  }

  if (typeof service.description === "string") {
    const trimmed = service.description.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  return "";
}

/**
 * Получить безопасную строку из значения (для категорий, slug и т.д.)
 */
export function getSafeString(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (value != null) {
    return String(value).trim();
  }
  return "";
}

/**
 * Получить имя салона из SEO метаданных (из БД)
 */
export function getSalonName(seo: any): string {
  if (!seo || typeof seo !== "object") {
    return "";
  }
  if (seo.salon_name && typeof seo.salon_name === "string") {
    const trimmed = seo.salon_name.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return "";
}

/**
 * Получить город из SEO метаданных (из БД)
 */
export function getSalonCity(seo: any): string {
  if (!seo || typeof seo !== "object") {
    return "";
  }
  if (seo.city && typeof seo.city === "string") {
    const trimmed = seo.city.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return "";
}

/**
 * Получить base_url из SEO метаданных или текущий origin (только для технических нужд)
 */
export function getBaseUrl(seo: any): string {
  if (seo && typeof seo === "object" && seo.base_url && typeof seo.base_url === "string") {
    const trimmed = seo.base_url.trim();
    if (trimmed.length > 0) {
      return trimmed.replace(/\/$/, "");
    }
  }
  // window.location.origin - это технический фолбэк для URL, не хардкод контента
  return window.location.origin;
}

/**
 * Получить валюту из данных услуги или из настроек салона
 */
export function getCurrency(service: any, salonSettings: any): string {
  if (service && typeof service === "object" && service.currency && typeof service.currency === "string") {
    const trimmed = service.currency.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  if (salonSettings && typeof salonSettings === "object" && salonSettings.currency && typeof salonSettings.currency === "string") {
    const trimmed = salonSettings.currency.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return "";
}

/**
 * Получить имя мастера безопасно
 */
export function getMasterName(master: any): string {
  if (!master || typeof master !== "object") {
    return "";
  }
  if (master.name && typeof master.name === "string") {
    const trimmed = master.name.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  if (master.full_name && typeof master.full_name === "string") {
    const trimmed = master.full_name.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return "";
}

/**
 * Получить специализацию мастера безопасно
 */
export function getMasterSpecialization(master: any): string {
  if (!master || typeof master !== "object") {
    return "";
  }
  if (master.specialization && typeof master.specialization === "string") {
    const trimmed = master.specialization.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  if (master.job_title && typeof master.job_title === "string") {
    const trimmed = master.job_title.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  if (master.position && typeof master.position === "string") {
    const trimmed = master.position.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return "";
}

/**
 * Получить URL изображения мастера безопасно
 */
export function getMasterImageUrl(master: any, apiBaseUrl: string): string {
  if (!master || typeof master !== "object") {
    return "";
  }
  if (!master.image || typeof master.image !== "string") {
    return "";
  }

  const imagePath = master.image.trim();
  if (imagePath.length === 0) {
    return "";
  }

  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  const base = apiBaseUrl || window.location.origin;
  if (imagePath.startsWith("/")) {
    return `${base}${imagePath}`;
  }

  return `${base}/uploads/${imagePath}`;
}

/**
 * Получить первую букву имени для аватара
 */
export function getInitialLetter(name: string): string {
  const safe = getSafeString(name);
  if (safe.length > 0) {
    return safe.charAt(0).toUpperCase();
  }
  return "";
}

/**
 * Безопасный slugify для URL (без фолбэков)
 */
export function slugifyAscii(text: string): string {
  const safe = getSafeString(text);
  if (safe.length === 0) {
    return "";
  }
  const lower = safe.toLowerCase();
  const cleaned = lower
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned;
}
