// Domain & Infrastructure Port: Clock abstraction for deterministic time testing and time-travel simulation

export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  private offsetMs = 0;
  private listeners: Set<() => void> = new Set();

  public now(): Date {
    return new Date(Date.now() + this.offsetMs);
  }

  public getOffsetMs(): number {
    return this.offsetMs;
  }

  public advance(ms: number): void {
    this.offsetMs += ms;
    this.notify();
  }

  public advanceMinutes(minutes: number): void {
    this.advance(minutes * 60 * 1000);
  }

  public advanceHours(hours: number): void {
    this.advance(hours * 60 * 60 * 1000);
  }

  public advanceDays(days: number): void {
    this.advance(days * 24 * 60 * 60 * 1000);
  }

  public reset(): void {
    this.offsetMs = 0;
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }
}

export class FakeClock implements Clock {
  private currentTime: Date;

  constructor(initialTime?: Date | string) {
    this.currentTime = initialTime ? new Date(initialTime) : new Date('2026-09-03T08:00:00.000Z');
  }

  public now(): Date {
    return new Date(this.currentTime.getTime());
  }

  public set(time: Date | string): void {
    this.currentTime = new Date(time);
  }

  public advance(ms: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + ms);
  }

  public advanceMinutes(minutes: number): void {
    this.advance(minutes * 60 * 1000);
  }

  public advanceHours(hours: number): void {
    this.advance(hours * 60 * 60 * 1000);
  }

  public advanceDays(days: number): void {
    this.advance(days * 24 * 60 * 60 * 1000);
  }
}

// Global default system clock
export const defaultClock = new SystemClock();
