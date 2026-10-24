import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Move, Square } from '@xq/xiangqi-core';
import { MoveList } from './MoveList';

afterEach(cleanup);

const mv = (from: string, to: string): Move => ({ from: from as Square, to: to as Square });

describe('MoveList', () => {
  it('renders numbered move pairs in UCI text', () => {
    const moves = [mv('h2', 'e2'), mv('h7', 'e7'), mv('b0', 'c2')];
    const { container } = render(<MoveList moves={moves} />);
    const rows = container.querySelectorAll('li');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('1. h2e2 h7e7');
    expect(rows[1]).toHaveTextContent('2. b0c2');
  });

  it('highlights the last move by default and the given ply when currentPly is set', () => {
    const moves = [mv('h2', 'e2'), mv('h7', 'e7'), mv('b0', 'c2')];
    const { rerender, container } = render(<MoveList moves={moves} />);
    expect(container.querySelector('[aria-current="step"]')).toHaveTextContent('b0c2');
    expect(container.querySelector('[aria-current="step"]')).toHaveAttribute('data-ply', '3');

    rerender(<MoveList moves={moves} currentPly={2} />);
    expect(container.querySelector('[aria-current="step"]')).toHaveAttribute('data-ply', '2');
  });

  it('renders an empty list without crashing', () => {
    render(<MoveList moves={[]} />);
    expect(screen.getByText('Chưa có nước đi')).toBeInTheDocument();
  });
});
