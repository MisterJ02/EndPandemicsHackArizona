from rest_framework import serializers

from .models import Report


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ["id", "latitude", "longitude", "disease", "severity", "timestamp", "session_id"]
        read_only_fields = ["id", "timestamp"]

    def validate_session_id(self, value: str) -> str:
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("session_id is required")
        if len(value) > 64:
            raise serializers.ValidationError("session_id too long")
        return value
