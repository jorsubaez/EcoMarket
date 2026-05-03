import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

export interface ApiProduct {
  id: number;
  name: string;
  origin: string;
  price: number | string;
  unit: string;
  description: string;
  quantity: number;
  /**
   * `image` is a File object when uploading; the API response returns a URL
   * string via `image_url`. The field is kept optional to cover both cases.
   */
  image?: File | string | null;
  image_url_legacy?: string;
  certificate?: File | string | null;
  certificate_url?: string;
  verification_status?: string;
  ownerId: number | string;
  ownerName?: string;
  image_url?: string;
}

/** Fields that are always sent as plain text in a multipart request. */
type TextPayloadKey = Exclude<keyof ApiProduct, 'image' | 'certificate'>;

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private apiUrl = 'http://localhost:8000/api/productos/';

  private productsSubject = new BehaviorSubject<ApiProduct[]>([]);
  public products$ = this.productsSubject.asObservable();

  constructor(private http: HttpClient) {}

  async refreshProducts(): Promise<void> {
    try {
      const products = await firstValueFrom(this.http.get<ApiProduct[]>(this.apiUrl));
      this.productsSubject.next(products);
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  async createProduct(payload: Partial<ApiProduct>): Promise<ApiProduct> {
    const formData = this.buildFormData(payload);
    const newProduct = await firstValueFrom(
      this.http.post<ApiProduct>(this.apiUrl, formData),
    );
    await this.refreshProducts();
    return newProduct;
  }

  async updateProduct(id: number | string, payload: Partial<ApiProduct>): Promise<ApiProduct> {
    const formData = this.buildFormData(payload);
    const updatedProduct = await firstValueFrom(
      // PATCH is used so that fields not included in the payload are preserved.
      this.http.patch<ApiProduct>(`${this.apiUrl}${id}/`, formData),
    );
    await this.refreshProducts();
    return updatedProduct;
  }

  async deleteProduct(id: number | string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.apiUrl}${id}/`));
    await this.refreshProducts();
  }

  /**
   * Convert a plain object payload into a FormData instance.
   *
   * - File fields (`image`, `certificate`) are appended as Blob/File objects
   *   so that Django's DRF `ImageField` / `FileField` can parse them.
   * - All other fields are appended as strings.
   * - `null` values for file fields send an explicit empty string so that
   *   DRF interprets the field as "cleared" when the model allows null.
   */
  private buildFormData(payload: Partial<ApiProduct>): FormData {
    const fd = new FormData();

    for (const [key, value] of Object.entries(payload)) {
      if (key === 'image' || key === 'certificate') {
        if (value instanceof File) {
          fd.append(key, value, (value as File).name);
        } else if (value === null) {
          fd.append(key, '');
        }
        // If undefined, omit the field entirely (field is left unchanged by PATCH).
      } else if (value !== undefined && value !== null) {
        fd.append(key as TextPayloadKey, String(value));
      }
    }

    return fd;
  }
}
