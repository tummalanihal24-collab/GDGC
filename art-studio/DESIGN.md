# DESIGN

**1. How do login and the two roles work?**
Sign-up always creates a customer. The one studio (admin) account comes from the seed data. Passwords are hashed with bcrypt. Login returns a signed JWT (7 days) that the React app sends as a Bearer token. On every request the server loads the user from MongoDB and reads the role from there, not from the token, and a `role()` middleware allows the route or refuses it: missing or bad token is 401, wrong role is 403. Customer records are looked up with `{ _id, user: me }`, so someone else's record returns 404, exactly like a missing one. Customer list endpoints only query their own `user`; the admin sees all.

**2. Which database did you choose, and why?**
MongoDB with Mongoose (the MERN stack), and it works with a local install or a cloud-hosted Atlas cluster, which the brief prefers. Single-document atomic updates and partial unique indexes are enough to enforce both "only once" rules without needing multi-document transactions (which a standalone MongoDB doesn't offer).

**3. How do you stop two people from taking the same painting or date?**
Painting: buying runs `findOneAndUpdate({ _id, status: 'available' }, { status: 'sold' })`. It is atomic, so with simultaneous buyers only one gets a document back and creates the order; the others get 409 "just been sold". A partial unique index on `orders.painting` (only where status is `placed`) is a second guard, and if order creation fails the painting is set back to available. Cancelling an order marks it cancelled and sets the painting back to available. Date: bookings carry `live: true` while requested or confirmed, and a unique index on `date` applies only to live bookings. A second insert for a taken date fails with a duplicate-key error, which becomes a 409 "date just taken". Declining or cancelling sets `live: false`, freeing the date. The tests fire two simultaneous requests for each case.

**4. What did you finish, what did you leave out, and what would you do next?**
Finished: sign-up/login and both roles with 401/403/404 behaviour; paintings from the seed data with images (browse, studio add/edit only while available, buy, cancel); wall bookings (7–90 days, 10–500 sq ft, price = size × ₹150, one booking per date, studio confirm/decline, customer cancel until 3 days before); pottery requests (seed items and glazes, quantity 1–12, needed-by at least 14 days, studio accept/decline, customer edit/cancel only while requested); loading, empty and error states on every data screen with clear refusal messages; API tests.
Left out: everything marked out of scope (payments, uploads, emails, deployment), pagination, rate limiting.
Notes: dates and "today" use IST calendar days. Pottery items in the seed data have no price, so none is shown. The seed's two already-sold paintings stay sold with no order behind them. Next: React component tests, httpOnly-cookie sessions, pagination.
