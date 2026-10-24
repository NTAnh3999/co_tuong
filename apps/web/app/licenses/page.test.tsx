import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import LicensesPage from './page';

describe('/licenses', () => {
  afterEach(cleanup);

  it('renders the licenses heading', () => {
    render(<LicensesPage />);
    expect(screen.getByRole('heading', { name: 'Giấy phép' })).toBeInTheDocument();
  });
});
