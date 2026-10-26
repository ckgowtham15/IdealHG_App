import { Component, computed, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { DurPipe } from './dur.pipe';
import { OrderStore } from './order.store';
import { AuthService } from './auth.service';
import { STEPS } from './models';

@Component({
  selector: 'app-detail',
  imports: [DatePipe, DurPipe, RouterLink],
  template: `
  <a routerLink="/">← All orders</a>
  @if (o(); as order) {
    <h2>{{ order.project }} <small>{{ order.customer }} · {{ order.id }}</small></h2>
    <p class="t">⏱ Total time: {{ total() | dur }} @if (order.closed) { <span class="ok">· Completed</span> }</p>

    @if (cur(); as c) {
      <div class="card cur">
        <span [class]="'tag ' + c.kind">{{ c.kind }}</span>
        <h3>{{ c.title }}</h3>
        <p class="t">Running: {{ running() | dur }}</p>
        @if (auth.isAdmin()) {
        <input #r placeholder="Remark (optional)">
        @if (c.kind === 'decision') {
          <button (click)="go('yes', r)">Yes – continue</button>
          <button class="no" (click)="go('no', r)">No – {{ c.noText }}</button>
        } @else { <button (click)="go('yes', r)">Complete step ✓</button> }
        } @else { <p class="muted">Waiting for the admin to confirm this step.</p> }
      </div>
    }

    <h3>Step summary</h3>
    <table>
      <tr><th>#</th><th>Step</th><th>Status</th><th>Tries</th><th>Time spent</th></tr>
      @for (r of rows(); track r.step.id; let i = $index) {
        <tr [class]="r.status"><td>{{ i + 1 }}</td><td><span [class]="'tag ' + r.step.kind">{{ r.step.kind }}</span> {{ r.step.title }}</td>
          <td>{{ r.status }}</td><td>{{ r.tries || '' }}</td><td>{{ r.ms ? (r.ms | dur) : '' }}</td></tr>
      }
    </table>

    <h3>Time log <button class="sm" (click)="csv()">Export CSV</button></h3>
    <table>
      <tr><th>Step</th><th>Start</th><th>End</th><th>Duration</th><th>Outcome</th><th>Remark</th><th>By</th></tr>
      @for (e of order.log; track e.start) {
        <tr><td>{{ title(e.stepId) }}</td><td>{{ e.start | date:'dd MMM HH:mm:ss' }}</td>
          <td>{{ e.end ? (e.end | date:'dd MMM HH:mm:ss') : 'running…' }}</td>
          <td>{{ (e.end ?? store.now()) - e.start | dur }}</td><td>{{ e.outcome ?? '' }}</td><td>{{ e.remark }}</td><td>{{ e.by }}</td></tr>
      }
    </table>
    @if (auth.isAdmin()) { <button class="no sm" (click)="del()">Delete order</button> }
  } @else { <p>{{ store.loaded() ? 'Order not found.' : 'Loading…' }}</p> }`,
})
export class DetailComponent {
  id = input.required<string>();          // bound from the route (withComponentInputBinding)
  store = inject(OrderStore);
  auth = inject(AuthService);
  private router = inject(Router);
  o = computed(() => this.store.orders().find(x => x.id === this.id()));
  cur = computed(() => { const o = this.o(); return o && !o.closed ? STEPS[o.idx] : undefined; });
  total = computed(() => { const o = this.o(); return o ? (o.closed ?? this.store.now()) - o.created : 0; });
  running = computed(() => { const o = this.o(); return o ? this.store.now() - o.log[o.log.length - 1].start : 0; });
  rows = computed(() => {
    const o = this.o(); const now = this.store.now();
    return STEPS.map((step, i) => {
      const es = o?.log.filter(e => e.stepId === step.id) ?? [];
      const ms = es.reduce((a, e) => a + ((e.end ?? now) - e.start), 0);
      const status = !o ? 'pending' : o.closed || i < o.idx && es.length ? 'done' : i === o.idx ? 'current' : es.length ? 'done' : 'pending';
      return { step, tries: es.length, ms, status };
    });
  });
  title = (id: string) => STEPS.find(s => s.id === id)?.title;
  go(outcome: 'yes' | 'no', r: HTMLInputElement) { this.store.advance(this.id(), outcome, r.value.trim()); r.value = ''; }
  del() { this.store.remove(this.id()); this.router.navigate(['/']); }
  csv() {
    const o = this.o(); if (!o) return;
    const q = (v: unknown) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const rows = [['Step', 'Start', 'End', 'Duration (s)', 'Outcome', 'Remark'], ...o.log.map(e => [this.title(e.stepId), new Date(e.start).toISOString(),
      e.end ? new Date(e.end).toISOString() : '', e.end ? Math.round((e.end - e.start) / 1000) : '', e.outcome ?? '', e.remark ?? ''])];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.map(r => r.map(q).join(',')).join('\n')], { type: 'text/csv' }));
    a.download = o.id + '-timelog.csv'; a.click();
  }
}
