import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar } from '../src/components/common/Avatar';

describe('Avatar', () => {
  it('should render with default props', () => {
    render(<Avatar />);
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
  });

  it('should render with custom src', () => {
    const src = 'https://example.com/avatar.jpg';
    render(<Avatar src={src} alt="Test User" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', src);
    expect(img).toHaveAttribute('alt', 'Test User');
  });

  it('should render with different sizes', () => {
    const { rerender } = render(<Avatar size="sm" />);
    let img = screen.getByRole('img');
    expect(img).toHaveClass('w-8', 'h-8');

    rerender(<Avatar size="md" />);
    img = screen.getByRole('img');
    expect(img).toHaveClass('w-10', 'h-10');

    rerender(<Avatar size="lg" />);
    img = screen.getByRole('img');
    expect(img).toHaveClass('w-12', 'h-12');
  });

  it('should render status indicator when provided', () => {
    const { container } = render(<Avatar status="online" />);
    const statusIndicator = container.querySelector('[aria-label="Status: online"]');
    expect(statusIndicator).toBeInTheDocument();
  });

  it('should use default avatar when no src provided', () => {
    render(<Avatar />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', expect.stringContaining('dicebear'));
  });
});
