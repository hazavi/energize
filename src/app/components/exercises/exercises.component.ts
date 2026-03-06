import { Component, OnInit } from '@angular/core';
import { GenericService } from '../../service/generic.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

/** Matches the Supabase `exercises` table schema */
export interface CatalogExercise {
  id: number;
  name: string;
  gif_url: string;
  exercise_type: string;
  body_part: string[];
  equipment: string[];
  description?: string;
  steps?: string[];
  tip?: string;
}

@Component({
  selector: 'app-exercises',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './exercises.component.html',
  styleUrls: ['./exercises.component.css'],
})
export class ExercisesComponent implements OnInit {
  /** All exercises loaded from Supabase */
  allExercises: CatalogExercise[] = [];
  /** Filtered subset */
  filteredExercises: CatalogExercise[] = [];

  isLoading = false;
  searchTerm = '';
  currentPage = 1;
  pageSize = 20;

  /** Filter state */
  selectedExerciseType = '';
  selectedBodyPart = '';
  selectedEquipment = '';

  /** Distinct filter options (populated from data) */
  exerciseTypeOptions: string[] = [];
  bodyPartOptions: string[] = [];
  equipmentOptions: string[] = [];

  constructor(
    private genericService: GenericService<CatalogExercise>,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadExercises();
  }

  loadExercises(): void {
    this.isLoading = true;
    this.genericService.getAll('exercises', { range: '0-9999' }).subscribe({
      next: (data) => {
        this.allExercises = data;
        this.buildFilterOptions();
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading exercises:', err);
        this.isLoading = false;
      },
    });
  }

  /** Extract distinct filter values from loaded data */
  buildFilterOptions(): void {
    const types = new Set<string>();
    const parts = new Set<string>();
    const equip = new Set<string>();

    for (const ex of this.allExercises) {
      if (ex.exercise_type) types.add(ex.exercise_type);
      if (ex.body_part) ex.body_part.forEach((bp) => parts.add(bp));
      if (ex.equipment) ex.equipment.forEach((eq) => equip.add(eq));
    }

    this.exerciseTypeOptions = [...types].sort();
    this.bodyPartOptions = [...parts].sort();
    this.equipmentOptions = [...equip].sort();
  }

  /** Apply all active filters + search together */
  applyFilters(): void {
    this.currentPage = 1;
    let result = [...this.allExercises];

    // Search
    const term = this.searchTerm.toLowerCase().trim();
    if (term) {
      result = result.filter((ex) => ex.name.toLowerCase().includes(term));
    }

    // Exercise type
    if (this.selectedExerciseType) {
      result = result.filter((ex) => ex.exercise_type === this.selectedExerciseType);
    }

    // Body part (array contains)
    if (this.selectedBodyPart) {
      result = result.filter((ex) => ex.body_part?.includes(this.selectedBodyPart));
    }

    // Equipment (array contains)
    if (this.selectedEquipment) {
      result = result.filter((ex) => ex.equipment?.includes(this.selectedEquipment));
    }

    this.filteredExercises = result;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedExerciseType = '';
    this.selectedBodyPart = '';
    this.selectedEquipment = '';
    this.applyFilters();
  }

  get hasActiveFilters(): boolean {
    return (
      this.searchTerm.trim() !== '' ||
      this.selectedExerciseType !== '' ||
      this.selectedBodyPart !== '' ||
      this.selectedEquipment !== ''
    );
  }

  /** Paginated slice for current page */
  get paginatedExercises(): CatalogExercise[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredExercises.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredExercises.length / this.pageSize);
  }

  get totalItems(): number {
    return this.filteredExercises.length;
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  getDisplayedPageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const maxVisible = 5;

    if (total <= maxVisible) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: number[] = [1];
    if (current > 3) pages.push(-1);

    let start = Math.max(2, current - 1);
    let end = Math.min(total - 1, current + 1);

    if (current <= 3) end = Math.min(total - 1, 4);
    else if (current >= total - 2) start = Math.max(2, total - 3);

    for (let i = start; i <= end; i++) {
      if (i !== 1 && i !== total) pages.push(i);
    }

    if (current < total - 2) pages.push(-1);
    if (total > 1) pages.push(total);

    return pages;
  }

  /** Freeze GIF first frame onto preceding <canvas> */
  freezeGif(event: Event): void {
    const img = event.target as HTMLImageElement;
    const canvas = img.previousElementSibling as HTMLCanvasElement;
    if (canvas?.tagName === 'CANVAS') {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
  }

  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = './assets/dumbbell.png';
  }

  navigateToExercise(id: number): void {
    this.router.navigate(['/exercises', id]);
  }
}
