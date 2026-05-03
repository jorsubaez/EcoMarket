import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { Router } from '@angular/router';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, authState } from '@angular/fire/auth';
import { Firestore, doc, setDoc, docData } from '@angular/fire/firestore';

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

  constructor() {
    // Escucha maestra: si el usuario cambia en Firebase Auth, sincronizamos con Firestore
    authState(this.auth).subscribe(user => {
      if (user) {
        docData(doc(this.firestore, `users/${user.uid}`)).subscribe({
          next: (profile: any) => {
            if (profile) {
              // El usuario existe y tiene perfil
              const session: SessionData = { id: user.uid, ...profile };
              this.sessionSubject.next(session);
              localStorage.setItem('ecomarket_session', JSON.stringify(session));
            } else {
              // FANTASMA: Existe en Auth pero le borraste el documento en Firestore
              this.sessionSubject.next(null);
              localStorage.removeItem('ecomarket_session');
            }
          },
          error: () => {
            // ERROR: El token fue revocado o la cuenta fue eliminada desde la consola
            this.sessionSubject.next(null);
            localStorage.removeItem('ecomarket_session');
          }
        });
      } else {
        // No hay usuario logueado
        this.sessionSubject.next(null);
        localStorage.removeItem('ecomarket_session');
      }
    });
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
        // Al guardar esto, el listener del constructor saltará automáticamente y actualizará
        await setDoc(doc(this.firestore, `users/${uid}`), profileData);
        return { uid, ...profileData };
      })
    );
  }

  login(credentials: any): Observable<SessionData> {
    return from(signInWithEmailAndPassword(this.auth, credentials.email, credentials.password)).pipe(
      switchMap(userCredential => {
        // Esperamos a traer el perfil de Firestore antes de completar el login
        return docData(doc(this.firestore, `users/${userCredential.user.uid}`)).pipe(
          take(1), // take(1) es vital para que la suscripción en el componente termine
          map((profile: any) => ({ id: userCredential.user.uid, ...profile } as SessionData))
        );
      })
    );
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
