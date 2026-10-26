import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { OrderStore } from './order.store';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  template: `
  <form class="card login" [formGroup]="f" (ngSubmit)="go()">
    <h3>Sign in</h3>
    <input formControlName="username" placeholder="Username" autocomplete="username">
    <input type="password" formControlName="password" placeholder="Password" autocomplete="current-password">
    <button [disabled]="f.invalid || busy()">Sign in</button>
    @if (err()) { <p class="err">{{ err() }}</p> }
    <small>Admin: processes orders and confirms every step. Client: views own orders and time log.</small>
  </form>`,
})
export class LoginComponent {
  private auth = inject(AuthService); private store = inject(OrderStore); private router = inject(Router);
  f = inject(FormBuilder).nonNullable.group({ username: ['', Validators.required], password: ['', Validators.required] });
  busy = signal(false); err = signal('');
  async go() {
    this.busy.set(true); this.err.set('');
    try { const v = this.f.getRawValue(); await this.auth.login(v.username, v.password); await this.store.load(); this.router.navigate(['/']); }
    catch { this.err.set('Wrong username or password'); }
    this.busy.set(false);
  }
}
