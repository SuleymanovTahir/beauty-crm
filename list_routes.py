
import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from main import app

for route in app.routes:
    if hasattr(route, 'methods'):
        print(f"{list(route.methods)} {route.path}")
    else:
        print(f"MOUNT {route.path}")
