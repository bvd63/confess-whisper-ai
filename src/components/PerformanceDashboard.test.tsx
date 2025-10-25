import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock the observability module
vi.mock('@/lib/observability', () => ({
  observability: {
    getMetricsSummary: vi.fn(() => ({
      'query_test': {
        count: 10,
        average: 150,
        p95: 200,
        min: 50,
        max: 300
      }
    })),
    getRequestLogs: vi.fn(() => []),
  }
}));

// Simple component to test performance metrics display
const PerformanceMetrics = () => {
  const { observability } = require('@/lib/observability');
  const metrics = observability.getMetricsSummary();
  
  return (
    <div>
      {Object.entries(metrics).map(([name, stats]: [string, any]) => (
        <div key={name} data-testid={`metric-${name}`}>
          <span>{name}</span>
          <span data-testid="p95">{stats.p95}ms</span>
          <span data-testid="average">{stats.average}ms</span>
        </div>
      ))}
    </div>
  );
};

describe('PerformanceMetrics', () => {
  it('should display performance metrics', () => {
    render(<PerformanceMetrics />);
    
    expect(screen.getByText('query_test')).toBeInTheDocument();
    expect(screen.getByTestId('p95')).toHaveTextContent('200ms');
    expect(screen.getByTestId('average')).toHaveTextContent('150ms');
  });
});
