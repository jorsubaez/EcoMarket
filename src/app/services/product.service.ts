import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Firestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';

export interface ApiProduct {
  id?: string;
  name: string;
  origin: string;
  price: number;
  unit: string;
  description: string;
  quantity: number;
  image?: File | null;
  image_url?: string;
  certificate?: File | null;
  certificate_url?: string;
  verification_status?: string;
  ownerId: string;
  ownerName?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private firestore = inject(Firestore);
  private storage = inject(Storage);

  private productsSubject = new BehaviorSubject<ApiProduct[]>([]);
  public products$ = this.productsSubject.asObservable();

  async refreshProducts(): Promise<void> {
    const q = collection(this.firestore, 'products');
    const querySnapshot = await getDocs(q);
    const products = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as ApiProduct));
    this.productsSubject.next(products);
  }

  async createProduct(payload: Partial<ApiProduct>): Promise<void> {
    const productData = { ...payload };
    delete productData.image;
    delete productData.certificate;

    // Subir imagen
    if (payload.image) {
      const imgRef = ref(this.storage, `products/img_${Date.now()}_${payload.image.name}`);
      await uploadBytes(imgRef, payload.image);
      productData.image_url = await getDownloadURL(imgRef);
    }

    // Subir certificado
    if (payload.certificate) {
      const certRef = ref(this.storage, `certificates/cert_${Date.now()}_${payload.certificate.name}`);
      await uploadBytes(certRef, payload.certificate);
      productData.certificate_url = await getDownloadURL(certRef);
    }

    productData.verification_status = 'PENDIENTE';
    await addDoc(collection(this.firestore, 'products'), productData);
    await this.refreshProducts();
  }

  async updateProduct(id: string, payload: Partial<ApiProduct>): Promise<void> {
    const productData = { ...payload };
    delete productData.image;
    delete productData.certificate;
    delete productData.id;

    if (payload.image) {
      const imgRef = ref(this.storage, `products/img_${Date.now()}_${payload.image.name}`);
      await uploadBytes(imgRef, payload.image);
      productData.image_url = await getDownloadURL(imgRef);
    }

    if (payload.certificate) {
      const certRef = ref(this.storage, `certificates/cert_${Date.now()}_${payload.certificate.name}`);
      await uploadBytes(certRef, payload.certificate);
      productData.certificate_url = await getDownloadURL(certRef);
    }

    const docRef = doc(this.firestore, `products/${id}`);
    await updateDoc(docRef, productData);
    await this.refreshProducts();
  }

  async deleteProduct(id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `products/${id}`));
    await this.refreshProducts();
  }
}
