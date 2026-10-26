import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService, User } from './auth.service';

@Component({
  selector: 'app-clients',
  imports: [ReactiveFormsModule],
  template: `
  <h2>Client accounts</h2>
  <form class="card" [formGroup]="f" (ngSubmit)="add()">
    <input formControlName="username" placeholder="Client username *">
    <input type="password" formControlName="password" placeholder="Password (min 4) *">
    <input formControlName="customer" placeholder="Customer name (as used on orders) *">
    <button [disabled]="f.invalid">Add client</button>
    @if (err()) { <p class="err">{{ err() }}</p> }
  </form>
  <table><tr><th>Username</th><th>Role</th><th>Customer (orders they can see)</th><th></th></tr>
    @for (u of users(); track u.username) {
      <tr><td>{{ u.username }}</td><td>{{ u.role }}</td><td>{{ u.customer }}</td>
        <td>@if (u.role === 'client') { <button class="no sm" (click)="del(u.username)">Remove</button> }</td></tr>
    }
  </table>`,
})
export class ClientsComponent {
  private auth = inject(AuthService);
  f = inject(FormBuilder).nonNullable.group({ username: ['', Validators.required], password: ['', [Validators.required, Validators.minLength(4)]], customer: ['', Validators.required] });
  users = signal<User[]>([]); err = signal('');
  constructor() { this.load(); }
  async load() { this.users.set(await this.auth.api('GET', '/users')); }
  async add() {
    this.err.set('');
    try { await this.auth.api('POST', '/users', this.f.getRawValue()); this.f.reset(); await this.load(); }
    catch { this.err.set('Could not add – username may already exist.'); }
  }
  async del(u: string) { await this.auth.api('DELETE', '/users/' + u); await this.load(); }
}
