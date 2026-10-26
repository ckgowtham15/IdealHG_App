import { Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { DurPipe } from './dur.pipe';
import { OrderStore } from './order.store';
import { AuthService } from './auth.service';
import { Order, STEPS } from './models';

@Component({
  selector: 'app-orders',
  imports: [ReactiveFormsModule, RouterLink, DurPipe, DatePipe],
  template: `
  <section class="stats">
    <div><b>{{ stats().total }}</b>Orders</div><div><b>{{ stats().active }}</b>In progress</div>
    <div><b>{{ stats().done }}</b>Completed</div><div><b>{{ stats().avg | dur }}</b>Avg. order-to-close</div>
  </section>
  @if (auth.isAdmin()) {
  <form class="card" [formGroup]="form" (ngSubmit)="create()">
    <h3>Start a new order</h3>
    <input formControlName="customer" placeholder="Customer *">
    <input formControlName="project" placeholder="Project name *">
    <input formControlName="product" placeholder="Product (e.g. sectional door)">
    <button [disabled]="form.invalid">Start – client visit</button>
  </form>
  }
  <h3>Orders</h3>
  @for (o of store.orders(); track o.id) {
    <a class="card order" [routerLink]="['/order', o.id]">
      <div><b>{{ o.project }}</b> <small>{{ o.customer }} · {{ o.id }} · started {{ o.created | date:'dd MMM, HH:mm' }}</small>
        <div class="bar"><i [style.width.%]="pct(o)"></i></div>
        <small>{{ o.closed ? 'Completed' : 'Now: ' + title(o) }}</small></div>
      <div class="t">⏱ {{ elapsed(o) | dur }}</div>
    </a>
  } @empty { <p class="muted">No orders yet – start one above.</p> }`,
})
export class OrdersComponent {
  store = inject(OrderStore);
  auth = inject(AuthService);
  private router = inject(Router);
  form = inject(FormBuilder).nonNullable.group({ customer: ['', Validators.required], project: ['', Validators.required], product: [''] });
  stats = computed(() => {
    const l = this.store.orders(), done = l.filter(o => o.closed);
    const avg = done.length ? done.reduce((a, o) => a + ((o.closed ?? 0) - o.created), 0) / done.length : undefined;
    return { total: l.length, active: l.length - done.length, done: done.length, avg };
  });
  create() {
    if (this.form.invalid) return;
    const id = this.store.add(this.form.getRawValue());
    this.form.reset();
    this.router.navigate(['/order', id]);
  }
  pct(o: Order) { return Math.round(((o.closed ? STEPS.length : o.idx) / STEPS.length) * 100); }
  elapsed(o: Order) { return (o.closed ?? this.store.now()) - o.created; }
  title(o: Order) { return STEPS[o.idx]?.title; }
}
