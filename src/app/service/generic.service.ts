import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GenericService<T> {
  private baseUrl = `${environment.supabaseUrl}/rest/v1`;

  constructor(private http: HttpClient) {}

  getAll(endpoint: string, options?: { range?: string }): Observable<T[]> {
    let headers = this.getHeaders();
    if (options?.range) {
      headers = headers.set('Range', options.range);
    }
    const separator = endpoint.includes('?') ? '&' : '?';
    return this.http.get<T[]>(`${this.baseUrl}/${endpoint}${separator}select=*`, { headers });
  }

  getById(endpoint: string, id: number): Observable<T> {
    const headers = this.getHeaders()
      .set('Accept', 'application/vnd.pgrst.object+json');
    return this.http.get<T>(`${this.baseUrl}/${endpoint}?id=eq.${id}`, {
      headers,
    });
  }

  create(endpoint: string, data: T): Observable<T> {
    const headers = this.getHeaders()
      .set('Content-Type', 'application/json')
      .set('Prefer', 'return=representation'); // Ensure the server returns the created record
    return this.http.post<T>(`${this.baseUrl}/${endpoint}`, data, { headers });
  }
  updateById(endpoint: string, id: number, data: T): Observable<T> {
    const headers = this.getHeaders();
    return this.http.patch<T>(`${this.baseUrl}/${endpoint}?id=eq.${id}`, data, {
      headers,
    });
  }

  deleteById(endpoint: string, id: number): Observable<void> {
    const headers = this.getHeaders();
    return this.http.delete<void>(`${this.baseUrl}/${endpoint}?id=eq.${id}`, {
      headers,
    });
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      apikey: environment.supabaseKey,
      Authorization: `Bearer ${environment.supabaseKey}`,
    });
  }
}
