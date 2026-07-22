import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { API_BASE, AuthUser, homeForRole } from '../core/api';

export interface AuthResponse {
  success: boolean;
  data: {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
  };
}

const USER_KEY = 'mitaneko_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = `${API_BASE}/auth`;

  readonly user = signal<AuthUser | null>(this.readUser());

  login(email: string, password: string) {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap((res) => this.persistSession(res)),
    );
  }

  register(data: {
    nom: string;
    prenom: string;
    email: string;
    password: string;
    telephone?: string;
  }) {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data).pipe(
      tap((res) => this.persistSession(res)),
    );
  }

  logout() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem(USER_KEY);
    }
    this.user.set(null);
  }

  isLoggedIn(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return !!localStorage.getItem('accessToken');
  }

  homeRoute(): string {
    return homeForRole(this.user()?.role);
  }

  private persistSession(res: AuthResponse) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('accessToken', res.data.accessToken);
    localStorage.setItem('refreshToken', res.data.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
    this.user.set(res.data.user);
  }

  private readUser(): AuthUser | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }
}
