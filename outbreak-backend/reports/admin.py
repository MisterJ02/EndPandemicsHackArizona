from django.contrib import admin
from .models import Report


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ("id", "disease", "severity", "latitude", "longitude", "timestamp", "session_id")
    list_filter = ("disease", "severity")
    search_fields = ("session_id", "disease")
