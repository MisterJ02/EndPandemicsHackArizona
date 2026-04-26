# Outbreak Risk Tracker — Django Backend

Django 5 + DRF + PostgreSQL backend for the Outbreak Risk Tracker frontend.

## Endpoints

| Method | Path                  | Description                                               |
|--------|-----------------------|-----------------------------------------------------------|
| GET    | `/api/reports/`       | List all reports                                          |
| POST   | `/api/reports/`       | Create a report (body must include `session_id`)          |
| DELETE | `/api/reports/<id>/`  | Delete report (only if request `session_id` matches row)  |

`session_id` may be sent in the `X-Session-Id` header **or** in the request body.

### Example

```bash
curl http://localhost:8000/api/reports/

curl -X POST http://localhost:8000/api/reports/ \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: abc-123" \
  -d '{"latitude":33.4,"longitude":-112.0,"disease":"Flu","severity":"medium","session_id":"abc-123"}'

curl -X DELETE http://localhost:8000/api/reports/1/ \
  -H "X-Session-Id: abc-123"
```

## Run with Docker (recommended — one command)

```bash
docker compose up --build
```

Backend will be on `http://localhost:8000` with seed data loaded.

## Run locally (without Docker)

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Postgres must be running locally. Create a database:
createdb outbreak

cp .env.example .env                # then edit DATABASE_URL if needed

python manage.py migrate
python manage.py seed_reports       # ~15 sample reports around Phoenix/Tucson
python manage.py runserver
```

## Configuration (env vars)

| Variable               | Default                                                | Notes                                |
|------------------------|--------------------------------------------------------|--------------------------------------|
| `DEBUG`                | `True`                                                 | Set `False` in production            |
| `SECRET_KEY`           | dev key                                                | **Required** in production           |
| `DATABASE_URL`         | `postgres://postgres:postgres@localhost:5432/outbreak` | Postgres URL                         |
| `ALLOWED_HOSTS`        | `*`                                                    | Comma-separated                      |
| `CORS_ALLOWED_ORIGINS` | (regex defaults to localhost + `*.lovable.app`)        | Comma-separated, or `*` to allow all |

## Connecting the frontend

In the React app, set `VITE_API_URL` to your Django server URL:

```
VITE_API_URL=http://localhost:8000
```

Then reload. The map will pull live data and show "offline" if the server isn't reachable.

## Deployment hints

- **Render / Railway / Fly.io**: provision a managed Postgres, set `DATABASE_URL`, `SECRET_KEY`, `DEBUG=False`, and your frontend's origin in `CORS_ALLOWED_ORIGINS`. The `Dockerfile` is production-ready (gunicorn).
- Run `python manage.py migrate` on first deploy; `seed_reports` is optional.
