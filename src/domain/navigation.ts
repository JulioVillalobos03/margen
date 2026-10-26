export type Screen = 'welcome' | 'auth' | 'home' | 'vehicle' | 'goals' | 'evaluate' | 'history' | 'detail' | 'account' | 'capture' | 'live';
export type Navigation = { current: Screen; history: Screen[] };
export type NavigationAction = { type: 'open'; screen: Screen; tab?: boolean } | { type: 'back' } | { type: 'reset'; screen: Screen };
export const initialNavigation: Navigation = { current: 'welcome', history: [] };
export function navigationReducer(state: Navigation, action: NavigationAction): Navigation {
  if (action.type === 'reset') return { current: action.screen, history: [] };
  if (action.type === 'back') return state.history.length ? { current: state.history.at(-1)!, history: state.history.slice(0, -1) } : state;
  if (state.current === action.screen) return state;
  return { current: action.screen, history: action.tab || state.current === 'welcome' ? [] : [...state.history, state.current] };
}

/** Once a finger moves, returning to its origin must not turn a swipe into a tap. */
export class TapGesture {
  private origin: { x: number; y: number } | null = null;
  private moved = false;
  private touching = false;
  private endedAt = 0;
  private readonly now: () => number;
  constructor(now: () => number = Date.now) { this.now = now; }
  start(x: number, y: number) { this.origin = { x, y }; this.moved = false; this.touching = true; }
  move(x: number, y: number) {
    if (this.origin && Math.hypot(x - this.origin.x, y - this.origin.y) > 10) this.moved = true;
  }
  finish() { this.touching = false; this.endedAt = this.now(); }
  cancel() { this.moved = true; this.finish(); }
  canPress() { return !this.moved || (!this.touching && this.now() - this.endedAt > 300); }
}
