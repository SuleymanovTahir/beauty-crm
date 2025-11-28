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

__all__ = [
    'migrate_users_schema',
    'migrate_bookings_schema',
    'migrate_services_schema',
    'migrate_clients_schema',
    'migrate_bot_schema',
    'migrate_salon_schema',
    'migrate_other_schema',
]
