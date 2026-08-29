"""
Management command to seed realistic disaster relief and logistics demo data for SETU.
Usage: python manage.py seed_demo_data
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from core.models import District, Need, Resource, Condition, Alert, Allocation
from logistics.models import Vehicle
from matching.models import Match
from matching.services import find_and_score_matches_for_need, confirm_match_and_allocate
from core.spatial_compat import HAS_GIS

if HAS_GIS:
    from django.contrib.gis.geos import Point
else:
    from core.spatial_compat import MockPoint as Point

User = get_user_model()


class Command(BaseCommand):
    help = "Seed realistic Northeast India demo data for SETU platform"

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Seeding SETU demonstration data..."))

        # 1. Create Districts
        districts_info = [
            {"name": "Cachar", "state": "Assam", "lat": 24.8333, "lon": 92.7789, "pop": 1736000},
            {"name": "East Khasi Hills", "state": "Meghalaya", "lat": 25.5788, "lon": 91.8933, "pop": 825922},
            {"name": "Kamrup Metropolitan", "state": "Assam", "lat": 26.1445, "lon": 91.7362, "pop": 1253938},
            {"name": "Dima Hasao", "state": "Assam", "lat": 25.1833, "lon": 93.0167, "pop": 214102},
            {"name": "Majuli", "state": "Assam", "lat": 26.9500, "lon": 94.2167, "pop": 167300},
        ]

        from core.boundary_service import RealtimeBoundaryFetcher
        boundary_fetcher = RealtimeBoundaryFetcher()

        district_map = {}
        for d in districts_info:
            dist_obj, created = District.objects.get_or_create(
                name=d["name"],
                defaults={
                    "state": d["state"],
                    "population": d["pop"],
                    "centroid": Point(d["lon"], d["lat"]),
                }
            )
            district_map[d["name"]] = dist_obj
            self.stdout.write(f"District: {dist_obj.name} ({dist_obj.state})")

        # 2. Create Users with different roles
        users_data = [
            {"username": "officer_ananda", "email": "ananda@setu.org", "role": "field_officer", "district": district_map["Cachar"], "verified": True},
            {"username": "admin_aryan", "email": "aryan@setu.org", "role": "district_admin", "district": district_map["Kamrup Metropolitan"], "verified": True},
            {"username": "operator_rajesh", "email": "rajesh.transport@setu.org", "role": "transport_operator", "district": district_map["Cachar"], "verified": True},
            {"username": "redcross_assam", "email": "relief@redcross.org", "role": "ngo", "district": district_map["Kamrup Metropolitan"], "verified": True},
            {"username": "citizen_priya", "email": "priya@gmail.com", "role": "citizen", "district": district_map["East Khasi Hills"], "verified": False},
        ]

        user_map = {}
        for u in users_data:
            user, created = User.objects.get_or_create(
                username=u["username"],
                defaults={
                    "email": u["email"],
                    "role": u["role"],
                    "district": u["district"],
                    "is_verified": u["verified"],
                    "phone_number": "+919876543210"
                }
            )
            user.set_password("Password123!")
            if u["role"] in ["district_admin", "admin"]:
                user.is_staff = True
                user.is_superuser = True
            user.save()
            user_map[u["username"]] = user

        # 3. Create Vehicles
        v1, _ = Vehicle.objects.get_or_create(
            registration_number="AS-11-BC-4401",
            defaults={
                "vehicle_type": "5-Ton 4x4 Heavy Relief Truck",
                "operator": user_map["operator_rajesh"],
                "current_location": Point(92.7800, 24.8350),
                "status": "idle"
            }
        )

        v2, _ = Vehicle.objects.get_or_create(
            registration_number="ML-05-AA-7890",
            defaults={
                "vehicle_type": "High-Clearance Pickup",
                "operator": user_map["operator_rajesh"],
                "current_location": Point(91.8900, 25.5700),
                "status": "idle"
            }
        )

        # 4. Create Available Resources
        res_data = [
            {
                "type": "medicine",
                "quantity": 1200,
                "unit": "packets",
                "lat": 24.8400,
                "lon": 92.7850,
                "district": district_map["Cachar"],
                "provider": user_map["redcross_assam"],
                "status": "verified_org"
            },
            {
                "type": "food",
                "quantity": 3500,
                "unit": "kg",
                "lat": 26.1500,
                "lon": 91.7400,
                "district": district_map["Kamrup Metropolitan"],
                "provider": user_map["redcross_assam"],
                "status": "verified_org"
            },
            {
                "type": "water",
                "quantity": 5000,
                "unit": "litres",
                "lat": 24.8250,
                "lon": 92.7700,
                "district": district_map["Cachar"],
                "provider": user_map["officer_ananda"],
                "status": "verified_org"
            },
            {
                "type": "construction_material",
                "quantity": 800,
                "unit": "tarpaulins",
                "lat": 25.5800,
                "lon": 91.9000,
                "district": district_map["East Khasi Hills"],
                "provider": user_map["citizen_priya"],
                "status": "unverified"
            }
        ]

        for r in res_data:
            Resource.objects.get_or_create(
                type=r["type"],
                district=r["district"],
                provider=r["provider"],
                defaults={
                    "quantity_available": r["quantity"],
                    "unit": r["unit"],
                    "location": Point(r["lon"], r["lat"]),
                    "verification_status": r["status"],
                }
            )

        # 5. Create Urgent Needs
        need_data = [
            {
                "type": "medicine",
                "urgency": "critical",
                "quantity": 300,
                "unit": "packets",
                "lat": 24.8300,
                "lon": 92.7750,
                "district": district_map["Cachar"],
                "reported_by": user_map["officer_ananda"],
                "description": "Urgent ORS, IV fluids and anti-venom at flooded relief camp."
            },
            {
                "type": "water",
                "urgency": "high",
                "quantity": 1500,
                "unit": "litres",
                "lat": 25.1850,
                "lon": 93.0200,
                "district": district_map["Dima Hasao"],
                "reported_by": user_map["officer_ananda"],
                "description": "Drinking water contamination after flash flood in Haflong valley."
            }
        ]

        created_needs = []
        for n in need_data:
            need_obj, _ = Need.objects.get_or_create(
                type=n["type"],
                district=n["district"],
                reported_by=n["reported_by"],
                defaults={
                    "urgency": n["urgency"],
                    "quantity": n["quantity"],
                    "unit": n["unit"],
                    "location": Point(n["lon"], n["lat"]),
                    "description": n["description"],
                    "status": "open"
                }
            )
            created_needs.append(need_obj)

        # 6. Create Condition Reports and trigger alerts
        Condition.objects.get_or_create(
            district=district_map["Dima Hasao"],
            condition_type="road_status",
            defaults={
                "value": "blocked",
                "location": Point(93.0100, 25.1800),
                "reported_by": user_map["officer_ananda"],
                "source": "field_report"
            }
        )

        Condition.objects.get_or_create(
            district=district_map["Cachar"],
            condition_type="rainfall",
            defaults={
                "value": "115mm",
                "risk_score": 0.82,
                "location": Point(92.7800, 24.8300),
                "reported_by": user_map["officer_ananda"],
                "source": "weather_api"
            }
        )

        # 7. Run matching engine and confirm one match
        if created_needs:
            sample_need = created_needs[0]
            matches = find_and_score_matches_for_need(sample_need)
            self.stdout.write(f"Scored {len(matches)} matches for Need #{sample_need.id}")
            if matches:
                top_match = matches[0]
                alloc = confirm_match_and_allocate(top_match, vehicle=v1)
                self.stdout.write(f"Confirmed Match #{top_match.id} -> Created Allocation #{alloc.id}")

        self.stdout.write(self.style.SUCCESS("SETU demonstration data seeded successfully!"))
