import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExitToLobbyButton } from './ExitToLobbyButton';

describe('ExitToLobbyButton', () => {
  it('links to the play mode-selection lobby', () => {
    render(<ExitToLobbyButton />);
    expect(screen.getByRole('link', { name: 'Thoát ra sảnh' })).toHaveAttribute('href', '/play');
  });
});
