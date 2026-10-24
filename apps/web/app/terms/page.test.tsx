import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import TermsPage from './page';

describe('/terms', () => {
  afterEach(cleanup);

  it('renders the terms heading', () => {
    render(<TermsPage />);
    expect(screen.getByRole('heading', { name: 'Điều khoản sử dụng' })).toBeInTheDocument();
  });
});
