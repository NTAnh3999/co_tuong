import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import RulesPage from './page';

describe('/rules', () => {
  afterEach(cleanup);

  it('renders the rules heading', () => {
    render(<RulesPage />);
    expect(screen.getByRole('heading', { name: 'Luật chơi' })).toBeInTheDocument();
  });
});
