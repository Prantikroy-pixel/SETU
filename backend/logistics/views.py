"""
Views for logistics app.
Provides Vehicle fleet management and real-time GPS ping location updates.
"""

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Vehicle
from .serializers import VehicleSerializer, VehiclePingSerializer
from core.spatial_compat import HAS_GIS
from accounts.permissions import IsTransportOperatorOrAdminOrReadOnly

if HAS_GIS:
    from django.contrib.gis.geos import Point
else:
    from core.spatial_compat import MockPoint as Point


class VehicleViewSet(viewsets.ModelViewSet):
    """
    Fleet management and GPS location updates for transport vehicles.
    GET /api/vehicles/ (Public read-only)
    POST / PUT / PATCH / DELETE /api/vehicles/{id}/ (Assigned Operator or Admin only)
    POST /api/vehicles/{id}/ping/ (Assigned Operator or Admin only)
    """
    queryset = Vehicle.objects.all().select_related('operator')
    serializer_class = VehicleSerializer
    permission_classes = [IsTransportOperatorOrAdminOrReadOnly]

    def perform_create(self, serializer):
        if self.request.user and self.request.user.is_authenticated:
            serializer.save(operator=self.request.user)
        else:
            default_op = User.objects.filter(role='transport_operator').first()
            serializer.save(operator=default_op)

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get('status')
        operator_param = self.request.query_params.get('operator')
        if status_param:
            qs = qs.filter(status=status_param)
        if operator_param:
            qs = qs.filter(operator_id=operator_param)
        return qs

    @action(detail=True, methods=['post'], url_path='ping')
    def ping(self, request, pk=None):
        """
        POST /api/vehicles/{id}/ping/
        Payload: { "latitude": 24.8333, "longitude": 92.7789, "status": "en_route" }
        Updates the vehicle's live coordinates and timestamp.
        """
        vehicle = self.get_object()
        serializer = VehiclePingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        lat = serializer.validated_data['latitude']
        lon = serializer.validated_data['longitude']
        new_status = serializer.validated_data.get('status')

        vehicle.current_location = Point(lon, lat)
        vehicle.last_ping_at = timezone.now()
        if new_status:
            vehicle.status = new_status

        vehicle.save()

        return Response({
            'message': 'Vehicle GPS ping updated successfully.',
            'vehicle': VehicleSerializer(vehicle).data
        }, status=status.HTTP_200_OK)
