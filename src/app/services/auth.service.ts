import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap, Observable } from 'rxjs';
import { Router } from '@angular/router';

export interface SessionData {
  id: number | string;
  name: string;
  email: string;
  rol: string;
  provincia?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8000/api/users';
  private sessionSubject = new BehaviorSubject<SessionData | null>(this.getSessionFromStorage());
  public session$ = this.sessionSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  private getSessionFromStorage(): SessionData | null {
    try {
      const data = localStorage.getItem('ecomarket_session');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  get currentUser(): SessionData | null {
    return this.sessionSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem('ecomarket_token');
  }

  login(credentials: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login/`, credentials).pipe(
      tap(response => {
        if (response.access && response.user) {
          localStorage.setItem('ecomarket_token', response.access);
          localStorage.setItem('ecomarket_session', JSON.stringify(response.user));
          this.sessionSubject.next(response.user);
        }
      })
    );
  }

  register(userData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register/`, userData);
  }

  logout(): void {
    localStorage.removeItem('ecomarket_token');
    localStorage.removeItem('ecomarket_session');
    this.sessionSubject.next(null);
    this.router.navigate(['/login']);
  }

  updateSession(newData: Partial<SessionData>): void {
    const currentSession = this.currentUser;
    if (currentSession) {
      const updatedSession = { ...currentSession, ...newData };
      localStorage.setItem('ecomarket_session', JSON.stringify(updatedSession));
      this.sessionSubject.next(updatedSession);
    }
  }
}
