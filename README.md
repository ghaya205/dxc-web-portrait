# DXC SLA Dashboard — MVC Refactor

Same app as the original, restructured into a clean **PHP native MVC** backend + **React** frontend.

---

## Project Structure

```
stage-mvc/
├── backend/                     ← PHP MVC API
│   ├── public/
│   │   ├── index.php            ← Front Controller (single entry point)
│   │   └── .htaccess            ← Apache rewrite → index.php
│   ├── routes/
│   │   └── api.php              ← All route definitions
│   ├── controllers/
│   │   └── AuthController.php   ← login / register / me
│   ├── models/
│   │   └── User.php             ← DB queries (data layer only)
│   ├── core/
│   │   ├── Router.php           ← Dispatches URI → Controller@action
│   │   ├── Controller.php       ← Base controller (json helper, input parser)
│   │   └── Database.php         ← PDO singleton
│   └── config/
│       ├── app.php              ← Loads .env → JWT_SECRET constant
│       └── database.php         ← DB credentials
│
├── src/                         ← React frontend (UI unchanged)
│   ├── api.js                   ← Updated BASE URL → /backend/public
│   └── ...
├── vendor/                      ← Composer (firebase/php-jwt)
├── .env                         ← jwtsecret=your_secret_here
└── package.json
```

---

## MVC Pattern

| Layer | File | Responsibility |
|---|---|---|
| **Model** | `models/User.php` | All DB queries — no HTTP, no business logic |
| **View** | React (`src/`) | UI rendered in the browser via API responses |
| **Controller** | `controllers/AuthController.php` | Validates input, calls Model, returns JSON |
| **Router** | `core/Router.php` + `routes/api.php` | Maps `METHOD /path` → `Controller@action` |
| **Front Controller** | `backend/public/index.php` | Single PHP entry point for all requests |

---

## API Endpoints

| Method | Path | Action |
|---|---|---|
| `POST` | `/auth/login` | Authenticate user, return JWT |
| `POST` | `/auth/register` | Create new user |
| `GET` | `/auth/me` | Validate JWT, return user info |

---

---

## Run everything with Docker (recommended, no XAMPP needed)

This spins up MySQL, the PHP/Apache backend, and the React frontend (built and served by nginx) together.

### 1. Requirements
- Docker Desktop (or Docker Engine + Docker Compose plugin)

### 2. Start it
```bash
docker compose up --build
```

First run takes a bit longer (npm install + composer install + MySQL init). Subsequent runs are fast.

### 3. Access the app
| Service | URL |
|---|---|
| Frontend (the app) | http://localhost:8081 |
| Backend API directly | http://localhost:8080 |
| phpMyAdmin | http://localhost:8082 (user: `root`, pass: `rootpass`) |
| MySQL (external tools) | `localhost:3306` (user: `dxcuser` / pass: `dxcpass`, or `root` / `rootpass`) |

The frontend container proxies all `/api/*` calls to the backend container automatically — you don't need to touch `src/services/api.js`.

### 4. Database
On first start, MySQL automatically runs everything in `docker/mysql-init/` in order: it creates the `dxcdb` database, the base `roles`/`users` tables, then all migrations `001` → `008`. You don't need to run `setup_*.php` scripts manually.

The big historical dataset `sla_data.sql` (57MB) is **not** imported automatically (would slow down every fresh start). Import it manually once, if you need it:
```bash
docker exec -i dxc_db mysql -uroot -prootpass dxcdb < sla_data.sql
```

### 5. Environment variables
Edit `.env` at the project root (Brevo API key, JWT secret, taxi/bus company emails). The backend container reads it automatically — restart the backend after changing it:
```bash
docker compose restart backend
```

### 6. Rebuilding after code changes
- **Backend** (PHP): changes are picked up instantly, no rebuild needed (`./backend` is mounted as a live volume).
- **Frontend** (React): since it's built once into static files by nginx, rebuild after changes:
```bash
docker compose up --build frontend
```

### 7. Stopping / resetting
```bash
docker compose down          # stop everything, keep DB data
docker compose down -v       # stop everything AND wipe the database
```

---

## Setup (manual, XAMPP/WAMP)

### 1. Copy to your web server root

```
/var/www/html/stage-mvc/   (or htdocs for XAMPP/WAMP)
```

### 2. Create `.env` at project root

```env
jwtsecret=your_super_secret_key_here
```

### 3. Install PHP dependencies

```bash
composer install
```

### 4. Create the database

```sql
CREATE DATABASE dxcdb CHARACTER SET utf8mb4;
USE dxcdb;

CREATE TABLE roles (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);
INSERT INTO roles (name) VALUES ('agent'), ('supervisor'), ('admin');

CREATE TABLE users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  role_id    INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);
```

### 5. Edit DB credentials if needed

Edit `backend/config/database.php`.

### 6. Install and start React dev server

```bash
npm install
npm run dev
```

### 7. Adjust BASE URL in `src/api.js`

```js
const BASE = 'http://localhost/stage-mvc/backend/public';
```

---

## Extending — Adding a New Resource

**1. Route** (`backend/routes/api.php`)
```php
$router->add('GET', '/tickets', 'TicketController', 'index');
```

**2. Controller** (`backend/controllers/TicketController.php`)
```php
namespace Controllers;
use Core\Controller;
use Models\Ticket;

class TicketController extends Controller {
    public function index(): void {
        $this->json((new Ticket())->all());
    }
}
```

**3. Model** (`backend/models/Ticket.php`)
```php
namespace Models;
use Core\Database;

class Ticket {
    public function all(): array {
        return Database::getInstance()->query("SELECT * FROM tickets")->fetchAll();
    }
}
```
