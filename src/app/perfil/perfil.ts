import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-perfil',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly apiUrl = 'http://localhost:8000/api/users/me/';

  protected loading = false;
  protected accessDenied = false;
  protected editing = false;
  protected saving = false;
  protected successMessage = '';
  protected errorMessage = '';

  protected readonly sidebarItems = [
    'Mi perfil',
    'Mis pedidos',
    'Direcciones',
    'Ajustes',
    'Cerrar sesion',
  ];

  protected user: UserProfile = {
    id: '',
    nombre: 'Usuario EcoMarket',
    email: 'email@ejemplo.com',
    rol: 'cliente',
    telefono: '',
    direccion: '',
  };

  protected readonly profileForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email]],
    telefono: ['', [Validators.maxLength(20)]],
    direccion: ['', [Validators.maxLength(160)]],
  });

  async ngOnInit(): Promise<void> {
    const session = this.authService.currentUser;

    if (!session) {
      this.accessDenied = true;
      this.loading = false;
      return;
    }

    this.user = {
      id: session.id,
      nombre: session.name || 'Usuario EcoMarket',
      email: session.email || 'email@ejemplo.com',
      rol: session.rol || 'cliente',
      telefono: '',
      direccion: '',
    };

    this.syncFormWithUser();
    this.loadUserDetails();
  }

  protected get avatarInitials(): string {
    const parts = this.user.nombre
      .split(' ')
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 2);

    return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'UE';
  }

  protected get roleLabel(): string {
    switch (this.user.rol) {
      case 'productor':
        return 'Cuenta de productor';
      case 'cliente':
        return 'Cuenta de cliente';
      default:
        return 'Cuenta EcoMarket';
    }
  }

  protected get displayPhone(): string {
    return this.user.telefono?.trim() || 'No especificado';
  }

  protected get displayAddress(): string {
    return this.user.direccion?.trim() || 'Anade una direccion principal';
  }

  protected beginEdit(): void {
    this.clearMessages();
    this.editing = true;
    this.syncFormWithUser();
  }

  protected cancelEdit(): void {
    this.editing = false;
    this.clearMessages();
    this.syncFormWithUser();
  }

  protected async saveProfile(): Promise<void> {
    this.clearMessages();

    if (this.profileForm.invalid || !this.user.id) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const payload = {
      nombre: this.profileForm.controls.nombre.value.trim(),
      email: this.profileForm.controls.email.value.trim(),
      telefono: this.profileForm.controls.telefono.value.trim(),
      direccion: this.profileForm.controls.direccion.value.trim(),
    };

    this.saving = true;

    try {
      const updatedUser = await firstValueFrom(
        this.http.patch<any>(this.apiUrl, {
          first_name: payload.nombre.split(' ')[0] || '',
          last_name: payload.nombre.split(' ').slice(1).join(' ') || '',
          email: payload.email,
          telefono: payload.telefono,
          direccion: payload.direccion
        }),
      );

      this.user = {
        ...this.user,
        nombre: updatedUser.first_name + ' ' + updatedUser.last_name,
        email: updatedUser.email,
        telefono: updatedUser.telefono,
        direccion: updatedUser.direccion
      };

      this.authService.updateSession({
        name: this.user.nombre,
        email: this.user.email
      });

      this.syncFormWithUser();
      this.editing = false;
      this.successMessage = 'Perfil actualizado correctamente.';
    } catch {
      this.errorMessage =
        'No se pudo guardar el perfil. Comprueba que el backend de Django esté funcionando.';
    } finally {
      this.saving = false;
    }
  }

  protected handleSidebarAction(item: string): void {
    this.clearMessages();

    if (item === 'Cerrar sesion') {
      this.authService.logout();
      this.accessDenied = true;
      this.editing = false;
      return;
    }

    if (item === 'Mi perfil') {
      this.editing = false;
      return;
    }

    this.successMessage = `La sección "${item}" estará disponible en futuras versiones.`;
  }

  private loadUserDetails(): void {
    this.clearMessages();

    this.http.get<any>(this.apiUrl).subscribe({
      next: (remoteUser) => {
        this.user = {
          ...this.user,
          nombre: remoteUser.first_name ? remoteUser.first_name + ' ' + remoteUser.last_name : remoteUser.username,
          email: remoteUser.email,
          rol: remoteUser.rol,
          telefono: remoteUser.telefono || '',
          direccion: remoteUser.direccion || ''
        };
        this.syncFormWithUser();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage =
          'No se pudieron cargar los detalles completos del perfil. Se muestran los datos de la sesion local.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private syncFormWithUser(): void {
    this.profileForm.reset({
      nombre: this.user.nombre || '',
      email: this.user.email || '',
      telefono: this.user.telefono || '',
      direccion: this.user.direccion || '',
    });
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }
}

interface Session {
  id: number | string;
  name: string;
  email?: string;
  rol?: string;
}

interface UserProfile {
  id: number | string;
  nombre: string;
  email: string;
  rol: string;
  telefono?: string;
  direccion?: string;
}
