import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, getDocs, query, where } from '@angular/fire/firestore';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  async createOrder(data: any): Promise<string> {
    const user = this.authService.currentUser;
    if (!user) throw new Error('No authenticado');

    const docRef = await addDoc(collection(this.firestore, 'orders'), {
      ...data,
      userId: user.id,
      createdAt: new Date().toISOString(),
      status: 'PENDIENTE'
    });
    return docRef.id;
  }
}
