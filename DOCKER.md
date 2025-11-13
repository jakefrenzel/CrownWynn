# Docker Setup for CrownWynn

This project includes a complete Docker setup for both development and production environments.

## Quick Start (Development)

```bash
# Build and start all services
docker-compose up --build

# View in browser
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# Full app via Nginx: http://localhost
```

## Services

- **Frontend**: Next.js app with hot reloading (port 3000)
- **Backend**: Django API server (port 8000)
- **Database**: PostgreSQL 15 (port 5432)
- **Nginx**: Reverse proxy for production-like setup (port 80)

## Development Commands

```bash
# Start services
docker-compose up

# Rebuild and start
docker-compose up --build

# View logs
docker-compose logs -f [service-name]

# Run Django commands
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser

# Install new npm packages
docker-compose exec frontend npm install [package-name]

# Stop all services
docker-compose down

# Stop and remove volumes (clears database)
docker-compose down -v
```

## Production Build

```bash
# Build production images
docker build -t crownwynn-frontend ./frontend
docker build -t crownwynn-backend ./backend

# Run production containers
docker run -p 3000:3000 crownwynn-frontend
docker run -p 8000:8000 crownwynn-backend
```

## File Structure

```
├── docker-compose.yml      # Development orchestration
├── nginx.conf             # Reverse proxy config
├── .dockerignore          # Docker build exclusions
├── backend/
│   └── Dockerfile         # Django production image
└── frontend/
    ├── Dockerfile         # Next.js production image
    └── Dockerfile.dev     # Next.js development image
```

## Environment Variables

Create `.env` files for different environments:

**backend/.env**:
```
DEBUG=0
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://user:pass@db:5432/crownwynn
CORS_ALLOWED_ORIGINS=https://yourdomain.com
```

**frontend/.env.local**:
```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

## Troubleshooting

- **Port conflicts**: Change ports in `docker-compose.yml`
- **Permission issues**: Try `docker-compose down && docker-compose up --build`
- **Database issues**: Run `docker-compose down -v` to reset volumes
- **Hot reload not working**: Ensure volumes are mounted correctly

## Security Notes

- Production images run as non-root users
- Static files served efficiently via Nginx
- Database passwords should be changed for production
- Add SSL/HTTPS configuration for production deployment