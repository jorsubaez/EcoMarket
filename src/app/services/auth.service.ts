import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, authState } from '@angular/fire/auth';
import { Firestore, doc, setDoc, onSnapshot } from '@angular/fire/firestore';

export interface SessionData {
  id: string;
  name: string;
  email: string;
  rol: string;
  provincia?: string;
  telefono?: string;
  direccion?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);

  private sessionSubject = new BehaviorSubject<SessionData | null>(this.getSessionFromStorage());
  public session$ = this.sessionSubject.asObservable();

  // Guardamos el listener para poder "matarlo" cuando cerramos sesión
  private profileUnsubscribe: (() => void) | null = null;

  constructor() {
    authState(this.auth).subscribe(user => {
      // 1. Si había un listener anterior, lo destruimos
      if (this.profileUnsubscribe) {
        this.profileUnsubscribe();
        this.profileUnsubscribe = null;
      }

      if (user) {
        // 2. Creamos el nuevo listener
        const docRef = doc(this.firestore, `users/${user.uid}`);
        this.profileUnsubscribe = onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            const profile = snap.data();
            const session: SessionData = { id: user.uid, ...profile } as SessionData;
            this.sessionSubject.next(session);
            localStorage.setItem('ecomarket_session', JSON.stringify(session));
          } else {
            this.clearSession();
          }
        }, (error) => {
          console.error('Error de Firestore:', error);
          this.clearSession();
        });
      } else {
        this.clearSession();
      }
    });
  }

  private clearSession() {
    this.sessionSubject.next(null);
    localStorage.removeItem('ecomarket_session');
  }

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

  register(userData: any): Observable<any> {
    return from(
      createUserWithEmailAndPassword(this.auth, userData.email, userData.password)
    ).pipe(
      switchMap(async (userCredential) => {
        const uid = userCredential.user.uid;
        const profileData: Partial<SessionData> = {
          name: `${userData.first_name} ${userData.last_name}`.trim(),
          email: userData.email,
          rol: userData.rol || 'CLIENTE',
          provincia: userData.provincia
        };
        await setDoc(doc(this.firestore, `users/${uid}`), profileData);
        return { uid, ...profileData };
      })
    );
  }

  // Ahora el login SOLO autentica. La redirección la hará el componente al escuchar el session$
  login(credentials: any): Observable<any> {
    return from(signInWithEmailAndPassword(this.auth, credentials.email, credentials.password));
  }

  logout(): void {
    signOut(this.auth).then(() => {
      this.router.navigate(['/login']);
    });
  }

  async updateProfile(uid: string, data: Partial<SessionData>): Promise<void> {
    await setDoc(doc(this.firestore, `users/${uid}`), data, { merge: true });
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
