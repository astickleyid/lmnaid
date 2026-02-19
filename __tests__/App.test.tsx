import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import App from '../App';

describe('App', () => {
  it('renders without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });

  it('renders the application wrapper', () => {
    const { container } = render(<App />);
    // The app renders even if splash screen is shown first
    expect(container.firstChild).toBeTruthy();
  });
});
