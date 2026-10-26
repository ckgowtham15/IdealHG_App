import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './guards';
export const routes: Routes = [
  { path: 'login', title: 'Sign in', loadComponent: () => import('./login').then(m => m.LoginComponent) },
  { path: '', title: 'Orders', canActivate: [authGuard], loadComponent: () => import('./orders').then(m => m.OrdersComponent) },
  { path: 'order/:id', title: 'Order time log', canActivate: [authGuard], loadComponent: () => import('./detail').then(m => m.DetailComponent) },
  { path: 'clients', title: 'Clients', canActivate: [adminGuard], loadComponent: () => import('./clients').then(m => m.ClientsComponent) },
  { path: '**', redirectTo: '' },
];
