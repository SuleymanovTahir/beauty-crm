from fastapi import FastAPI

from crm_api import router as api_root_router
from crm_api.dashboard import router as dashboard_router
from crm_api.funnel import router as funnel_router
from crm_api.tasks import router as tasks_router
from crm_api.schedule import router as schedule_router
from crm_api.loyalty import router as loyalty_router
from crm_api.newsletter import router as newsletter_router
from crm_api.invoices import router as invoices_router
from crm_api.contracts import router as contracts_router
from crm_api.telephony import router as telephony_router
from crm_api.recordings import router as recordings_router
from crm_api.holidays import router as holidays_router
from crm_api.visitor_analytics import router as visitor_analytics_router
from crm_api.automation import router as automation_router
from crm_api.reports import router as reports_router
from crm_api.audit import router as audit_router
from crm_api.webrtc_signaling import router as webrtc_router
from crm_api.notifications_ws import router as notifications_ws_router
from crm_api.ringtones import router as ringtones_router
from crm_api.notifications import router as notifications_router
from crm_api.chat_ws import router as chat_ws_router
from crm_api.reminders import router as reminders_router
from crm_api.push_tokens import router as push_tokens_router
from crm_api.database_explorer import router as db_explorer_router
from crm_api.menu_settings import router as menu_settings_router
from crm_api.service_change_requests import router as service_change_requests_router
from crm_api.positions import router as positions_router
from crm_api.products import router as products_router
from crm_api.promo_codes import router as promo_codes_router
from crm_api.subscriptions import router as subscriptions_router
from crm_api.broadcasts import router as broadcasts_router
from crm_api.trash import router as trash_router
from crm_api.messengers import router as messengers_router
from crm_api.marketplace_integrations import router as marketplace_router
from crm_api.payment_integrations import router as payment_integrations_router
from crm_api.admin_stubs import router as admin_stubs_router
from crm_api.admin_features import router as admin_features_router
from crm_api.internal_chat import router as internal_chat_router
from crm_api.statuses import router as statuses_router
from crm_api.gallery import router as gallery_router
from crm_api.admin_registrations import router as admin_registrations_router


def mount_crm_routers(app: FastAPI) -> None:
    """
    Mount routers used by CRM runtime group.
    """
    app.include_router(api_root_router, prefix="/api")

    # WebSocket endpoints.
    app.include_router(webrtc_router, prefix="/api/webrtc")
    app.include_router(notifications_ws_router, prefix="/api/ws")
    app.include_router(chat_ws_router, prefix="/api/ws")

    app.include_router(dashboard_router, prefix="/api")
    app.include_router(funnel_router, prefix="/api")
    app.include_router(tasks_router, prefix="/api")
    app.include_router(schedule_router, prefix="/api")
    app.include_router(loyalty_router, prefix="/api")
    app.include_router(newsletter_router, prefix="/api")
    app.include_router(invoices_router, prefix="/api")
    app.include_router(contracts_router, prefix="/api")
    app.include_router(telephony_router, prefix="/api")
    app.include_router(recordings_router, prefix="/api")
    app.include_router(ringtones_router, prefix="/api")
    app.include_router(reminders_router, prefix="/api")
    app.include_router(notifications_router, prefix="/api")
    app.include_router(automation_router, prefix="/api")
    app.include_router(reports_router, prefix="/api")
    app.include_router(holidays_router, prefix="/api/holidays")
    app.include_router(visitor_analytics_router, prefix="/api")
    app.include_router(audit_router, prefix="/api")
    app.include_router(db_explorer_router)
    app.include_router(push_tokens_router)
    app.include_router(menu_settings_router, prefix="/api")
    app.include_router(service_change_requests_router, prefix="/api")
    app.include_router(positions_router, prefix="/api")
    app.include_router(products_router, prefix="/api")
    app.include_router(promo_codes_router, prefix="/api")
    app.include_router(subscriptions_router, prefix="/api")
    app.include_router(broadcasts_router, prefix="/api")
    app.include_router(trash_router, prefix="/api")
    app.include_router(messengers_router, prefix="/api")
    app.include_router(marketplace_router, prefix="/api")
    app.include_router(payment_integrations_router, prefix="/api")
    app.include_router(admin_stubs_router, prefix="/api")
    app.include_router(admin_features_router, prefix="/api")
    app.include_router(internal_chat_router)  # already has /api/internal-chat prefix
    app.include_router(statuses_router, prefix="/api")
    app.include_router(gallery_router, prefix="/api")
    app.include_router(admin_registrations_router, prefix="/api")
