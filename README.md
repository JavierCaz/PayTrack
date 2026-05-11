# PayTrack

Track installment-based payments and collections for your small business or personal finances.

PayTrack helps you manage clients, create installment plans, record payments, and generate receipts — all on your device with no internet required.

## Features

- **Client management** — Add, edit, search, filter, and blacklist clients
- **Collections & installment plans** — Create collections with custom installment schedules (number of payments, frequency, payment days)
- **Payment tracking** — Record payments as paid, partial, or pending with automatic overdue detection
- **Receipt generation** — Generate and share visual receipts as images
- **Dashboard** — View summary statistics: totals, balances, monthly income, overdue/upcoming payments
- **Multi-language** — English and Spanish (auto-detects device locale)
- **Dark mode** — Light and dark themes with system-default or manual selection
- **Backup & restore** — Export all data as JSON and import it back, including external app format support
- **Cross-platform** — Works on iOS, Android, and Web

## Tech Stack

- **Framework:** React Native with [Expo SDK 54](https://docs.expo.dev/)
- **Language:** TypeScript
- **Routing:** [expo-router](https://docs.expo.dev/router/introduction/) (file-based routing)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand)
- **Database:** SQLite via `expo-sqlite`
- **Date Handling:** [dayjs](https://day.js.org/)
- **UI:** Native components with `@expo/vector-icons` (Ionicons)

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- npm or yarn
- [Expo CLI](https://docs.expo.dev/get-started/installation/)

## Getting Started

```bash
# Clone the repository
git clone https://github.com/javiercaz/paytrack.git
cd paytrack

# Install dependencies
npm install

# Start the development server
npm start
```

### Platform-specific

```bash
npm run android    # Run on Android emulator/device
npm run ios        # Run on iOS Simulator (macOS only)
npm run web        # Run in a web browser
```

## Scripts

| Script | Description |
| --- | --- |
| `npm start` | Start Expo dev server |
| `npm run android` | Start with Android |
| `npm run ios` | Start with iOS |
| `npm run web` | Start with web |
| `npm run lint` | Run ESLint |
| `npm run version` | Bump app version (prompts for patch/minor/major) |
| `npm run build:android` | Bump version + build Android (production AAB) |
| `npm run build:ios` | Bump version + build iOS (production) |
| `npm run build:all` | Bump version + build both platforms |

## Project Structure

```
app/                     # File-based routes (expo-router)
  (tabs)/                # Bottom tab navigation
  clients/               # Client CRUD screens
  collections/           # Collection CRUD screens
  payments/              # Payment recording screens
  receipts/              # Receipt view & share
  settings.tsx           # Settings screen
components/              # Reusable UI components
src/
  database/              # SQLite schema and connection
  services/              # Business logic (CRUD, backup, receipts)
  stores/                # Zustand state stores
  i18n/                  # English and Spanish translations
  theme/                 # Light/dark theme configuration
  types/                 # TypeScript interfaces
  utils/                 # Formatters and date utilities
```

## Configuration

No environment variables or external services are required. The app is fully self-contained with a local SQLite database.

App settings (appearance, language) are configured in-app via the Settings screen.

## Building for Production

For native builds, use [EAS Build](https://docs.expo.dev/build/introduction/).

### Version bump before building

Before triggering a build, bump the app version interactively:

```bash
npx expo-version
```

This updates both `app.json` and `package.json`, then creates a git commit and tag.

### Preview APK (testing & sharing)

Build an installable APK to test on your Android device or share with others before publishing:

```bash
npx expo-version && eas build --platform android --profile preview
```

EAS will generate a shareable download link — no Play Store required.

### Production build

```bash
# Production AAB (Google Play Store)
npx expo-version && eas build --platform android

# Production IPA (Apple App Store)
npx expo-version && eas build --platform ios

# Both platforms
npx expo-version && eas build --platform all
```

### Web build

Expo's static output can be deployed to any static hosting:

```bash
npx expo export --platform web
```

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

[MIT](LICENSE)
