# Render deployment

This Blueprint runs the Auth, Gold Rate, Product, and API Gateway services in
one Render Free Node.js web service. The gateway is the only public entry point.
The production launcher starts Auth, then Gold Rate, Product, and finally the
gateway, waiting for each service's database-aware `/health` endpoint before
starting its dependent service. It stops the other processes if one exits
unexpectedly and forwards Render shutdown signals.

## Deploy

1. Push this repository to GitHub and create a Blueprint in Render using
   `render.yaml` at the repository root.
2. Set the Blueprint's prompted environment values as described below. Keep
   the three Atlas URIs private and use the same strong, randomly generated
   `JWT_SECRET` for all services.
3. Set `FRONTEND_ORIGIN` to the exact deployed Vercel origin, without a trailing
   slash (for example, `https://your-site.vercel.app`).
4. In the Vercel project's environment variables, set `VITE_API_BASE_URL` to
   the Render service URL followed by `/api` (for example,
   `https://amir-jewellers-backend.onrender.com/api`) and redeploy the frontend.
5. Confirm the Render health check at `/health` reports `200`. The gateway
   reports healthy only after all three backend services are healthy.

Render supplies `PORT` to the web service. Do not set it in the Blueprint or
manually: the launcher uses it only for the API Gateway. The internal services
use ports 5001, 5003, and 5002 respectively and communicate using
`http://127.0.0.1`. In production, all four processes bind to `0.0.0.0`;
the local server bind behavior is unchanged.

## Environment variables to configure

| Variable | Purpose |
| --- | --- |
| `AUTH_MONGODB_URI` | Atlas connection string for the Auth Service. |
| `PRODUCT_MONGODB_URI` | Atlas connection string for the Product Service. |
| `GOLD_RATE_MONGODB_URI` | Atlas connection string for the Gold Rate Service. |
| `JWT_SECRET` | One long, random secret shared by Auth, Product, and Gold Rate services. |
| `FRONTEND_ORIGIN` | Exact public Vercel origin allowed by service CORS. |
| `OWNER_EMAIL` | Email for creating the initial owner account, if it does not already exist. |
| `OWNER_PASSWORD` | Password for the initial owner account; use at least 16 characters. |

The database adapters select `amir_auth`, `amir_products`, and
`amir_gold_rates` themselves. The launcher maps each `*_MONGODB_URI` to the
service's existing `MONGODB_URI` variable. It also sets the internal proxy URLs:
Auth at `127.0.0.1:5001`, Product at `127.0.0.1:5002`, and Gold Rate at
`127.0.0.1:5003`. You do not need to configure those internal URLs in Render.
The Render Blueprint leaves credentials unset so no secret or Atlas URI is
committed to Git.

If the initial owner record is not already in the Auth database, run the
existing `create-admin` command once in an environment where the Render
environment variables are available:

```sh
MONGODB_URI="$AUTH_MONGODB_URI" npm run create-admin --prefix services/auth-service
```

The command uses `OWNER_EMAIL`, `OWNER_PASSWORD`, and `JWT_SECRET` as well. Do
not add `MONGODB_URI` as a permanent Render variable; the production launcher
maps the dedicated Auth URI at service startup.

## Images on Render Free

Product image uploads continue to use the existing Multer validation and local
`services/product-service/uploads` directory. That directory is on Render's
ephemeral filesystem: uploaded files can disappear when the service restarts
or is redeployed, even though product records in Atlas remain. For durable
production images, plan a separate object-storage integration (for example,
Cloudinary, Amazon S3, or another compatible provider) or an appropriate
persistent disk plan. No external storage provider is configured by this
deployment.

## Local behavior

Local `.env` files and `scripts/dev-all.js` are unchanged. The production
launcher is separate and uses the existing per-service package installs. The
backend packages use ESM; the root package requires Node.js 20.19 or newer for
the MongoDB driver versions in the lockfiles.
