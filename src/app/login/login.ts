import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { finalize } from 'rxjs/operators';

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

    // Eliminamos los espacios en blanco accidentales al principio y al final del email
    this.email = this.email.trim();

    if (!this.email || !this.password) {
      this.errorMessage = 'Por favor, rellena todos los campos.';
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    this.authService.login({ email: this.email, password: this.password }).pipe(
      finalize(() => {
        this.submitting = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (profile) => {
        if (profile.rol?.toUpperCase() === 'PRODUCTOR') {
          this.router.navigate(['/panel-productor']);
        } else {
          this.router.navigate(['/perfil']);
        }
      },
      error: (err) => {
        // AHORA SÍ: Filtramos el error real de Firebase
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
          this.errorMessage = 'Email o contraseña incorrectos.';
        } else if (err.code === 'permission-denied') {
          this.errorMessage = 'Error de permisos en la base de datos (Firestore). Revisa las reglas.';
        } else {
          // Si es otro error raro, te lo mostrará en pantalla tal cual
          this.errorMessage = `Error interno: ${err.message || err.code}`;
        }
        console.error('Detalle del error de Firebase:', err);
      }
    });
  }
}
