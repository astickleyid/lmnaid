
# lmnaid - Social Networking Dashboard & Native Desktop App

[![CI](https://github.com/astickleyid/nXcor/actions/workflows/ci.yml/badge.svg)](https://github.com/astickleyid/nXcor/actions/workflows/ci.yml)
[![Deploy Production](https://github.com/astickleyid/nXcor/actions/workflows/deploy-production.yml/badge.svg)](https://github.com/astickleyid/nXcor/actions/workflows/deploy-production.yml)

A high-fidelity social networking platform with native desktop app, real-time streaming, and AI-powered features. Built with React, TypeScript, Electron, and powered by Google's Gemini AI.

View your app in AI Studio: https://ai.studio/apps/drive/1nKpc_GKeiJhJfBjiIQy8c9UC0UJC_UZ2

## ✨ Features

### Core Platform
- 🖥️ **Native Desktop App** - Electron-based app for macOS, Windows, Linux
- 🌙 **Dark Mode UI** - Elegant dark theme optimized for extended use
- 💬 **Real-time Chat** - Socket.IO powered messaging with typing indicators
- 🤖 **AI Integration** - Powered by Google Gemini AI for intelligent content
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- 🎨 **Smooth Animations** - Fluid animations using Framer Motion

### Social & Community
- 💬 **Social Features** - Posts, comments, profiles, and direct messaging
- 🌐 **Custom Servers** - Create gaming, study, or custom communities
- 👥 **User Profiles** - Customizable profiles with status and presence
- 🔔 **Notifications** - Real-time notifications for activity

### Streaming & Media
- 🎥 **Native Streaming** - Built-in RTMP server with HLS/DASH support
- 📺 **Twitch Integration** - Stream to Twitch & watch streams in-app
- 🎬 **Screen Capture** - Stream desktop or window content
- 📡 **Stream Management** - Viewer count, stream keys, live indicators

### Developer & Tools
- 🗄️ **Local Database** - SQLite embedded database (no setup)
- 🔧 **Developer Portal** - Built-in tools for developers
- 🎯 **Project Boards** - Kanban-style task management
- 🎤 **Voice Channels** - High-quality audio communication

## 🚀 Quick Start

### Native Desktop App

**For the full native app experience with streaming and database:**

See **[ELECTRON_SETUP.md](ELECTRON_SETUP.md)** for complete setup guide.

```bash
npm install
npm run build
npm run electron        # Start app
```

**Build installers:**
```bash
npm run electron:build:mac     # macOS DMG
npm run electron:build:win     # Windows installer
npm run electron:build:linux   # Linux AppImage/DEB
```

### Prerequisites
- Node.js 18+ (recommended: 20.x)
- npm or yarn package manager

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/astickleyid/nXcor.git
   cd nXcor
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env.local` file in the root directory:
   ```bash
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to `http://localhost:3000`

## 📦 Available Scripts

- `npm run dev` - Start development server (port 3000)
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Generate test coverage report

### Desktop App Scripts

- `npm run electron:dev` - Start desktop app in development mode
- `npm run electron:build` - Build desktop app for current platform
- `npm run electron:build:mac` - Build for macOS
- `npm run electron:build:win` - Build for Windows
- `npm run electron:build:linux` - Build for Linux

## 🎥 Live Streaming

The desktop app includes **native streaming functionality** that allows you to stream directly to Twitch.

### Features
- ✅ **Screen Capture** - Stream your entire screen
- ✅ **Cross-Platform** - Works on macOS, Windows, and Linux
- ✅ **RTMP Streaming** - Direct streaming to Twitch
- ✅ **Go Live Button** - Easy access from Twitch channels or sidebar
- ⏳ **Audio Support** - Coming soon (mic + system audio)

### How to Stream

1. **Get Your Twitch Stream Key**
   - Visit [Twitch Dashboard](https://dashboard.twitch.tv/settings/stream)
   - Copy your stream key (keep it secret!)

2. **Open Desktop App**
   ```bash
   npm run electron:dev  # Development mode
   # OR
   npm run electron:build  # Build installer
   ```

3. **Start Streaming**
   - Click the **"Go Live"** button (red video icon)
   - Enter your Twitch stream key
   - Select "Full Screen" as your source
   - Click **"Go Live on Twitch"**

4. **Verify**
   - Open your Twitch channel
   - Your stream should appear live!

For detailed documentation, see [STREAMING_IMPLEMENTATION.md](STREAMING_IMPLEMENTATION.md).

## 📺 Twitch Integration

Watch Twitch streams directly within lmnaid:

1. **Install Twitch Integration**
   - Click `+` in server sidebar
   - Browse integrations
   - Add Twitch

2. **Features**
   - Live stream player with chat
   - VOD browser
   - Clips gallery
   - Stream info and stats

For detailed documentation, see [TWITCH_INTEGRATION.md](TWITCH_INTEGRATION.md).

## 🔧 Tech Stack

- **Framework:** React 19.2.3
- **Language:** TypeScript 5.8.2
- **Build Tool:** Vite 6.2.0
- **Desktop:** Electron 39.2.7
- **Streaming:** FFmpeg + fluent-ffmpeg
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion 12.23.26
- **Icons:** Lucide React
- **AI:** Google Generative AI (Gemini)
- **State:** Zustand
- **Testing:** Vitest + React Testing Library

## 🚢 Deployment

### Automatic Deployment (Recommended)

This project uses GitHub Actions for automated deployment to Vercel:

- **Preview Deployments:** Automatically created for all pull requests
- **Production Deployments:** Automatically deployed when changes are pushed to the `main` branch

### Required Secrets

Configure these secrets in your GitHub repository settings:

- `VERCEL_TOKEN` - Your Vercel authentication token
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID` - Your Vercel project ID
- `GEMINI_API_KEY` - Your Google Gemini API key

### Manual Deployment

To deploy manually to Vercel:

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## 🧪 Testing

This project uses Vitest and React Testing Library for testing.

### Writing Tests

Tests are located in the `__tests__` directory. Example:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Component } from './Component';

describe('Component', () => {
  it('should render correctly', () => {
    render(<Component />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🤝 Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for details on:

- Code of conduct
- Development workflow
- Coding standards
- Pull request process
- CI/CD pipeline

## 📋 CI/CD Pipeline

### Continuous Integration

All pull requests trigger automated checks:

1. **Build Verification** - Ensures the project builds successfully
2. **Test Execution** - Runs all tests with coverage reporting
3. **Preview Deployment** - Deploys a preview version to Vercel

### Continuous Deployment

Merges to `main` branch trigger:

1. **Production Build** - Creates optimized production build
2. **Production Deployment** - Deploys to Vercel production environment
3. **Deployment Summary** - Generates summary with deployment URL

### Workflow Files

- `.github/workflows/ci.yml` - Runs tests and builds on PRs
- `.github/workflows/deploy-preview.yml` - Deploys preview on PRs
- `.github/workflows/deploy-production.yml` - Deploys production on main

## 📁 Project Structure

```
nXcor/
├── .github/
│   ├── workflows/           # GitHub Actions workflows
│   ├── ISSUE_TEMPLATE/      # Issue templates
│   ├── copilot-instructions.md  # GitHub Copilot instructions
│   └── pull_request_template.md
├── components/              # React components
├── services/                # API services
├── __tests__/              # Test files
├── App.tsx                  # Main application component
├── index.tsx                # Application entry point
├── types.ts                 # TypeScript type definitions
├── vite.config.ts          # Vite configuration
├── vitest.config.ts        # Vitest configuration
├── vercel.json             # Vercel deployment configuration
└── package.json            # Project dependencies
```

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key for AI features | Yes |

## 📝 License

This project is part of the AI Studio ecosystem.

## 🙏 Acknowledgments

- Built with [Vite](https://vitejs.dev/)
- Powered by [Google Gemini AI](https://ai.google.dev/)
- Hosted on [Vercel](https://vercel.com/)
- Icons by [Lucide](https://lucide.dev/)

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/astickleyid/nXcor/issues)
- **Discussions:** [GitHub Discussions](https://github.com/astickleyid/nXcor/discussions)
- **AI Studio:** https://ai.studio/apps/drive/1nKpc_GKeiJhJfBjiIQy8c9UC0UJC_UZ2

---

<div align="center">
Made with ❤️ by the lmnaid team
</div>
