# 🚀 Welcome to CrownWynn

CrownWynn is a no-risk, casino-style gaming platform built to showcase end-to-end product delivery: a Next.js frontend, a Django REST API, containerized deployment, and gameplay that keeps fairness and security in mind. Players use virtual crowns instead of cash to enjoy Mines and Keno while the stack handles auth, balances, and game verification.

Spin it up locally and explore the experience at [http://localhost:3000](http://localhost:3000/) once the stack is running.

```link
http://localhost:3000/
```

## 💻 Why I Built This
I wanted a single project that proves end-to-end ownership: designing the data models, implementing the API, building the React/Next.js app router UI, wiring auth and balances, and wrapping everything with Docker/Nginx so it runs the same in local and containerized environments. The focus was on clarity, reliability, and reproducibility rather than leaning on templates.

## ⚔️ How This Ties to Security
Casino-style apps stress-test secure coding. CrownWynn uses JWT auth, input validation around wagers, and seed-based randomness verification (Mines/Keno) to keep outcomes fair. The patterns mirror broader security practices: least-privilege API design, deterministic verification of sensitive flows, and clear boundaries between client, API, and database.

## 📁 Project Structure
Root folders you’ll interact with most:

```text
/
├── backend/
│   ├── api/                 # Django app with models, views, serializers, signals
│   ├── crownwynn/           # Django settings and URLs
│   ├── manage.py            # Django entrypoint
│   └── Dockerfile           # Backend container image
├── frontend/
│   ├── app/                 # Next.js app router pages (games, auth, admin)
│   ├── components/          # Shared UI pieces
│   ├── context/             # UI and user state providers
│   ├── css/                 # CSS Modules per feature
│   ├── lib/                 # API clients and validation helpers
│   └── Dockerfile           # Frontend container image
├── docker-compose.yml       # Orchestration for frontend, backend, DB, and Nginx
├── nginx.conf               # Reverse proxy config
└── README.md
```

---

**Thanks for reading! 👑**