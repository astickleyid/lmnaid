# Contributing to lmnaid

Thank you for your interest in contributing to lmnaid! This document provides guidelines and instructions for contributing.

## Table of Contents
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [CI/CD Pipeline](#cicd-pipeline)

## Getting Started

### Prerequisites
- Node.js 18+ (recommended: 20.x)
- npm or yarn package manager
- Git

### Setup
1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/nXcor.git
   cd nXcor
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a `.env.local` file:
   ```bash
   GEMINI_API_KEY=your_api_key_here
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

The app should now be running at `http://localhost:3000`

## Development Workflow

### Branch Naming
Use descriptive branch names with prefixes:
- `feature/` - New features (e.g., `feature/add-user-settings`)
- `fix/` - Bug fixes (e.g., `fix/login-validation`)
- `docs/` - Documentation updates (e.g., `docs/update-readme`)
- `chore/` - Maintenance tasks (e.g., `chore/update-dependencies`)
- `test/` - Test additions/updates (e.g., `test/add-component-tests`)

### Commit Messages
Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(auth): add social login support

Implemented OAuth integration for Google and GitHub login.
Added new SocialLoginButton component.

Closes #123
```

```
fix(sidebar): resolve mobile menu overlay issue

Fixed z-index conflict causing menu to appear behind content.
```

## Code Standards

### TypeScript
- Enable strict mode in `tsconfig.json`
- Avoid using `any` - use proper types or `unknown`
- Define interfaces for all props and complex objects
- Use type inference where obvious

### React Components
- Use functional components with hooks
- Keep components small and focused (< 300 lines)
- Extract reusable logic into custom hooks
- Use meaningful prop names

### Styling
- Use Tailwind CSS utility classes
- Follow existing dark theme patterns
- Ensure responsive design (mobile-first)
- Test on different screen sizes

### Code Quality
- Run linting before committing
- Format code consistently
- Remove unused imports and variables
- Add comments for complex logic only

## Testing

### Writing Tests
- Write tests for all new features
- Use React Testing Library
- Focus on user behavior, not implementation
- Mock external dependencies

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### Test Structure
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Component } from './Component';

describe('Component', () => {
  it('should render correctly', () => {
    render(<Component />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle user interaction', () => {
    render(<Component />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(screen.getByText('Result')).toBeInTheDocument();
  });
});
```

## Submitting Changes

### Before Submitting
1. **Test your changes:**
   ```bash
   npm run build
   npm test
   ```

2. **Review your changes:**
   ```bash
   git diff
   ```

3. **Ensure code quality:**
   - No console errors
   - Responsive design works
   - No broken functionality

### Pull Request Process
1. **Update your branch:**
   ```bash
   git checkout main
   git pull upstream main
   git checkout your-branch
   git rebase main
   ```

2. **Push your changes:**
   ```bash
   git push origin your-branch
   ```

3. **Create a Pull Request:**
   - Use a clear, descriptive title
   - Reference related issues (e.g., "Fixes #123")
   - Provide context and screenshots if applicable
   - Fill out the PR template completely

4. **Address review feedback:**
   - Respond to comments
   - Make requested changes
   - Request re-review when ready

### Pull Request Template
Your PR should include:
- **Description**: What does this PR do?
- **Motivation**: Why is this change needed?
- **Testing**: How was this tested?
- **Screenshots**: If UI changes
- **Checklist**:
  - [ ] Tests pass locally
  - [ ] Code follows project conventions
  - [ ] Documentation updated (if needed)
  - [ ] No console warnings/errors

## CI/CD Pipeline

### Automated Checks
All pull requests trigger automated checks:

1. **CI Workflow** (`.github/workflows/ci.yml`)
   - Dependency installation
   - Build verification
   - Test execution
   - Code coverage report

2. **Preview Deployment** (`.github/workflows/deploy-preview.yml`)
   - Deploys preview to Vercel
   - Comments preview URL on PR
   - Updates on new commits

### Production Deployment
- Automatic on merge to `main` branch
- Runs production build
- Deploys to Vercel production environment
- Creates deployment summary

### Required Secrets
The following secrets must be configured in GitHub repository settings:
- `VERCEL_TOKEN` - Vercel authentication token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID
- `GEMINI_API_KEY` - Google Gemini API key

## Getting Help

- **Issues**: Check existing issues or create a new one
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Refer to README.md and inline code comments

## Code of Conduct
- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn and grow

## License
By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to lmnaid! 🎉
