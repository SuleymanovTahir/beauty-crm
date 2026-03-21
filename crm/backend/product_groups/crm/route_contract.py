CRM_MODULE_ROUTE_MATCHERS = [
    ("dashboard", ("/api/dashboard",)),
    ("bookings", ("/api/bookings",)),
    ("calendar", ("/api/schedule",)),
    ("clients", ("/api/clients", "/api/search")),
    ("team", ("/api/users", "/api/employees", "/api/roles", "/api/permissions", "/api/positions")),
    ("services", ("/api/services",)),
    ("tasks", ("/api/tasks",)),
    ("analytics", ("/api/analytics", "/api/stats", "/api/advanced-analytics", "/api/client-insights", "/api/performance-metrics", "/api/reports")),
    ("funnel", ("/api/funnel",)),
    ("products", ("/api/products",)),
    ("invoices", ("/api/invoices",)),
    ("contracts", ("/api/contracts",)),
    ("telephony", ("/api/telephony", "/api/recordings", "/api/ringtones")),
    ("messengers", ("/api/messengers", "/api/chat")),
    ("internal_chat", ("/api/internal-chat",)),
    ("broadcasts", ("/api/broadcasts",)),
    ("referrals", ("/api/referral-campaigns",)),
    ("loyalty", ("/api/loyalty",)),
    ("challenges", ("/api/challenges",)),
    ("promo_codes", ("/api/promo-codes",)),
    ("service_change_requests", ("/api/my/services", "/api/my/change-requests")),
    ("bot_settings", ("/api/bot-settings", "/api/settings/bot")),
    ("notifications", ("/api/notifications", "/api/unread-count")),
    ("plans", ("/api/plans",)),
    ("payment_integrations", ("/api/payment-providers", "/api/create-payment", "/api/transactions")),
    ("marketplace_integrations", ("/api/marketplace-providers", "/api/marketplace", "/api/sync")),
]

RUNTIME_CRM_ONLY_PREFIXES = (
    "/api/ws",
    "/api/webrtc",
    "/api/internal-chat",
)

CRM_WEBSOCKET_PREFIXES = (
    "/api/ws",
    "/api/webrtc",
)
