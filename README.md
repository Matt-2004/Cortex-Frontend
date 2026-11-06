# OAuth comparison

This Next.js app contains two independent authentication implementations:

- **Auth.js** at `/api/auth`: custom credentials login backed by a bcrypt hash,
  plus Google OAuth.
- **Auth0** at `/auth/*`: the Auth0 Next.js SDK hosted login, logout, and
  profile routes.

## Configure locally

Copy `.env.local.example` to `.env.local` and fill in the credentials for the
provider you want to test. Auth0 can remain empty while comparing Auth.js.

For custom Auth.js login, set `AUTH_CUSTOM_EMAIL` and
`AUTH_CUSTOM_PASSWORD_HASH`. Generate a hash with:

```bash
node -e "console.log(require('bcryptjs').hashSync('change-me', 12))"
```

For Google OAuth, create credentials with this callback URL:

```text
http://localhost:3000/api/auth/callback/google
```

For Auth0, configure the application callback URL as:

```text
http://localhost:3000/auth/callback
```

Then start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
