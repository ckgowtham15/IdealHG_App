import { Component, effect, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { OrderStore } from './order.store';
import { AuthService } from './auth.service';
@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet],
  template: `<header><a routerLink="/"><b>IDEAL HG</b> – Order Processing SOP – HÖRMANN</a>
    @if (auth.user(); as u) {
      <span class="who">{{ u.username }} ({{ u.role }})
        @if (auth.isAdmin()) { <a routerLink="/clients">Clients</a> }
        <a href="#" (click)="out($event)">Sign out</a></span>
    }</header>
  @if (!store.online()) { <div class="warn">Cannot reach the server – showing the last loaded data. Changes will not be saved until it reconnects.</div> }
  <main><router-outlet /></main>`,
})
export class App {
  store = inject(OrderStore); auth = inject(AuthService); private router = inject(Router);
  constructor() { effect(() => { if (!this.auth.user()) { this.store.orders.set([]); this.router.navigate(['/login']); } }); }
  out(e: Event) { e.preventDefault(); this.auth.logout(); }
}
