import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-6b68b787/health", (c) => {
  return c.json({ status: "ok" });
});

// Get salon settings
app.get("/make-server-6b68b787/salon/settings", async (c) => {
  const settings = await kv.get("salon_settings");
  if (!settings) {
    const defaultSettings = {
      name: "Beauty Salon",
      address: "123 Main Street, City",
      phone: "+1234567890",
      email: "info@beautysalon.com",
      workingHours: {
        monday: { start: "09:00", end: "20:00" },
        tuesday: { start: "09:00", end: "20:00" },
        wednesday: { start: "09:00", end: "20:00" },
        thursday: { start: "09:00", end: "20:00" },
        friday: { start: "09:00", end: "20:00" },
        saturday: { start: "10:00", end: "18:00" },
        sunday: { start: "10:00", end: "16:00" }
      }
    };
    await kv.set("salon_settings", defaultSettings);
    return c.json(defaultSettings);
  }
  return c.json(settings);
});

// Get all services
app.get("/make-server-6b68b787/services", async (c) => {
  const services = await kv.getByPrefix("service:");
  if (services.length === 0) {
    // Create default services
    const defaultServices = [
      { id: "1", name: { en: "Haircut", ru: "Стрижка", es: "Corte de pelo", ar: "قص شعر", hi: "बाल कटाना", kk: "Шаш қию", pt: "Corte de cabelo", fr: "Coupe de cheveux", de: "Haarschnitt" }, category: "hair", duration: 30, price: 50, description: { en: "Professional haircut", ru: "Профессиональная стрижка", es: "Corte de pelo profesional", ar: "قص شعر احترافي", hi: "पेशेवर बाल कटाना", kk: "Кәсіби шаш қию", pt: "Corte de cabelo profissional", fr: "Coupe de cheveux professionnelle", de: "Professioneller Haarschnitt" } },
      { id: "2", name: { en: "Hair Coloring", ru: "Окрашивание волос", es: "Coloración de cabello", ar: "صبغ الشعر", hi: "बाल रंगना", kk: "Шаш бояу", pt: "Coloración de cabelo", fr: "Coloration des cheveux", de: "Haarfärbung" }, category: "hair", duration: 90, price: 120, description: { en: "Professional hair coloring", ru: "Профессиональное окрашивание", es: "Coloración profesional", ar: "صبغ احترافي", hi: "पेशेवर बाल रंगना", kk: "Кәсіби бояу", pt: "Coloración profissional", fr: "Coloration professionnelle", de: "Professionelle Färbung" } },
      { id: "3", name: { en: "Manicure", ru: "Маникюр", es: "Manicura", ar: "مانيكير", hi: "मैनीक्योर", kk: "Маникюр", pt: "Manicure", fr: "Manucure", de: "Maniküre" }, category: "nails", duration: 45, price: 35, description: { en: "Professional manicure", ru: "Профессиональный маникюр", es: "Manicura profesional", ar: "مانيكير احترافي", hi: "पेशेवर मैनीक्योर", kk: "Кәсіби маникюр", pt: "Manicure profissional", fr: "Manucure professionnelle", de: "Professionelle Maniküre" } },
      { id: "4", name: { en: "Pedicure", ru: "Педикюр", es: "Pedicura", ar: "باديكير", hi: "पेडीक्योर", kk: "Педикюр", pt: "Pedicure", fr: "Pédicure", de: "Pediküre" }, category: "nails", duration: 60, price: 45, description: { en: "Professional pedicure", ru: "Профессиональный педикюр", es: "Pedicura profesional", ar: "باديكير احترافي", hi: "पेशेवर पेडीक्योर", kk: "Кәсіби педикюр", pt: "Pedicure profissional", fr: "Pédicure professionnelle", de: "Professionelle Pediküre" } },
      { id: "5", name: { en: "Facial Treatment", ru: "Уход за лицом", es: "Tratamiento facial", ar: "علاج الوجه", hi: "फेशियल ट्रीटमेंट", kk: "Бет күтімі", pt: "Tratamento facial", fr: "Soin du visage", de: "Gesichtsbehandlung" }, category: "face", duration: 60, price: 80, description: { en: "Deep cleansing facial", ru: "Глубокая чистка лица", es: "Limpieza facial profunda", ar: "تنظيف عميق للوجه", hi: "गहरी सफाई फेशियल", kk: "Терең тазалау", pt: "Limpeza facial profunda", fr: "Nettoyage en profondeur", de: "Tiefenreinigung" } },
      { id: "6", name: { en: "Massage", ru: "Массаж", es: "Masaje", ar: "مساج", hi: "मालिश", kk: "Массаж", pt: "Massagem", fr: "Massage", de: "Massage" }, category: "body", duration: 60, price: 70, description: { en: "Relaxing full body massage", ru: "Расслабляющий массаж тела", es: "Masaje corporal relajante", ar: "تدليك الجسم بالكامل", hi: "आरामदायक पूर्ण शरीर मालिश", kk: "Релаксациялық массаж", pt: "Massagem corporal relaxante", fr: "Massage corporel relaxant", de: "Entspannende Ganzkörpermassage" } }
    ];
    for (const service of defaultServices) {
      await kv.set(`service:${service.id}`, service);
    }
    return c.json(defaultServices);
  }
  return c.json(services);
});

