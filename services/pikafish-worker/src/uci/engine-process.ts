import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';

/**
 * Owns one UCI engine subprocess. Callers should check PIKAFISH_PATH before
 * constructing this class; there is intentionally no binary-path fallback.
 */
export class EngineProcess {
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly lines: string[] = [];
  private readonly waiters: Array<{
    predicate: (line: string) => boolean;
    resolve: (lines: string[]) => void;
    reject: (error: Error) => void;
    collected: string[];
    timeout: ReturnType<typeof setTimeout>;
  }> = [];
  private failure: Error | undefined;
  private disposed = false;

  constructor(binaryPath: string, args: string[] = []) {
    if (!binaryPath) throw new Error('Engine binary path is required');
    this.child = spawn(binaryPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });

    const output = createInterface({ input: this.child.stdout });
    output.on('line', (line) => this.receiveLine(line));
    this.child.on('error', (error) => this.fail(error));
    this.child.on('exit', (code, signal) => {
      if (!this.disposed) {
        this.fail(new Error(`Engine exited unexpectedly (code ${code}, signal ${signal})`));
      }
    });
  }

  send(command: string): void {
    if (this.failure) throw this.failure;
    if (this.disposed) throw new Error('Engine process is disposed');
    if (command.includes('\n') || command.includes('\r')) {
      throw new Error('Engine commands must be a single line');
    }
    this.child.stdin.write(`${command}\n`);
  }

  waitFor(predicate: (line: string) => boolean, timeoutMs = 10_000): Promise<string[]> {
    if (this.failure) return Promise.reject(this.failure);
    if (this.disposed) return Promise.reject(new Error('Engine process is disposed'));

    return new Promise((resolve, reject) => {
      const waiter = {
        predicate,
        resolve,
        reject,
        collected: [] as string[],
        timeout: setTimeout(() => {
          const index = this.waiters.indexOf(waiter);
          if (index >= 0) this.waiters.splice(index, 1);
          reject(new Error(`Timed out waiting for engine output after ${timeoutMs}ms`));
        }, timeoutMs),
      };
      this.waiters.push(waiter);
      this.drainLines();
    });
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    for (const waiter of this.waiters.splice(0)) {
      clearTimeout(waiter.timeout);
      waiter.reject(new Error('Engine process disposed while waiting for output'));
    }
    if (this.child.exitCode !== null || this.child.signalCode !== null) return;

    const exited = new Promise<void>((resolve) => this.child.once('exit', () => resolve()));
    this.child.stdin.end('quit\n');
    const killTimer = setTimeout(() => this.child.kill(), 500);
    await Promise.race([exited, new Promise<void>((resolve) => setTimeout(resolve, 1_000))]);
    clearTimeout(killTimer);
    if (this.child.exitCode === null && this.child.signalCode === null) this.child.kill();
  }

  private receiveLine(line: string): void {
    this.lines.push(line);
    this.drainLines();
  }

  private drainLines(): void {
    const waiter = this.waiters[0];
    if (!waiter) return;
    while (this.lines.length > 0) {
      const line = this.lines.shift()!;
      waiter.collected.push(line);
      if (waiter.predicate(line)) {
        this.waiters.shift();
        clearTimeout(waiter.timeout);
        waiter.resolve(waiter.collected);
        this.drainLines();
        return;
      }
    }
  }

  private fail(error: Error): void {
    if (this.failure) return;
    this.failure = error;
    for (const waiter of this.waiters.splice(0)) {
      clearTimeout(waiter.timeout);
      waiter.reject(error);
    }
  }
}
