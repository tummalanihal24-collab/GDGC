# Art Studio (MERN)

An art studio site: buy one-of-a-kind paintings, book a wall painting, and request custom pottery. Two roles: **customer** and **studio (admin)**.

**Stack:** MongoDB + Mongoose, Express, React (Vite), Node.js. Loads the provided `seedData` (12 paintings with images, pottery items, glazes, the ₹150/sq ft mural rate and the studio account).

## Run it on a clean machine

Requires Node 20+ and a MongoDB (local install, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster).

```bash
cd art-studio
npm run install:all          # installs server + client dependencies
cp .env.example .env         # set MONGODB_URI and JWT_SECRET
npm run build                # builds the React app into client/dist
npm start                    # http://localhost:5000
```

Express serves the built React app and the painting images, and seeds the database on first start (re-running is safe).

**Studio login (from the seed data):** `studio@artstudio.in` / `Studio@123`. Customers sign up on the login page.

### Development mode (hot reload)

```bash
npm run dev:server    # API on :5000
npm run dev:client    # React on http://localhost:5173 (proxies /api and /images)
```

### Tests

```bash
npm test
```

Runs the API tests against a temporary in-memory MongoDB (downloaded once by `mongodb-memory-server`, so the first run needs internet). They cover 401/403/404, the sold-once rule, the one-booking-per-date rule (with simultaneous requests), date/size/quantity limits and the pottery status rules.

## Layout

```
server/src/   app.js (routes + rules), models.js (schemas + indexes), seed.js, config.js
server/seed/  seed.json + images/ (the provided dataset)
server/test/  API tests
client/src/   React app: App.jsx, pages/ (Paintings, Orders, Bookings, Pottery, Auth)
```

## API summary

All routes need `Authorization: Bearer <token>` except sign-up and login. `401` not logged in, `403` wrong role, `404` missing or someone else's record, `409` conflict (painting sold, date taken, wrong status), `400` bad input.

| Route | Who |
|---|---|
| `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/me`, `GET /api/catalog` | anyone / any logged-in |
| `GET /api/paintings` | any |
| `POST /api/paintings`, `PUT /api/paintings/:id` (available only) | admin |
| `GET /api/orders` | any (customers see their own) |
| `POST /api/orders`, `POST /api/orders/:id/cancel` | customer |
| `GET /api/bookings`, `GET /api/bookings/taken-dates` | any |
| `POST /api/bookings`, `POST /api/bookings/:id/cancel` | customer |
| `POST /api/bookings/:id/confirm` or `decline` | admin |
| `GET /api/pottery` | any |
| `POST /api/pottery`, `PUT /api/pottery/:id`, `POST /api/pottery/:id/cancel` | customer |
| `POST /api/pottery/:id/accept` or `decline` | admin |

See [DESIGN.md](DESIGN.md).
