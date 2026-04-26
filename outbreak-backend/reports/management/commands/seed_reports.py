"""Seed the database with sample outbreak reports clustered around Phoenix, AZ."""
import random

from django.core.management.base import BaseCommand

from reports.models import Report


DISEASES = [
    "Flu",
    "COVID-19",
    "RSV",
    "Norovirus",
    "Food Poisoning",
    "Unknown Respiratory Illness",
]
SEVERITIES = ["low", "medium", "high"]

# Clusters: (center_lat, center_lng, count, spread_deg)
CLUSTERS = [
    (33.4484, -112.0740, 6, 0.06),  # Phoenix
    (33.5806, -111.8990, 4, 0.04),  # Scottsdale
    (33.4152, -111.8315, 3, 0.05),  # Tempe / Mesa
    (32.2226, -110.9747, 2, 0.05),  # Tucson
]


class Command(BaseCommand):
    help = "Seed the database with sample outbreak reports."

    def add_arguments(self, parser):
        parser.add_argument("--clear", action="store_true", help="Delete existing seeded reports first")

    def handle(self, *args, **opts):
        random.seed(42)
        if opts["clear"]:
            n, _ = Report.objects.filter(session_id__startswith="seed-").delete()
            self.stdout.write(self.style.WARNING(f"Cleared {n} seeded reports"))

        created = 0
        for i, (lat, lng, count, spread) in enumerate(CLUSTERS):
            for _ in range(count):
                Report.objects.create(
                    latitude=lat + random.uniform(-spread, spread),
                    longitude=lng + random.uniform(-spread, spread),
                    disease=random.choice(DISEASES),
                    severity=random.choices(SEVERITIES, weights=[3, 4, 2])[0],
                    session_id=f"seed-cluster-{i}",
                )
                created += 1

        self.stdout.write(self.style.SUCCESS(f"Seeded {created} reports."))
