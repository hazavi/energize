import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, tap, catchError } from 'rxjs';
import {
  GymVisualExercise,
  GymVisualFilters,
  GymVisualFilterOption,
  GymVisualSearchResponse,
} from '../models/gymvisual';

@Injectable({
  providedIn: 'root',
})
export class GymVisualService {
  private readonly API_BASE = '/api/gymvisual';
  private readonly DEFAULT_GENDER = 49; // Male
  private cachedFilters: GymVisualFilters | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Fetch exercises from GymVisual via the proxy server.
   * Style is always "Basic Grey" (locked server-side).
   * Gender defaults to Male. All other filters are user-selectable.
   */
  searchExercises(
    gender: number = this.DEFAULT_GENDER,
    exerciseType: number = 0,
    bodyPart: number = 0,
    equipment: number = 0,
    page: number = 1,
    perPage: number = 20
  ): Observable<GymVisualSearchResponse> {
    let params = new HttpParams()
      .set('gender', gender.toString())
      .set('exerciseType', exerciseType.toString())
      .set('bodyPart', bodyPart.toString())
      .set('equipment', equipment.toString())
      .set('page', page.toString())
      .set('perPage', perPage.toString());

    return this.http.get<GymVisualSearchResponse>(
      `${this.API_BASE}/exercises`,
      { params }
    );
  }

  /**
   * Fetch available filter options from GymVisual (parsed from the page).
   * Results are cached after the first call.
   */
  getFilters(): Observable<GymVisualFilters> {
    if (this.cachedFilters) {
      return of(this.cachedFilters);
    }

    return this.http
      .get<GymVisualFilters>(`${this.API_BASE}/filters`)
      .pipe(
        tap((filters) => {
          this.cachedFilters = filters;
        }),
        catchError((err) => {
          console.error('Failed to fetch GymVisual filters, using fallback:', err);
          return of(this.getFallbackFilters());
        })
      );
  }

  getDefaultGender(): number {
    return this.DEFAULT_GENDER;
  }

  /**
   * Fallback filters in case the proxy is unreachable.
   * These match the values from gymvisual.com's catalog.
   */
  private getFallbackFilters(): GymVisualFilters {
    return {
      exerciseTypes: [
        { id: 0, name: 'All' },
        { id: 74, name: 'Aerobic' },
        { id: 63, name: 'Stretching' },
        { id: 69, name: 'Strength' },
      ],
      bodyParts: [
        { id: 0, name: 'All' },
        { id: 24, name: 'Back' },
        { id: 19, name: 'Calves' },
        { id: 18, name: 'Cardio' },
        { id: 23, name: 'Chest' },
        { id: 86, name: 'Feet' },
        { id: 25, name: 'Forearms' },
        { id: 84, name: 'Hands' },
        { id: 21, name: 'Hips' },
        { id: 15, name: 'Neck' },
        { id: 17, name: 'Plyometrics' },
        { id: 27, name: 'Shoulders' },
        { id: 20, name: 'Thighs' },
        { id: 26, name: 'Upper Arms' },
        { id: 22, name: 'Waist' },
        { id: 62, name: 'Weightlifting' },
      ],
      equipmentTypes: [
        { id: 0, name: 'All' },
        { id: 33, name: 'Assisted' },
        { id: 34, name: 'Band' },
        { id: 46, name: 'Barbell' },
        { id: 73, name: 'Battling Rope' },
        { id: 29, name: 'Body weight' },
        { id: 30, name: 'Bosu ball' },
        { id: 44, name: 'Cable' },
        { id: 45, name: 'Dumbbell' },
        { id: 43, name: 'EZ Barbell' },
        { id: 61, name: 'Hammer' },
        { id: 41, name: 'Kettlebell' },
        { id: 40, name: 'Leverage machine' },
        { id: 35, name: 'Medicine Ball' },
        { id: 39, name: 'Olympic barbell' },
        { id: 67, name: 'Power Sled' },
        { id: 65, name: 'Resistance Band' },
        { id: 31, name: 'Rope' },
        { id: 38, name: 'Sled machine' },
        { id: 37, name: 'Smith machine' },
        { id: 32, name: 'Stability ball' },
        { id: 79, name: 'Stick' },
        { id: 51, name: 'Suspension' },
        { id: 36, name: 'Trap bar' },
        { id: 42, name: 'Weighted' },
        { id: 47, name: 'Wheel roller' },
      ],
      genders: [
        { id: 49, name: 'Male' },
        { id: 48, name: 'Female' },
      ],
    };
  }
}
