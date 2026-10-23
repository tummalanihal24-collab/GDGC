# Art Studio

Small full-stack site for an art studio: buy one-of-a-kind paintings, book a wall painting, and request custom pottery. Two roles: **customer** and **studio (admin)**.

Stack: Node.js + Express, SQLite (`better-sqlite3`), plain HTML/JS front end served by the same server.

## Run it (clean machine)

Requires Node 20+ (tested on 22).

```bash
cd art-studio
npm install
cp .env.example .env     # then edit JWT_SECRET and ADMIN_PASSWORD
npm start                # http://localhost:3000
```

The database file is created and seeded on first start (`data/studio.db`). No separate DB setup is needed.

- **Studio login:** the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env` (defaults `studio@example.com` / `studio123` if no `.env`).
- **Customer:** use "Sign up" on the login page.

Run the tests: `npm test`

## Seed data

`data/seed.json` holds the wall rate per sq ft, pottery items, glazes and starter paintings. To use the official seed dataset, replace the values in that file (keep the same shape) and delete `data/studio.db` so it re-seeds.

## API summary

All routes need `Authorization: Bearer <token>` except sign-up/login.
`401` not logged in, `403` wrong role, `404` missing or someone else's record, `409` state conflict (painting sold, date taken, wrong status), `400` bad input.

| Route | Who |
|---|---|
| `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/me` | anyone / any |
| `GET /api/paintings` | any |
| `POST /api/paintings`, `PUT /api/paintings/:id` (available only) | admin |
| `GET/POST /api/orders`, `POST /api/orders/:id/cancel` | list: any (own vs all); create/cancel: customer |
| `GET/POST /api/bookings`, `POST /api/bookings/:id/cancel` | list: any; create/cancel: customer |
| `POST /api/bookings/:id/confirm` or `decline` | admin |
| `GET/POST /api/pottery`, `PUT /api/pottery/:id`, `POST /api/pottery/:id/cancel` | list: any; rest: customer |
| `POST /api/pottery/:id/accept` or `decline` | admin |

See [DESIGN.md](DESIGN.md) for design decisions.
