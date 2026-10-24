import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Piece } from '@xq/xiangqi-core';
import { CapturedPieces } from './CapturedPieces';

afterEach(cleanup);

const red = (type: Piece['type']): Piece => ({ type, color: 'red' });
const black = (type: Piece['type']): Piece => ({ type, color: 'black' });

describe('CapturedPieces', () => {
  it('filters to only the requested color', () => {
    const captured = [red('CHARIOT'), black('SOLDIER'), red('SOLDIER'), black('GENERAL')];
    render(<CapturedPieces captured={captured} color="red" />);
    const list = screen.getByRole('list', { name: 'Đỏ bị ăn' });
    const items = within(list).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual(['車', '兵']);
  });

  it('renders an empty state when nothing of that color is captured', () => {
    render(<CapturedPieces captured={[black('CANNON')]} color="red" />);
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.getByText('Chưa có quân nào bị ăn')).toBeInTheDocument();
  });

  it('uses the Board2D glyph map for black pieces', () => {
    render(<CapturedPieces captured={[black('CANNON')]} color="black" />);
    expect(screen.getByRole('listitem')).toHaveTextContent('砲');
  });
});
