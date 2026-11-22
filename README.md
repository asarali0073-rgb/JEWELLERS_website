# AMIR JEWELLERS — React + Node.js Microservices

React/Vite frontend, Express API Gateway, and three Node.js services:
1. Product Service
2. Auth Service
3. Gold Rate Service

The three services use separate MongoDB Atlas databases through Mongoose. See [MONGODB_SETUP.md](./MONGODB_SETUP.md) for Atlas configuration, secure admin setup, migration notes, and verification.

## Run locally
Install Node.js 20+ first. From the project root run:

```bash
npm run install:all
```

Copy each `.env.example` to `.env` in the same folder:
- `api-gateway/.env.example` -> `api-gateway/.env`
- `services/auth-service/.env.example` -> `services/auth-service/.env`
- `services/product-service/.env.example` -> `services/product-service/.env`
- `services/gold-rate-service/.env.example` -> `services/gold-rate-service/.env`
- `frontend/.env.example` -> `frontend/.env`

Configure each service's `MONGODB_URI`, and set the same long random `JWT_SECRET` in auth, product and gold-rate service `.env` files. Set a private `OWNER_EMAIL` and `OWNER_PASSWORD` in the auth service `.env`, then create the first account once:

```bash
npm run create-admin --prefix services/auth-service
```

For a single-command start, use:
```bash
npm run dev:all
```
This launches the services in a staggered order using one Node process per service, avoiding the extra npm/cmd wrappers and watcher processes. For backend hot reload during development, run the individual `npm run dev:auth`, `npm run dev:products`, `npm run dev:rates`, or `npm run dev:gateway` command instead; those watchers monitor only the service's `src` directory, not `node_modules`.

Or open five terminals at the project root:
```bash
npm run dev:auth
npm run dev:products
npm run dev:rates
npm run dev:gateway
npm run dev:frontend
```

Open http://localhost:5173. API Gateway is at http://localhost:5000.
The gateway `/health` endpoint checks all three backend services and returns `503` with dependency statuses if any service is unavailable.

Add real shop address, phone and Maps URL in `frontend/.env`.

Current features: gold-only catalogue, product details, manual 24K/22K/21K rates, owner login, protected admin overview at `/admin`, product management at `/admin/products`, and rate management at `/admin/gold-rates`. Public pages include `/`, `/collection`, `/product/:id`, `/gold-rates`, `/about`, and `/contact`. No order service, checkout or payment system.

Admins can add product photos from a computer or phone in `/admin/products`. Product Service validates images and stores them locally without third-party credentials. See [MONGODB_SETUP.md](./MONGODB_SETUP.md) for image storage and LAN/mobile testing details.
