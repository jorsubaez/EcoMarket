import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { CartService } from '../services/cart.service';

export interface Producto {
  id: string | number; // Aceptamos ambos para evitar choques
  nombre: string;
  origen: string;
  productor: string;
  precio: number;
  unidad: string;
  disponibilidad: number;
  imagenUrl: string;
  tieneEcoSello: boolean;
  descripcion?: string;
}

@Component({
  selector: 'app-detalle',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './detalle.html',
  styleUrl: './detalle.css',
})
export class Detalle implements OnInit {
  private route = inject(ActivatedRoute);
  private firestore = inject(Firestore);
  private cartService = inject(CartService);
  private cdr = inject(ChangeDetectorRef);

  producto: Producto | undefined;
  loading = true;

  ngOnInit() {
    const id = this.route.snapshot.queryParamMap.get('id');
    if (id) {
      this.cargarProducto(id);
    }
  }

  async cargarProducto(id: string) {
    this.loading = true;
    try {
      const docRef = doc(this.firestore, `products/${id}`);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const item = docSnap.data();
        this.producto = {
          id: docSnap.id,
          nombre: item['name'],
          origen: item['origin'],
          productor: item['ownerName'] || 'Productor Anónimo',
          precio: parseFloat(item['price']),
          unidad: item['unit'],
          disponibilidad: item['quantity'],
          imagenUrl: item['image_url'] || 'assets/images/placeholder.png',
          tieneEcoSello: item['verification_status'] === 'VERIFICADO',
          descripcion: item['description'] || '',
        };
      }
    } catch (err) {
      console.error('Error fetching product', err);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  agregarAlCarrito(cantidadInput: string) {
    if (this.producto) {
      const cantidad = parseInt(cantidadInput, 10) || 1;
      // Usamos "as any" para puentear el conflicto de id: string vs id: number en tu CartService actual
      this.cartService.addToCart(this.producto as any, cantidad);
    }
  }
}
