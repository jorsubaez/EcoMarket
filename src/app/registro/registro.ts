import { Component, inject, ChangeDetectorRef } from '@angular/core'; // <-- Importa ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { PROVINCIAS_ESPANA } from '../shared/provincias';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './registro.html',
  styleUrl: './registro.css'
})
export class RegistroComponent {
  passwordVisible = false;
  passwordConfirmVisible = false;
  submitting = false;
  errorMessage = '';

  readonly provincias = PROVINCIAS_ESPANA;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef); // <-- Inyectamos el CDR

  registerForm = this.fb.group({
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    passwordConfirm: ['', Validators.required],
    provincia: ['', Validators.required],
    terms: [false, Validators.requiredTrue]
  });

  togglePassword(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  togglePasswordConfirm(): void {
    this.passwordConfirmVisible = !this.passwordConfirmVisible;
  }

  isInvalid(controlName: string): boolean {
    const control = this.registerForm.get(controlName);
    return !!control && control.invalid && control.touched;
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.errorMessage = 'Revisa los campos marcados antes de continuar.';
      return;
    }

    const { password, passwordConfirm } = this.registerForm.value;
    if (password !== passwordConfirm) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      this.registerForm.get('passwordConfirm')?.setErrors({ mismatch: true });
      this.registerForm.get('passwordConfirm')?.markAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    const userData = {
      ...this.registerForm.value,
      rol: 'CLIENTE'
    };

    this.authService.register(userData).subscribe({
      next: () => {
        // Firebase ya te ha iniciado sesión automáticamente. Solo redirigimos.
        this.submitting = false;
        this.cdr.detectChanges(); // <-- Avisamos a Angular de que ya terminamos
        this.router.navigate(['/catalogo']);
      },
      error: (err) => {
        this.submitting = false;
        // Mostramos el mensaje exacto para saber qué falló
        this.errorMessage = 'Error: ' + (err.message || 'Hubo un error al registrar tu cuenta.');
        this.cdr.detectChanges(); // <-- Avisamos a Angular del error
        console.error('Fallo en el registro:', err);
      }
    });
  }
}
