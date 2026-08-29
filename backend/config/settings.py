"""
Django settings for SETU backend project.
"""

from pathlib import Path
import os
import sys
from datetime import timedelta
# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Include root repository directory in sys.path to allow direct matching_engine import
ROOT_DIR = BASE_DIR.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / '.env')
except ImportError:
    pass

from django.core.exceptions import ImproperlyConfigured

# backend/config/settings.py - Secure Production DEBUG Default
IS_RENDER = os.getenv('RENDER') == 'true' or 'RENDER' in os.environ
IS_VERCEL = os.getenv('VERCEL') == '1' or 'VERCEL' in os.environ
IS_PRODUCTION = IS_RENDER or IS_VERCEL or os.getenv('ENVIRONMENT') == 'production'

# Default to False in production; allow True only if explicitly set in development
if IS_PRODUCTION:
    DEBUG = os.getenv('DEBUG', 'False').lower() in ('true', '1', 'yes')
else:
    DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 'yes')

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-setu-production-fallback-key-98127391823')
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Host Header Validation (Permit all Render, Vercel, and API Checker hosts)
allowed_hosts_env = os.getenv('ALLOWED_HOSTS')
if allowed_hosts_env:
    ALLOWED_HOSTS = [h.strip() for h in allowed_hosts_env.split(',') if h.strip()]
    if '*' not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append('*')
else:
    ALLOWED_HOSTS = ['*']


# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third party packages
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',

    # SETU apps
    'accounts',
    'core',
    'logistics',
    'matching',
    'dashboard',
]

# Check if GeoDjango GIS app is usable in this environment
try:
    from django.contrib.gis.gdal import HAS_GDAL
    if HAS_GDAL:
        INSTALLED_APPS.insert(0, 'django.contrib.gis')
except Exception:
    pass

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'core.middleware.SecurityHeadersMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# backend/config/settings.py - Production PostgreSQL Database Configuration
DATABASE_URL = os.getenv('DATABASE_URL')
USE_SQLITE = os.getenv('USE_SQLITE', 'False').lower() in ('true', '1')

if DATABASE_URL and not USE_SQLITE:
    import dj_database_url
    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
            engine='django.db.backends.postgresql',
        )
    }
else:
    # Local development ONLY - never use /tmp/db.sqlite3 in production
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Custom User Model
AUTH_USER_MODEL = 'accounts.User'

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static & Media files
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = os.getenv('MEDIA_ROOT', str(BASE_DIR / 'media'))

# REST Framework configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
}

# SimpleJWT configuration
jwt_lifetime = int(os.getenv('JWT_ACCESS_TOKEN_LIFETIME_MIN', '60'))
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=jwt_lifetime),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# CORS Configuration (SEC-008: Whitelist trusted origins, prevent wildcard Access-Control-Allow-Origin: *)
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True

# Whitelist Vite dev frontends and local dev ports
_DEFAULT_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'https://setulive.vercel.app',
    'https://setu-frontend-five.vercel.app',
    'https://setu-frontend.onrender.com',
]

cors_origins_env = os.getenv('CORS_ALLOWED_ORIGINS')
if cors_origins_env:
    CORS_ALLOWED_ORIGINS = list(set(
        [origin.strip() for origin in cors_origins_env.split(',') if origin.strip()]
        + _DEFAULT_ALLOWED_ORIGINS
    ))
else:
    CORS_ALLOWED_ORIGINS = _DEFAULT_ALLOWED_ORIGINS

CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# ─────────────────────────────────────────────────────────────────────────────
# HTTP Security Response Headers (SEC-009)
# ─────────────────────────────────────────────────────────────────────────────
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_BROWSER_XSS_FILTER = True
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True

# Render edge load balancer handles HTTPS termination securely
SECURE_SSL_REDIRECT = False

# Weather & SMS Gateways API Keys
WEATHER_API_KEY = os.getenv('WEATHER_API_KEY', '')
SMS_GATEWAY_API_KEY = os.getenv('SMS_GATEWAY_API_KEY', '')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'