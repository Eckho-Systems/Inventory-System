# Roberto's Inventory System

## Getting Started

This is an offline-first inventory management system built with React Native and Expo, designed for Roberto's business to manage inventory, track transactions, and generate reports.

### Prerequisites

- [Node.js LTS](https://nodejs.org/)
- [Expo CLI](https://expo.dev/)
- [Watchman](https://facebook.github.io/watchman/) (for macOS/Linux)
- [Xcode](https://developer.apple.com/xcode/) (for iOS development)
- [Android Studio](https://developer.android.com/studio) (for Android development)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```
4. Follow the instructions in the terminal to open the app on your device or emulator.

### Available Scripts

- `npm start` - Start the development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS simulator
- `npm run web` - Run on web browser

### Project Structure

```
src/
├── features/           # Feature-based modules
│   ├── auth/          # Authentication
│   ├── inventory/     # Inventory management
│   ├── transactions/  # Transaction tracking
│   ├── reports/       # Reporting
│   └── users/         # User management
├── database/          # Database setup and models
├── services/          # API and business logic
├── navigation/        # Navigation configuration
├── utils/             # Utility functions
├── types/             # TypeScript type definitions
└── constants/         # Application constants
```

### Tech Stack

- **Frontend:** React Native with Expo
- **Database:** SQLite (local, offline-first)
- **State Management:** Zustand
- **UI Library:** React Native Paper + NativeWind
- **Navigation:** React Navigation

### Development

- Use TypeScript for type safety
- Follow the feature-based architecture
- Write tests for new features
- Keep components small and focused
- Use meaningful commit messages

### License

MIT
- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
