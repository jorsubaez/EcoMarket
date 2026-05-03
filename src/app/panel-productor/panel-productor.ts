import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { ApiProduct, ProductService } from '../services/product.service';
import { PROVINCIAS_ESPANA } from '../shared/provincias';

interface Product {
  id?: string;
  ownerId: string;
  ownerName?: string;
  name: string;
  origin: string;
  price: number;
  unit: string;
  description: string;
  quantity: number;
  image?: string;
  verification_status?: string;
}

@Component({
  selector: 'app-panel-productor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './panel-productor.html',
  styleUrl: './panel-productor.css',
})
export class PanelProductor implements OnInit, OnDestroy {
  @ViewChild('imageInput') imageInput?: ElementRef<HTMLInputElement>;

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly productService = inject(ProductService);
  private readonly cdr = inject(ChangeDetectorRef);

  private productsSub?: Subscription;

  private readonly placeholderImage =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200">
        <rect width="320" height="200" rx="18" fill="#edf7ee"/>
        <circle cx="108" cy="82" r="26" fill="#9ccc9f"/>
        <path d="M44 160c18-34 44-50 78-50 28 0 53 14 76 43 11-13 26-20 43-20 29 0 53 17 70 27v0H44z" fill="#58a55c"/>
        <text x="160" y="182" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#2f6f35">EcoMarket</text>
      </svg>
    `);

  protected sessionName = 'Productor';
  protected accessDenied = false;
  protected loading = true;
  protected submitting = false;
  protected compressing = false;
  protected searchTerm = '';
  protected readonly provincias = PROVINCIAS_ESPANA;
  protected successMessage = '';
  protected errorMessage = '';

  protected selectedFileName = 'Ningún archivo seleccionado';

  protected editingProductId: string | null = null;
  protected products: Product[] = [];

  protected readonly productForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    origin: ['', [Validators.required, Validators.maxLength(80)]],
    price: [0, [Validators.required, Validators.min(0)]],
    unit: ['EUR/kg', Validators.required],
    description: ['', [Validators.required, Validators.maxLength(300)]],
    quantity: [0, [Validators.required, Validators.min(0)]],
  });

  private selectedImageFile: File | null = null;
  private ownerId: string | null = null;

  async ngOnInit(): Promise<void> {
    const session = this.authService.currentUser;

    if (!session || session.rol?.toUpperCase() !== 'PRODUCTOR') {
      this.accessDenied = true;
      this.loading = false;
      return;
    }

    this.sessionName = session.name || 'Productor';
    this.ownerId = session.id;

    this.productsSub = this.productService.products$.subscribe((allProducts) => {
      this.products = allProducts
        .filter((p) => String(p.ownerId) === String(this.ownerId))
        .map((p) => ({
          id: p.id,
          ownerId: p.ownerId,
          ownerName: p.ownerName,
          name: p.name,
          origin: p.origin,
          price: p.price,
          unit: p.unit,
          description: p.description,
          quantity: p.quantity,
          image: p.image_url || '',
          verification_status: p.verification_status || 'VERIFICADO',
        }));

      this.loading = false;
      this.cdr.detectChanges();
    });

    this.productService.refreshProducts();
  }

  ngOnDestroy(): void {
    if (this.productsSub) {
      this.productsSub.unsubscribe();
    }
  }

  protected get filteredProducts(): Product[] {
    const query = this.searchTerm.trim().toLowerCase();
    if (!query) return this.products;
    return this.products.filter((product) => product.name.toLowerCase().includes(query));
  }

  protected get isEditing(): boolean {
    return this.editingProductId !== null;
  }

  protected updateSearch(term: string): void {
    this.searchTerm = term;
  }

  protected async submitProduct(): Promise<void> {
    this.clearMessages();

    if (this.productForm.invalid || this.ownerId === null) {
      this.productForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const formValue = this.productForm.getRawValue();

    const payload: Partial<ApiProduct> = {
      ownerId: this.ownerId,
      ownerName: this.sessionName,
      name: formValue.name.trim(),
      origin: formValue.origin.trim(),
      price: Number(formValue.price),
      unit: formValue.unit,
      description: formValue.description.trim(),
      quantity: Number(formValue.quantity),
    };

    if (this.selectedImageFile) {
      payload.image = this.selectedImageFile;
    }

    try {
      if (this.editingProductId !== null) {
        await this.productService.updateProduct(this.editingProductId, payload);
        this.successMessage = 'Producto actualizado correctamente.';
      } else {
        await this.productService.createProduct(payload);
        this.successMessage = 'Producto añadido correctamente.';
      }
      this.resetForm();
    } catch (error: any) {
      console.error('Submit Error:', error);
      this.errorMessage = 'No se pudo guardar el producto. Comprueba tu conexión.';
    } finally {
      this.submitting = false;
      this.cdr.detectChanges();
    }
  }

  protected editProduct(product: Product): void {
    this.clearMessages();
    this.editingProductId = product.id ?? null;
    this.selectedImageFile = null;
    this.selectedFileName = product.image ? 'Imagen actual' : 'Ningún archivo seleccionado';

    this.productForm.setValue({
      name: product.name ?? '',
      origin: product.origin ?? '',
      price: Number(product.price ?? 0),
      unit: product.unit ?? 'EUR/kg',
      description: product.description ?? '',
      quantity: Number(product.quantity ?? 0),
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected async deleteProduct(product: Product): Promise<void> {
    const confirmed = window.confirm(`Vas a eliminar "${product.name}".\n\n¿Seguro que deseas continuar?`);
    if (!confirmed) return;

    this.clearMessages();
    try {
      if (!product.id) return;
      await this.productService.deleteProduct(product.id);
      if (this.editingProductId === product.id) this.resetForm();
      this.successMessage = 'Producto eliminado correctamente.';
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error eliminando producto:', error);
      this.errorMessage = 'No se pudo eliminar el producto.';
      this.cdr.detectChanges();
    }
  }

  protected cancelEdit(): void {
    this.resetForm();
    this.clearMessages();
  }

  protected async onImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];

    if (!file) {
      this.selectedFileName = this.isEditing ? 'Imagen actual' : 'Ningún archivo seleccionado';
      this.selectedImageFile = null;
      return;
    }

    if (!file.type.match(/image\/(jpeg|jpg|png|webp)/)) {
      this.errorMessage = 'Formato de imagen inválido. Por favor sube una foto en formato JPG, PNG o WebP.';
      this.selectedFileName = 'Ningún archivo seleccionado';
      this.selectedImageFile = null;
      if (this.imageInput) this.imageInput.nativeElement.value = '';
      return;
    }

    this.errorMessage = '';
    this.selectedImageFile = file;
    this.selectedFileName = file.name;
  }

  protected logout(): void {
    this.authService.logout();
    this.accessDenied = true;
    this.products = [];
    this.clearMessages();
  }

  protected formatPrice(value: number | string): string {
    const numericValue = Number(value);
    return Number.isNaN(numericValue) ? `${value}` : numericValue.toFixed(2).replace('.', ',');
  }

  protected formatUnit(unit: string): string {
    return unit ? unit.replace('EUR/', '€/') : '';
  }

  protected productImage(product: Product): string {
    return product.image || this.placeholderImage;
  }

  protected getStatusLabel(status?: string): string {
    return status === 'VERIFICADO' ? 'Verificado' : 'Pendiente';
  }

  protected getStatusClass(status?: string): string {
    return status === 'VERIFICADO' ? 'status-badge verified' : 'status-badge pending';
  }

  private resetForm(): void {
    this.productForm.reset({
      name: '', origin: '', price: 0, unit: 'EUR/kg', description: '', quantity: 0,
    });
    this.editingProductId = null;
    this.selectedImageFile = null;
    this.selectedFileName = 'Ningún archivo seleccionado';
    if (this.imageInput) this.imageInput.nativeElement.value = '';
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }
}
