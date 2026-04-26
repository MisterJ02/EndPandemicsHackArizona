from django.urls import path

from .views import ReportListCreate, ReportDestroy, WeatherView


urlpatterns = [
    path("reports/", ReportListCreate.as_view(), name="report-list-create"),
    path("reports/<int:pk>/", ReportDestroy.as_view(), name="report-destroy"),
    path("weather/",WeatherView.as_view(),name="weather"),   # ← add this
]
