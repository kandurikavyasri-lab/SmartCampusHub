# SmartCampusHub

SmartCampusHub is an Expo/React Native mobile app with a small Express API server.

## Requirements

- Node.js
- pnpm
- Expo Go app, Android emulator, or iOS simulator

Enable pnpm if needed:

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

## Run Locally

Install dependencies:

```bash
pnpm install
```

Start the app and API together:

```bash
pnpm dev
```

The API runs at:

```text
http://localhost:5000
```

Expo runs at:

```text
http://localhost:8081
```

You can also run them separately:

```bash
pnpm dev:api
pnpm dev:mobile
```

## Database

Most mobile app demo data is stored locally in the app. If you need database-backed features, create a PostgreSQL database and set:

```bash
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/smartcampushub
```

Then push the schema:

```bash
pnpm db:push
```

## Demo Login

Student:

```text
student@university.edu
student123
```

Admin:

```text
admin@university.edu
admin123
```

## Android APK

Build a shareable Android APK:

```bash
pnpm eas:login
pnpm eas:init
pnpm build:apk
```

Before building, replace the production API URL in `artifacts/mobile/eas.json`. Full steps are in `docs/ANDROID_DEPLOYMENT.md`.
