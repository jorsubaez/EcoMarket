import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../services/cart.service';
import { ApiProduct, ProductService } from '../services/product.service';
import { AuthService } from '../services/auth.service';
import { PROVINCIAS_ESPANA } from '../shared/provincias';

export interface Producto {
  id: number;
  nombre: string;
  origen: string;
  productor: string;
  categoria?: string;
  precio: number;
  unidad: string;
  disponibilidad: number;
  imagenUrl: string;
  tieneEcoSello: boolean;
  descripcion?: string;
  certificadoUrl?: string;
}

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css',
})
export class Catalogo implements OnInit {
  productos: Producto[] = [];
  selectedProducto: Producto | null = null;
  loading = true;
  selectedCategoria = 'Todos';
  selectedProvincia = 'Todas';
  minPrecio: number | null = null;
  maxPrecio: number | null = null;
  cercaDeMiActivo = false;

  readonly categoriasDisponibles = [
    'Todos',
    'Frutas',
    'Verduras',
    'Lacteos',
    'Huevos',
    'Miel',
    'Bebidas',
    'Conservas',
    'Otros',
  ];

  readonly provinciasDisponibles = ['Todas', ...PROVINCIAS_ESPANA];

  constructor(
    private cartService: CartService,
    private productService: ProductService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.productService.products$.subscribe((data: ApiProduct[]) => {
      this.productos = data.map((item) => ({
        id: item.id,
        nombre: item.name,
        origen: item.origin,
        productor: item.ownerName || 'Productor anonimo',
        categoria: this.inferirCategoria(item),
        precio: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
        unidad: item.unit,
        disponibilidad: item.quantity,
        imagenUrl:
          item.image_url || item.image_url_legacy || 'assets/images/placeholder.png',
        tieneEcoSello: item.verification_status === 'VERIFICADO',
        descripcion: item.description || '',
        certificadoUrl: item.certificate_url,
      }));
      this.loading = false;
      this.cdr.detectChanges();
    });

    this.productService.refreshProducts();
  }

  get productosFiltrados(): Producto[] {
    return this.productos.filter((producto) => {
      const categoriaValida =
        this.selectedCategoria === 'Todos' ||
        producto.categoria === this.selectedCategoria;
      const provinciaValida =
        this.selectedProvincia === 'Todas' ||
        producto.origen === this.selectedProvincia;
      const minValido = this.minPrecio === null || producto.precio >= this.minPrecio;
      const maxValido = this.maxPrecio === null || producto.precio <= this.maxPrecio;

      return categoriaValida && provinciaValida && minValido && maxValido;
    });
  }

  abrirModal(producto: Producto) {
    this.selectedProducto = producto;
    document.body.style.overflow = 'hidden';
  }

  cerrarModal() {
    this.selectedProducto = null;
    document.body.style.overflow = 'auto';
  }

  formatUnidadPrecio(unidad: string): string {
    if (!unidad) {
      return '';
    }

    return unidad.startsWith('EUR/') ? unidad.replace('EUR/', 'EUR/') : `EUR/${unidad}`;
  }

  actualizarCategoria(categoria: string) {
    this.selectedCategoria = categoria;
  }

  actualizarProvincia(provincia: string) {
    this.selectedProvincia = provincia;
    this.cercaDeMiActivo = false;
  }

  actualizarMinPrecio(value: string) {
    this.minPrecio = value === '' ? null : Number(value);
  }

  actualizarMaxPrecio(value: string) {
    this.maxPrecio = value === '' ? null : Number(value);
  }

  limpiarFiltros() {
    this.selectedCategoria = 'Todos';
    this.selectedProvincia = 'Todas';
    this.minPrecio = null;
    this.maxPrecio = null;
    this.cercaDeMiActivo = false;
  }

  aplicarCercaDeMi() {
    const usuario = this.authService.currentUser;

    if (!usuario) {
      alert('Debes iniciar sesión para usar el filtro "Cerca de mí".');
      return;
    }

    if (!usuario.provincia) {
      alert('Tu perfil no tiene una provincia configurada. Completa tu registro para usar esta función.');
      return;
    }

    this.selectedProvincia = usuario.provincia;
    this.cercaDeMiActivo = true;
    this.cdr.detectChanges();
  }

  agregarAlCarrito(producto: Producto, cantidadInput: string) {
    const cantidad = parseInt(cantidadInput, 10) || 1;
    this.cartService.addToCart(producto, cantidad);
    this.cerrarModal();
  }

  private inferirCategoria(item: ApiProduct): string {
    const textoBase = `${item.name} ${item.description || ''}`.toLowerCase();

    if (
      this.contieneAlguna(textoBase, [
        'manzana',
        'pera',
        'platano',
        'banana',
        'naranja',
        'limon',
        'uva',
        'fruta',
        'fresa',
        'melon',
      ])
    ) {
      return 'Frutas';
    }

    if (
      this.contieneAlguna(textoBase, [
        'lechuga',
        'tomate',
        'pepino',
        'zanahoria',
        'papa',
        'cebolla',
        'col',
        'brocoli',
        'verdura',
        'calabacin',
      ])
    ) {
      return 'Verduras';
    }

    if (
      this.contieneAlguna(textoBase, [
        'queso',
        'leche',
        'yogur',
        'yogurt',
        'mantequilla',
        'lacteo',
      ])
    ) {
      return 'Lacteos';
    }

    if (this.contieneAlguna(textoBase, ['huevo', 'huevos'])) {
      return 'Huevos';
    }

    if (this.contieneAlguna(textoBase, ['miel'])) {
      return 'Miel';
    }

    if (
      this.contieneAlguna(textoBase, [
        'zumo',
        'jugo',
        'vino',
        'bebida',
        'infusion',
        'cafe',
        'te',
      ])
    ) {
      return 'Bebidas';
    }

    if (
      this.contieneAlguna(textoBase, [
        'mermelada',
        'conserva',
        'mojo',
        'salsa',
        'compota',
      ])
    ) {
      return 'Conservas';
    }

    return 'Otros';
  }

  private contieneAlguna(texto: string, terminos: string[]): boolean {
    return terminos.some((termino) => texto.includes(termino));
  }
}
