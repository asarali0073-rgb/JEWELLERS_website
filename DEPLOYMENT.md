# Vercel deployment

The root `vercel.json` configures one Vercel project with the Vite frontend,
API Gateway, and Auth, Product, and Gold Rate services. Requests under `/api/`
are routed to the gateway; all other paths are routed to the frontend.
Vercel service bindings inject the internal service URLs at runtime.

## Deploy

1. Import the repository into Vercel as one project and deploy from the
   repository root. Keep the configured service roots and frameworks in
   `vercel.json`.
2. Set `MONGO_URI` and `JWT_SECRET` in each of the Auth, Product, and Gold Rate
   services. Use the Atlas URI for that service's database; the service selects
   its database name itself. Use the same strong, randomly generated
   `JWT_SECRET` in all three services.
3. Set `OWNER_EMAIL` and `OWNER_PASSWORD` in Auth Service if you need to create
   the initial owner account. These are used only by the explicit
   `create-admin` command.
4. Do not configure `AUTH_URL`, `PRODUCT_URL`, or `GOLD_RATE_URL` manually.
   Vercel injects those internal service URLs through the gateway bindings.
   Product Service also receives a Gold Rate service binding for its existing
   product price estimates.
5. Redeploy after setting environment variables, then verify the public site
   and `/api/products`, `/api/gold-rates`, and `/api/auth/login`.

The `.env.example` files list each service's variable names with empty values.
Copy them to local `.env` files for development; `.env` files are ignored by
Git. The Vite development server proxies `/api` to the local gateway on port
5000, so frontend requests use the same relative URLs locally and in
production.

The public gateway endpoints are `/api/auth/*`, `/api/products/*`, and
`/api/gold-rates/*`. The auth and product proxies strip their public prefixes
before forwarding, matching the services' `/login` and `/` routes. The gateway
explicitly rewrites `/api/gold-rates/*` to the Gold Rate Service's
`/gold-rates/*` routes. Product Service calls the bound Gold Rate Service at
`/gold-rates` directly.

Product image uploads use the existing local filesystem directory. Serverless
deployment filesystems are not durable storage, so uploaded images may not
persist across invocations or deployments. Use durable object storage if
production image persistence is required.

## Local development

Use the root instructions in [README.md](./README.md) to install dependencies
and start all five apps. For initial owner setup, configure `MONGO_URI`,
`JWT_SECRET`, `OWNER_EMAIL`, and `OWNER_PASSWORD` in
`services/auth-service/.env`, then run:

```sh
npm run create-admin --prefix services/auth-service
```
