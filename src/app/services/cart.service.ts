import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Firestore, collection, getDocs, doc, setDoc, deleteDoc } from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { Producto } from '../catalogo/catalogo';

export interface CartItem {
  id?: string;
  producto: Producto;
  cantidad: number;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  private cartItems: CartItem[] = [];
  private cartSubject = new BehaviorSubject<CartItem[]>([]);
  public cart$ = this.cartSubject.asObservable();

  constructor() {
    this.authService.session$.subscribe((session) => {
      if (session?.id) {
        this.loadCart(session.id);
      } else {
        this.clearCartLocal();
      }
    });
  }

  async loadCart(userId: string) {
    const cartRef = collection(this.firestore, `users/${userId}/cart`);
    const snapshot = await getDocs(cartRef);
    this.cartItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CartItem));
    this.cartSubject.next([...this.cartItems]);
  }

  async addToCart(producto: Producto, cantidad: number) {
    const user = this.authService.currentUser;
    if (!user) return;

    const existingItem = this.cartItems.find(item => item.producto.id === producto.id);
    const cartRef = collection(this.firestore, `users/${user.id}/cart`);

    if (existingItem) {
      existingItem.cantidad += cantidad;
      await setDoc(doc(cartRef, existingItem.id), { cantidad: existingItem.cantidad }, { merge: true });
    } else {
      const newItemRef = doc(cartRef);
      const newItem: CartItem = { id: newItemRef.id, producto, cantidad };
      await setDoc(newItemRef, newItem);
      this.cartItems.push(newItem);
    }
    this.cartSubject.next([...this.cartItems]);
  }

  async removeFromCart(productoId: string | number) {
    const user = this.authService.currentUser;
    const item = this.cartItems.find(i => i.producto.id === productoId);
    if (user && item?.id) {
      await deleteDoc(doc(this.firestore, `users/${user.id}/cart/${item.id}`));
      this.cartItems = this.cartItems.filter(i => i.id !== item.id);
      this.cartSubject.next([...this.cartItems]);
    }
  }

  async updateQuantity(productoId: string | number, cantidad: number) {
    if (cantidad <= 0) {
      await this.removeFromCart(productoId);
      return;
    }
    const user = this.authService.currentUser;
    const item = this.cartItems.find(i => i.producto.id === productoId);
    if (user && item?.id) {
      item.cantidad = cantidad;
      await setDoc(doc(this.firestore, `users/${user.id}/cart/${item.id}`), { cantidad }, { merge: true });
      this.cartSubject.next([...this.cartItems]);
    }
  }

  getCartTotal(): number {
    return this.cartItems.reduce((total, item) => total + (Number(item.producto.precio) * item.cantidad), 0);
  }

  getCartCount(): number {
    return this.cartItems.reduce((count, item) => count + item.cantidad, 0);
  }

  clearCartLocal() {
    this.cartItems = [];
    this.cartSubject.next([...this.cartItems]);
  }
}
