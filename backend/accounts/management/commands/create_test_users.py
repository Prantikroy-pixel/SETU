from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Create test users for SETU'

    def handle(self, *args, **options):
        # Test Admin User
        if not User.objects.filter(username='admin').exists():
            User.objects.create_user(
                username='admin',
                email='admin@setu.local',
                password='admin123',
                role='admin',
                first_name='Admin',
                last_name='User',
                is_staff=True,
                is_superuser=True,
                is_verified=True
            )
            self.stdout.write(self.style.SUCCESS('Created admin user'))

        # Test District Admin
        if not User.objects.filter(username='district_admin').exists():
            User.objects.create_user(
                username='district_admin',
                email='district@setu.local',
                password='district123',
                role='district_admin',
                first_name='District',
                last_name='Admin',
                is_verified=True
            )
            self.stdout.write(self.style.SUCCESS('Created district_admin user'))

        # Test NGO User
        if not User.objects.filter(username='ngo_user').exists():
            User.objects.create_user(
                username='ngo_user',
                email='ngo@setu.local',
                password='ngo123',
                role='ngo',
                first_name='NGO',
                last_name='User',
                is_verified=True
            )
            self.stdout.write(self.style.SUCCESS('Created ngo user'))

        # Test Field Officer
        if not User.objects.filter(username='field_officer').exists():
            User.objects.create_user(
                username='field_officer',
                email='officer@setu.local',
                password='officer123',
                role='field_officer',
                first_name='Field',
                last_name='Officer',
                is_verified=True
            )
            self.stdout.write(self.style.SUCCESS('Created field_officer user'))

        # Test Transport Operator
        if not User.objects.filter(username='transport_operator').exists():
            User.objects.create_user(
                username='transport_operator',
                email='transport@setu.local',
                password='transport123',
                role='transport_operator',
                first_name='Transport',
                last_name='Operator',
                is_verified=True
            )
            self.stdout.write(self.style.SUCCESS('Created transport_operator user'))

        # Test Citizen
        if not User.objects.filter(username='citizen').exists():
            User.objects.create_user(
                username='citizen',
                email='citizen@setu.local',
                password='citizen123',
                role='citizen',
                first_name='Test',
                last_name='Citizen',
                is_verified=True
            )
            self.stdout.write(self.style.SUCCESS('Created citizen user'))

        self.stdout.write(self.style.SUCCESS('All test users created successfully!'))
