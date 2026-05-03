import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  email = '';
  password = '';
  passwordVisible = false;
  errorMessage = '';
  submitting = false;
  submitted = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  togglePassword() {
    this.passwordVisible = !this.passwordVisible;
  }

  onSubmit() {
    this.submitted = true;
    this.email = this.email.trim();

    if (!this.email || !this.password) {
      this.errorMessage = 'Por favor, rellena todos los campos.';
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    // 1. Iniciamos sesión en Firebase Auth
    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        // 2. Esperamos a que Firestore descargue el perfil automáticamente
        const sub = this.authService.session$.subscribe(profile => {
          if (profile) {
            this.submitting = false;
            sub.unsubscribe(); // Dejamos de escuchar para no repetir la redirección

            if (profile.rol?.toUpperCase() === 'PRODUCTOR') {
              this.router.navigate(['/panel-productor']);
            } else {
              this.router.navigate(['/perfil']);
            }
          }
        });
      },
      error: (err) => {
        this.submitting = false;
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
          this.errorMessage = 'Email o contraseña incorrectos.';
        } else {
          this.errorMessage = `Error: ${err.message || err.code}`;
        }
        this.cdr.detectChanges();
      }
    });
  }
}
