from django.urls import path

from .views import ReportListCreate, ReportDestroy


urlpatterns = [
    path("reports/", ReportListCreate.as_view(), name="report-list-create"),
    path("reports/<int:pk>/", ReportDestroy.as_view(), name="report-destroy"),
]