// Get all professionals
app.get("/make-server-6b68b787/professionals", async (c) => {
  const professionals = await kv.getByPrefix("professional:");
  if (professionals.length === 0) {
    const defaultProfessionals = [
      { id: "1", name: "Anna Smith", position: "Senior Stylist", rating: 4.9, reviews: 127, avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200", specialties: ["1", "2"] },
      { id: "2", name: "Maria Garcia", position: "Master Colorist", rating: 4.8, reviews: 98, avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200", specialties: ["2"] },
      { id: "3", name: "Sophie Laurent", position: "Nail Technician", rating: 4.7, reviews: 156, avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200", specialties: ["3", "4"] },
      { id: "4", name: "Elena Petrova", position: "Esthetician", rating: 4.9, reviews: 143, avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200", specialties: ["5"] },
      { id: "5", name: "Julia Martinez", position: "Massage Therapist", rating: 5.0, reviews: 89, avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200", specialties: ["6"] }
    ];
    for (const prof of defaultProfessionals) {
      await kv.set(`professional:${prof.id}`, prof);
    }
    return c.json(defaultProfessionals);
  }
  return c.json(professionals);
});

// Get available dates
app.post("/make-server-6b68b787/booking/available-dates", async (c) => {
  const { professionalId, serviceIds } = await c.req.json();
  const today = new Date();
  const availableDates = [];
  
  // Generate next 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dayOfWeek = date.getDay();
    
    // Skip Sundays for this example
    if (dayOfWeek !== 0) {
      availableDates.push(date.toISOString().split('T')[0]);
    }
  }
  
  return c.json({ dates: availableDates });
});

// Get available time slots
app.post("/make-server-6b68b787/booking/available-slots", async (c) => {
  const { date, professionalId, serviceIds, duration } = await c.req.json();
  
  const selectedDate = new Date(date);
  const dayOfWeek = selectedDate.getDay();
  
  // Define working hours based on day
  let startHour = 9;
  let endHour = 20;
  
  if (dayOfWeek === 6) { // Saturday
    startHour = 10;
    endHour = 18;
  } else if (dayOfWeek === 0) { // Sunday
    startHour = 10;
    endHour = 16;
  }
  
  const slots = [];
  const totalDuration = duration || 60;
  const slotInterval = 30; // 30-minute intervals
  
  // Get existing bookings for this date
  const bookingKey = `booking:${date}:${professionalId || 'any'}`;
  const existingBookings = await kv.get(bookingKey) || [];
  
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += slotInterval) {
      const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      const timeInMinutes = hour * 60 + minute;
      const endTimeInMinutes = timeInMinutes + totalDuration;
      
      // Check if slot is available
      const isBooked = existingBookings.some((booking: any) => {
        const bookingStart = parseInt(booking.time.split(':')[0]) * 60 + parseInt(booking.time.split(':')[1]);
        const bookingEnd = bookingStart + booking.duration;
        return (timeInMinutes < bookingEnd && endTimeInMinutes > bookingStart);
      });
      
      if (!isBooked && endTimeInMinutes <= endHour * 60) {
        const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
        const isOptimal = (hour === 10 || hour === 14 || hour === 16);
        slots.push({ time, period, isOptimal, available: true });
      }
    }
  }
  
  return c.json({ slots });
});

// Create booking
app.post("/make-server-6b68b787/booking/create", async (c) => {
  const { services, professionalId, date, time, phone, duration } = await c.req.json();
  
  if (!services || !date || !time) {
    return c.json({ error: "Missing required fields" }, 400);
  }
  
  // Generate booking ID
  const bookingId = `BK${Date.now()}`;
  
  // Create booking object
  const booking = {
    id: bookingId,
    services,
    professionalId: professionalId || 'any',
    date,
    time,
    phone,
    duration,
    status: 'confirmed',
    createdAt: new Date().toISOString()
  };
  
  // Save booking
  await kv.set(`booking:${bookingId}`, booking);
  
  // Update slot availability
  const bookingKey = `booking:${date}:${professionalId || 'any'}`;
  const existingBookings = await kv.get(bookingKey) || [];
  existingBookings.push({ bookingId, time, duration });
  await kv.set(bookingKey, existingBookings);
  
  return c.json({ success: true, booking });
});

// Get user bookings
app.get("/make-server-6b68b787/booking/user/:phone", async (c) => {
  const phone = c.req.param('phone');
  const allBookings = await kv.getByPrefix("booking:BK");
  const userBookings = allBookings.filter((b: any) => b.phone === phone);
  return c.json({ bookings: userBookings });
});

Deno.serve(app.fetch);