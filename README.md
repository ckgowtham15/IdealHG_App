# IDEAL HG – Order Processing SOP (Hörmann Doors)
Angular front-end + small Node/Express API. Orders are stored on the server in `DATA_DIR/orders.json`, so every device sees the same data.

Local: `npm install` → `npm run build` → `npm start` → http://localhost:3000   (dev: `npm start` in one terminal, `npm run dev` in another → :4200)
Docker/VPS: `docker compose up -d --build` (data kept in the `ideal-hg-data` volume; set ADMIN_PASSWORD in docker-compose.yml)
Render: connect the repo, it reads render.yaml (adds a 1 GB persistent disk).
Back up the `/data/orders.json` file regularly.

## Sign-in
- Admin account = `ADMIN_USER` (default `admin`) / `ADMIN_PASSWORD` (default `admin123` – change it!). Only the admin can create orders, confirm steps, delete orders and manage clients. Each confirmed step records who confirmed it.
- Clients: admin adds them under **Clients**; a client sees (read-only) only orders whose *customer name* matches theirs.
