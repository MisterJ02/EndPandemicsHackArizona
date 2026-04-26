from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Report",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("latitude", models.FloatField()),
                ("longitude", models.FloatField()),
                ("disease", models.CharField(max_length=64)),
                (
                    "severity",
                    models.CharField(
                        choices=[("low", "Low"), ("medium", "Medium"), ("high", "High")],
                        max_length=8,
                    ),
                ),
                ("timestamp", models.DateTimeField(auto_now_add=True)),
                ("session_id", models.CharField(db_index=True, max_length=64)),
            ],
            options={"ordering": ["-timestamp"]},
        ),
    ]
