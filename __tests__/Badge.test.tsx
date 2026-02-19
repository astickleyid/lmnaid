import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../src/components/common/Badge';

describe('Badge', () => {
  it('should render children text', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('should apply variant classes', () => {
    const { rerender, container } = render(<Badge variant="success">Success</Badge>);
    expect(container.firstChild).toHaveClass('bg-green-500/10', 'text-green-400');

    rerender(<Badge variant="warning">Warning</Badge>);
    expect(container.firstChild).toHaveClass('bg-yellow-500/10', 'text-yellow-400');

    rerender(<Badge variant="error">Error</Badge>);
    expect(container.firstChild).toHaveClass('bg-red-500/10', 'text-red-400');
  });

  it('should apply size classes', () => {
    const { rerender, container } = render(<Badge size="sm">Small</Badge>);
    expect(container.firstChild).toHaveClass('px-2', 'py-0.5', 'text-xs');

    rerender(<Badge size="md">Medium</Badge>);
    expect(container.firstChild).toHaveClass('px-2.5', 'py-1', 'text-sm');
  });

  it('should apply custom className', () => {
    const { container } = render(<Badge className="custom-class">Test</Badge>);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
