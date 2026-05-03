import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { AuthService } from '../services/auth.service';

interface UserProfile {
  id: string | number;
  nombre: string;
  email: string;
  rol: string;
  telefono?: string;
  direccion?: string;
}

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

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
    email: [{ value: '', disabled: true }, [Validators.required, Validators.email]], // Deshabilitado porque cambiar email en Firebase requiere reautenticar
    telefono: ['', [Validators.maxLength(20)]],
    direccion: ['', [Validators.maxLength(160)]],
  });

  ngOnInit(): void {
    // Al suscribirnos, si Firebase tarda un poco en confirmar la sesión,
    // el perfil se dibujará automáticamente en cuanto los datos lleguen.
    this.authService.session$.subscribe(session => {
      if (!session) {
        this.accessDenied = true;
        this.loading = false;
        this.cdr.detectChanges();
        return;
      }

      this.accessDenied = false;
      this.user = {
        id: session.id,
        nombre: session.name || 'Usuario EcoMarket',
        email: session.email || 'email@ejemplo.com',
        rol: session.rol || 'CLIENTE',
        telefono: session.telefono || '',
        direccion: session.direccion || '',
      };

      this.syncFormWithUser();
      this.cdr.detectChanges();
    });
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
    switch (this.user.rol?.toLowerCase()) {
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
      name: this.profileForm.controls.nombre.value.trim(),
      telefono: this.profileForm.controls.telefono.value.trim(),
      direccion: this.profileForm.controls.direccion.value.trim(),
    };

    this.saving = true;

    try {
      // 1. Guardamos en Firestore
      await this.authService.updateProfile(String(this.user.id), payload);

      // 2. Actualizamos la vista localmente
      this.user = {
        ...this.user,
        nombre: payload.name,
        telefono: payload.telefono,
        direccion: payload.direccion
      };

      // ¡Magia! Firebase ya ha actualizado el BehaviorSubject de la sesión y el localStorage por detrás.
      // Así que ya no necesitamos llamar a updateSession().

      this.syncFormWithUser();
      this.editing = false;
      this.successMessage = 'Perfil actualizado correctamente.';
    } catch (error) {
      console.error(error);
      this.errorMessage = 'No se pudo guardar el perfil.';
    } finally {
      this.saving = false;
      this.cdr.detectChanges();
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
