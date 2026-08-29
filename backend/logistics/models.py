"""
Logistics models for SETU.
Defines Vehicle for GPS fleet tracking and operator assignment.
"""

from django.db import models
from django.conf import settings
from core.spatial_compat import SpatialPointField


class Vehicle(models.Model):
    STATUS_IDLE = 'idle'
    STATUS_EN_ROUTE = 'en_route'
    STATUS_DELIVERED = 'delivered'
    STATUS_UNAVAILABLE = 'unavailable'

    STATUS_CHOICES = [
        (STATUS_IDLE, 'Idle / Available'),
        (STATUS_EN_ROUTE, 'En Route'),
        (STATUS_DELIVERED, 'Delivered'),
        (STATUS_UNAVAILABLE, 'Unavailable / Maintenance'),
    ]

    registration_number = models.CharField(
        max_length=20,
        unique=True,
        help_text="Official vehicle registration number e.g. AS-01-AB-1234"
    )
    vehicle_type = models.CharField(
        max_length=30,
        help_text="e.g. 5-Ton Truck, 4x4 Pickup, Delivery Van, Relief Boat"
    )
    operator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vehicles',
        help_text="Assigned transport operator"
    )
    current_location = SpatialPointField(
        geography=True,
        null=True,
        blank=True,
        help_text="Real-time GPS coordinate from last ping"
    )
    last_ping_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_IDLE
    )

    class Meta:
        ordering = ['registration_number']

    def __str__(self):
        return f"{self.registration_number} ({self.vehicle_type}) - {self.get_status_display()}"
