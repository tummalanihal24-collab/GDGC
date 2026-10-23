# DESIGN

**1. How do login and the two roles work?**
Sign-up creates a customer only; the single studio (admin) account is created by the seed script from `ADMIN_EMAIL`/`ADMIN_PASSWORD`. Passwords are hashed with bcrypt. Login returns a signed JWT (7 days) that the browser sends as a Bearer token. On every request the server loads the user from the database and takes the role from there (not from the token), then a `role()` middleware allows or refuses the route: no/invalid token is 401, wrong role is 403. Customer-owned records are always fetched by id and checked against the caller; if they belong to someone else the server answers 404, the same as a missing record. Customer list endpoints only query `WHERE user_id = me`.

**2. Which database did you choose, and why?**
SQLite via `better-sqlite3`. It needs no account or setup (so the README works on a clean machine), it supports real transactions, and partial unique indexes give me database-level guarantees for the two "only once" rules. The trade-off is that it is a single file, not cloud hosted; the SQL is simple enough to move to Postgres.

**3. How do you stop two people from taking the same painting or date?**
Painting: buying runs one transaction that does `UPDATE paintings SET status='sold' WHERE id=? AND status='available'`; only the caller whose update changes a row continues to create the order, the other gets 409 "just been sold". A partial unique index on `orders(painting_id) WHERE status='placed'` backs this up. Cancelling an order sets it to cancelled and the painting back to available in one transaction. Date: a partial unique index `bookings(date) WHERE status IN ('requested','confirmed')`. A second insert for the same date fails and is turned into a 409 "date just taken"; declined/cancelled bookings free the date. SQLite also serialises writers, and the tests fire two simultaneous requests for each case.

**4. What did you finish, what did you leave out, and what would you do next?**
Finished: sign-up/login, both roles with 401/403/404 behaviour, paintings (browse, admin add/edit while available, buy, cancel), wall bookings (7–90 day window, 10–500 sq ft, price = size × seed rate, one booking per date, admin confirm/decline, customer cancel until 3 days before), pottery requests (seed item/glaze, quantity 1–12, needed-by ≥14 days, admin accept/decline, customer edit/cancel only while requested), a simple UI with loading/empty/error states and clear refusal messages, and API tests (`npm test`).
Left out: everything listed as out of scope (payments, uploads, emails, deployment, etc.), pagination, and rate limiting.
Caveats: the official `seedData.zip` was not available to me, so `data/seed.json` has placeholder values in the same shape (wall rate, pottery items, glazes, paintings); swap in the real data. "Days away" is calculated from UTC calendar dates, not IST. Next: load the real seed data, UI tests, move the token to an httpOnly cookie, and add pagination.
