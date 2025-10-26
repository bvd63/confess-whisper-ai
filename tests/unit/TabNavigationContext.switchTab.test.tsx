import { describe, it, expect } from 'vitest';
import React from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { render, fireEvent, screen } from '@testing-library/react';
import { TabNavigationProvider, useTabNavigation } from '@/contexts/TabNavigationContext';

const LocationProbe: React.FC = () => {
  const location = useLocation();
  const { switchTab } = useTabNavigation();
  return (
    <div>
      <div data-testid="pathname">{location.pathname + location.search}</div>
      <button onClick={() => switchTab('home')}>go-home</button>
      <button onClick={() => switchTab('messages')}>go-messages</button>
    </div>
  );
};

const setup = (initialPath = '/messages?user=abc') => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <TabNavigationProvider>
        <LocationProbe />
      </TabNavigationProvider>
    </MemoryRouter>
  );
};

describe('TabNavigationContext.switchTab', () => {
  it('navigates away from a conversation when switching to Home', async () => {
    setup('/messages?user=xyz');

    // Sanity: we start inside a conversation
    expect(screen.getByTestId('pathname').textContent).toBe('/messages?user=xyz');

    // Switch to Home
    fireEvent.click(screen.getByText('go-home'));

    // Should be at home root
    expect(screen.getByTestId('pathname').textContent).toBe('/');
  });

  it('resets to messages list when tapping Messages inside a conversation', async () => {
    setup('/messages?user=abc');

    // Sanity
    expect(screen.getByTestId('pathname').textContent).toBe('/messages?user=abc');

    // Switch to Messages tab explicitly
    fireEvent.click(screen.getByText('go-messages'));

    // Should reset to messages list
    expect(screen.getByTestId('pathname').textContent).toBe('/messages');
  });
});
