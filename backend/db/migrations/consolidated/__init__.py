"""
Consolidated __init__.py for consolidated migrations
"""
from .schema_users import migrate_users_schema
from .schema_bookings import migrate_bookings_schema
from .schema_services import migrate_services_schema
from .schema_clients import migrate_clients_schema
from .schema_bot import migrate_bot_schema
from .schema_salon import migrate_salon_schema
from .schema_other import migrate_other_schema
from .schema_gallery import (
    migrate_gallery_schema,
    add_show_on_public_page_to_users,
    import_gallery_images,
)
from .schema_public import migrate_public_schema
from .schema_bot_analytics import migrate_bot_analytics_schema
from .schema_service_assignments import run_migration as migrate_service_assignments
from .schema_account_enhancements import migrate_account_enhancements
from .schema_challenges import migrate_challenges_schema
from .schema_admin_features import migrate_admin_features_schema
from . import schema_soft_delete



__all__ = [
    # Users
    'migrate_users_schema',
    # Bookings
    'migrate_bookings_schema',
    # Services
    'migrate_services_schema',
    'migrate_service_assignments',  # Assigns services to masters
    # Clients
    'migrate_clients_schema',
    # Bot
    'migrate_bot_schema',
    'migrate_bot_analytics_schema',
    # Salon
    'migrate_salon_schema',
    # Other
    'migrate_other_schema',
    # Gallery
    'migrate_gallery_schema',
    'add_show_on_public_page_to_users',
    'import_gallery_images',
    # Public Content
    'migrate_public_schema',
    # Account Enhancements
    'migrate_account_enhancements',
    # Challenges
    'migrate_challenges_schema',
    # Admin Features
    'migrate_admin_features_schema',
    'schema_soft_delete',

]


