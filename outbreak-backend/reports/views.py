import json
import urllib.request

from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView

from .models import Report
from .serializers import ReportSerializer

WMO_DESCRIPTIONS: dict[int, str] = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Icy fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Heavy freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}
 
 
def _wmo_to_condition(code: int) -> str:
    return WMO_DESCRIPTIONS.get(code, f"Unknown (WMO {code})")
 
 
def _fetch_open_meteo(lat: float, lng: float) -> dict:
    """
    Calls Open-Meteo for current weather variables at (lat, lng).
    Returns parsed JSON dict.  Raises on HTTP / JSON errors.
    """
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lng}"
        "&current=temperature_2m,relative_humidity_2m,apparent_temperature,"
        "precipitation,weather_code,wind_speed_10m,wind_direction_10m"
        "&temperature_unit=fahrenheit"
        "&wind_speed_unit=mph"
        "&precipitation_unit=inch"
        "&timezone=auto"
        "&forecast_days=1"
    )
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=6) as resp:
        raw = resp.read()
    return json.loads(raw)
 
 
class WeatherView(APIView):
    """
    GET /api/weather/?lat=33.4484&lng=-112.0740
 
    Returns:
    {
        "temperature_f": 98.6,
        "feels_like_f": 101.2,
        "humidity_pct": 14,
        "precipitation_in": 0.0,
        "wind_speed_mph": 8.4,
        "wind_direction_deg": 220,
        "weather_code": 0,
        "condition": "Clear sky",
        "timezone": "America/Phoenix",
        "is_day": true            # derived from Open-Meteo apparent_temperature sign convention
    }
    """
 
    def get(self, request):
        # ---- parse & validate query params --------------------------------
        try:
            lat = float(request.query_params.get("lat", ""))
            lng = float(request.query_params.get("lng", ""))
        except (TypeError, ValueError):
            return Response(
                {"detail": "lat and lng query parameters are required and must be numbers."},
                status=status.HTTP_400_BAD_REQUEST,
            )
 
        if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
            return Response(
                {"detail": "lat must be in [-90, 90] and lng in [-180, 180]."},
                status=status.HTTP_400_BAD_REQUEST,
            )
 
        # ---- call Open-Meteo ----------------------------------------------
        try:
            data = _fetch_open_meteo(lat, lng)
        except Exception as exc:
            return Response(
                {"detail": f"Failed to reach Open-Meteo: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
 
        current = data.get("current", {})
        code = int(current.get("weather_code", 0))
 
        payload = {
            "temperature_f": current.get("temperature_2m"),
            "feels_like_f": current.get("apparent_temperature"),
            "humidity_pct": current.get("relative_humidity_2m"),
            "precipitation_in": current.get("precipitation"),
            "wind_speed_mph": current.get("wind_speed_10m"),
            "wind_direction_deg": current.get("wind_direction_10m"),
            "weather_code": code,
            "condition": _wmo_to_condition(code),
            "timezone": data.get("timezone", ""),
        }
 
        return Response(payload)

def _extract_session_id(request) -> str:
    """Pulls session_id from header first, falling back to body."""
    sid = request.headers.get("X-Session-Id", "").strip()
    if sid:
        return sid
    data = request.data if hasattr(request, "data") else {}
    if isinstance(data, dict):
        return (data.get("session_id") or "").strip()
    return ""


class ReportListCreate(generics.ListCreateAPIView):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer


class ReportDestroy(generics.DestroyAPIView):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer

    def destroy(self, request, *args, **kwargs):
        report = self.get_object()
        sid = _extract_session_id(request)
        if not sid:
            return Response(
                {"detail": "session_id required"}, status=status.HTTP_400_BAD_REQUEST
            )
        if report.session_id != sid:
            return Response(
                {"detail": "You can only delete reports created by your session."},
                status=status.HTTP_403_FORBIDDEN,
            )
        report.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
