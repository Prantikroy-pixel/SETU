"""
WSGI config for config project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
"""

import os
import sys
from pathlib import Path

# Add backend directory to python path for Vercel deployment
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Also add workspace root so matching_engine is importable
ROOT_DIR = BASE_DIR.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_wsgi_application()
app = application

# Auto-migrate and seed demo accounts on WSGI server startup if tables don't exist
try:
    from django.core.management import call_command
    from django.contrib.auth import get_user_model
    call_command('migrate', interactive=False)

    User = get_user_model()
    if not User.objects.filter(username='admin_aryan').exists():
        call_command('seed_demo_data')
except Exception as e:
    print(f"[WSGI Startup] Auto-migration/seed note: {e}")
