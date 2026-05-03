import { Component } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-contacto',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './contacto.html',
  styleUrl: './contacto.css',
})
export class Contacto {
  contactoForm = new FormGroup({
    nombre: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email]),
    motivo: new FormControl('Información general'),
    mensaje: new FormControl('', Validators.required),
  });

  successMessage = '';
  errorMessage = '';
  submitting = false;

  constructor(private http: HttpClient) {}

  onSubmit() {
    if (this.contactoForm.valid) {
      this.submitting = true;
      this.errorMessage = '';
      this.successMessage = '';

      this.http.post('http://localhost:8000/api/users/contact/', this.contactoForm.value).subscribe({
        next: () => {
          this.submitting = false;
          this.successMessage = '¡Formulario enviado correctamente! Nos pondremos en contacto contigo pronto.';
          this.contactoForm.reset({ motivo: 'Información general' });
          setTimeout(() => {
            this.successMessage = '';
          }, 4000);
        },
        error: (err) => {
          this.submitting = false;
          this.errorMessage = 'Hubo un error al enviar el mensaje. Por favor, inténtalo más tarde.';
          console.error(err);
        }
      });
    }
  }
}
