# MongoDB Atlas setup

Each service connects to Atlas using Mongoose and selects its own database:

| Service | Database |
|---|---|
| Product Service | `amir_products` |
| Gold Rate Service | `amir_gold_rates` |
| Auth Service | `amir_auth` |

## Configure Atlas

1. In Atlas, create a database user with access to these databases and add the development/deployment machine's IP to the network access list.
2. Copy each service's `.env.example` to `.env` in that same service folder.
3. Set `MONGODB_URI` to the Atlas connection string in each `.env`. Use the database name shown above in each URI; the service also selects its database explicitly. Preserve Atlas query options such as `retryWrites=true&w=majority`.
4. URL-encode special characters in the database user's username or password.
5. Set the same strong, randomly generated `JWT_SECRET` in all three services. Never use a published example value.
6. In `services/auth-service/.env`, set a unique `OWNER_EMAIL` and `OWNER_PASSWORD` of at least 16 characters. These variables are only used by the explicit administrator setup command; they do not create an account during service startup.

Never commit `.env` files. They are ignored by the repository's `.gitignore`.

## Product image uploads

Product images are stored locally by Product Service; no image-hosting account or extra credentials are required. The authenticated `POST /api/products/upload` gateway route accepts one JPG/JPEG, PNG, or WEBP image up to 5 MB. Product Service checks the MIME type and image signature, then saves it with a generated filename under `services/product-service/uploads/`.

MongoDB stores a gateway-relative URL such as `/api/products/uploads/<generated-filename>.jpg` in the existing product `images` field. The URL stays on the same host as the site, so a phone accessing the development site over the computer's LAN can load the image through the API Gateway. Existing external image URLs and product records are preserved.

Uploaded files remain on disk when Product Service restarts and are not automatically deleted. They are local to the development machine: back up the uploads directory with the database, and use persistent shared storage or an image-hosting service for a deployment or multiple application servers.

## Install and start

From the repository root:

```powershell
npm run install:all
npm run create-admin --prefix services/auth-service
```

The admin command creates one bcrypt-hashed owner account and refuses to replace an account with the same email. To add the first admin, configure `MONGODB_URI`, `JWT_SECRET`, `OWNER_EMAIL`, and `OWNER_PASSWORD` in the auth service `.env` first. Do not copy the old demo password into production.

Start each process in a separate terminal at the repository root:

```powershell
npm run dev:auth
npm run dev:products
npm run dev:rates
npm run dev:gateway
npm run dev:frontend
```

The existing ports remain unchanged: Auth `5001`, Product `5002`, Gold Rate `5003`, Gateway `5000`, and Vite `5173`. `npm run dev:all` remains available after configuring the environments and creating the admin.

Services connect to MongoDB before opening their HTTP ports. A missing URI, inaccessible Atlas cluster, or invalid JWT configuration prevents startup and is reported without printing credentials or the URI. MongoDB connection/disconnection errors are logged by service. The `/health` endpoint remains available once a service is listening.

## Verify the existing APIs

Once all processes are running, check:

```powershell
Invoke-RestMethod http://localhost:5000/health
Invoke-RestMethod http://localhost:5000/api/products
Invoke-RestMethod http://localhost:5000/api/gold-rates
```

Sign in through the existing frontend at `http://localhost:5173/login` to exercise the Auth Service. Product create/update/delete and gold-rate updates remain owner-only. Gold rates are not fabricated or initialized in Atlas: before the owner enters rates, the existing API returns the same three zero-valued placeholders. The gold-rate update endpoint uses an Atlas transaction to save current rates and history together.

To test image uploads on a computer, sign in as the owner, open `http://localhost:5173/admin/products`, choose **Add product**, then **Choose Image**. Select a JPG, PNG, or WEBP up to 5 MB, check the preview and upload progress, fill in the remaining fields, and save. Editing a product shows its current image and allows you to replace or remove it.

To test from a phone, connect it and the development computer to the same network, run the frontend so it is reachable on the LAN, and open `http://<computer-LAN-IP>:5173` on the phone. Sign in, choose **Add product** and select a photo from the gallery, then save. Allow local-network connections through the computer firewall if prompted. Browser and device file-picker behavior can vary. The Product Service and API Gateway must also be running on the computer.

## Initial administrator and legacy demo login

The old Auth Service generated a demo owner from environment defaults and stored no account record. Startup no longer creates that account. Set `OWNER_EMAIL` and a new private `OWNER_PASSWORD` in the auth service `.env`, then run:

```powershell
npm run create-admin --prefix services/auth-service
```

The password is hashed using the existing `bcryptjs` dependency. The setup command never prints the password or hash and won't overwrite an existing account. Change or remove the setup-only password value after creating the account. To create a replacement account, use a separately managed administrative process; this setup command intentionally does not update existing users.

If an older `admins` record contains a plaintext `password` and has role `admin`, a successful login migrates it in place: the password is replaced with a bcrypt hash, the plaintext field is removed, and the role is normalized to `owner`. Incorrect passwords do not change the record. If a password has been exposed, change it immediately after regaining access.

## Existing in-memory data

There is no automatic migration or startup seeding. The three sample products in the old Product Service and all rates/history lived only in process memory; zero-valued rate placeholders are still returned when no rate documents exist. Existing Atlas collections are never dropped or overwritten.

If you have owner-created products or entered rates in a still-running old version, preserve them before shutting that version down:

1. Save `GET /api/products`, `GET /api/gold-rates`, and `GET /api/gold-rates/history` responses from the gateway.
2. For product records, keep the existing string `_id` and product fields; remove response-only `estimatedPrice` and `rateUpdatedAt`. For rate/history records, preserve values, `updatedBy`, and timestamps.
3. Review for `_id`/purity collisions with existing Atlas records, convert timestamps to BSON dates, and import the reviewed records into the service's collections (`products`, `rates`, and `rate_history`) using MongoDB Compass or an equivalent controlled import.
4. Do not import the old zero placeholders as rate documents. Create the initial owner using the secure setup command above; do not migrate or reuse a demo password.

If the old process has already stopped, its in-memory changes cannot be recovered. The sample products are demo fixtures and are deliberately not inserted into Atlas.

## Common connection problems

- **Authentication failed:** confirm the Atlas database username/password and URL-encode special password characters.
- **Server selection timeout / network unreachable:** allowlist the current IP in Atlas and verify network/DNS access to the cluster.
- **Invalid URI:** copy the `mongodb+srv` URI from Atlas and replace the placeholders; do not add literal angle brackets.
- **Wrong database:** each service selects its named database even if the URI path differs; configure the matching name in the URI for clarity.
- **Gold-rate updates fail:** Atlas transactions require a replica set, which Atlas clusters provide. Check that the selected cluster is available.
- **Port already in use:** stop the process using the existing service port or configure that service's existing `PORT` variable.
