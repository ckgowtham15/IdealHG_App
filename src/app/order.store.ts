import { Injectable, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval, map } from 'rxjs';
import { Order, STEPS } from './models';
import { AuthService } from './auth.service';

/** Orders live on the server (shared by every device). The signal is refreshed every 8s. */
@Injectable({ providedIn: 'root' })
export class OrderStore {
  readonly now = toSignal(interval(1000).pipe(map(() => Date.now())), { initialValue: Date.now() });
  readonly orders = signal<Order[]>([]);
  readonly online = signal(true);
  readonly loaded = signal(false);
  private saving = 0;

  constructor() { this.load(); setInterval(() => this.load(), 8000); }

  private auth = inject(AuthService);
  private api = (m: string, p: string, b?: unknown) => this.auth.api(m, p, b);

  async load() {
    if (this.saving || !this.auth.user()) return;
    try {
      const l = await this.api('GET', '/orders');
      if (!this.saving) this.orders.set(l);
      this.online.set(true); this.loaded.set(true);
    } catch { this.online.set(false); }
  }

  private save(o: Order) {
    this.saving++;
    this.api('PUT', '/orders/' + o.id, o).then(() => this.online.set(true)).catch(() => this.online.set(false)).finally(() => this.saving--);
  }

  add(v: { customer: string; project: string; product: string }): string {
    const t = Date.now();
    const id = 'ORD-' + t.toString(36).toUpperCase().slice(-5);
    const o: Order = { id, ...v, created: t, idx: 0, log: [{ stepId: STEPS[0].id, start: t }] };
    this.orders.update(l => [o, ...l]); this.save(o);
    return id;
  }

  remove(id: string) {
    this.orders.update(l => l.filter(o => o.id !== id));
    this.saving++;
    this.api('DELETE', '/orders/' + id).catch(() => this.online.set(false)).finally(() => this.saving--);
  }

  /** Completes the running step (stamping its end time) and starts the next one. */
  advance(id: string, outcome: 'yes' | 'no', remark: string) {
    const o = this.orders().find(x => x.id === id);
    if (!o || o.closed) return;
    const now = Date.now(), step = STEPS[o.idx], decision = step.kind === 'decision';
    const log = o.log.map((e, i) => i === o.log.length - 1 ? { ...e, end: now, remark, by: this.auth.user()?.username, outcome: decision ? outcome : undefined } : e);
    const next = decision && outcome === 'no' ? STEPS.findIndex(s => s.id === step.backTo) : o.idx + 1;
    const n: Order = next >= STEPS.length ? { ...o, log, closed: now } : { ...o, idx: next, log: [...log, { stepId: STEPS[next].id, start: now }] };
    this.orders.update(l => l.map(x => (x.id === id ? n : x)));
    this.save(n);
  }
}
