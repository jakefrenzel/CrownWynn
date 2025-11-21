# CrownWynn 👑

**Feel the Rush, Without the Risk** — The #1 destination for no-risk casino-style games.

## Overview

CrownWynn is a full-stack web application offering casino-style games without real money gambling. Players receive virtual currency (crowns 👑) to enjoy classic casino games in a risk-free environment. The platform features user authentication, balance management, and an expanding collection of games.

### Features

- **No-Risk Gaming**: Play casino-style games with virtual currency
- **Welcome Bonus**: New users receive 1,000 crowns to start playing
- **Secure Authentication**: JWT-based authentication with token blacklisting
- **User Profiles**: Track your balance and gaming history
- **Multiple Games**: Starting with Mines, with more games coming soon

### Tech Stack

**Frontend:**
- Next.js 16.0.1 (React 19)
- TypeScript
- CSS Modules
- Axios for API requests

**Backend:**
- Django 5.2.8
- Django REST Framework
- PostgreSQL
- JWT Authentication (Simple JWT)

## Getting Started

### Prerequisites

- **Docker** (recommended) or
- **Node.js** (v18 or higher) and **Python** (v3.10 or higher)
- **PostgreSQL** (if not using Docker)

---

## Option 1: Docker Setup (Recommended)

Docker simplifies setup by handling all dependencies and database configuration automatically.

### 1. Clone the Repository

```bash
git clone https://github.com/jakefrenzel/CrownWynn.git
cd CrownWynn
```

### 2. Build and Run with Docker Compose

```bash
docker-compose up --build
```

This will:
- Set up PostgreSQL database
- Build and run the Django backend on `http://localhost:8000`
- Build and run the Next.js frontend on `http://localhost:3000`

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Django Admin**: http://localhost:8000/admin

### 4. Create a Superuser (Optional)

```bash
docker-compose exec backend python manage.py createsuperuser
```

---

## Option 2: Manual Setup (Without Docker)

### Backend Setup

1. **Navigate to Backend Directory**
   ```bash
   cd backend
   ```

2. **Create Virtual Environment**
   ```bash
   python -m venv venv
   ```

3. **Activate Virtual Environment**
   - **Windows**:
     ```bash
     venv\Scripts\activate
     ```
   - **macOS/Linux**:
     ```bash
     source venv/bin/activate
     ```

4. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

5. **Configure Database**
   
   Update `backend/crownwynn/settings.py` with your PostgreSQL credentials:
   ```python
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.postgresql',
           'NAME': 'crownwynn_db',
           'USER': 'your_username',
           'PASSWORD': 'your_password',
           'HOST': 'localhost',
           'PORT': '5432',
       }
   }
   ```

6. **Run Migrations**
   ```bash
   python manage.py migrate
   ```

7. **Create Superuser (Optional)**
   ```bash
   python manage.py createsuperuser
   ```

8. **Start Backend Server**
   ```bash
   python manage.py runserver
   ```

   Backend will run on `http://localhost:8000`

### Frontend Setup

1. **Navigate to Frontend Directory** (in a new terminal)
   ```bash
   cd frontend
   ```

2. **Install Dependencies**
   ```bash 
   npm install
   ```

3. **Configure API URL**
   
   Ensure `frontend/lib/axiosInstance.ts` points to your backend:
   ```typescript
   baseURL: "http://localhost:8000"
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

   Frontend will run on `http://localhost:3000`

---

## Contributing

We welcome contributions! Here's how to get started:

### 1. Fork and Clone

```bash
git fork https://github.com/jakefrenzel/CrownWynn.git
git clone https://github.com/YOUR_USERNAME/CrownWynn.git
cd CrownWynn
```

### 2. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 3. Set Up Your Environment

Follow either the **Docker Setup** or **Manual Setup** instructions above.

### 4. Make Your Changes

- Write clean, well-documented code
- Follow existing code style and patterns
- Test your changes thoroughly

### 5. Commit Your Changes

```bash
git add .
git commit -m "Add: brief description of your changes"
```

### 6. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then open a Pull Request on GitHub with:
- Clear description of changes
- Screenshots (if UI changes)
- Testing steps

### Development Guidelines

- **Frontend**: Follow TypeScript best practices, use CSS Modules for styling
- **Backend**: Follow Django conventions, write API documentation
- **Security**: Never commit sensitive data (`.env` files, secrets)
- **Testing**: Add tests for new features when applicable

### Areas for Contribution

- 🎮 New game implementations
- 🎨 UI/UX improvements
- 🔒 Security enhancements
- 📱 Responsive design improvements
- 🐛 Bug fixes
- 📚 Documentation updates

---

## Project Structure

```
CrownWynn/
├── backend/               # Django REST API
│   ├── api/              # Main API app
│   │   ├── models.py     # Database models
│   │   ├── views.py      # API endpoints
│   │   ├── serializers.py # DRF serializers
│   │   └── urls.py       # API routes
│   ├── crownwynn/        # Project settings
│   └── manage.py
│
├── frontend/             # Next.js application
│   ├── app/             # Next.js pages
│   │   ├── page.tsx     # Home page
│   │   ├── login/       # Login page
│   │   ├── register/    # Register page
│   │   └── mines/       # Mines game
│   ├── components/      # React components
│   ├── context/         # React Context providers
│   ├── css/            # CSS Modules
│   └── lib/            # Utilities (axios instance)
│
└── docker-compose.yml   # Docker configuration
```

---

## License

This project is currently under development. License information coming soon.

## Contact

For questions or suggestions, please open an issue on GitHub or contact the maintainer.

---

**Happy Gaming! 🎰👑**