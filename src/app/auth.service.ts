import { Injectable, computed, signal } from '@angular/core';
export interface User { username: string; role: 'admin' | 'client'; customer: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<User | null>(JSON.parse(localStorage.getItem('hg-user') ?? 'null'));
  readonly isAdmin = computed(() => this.user()?.role === 'admin');

  /** All server calls go through here: adds the sign-in token and signs out when it is rejected. */
  async api(method: string, path: string, body?: unknown): Promise<any> {
    const r = await fetch('/api' + path, { method, body: body ? JSON.stringify(body) : undefined,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (localStorage.getItem('hg-token') ?? '') } });
    if (r.status === 401 && path !== '/login') this.logout();
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  }
  async login(username: string, password: string) {
    const r = await this.api('POST', '/login', { username, password });
    const u: User = { username: r.username, role: r.role, customer: r.customer };
    localStorage.setItem('hg-token', r.token); localStorage.setItem('hg-user', JSON.stringify(u));
    this.user.set(u);
  }
  logout() { localStorage.removeItem('hg-token'); localStorage.removeItem('hg-user'); this.user.set(null); }
}
