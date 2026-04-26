from django.db import models


class Report(models.Model):
    SEVERITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
    ]

    latitude = models.FloatField()
    longitude = models.FloatField()
    disease = models.CharField(max_length=64)
    severity = models.CharField(max_length=8, choices=SEVERITY_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    session_id = models.CharField(max_length=64, db_index=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self) -> str:
        return f"{self.disease} ({self.severity}) @ {self.latitude:.3f},{self.longitude:.3f}"
