# Android APK Deployment

This project is now configured for Expo EAS Android builds.

## 1. Prepare the production API

Deploy the Express API first and keep its public HTTPS URL ready. The APK cannot use `localhost` after it is installed on another phone.

Recommended API environment variables:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
NODE_ENV=production
PORT=5000
```

## 2. Set the mobile API URL

Open `artifacts/mobile/eas.json` and replace:

```text
https://YOUR-PRODUCTION-API-DOMAIN.com
```

with your deployed API URL, for example:

```text
https://api.smartcampushub.com
```

## 3. Login and initialize EAS

From the project root:

```bash
pnpm eas:login
pnpm eas:init
```

After `eas:init`, Expo may add a real EAS project ID to `artifacts/mobile/app.json`. Keep that generated value.

## 4. Build an APK for sharing directly

```bash
pnpm build:apk
```

When the build finishes, Expo gives you a download link. Send that APK link to Android users.

## 5. Build an AAB for Google Play Store

```bash
pnpm build:aab
```

Use the generated `.aab` for Play Store release. APK is good for direct sharing and testing; AAB is best for Play Store.

## 6. Production checklist

- Replace the default app icon before public release.
- Replace `com.smartcampushub.app` if you own a different package name.
- Use HTTPS for the production API.
- Keep database secrets only on the API server, never inside the mobile app.
- Test the APK on at least one real Android phone before sharing widely.
