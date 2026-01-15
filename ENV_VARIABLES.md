# Environment Variables Configuration

## Salon Settings (Optional - Override Database Defaults)

These environment variables allow you to override default salon settings when the database is empty or during initialization:

```bash
# Salon Information
SALON_NAME="Your Salon Name"
SALON_ADDRESS="Your Address"
SALON_PHONE="+1234567890"
SALON_EMAIL="info@yoursalon.com"
SALON_CITY="Your City"
SALON_COUNTRY="Your Country"

# Salon Coordinates (for maps)
SALON_LATITUDE="25.2048"
SALON_LONGITUDE="55.2708"

# Social Media & Links
INSTAGRAM_URL="https://www.instagram.com/yoursalon/"
WHATSAPP_NUMBER="+1234567890"
BOOKING_URL="https://yourbooking.com"
GOOGLE_MAPS_URL="https://maps.app.goo.gl/YOUR_LINK"

# Bot Configuration
BOT_NAME="Your Salon Assistant"
BOT_NAME_EN="Your Salon Assistant"
BOT_NAME_AR="مساعد صالونك"

# System Configuration
TIMEZONE="Asia/Dubai"
CURRENCY="AED"
BASE_URL="https://your-domain.com"
PUBLIC_URL="https://your-domain.com"
PRODUCTION_URL="https://your-domain.com"
```

## Required Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost/dbname"

# SMTP (Email)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM_EMAIL="your-email@gmail.com"
SMTP_FROM_NAME="Your Salon Name"  # Optional, falls back to SALON_NAME

# PayPal
PAYPAL_MODE="sandbox"  # or "live"
PAYPAL_CLIENT_ID="your-client-id"
PAYPAL_SECRET="your-secret"

# Telegram Bot (Optional)
TELEGRAM_BOT_TOKEN="your-bot-token"
TELEGRAM_MANAGER_CHAT_ID="your-chat-id"

# Security
SECRET_KEY="your-secret-key-for-jwt"
```

## Notes

- All salon-specific variables are **optional** and will fall back to generic defaults
- The system will first try to load settings from the database
- Environment variables are used as fallbacks when database is empty
- Update salon settings through the admin panel after initial setup
- Never commit `.env` file to version control
