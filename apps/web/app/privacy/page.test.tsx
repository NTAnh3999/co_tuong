import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import PrivacyPage from './page';

describe('/privacy', () => {
  afterEach(cleanup);

  it('renders the privacy heading', () => {
    render(<PrivacyPage />);
    expect(screen.getByRole('heading', { name: 'Quyền riêng tư' })).toBeInTheDocument();
  });
});
