FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Download OpenFlights data at build time
RUN python -c "\
import urllib.request, os; \
os.makedirs('/app/data', exist_ok=True); \
urllib.request.urlretrieve('https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat', '/app/data/airports.dat'); \
urllib.request.urlretrieve('https://raw.githubusercontent.com/jpatokal/openflights/master/data/airlines.dat', '/app/data/airlines.dat'); \
print('OpenFlights data downloaded')" || echo "Data download skipped (no network at build time)"

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
