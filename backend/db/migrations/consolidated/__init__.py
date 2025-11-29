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

__all__ = [
    # Users
    'migrate_users_schema',
    # Bookings
    'migrate_bookings_schema',
    # Services
    'migrate_services_schema',
    # Clients
    'migrate_clients_schema',
    # Bot
    'migrate_bot_schema',
    # Salon
    'migrate_salon_schema',
    # Other
    'migrate_other_schema',
    # Gallery
    'migrate_gallery_schema',
    'add_show_on_public_page_to_users',
    'import_gallery_images',
]
