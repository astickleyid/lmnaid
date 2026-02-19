# GitHub Copilot Instructions for lmnaid

## Project Overview
lmnaid is a high-fidelity dark-mode social networking dashboard featuring profile management, post feeds, and AI-assisted content creation. Built with React, TypeScript, Vite, and Framer Motion.

## Tech Stack
- **Framework**: React 19.2.3 with TypeScript
- **Build Tool**: Vite 6.2.0
- **UI Framework**: Tailwind CSS (via classes)
- **Animation**: Framer Motion 12.23.26
- **Icons**: Lucide React
- **AI Integration**: Google Generative AI (Gemini)
- **Testing**: Vitest + React Testing Library

## Code Style Guidelines

### General Principles
- Use functional components with hooks (no class components)
- Prefer TypeScript strict typing over `any`
- Use descriptive variable names
- Keep components focused and single-responsibility
- Extract reusable logic into custom hooks

### Component Structure
```typescript
// 1. Imports
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// 2. Types/Interfaces
interface ComponentProps {
  title: string;
  onAction: () => void;
}

// 3. Component definition
export const Component = ({ title, onAction }: ComponentProps) => {
  // 4. Hooks
  const [state, setState] = useState('');
  
  // 5. Event handlers
  const handleClick = () => {
    // logic
  };
  
  // 6. Render
  return (
    <div className="container">
      {/* JSX */}
    </div>
  );
};
```

### Styling Conventions
- Use Tailwind CSS utility classes
- Dark theme is default: use `bg-black`, `bg-zinc-900`, `text-zinc-100`, etc.
- Primary color: purple (`purple-500`, custom primary CSS variable)
- Consistent spacing: `gap-4`, `p-4`, `mb-4`
- Responsive design: use `md:`, `lg:` breakpoints
- Animations: use Framer Motion for complex animations, CSS transitions for simple ones

### State Management
- Local state with `useState` for component-specific data
- Prop drilling for shared state (no global state library yet)
- Custom hooks for complex state logic
- Context API for theme and notifications

### API Integration
- Environment variable: `GEMINI_API_KEY` for AI features
- Use services directory for API calls
- Handle loading and error states explicitly

### File Organization
- Components in `/components` directory
- Services/API calls in `/services` directory
- Types in `/types.ts`
- One component per file
- Co-locate tests with components or in `__tests__` directory

### Testing
- Write tests for all new components
- Use React Testing Library
- Test user interactions, not implementation details
- Mock external dependencies (API calls, etc.)

### Naming Conventions
- Components: PascalCase (e.g., `UserProfile.tsx`)
- Files: PascalCase for components, camelCase for utilities
- Variables/functions: camelCase
- Constants: UPPER_SNAKE_CASE
- Types/Interfaces: PascalCase with descriptive names

### Git Workflow
- Branch naming: `feature/`, `fix/`, `docs/`, `chore/`
- Commit messages: conventional commits format
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation
  - `chore:` for maintenance tasks
  - `test:` for test additions/changes

## Common Patterns

### Modal Pattern
```typescript
const [isOpen, setIsOpen] = useState(false);

<Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
  {/* Modal content */}
</Modal>
```

### Animation Pattern
```typescript
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
>
  {/* Content */}
</motion.div>
```

### Event Handler Pattern
```typescript
const handleAction = (param: string) => {
  // Validation
  if (!param) return;
  
  // Action
  doSomething(param);
  
  // Notification
  addNotification('success', 'Action completed');
};
```

## Environment Variables
- `GEMINI_API_KEY`: Required for AI features
- Set in `.env.local` for local development
- Configure in Vercel for deployments

## Build and Deploy
- **Dev**: `npm run dev` (runs on port 3000)
- **Build**: `npm run build` (outputs to `dist/`)
- **Preview**: `npm run preview`
- **Test**: `npm test`
- **Deploy**: Automatic via Vercel on push to main

## CI/CD
- Pull requests trigger: lint, build, test, preview deployment
- Main branch push triggers: production deployment
- All workflows use GitHub Actions
- Vercel handles hosting and deployments

## Important Notes
- Always handle loading states for async operations
- Provide meaningful error messages to users
- Ensure responsive design works on mobile
- Test dark mode appearance
- Keep accessibility in mind (ARIA labels, keyboard navigation)
- Optimize images and assets for performance
