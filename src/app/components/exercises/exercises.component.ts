import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { GenericService } from '../../service/generic.service';
import { GymVisualService } from '../../service/gymvisual.service';
import { Exercise } from '../../models/exercise';
import { BodyPart } from '../../models/bodypart';
import { Category } from '../../models/category';
import {
  GymVisualExercise,
  GymVisualFilters,
  GymVisualFilterOption,
  GymVisualPagination,
} from '../../models/gymvisual';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LoadingComponent } from '../loading/loading.component';

@Component({
  selector: 'app-exercises',
  imports: [FormsModule, ReactiveFormsModule],
  templateUrl: './exercises.component.html',
  styleUrls: ['./exercises.component.css'],
})
export class ExercisesComponent implements OnInit {
  exercises: Exercise[] = [];
  filteredExercises: Exercise[] = [];
  bodyParts: BodyPart[] = [];
  categories: Category[] = [];
  isLoading: boolean = false;
  currentPage: number = 1;
  pageSize: number = 20;

  // Search and filter properties
  searchTerm: string = '';
  selectedBodyPart: number = 0; // 0 means all
  selectedCategory: number = 0; // 0 means all

  // GymVisual properties
  gymVisualExercises: GymVisualExercise[] = [];
  gymVisualFilters!: GymVisualFilters;
  gymVisualPagination: GymVisualPagination = { currentPage: 1, totalPages: 1, totalItems: 0 };
  gymVisualLoading: boolean = false;
  selectedExerciseType: number = 69; // Default: Strength
  selectedGymBodyPart: number = 0; // 0 means all
  selectedEquipmentType: number = 0; // 0 means all
  selectedGender: number = 49; // Default: Male
  gymVisualPage: number = 1;

  constructor(
    private genericService: GenericService<any>,
    private sanitizer: DomSanitizer,
    private gymVisualService: GymVisualService
  ) {}

  ngOnInit(): void {
    this.loadBodyParts();
    this.loadCategories();
    this.loadExercises();
    this.loadGymVisualData();
  }

  loadGymVisualData(): void {
    this.selectedGender = this.gymVisualService.getDefaultGender();

    // Load filter options
    this.gymVisualService.getFilters().subscribe({
      next: (filters) => {
        this.gymVisualFilters = filters;
      },
      error: (err) => console.error('Error loading GymVisual filters:', err),
    });

    // Load initial exercises
    this.fetchGymVisualExercises();
  }

  fetchGymVisualExercises(): void {
    this.gymVisualLoading = true;
    this.gymVisualService
      .searchExercises(
        this.selectedGender,
        this.selectedExerciseType,
        this.selectedGymBodyPart,
        this.selectedEquipmentType,
        this.gymVisualPage,
        this.pageSize
      )
      .subscribe({
        next: (response) => {
          this.gymVisualExercises = response.exercises;
          if (response.pagination) {
            this.gymVisualPagination = response.pagination;
          }
          this.gymVisualLoading = false;
        },
        error: (err) => {
          console.error('Error fetching GymVisual exercises:', err);
          this.gymVisualLoading = false;
        },
      });
  }

  loadExercises(): void {
    this.isLoading = true;
    this.genericService.getAll('exercise').subscribe({
      next: (exercises) => {
        let processedExercises = exercises.map((exercise: Exercise) => {
          return {
            ...exercise,
            base64Thumbnail: exercise.thumbnail || './assets/dumbbell.png',
            thumbnail: exercise.thumbnail || '',
            sortKey: generateSortKey(exercise.id),
          };
        });

        // Sort by the deterministic sort key
        processedExercises.sort(
          (a: any, b: any) => a.sortKey - b.sortKey
        );

        this.exercises = processedExercises;
        this.filteredExercises = [...this.exercises];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading exercises:', err);
        this.isLoading = false;
      },
    });
  }

  loadBodyParts(): void {
    this.isLoading = true;
    this.genericService.getAll('bodypart').subscribe(
      (data) => {
        this.bodyParts = data;
        this.isLoading = false;
      },
      (error) => {
        console.error('Error fetching body parts:', error);
        this.isLoading = false;
      }
    );
  }

  loadCategories(): void {
    this.isLoading = true;
    this.genericService.getAll('category').subscribe(
      (data) => {
        this.categories = data;
        this.isLoading = false;
      },
      (error) => {
        console.error('Error fetching categories:', error);
        this.isLoading = false;
      }
    );
  }

  applyFilters(): void {
    // Reset pagination when applying filters
    this.currentPage = 1;

    // Start with all exercises
    let result = [...this.exercises];

    // Apply search term filter
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const term = this.searchTerm.toLowerCase().trim();
      result = result.filter(
        (exercise) =>
          exercise.name.toLowerCase().includes(term) ||
          this.getBodyPartName(exercise.bodypart_id)
            .toLowerCase()
            .includes(term) ||
          this.getCategoryName(exercise.category_id)
            .toLowerCase()
            .includes(term)
      );
    }

    // Apply body part filter - ensure numeric comparison
    if (this.selectedBodyPart > 0) {
      const bodyPartId = Number(this.selectedBodyPart);
      result = result.filter(
        (exercise) => Number(exercise.bodypart_id) === bodyPartId
      );
    }

    // Apply category filter - ensure numeric comparison
    if (this.selectedCategory > 0) {
      const categoryId = Number(this.selectedCategory);
      result = result.filter(
        (exercise) => Number(exercise.category_id) === categoryId
      );
    }

    // Update filtered exercises
    this.filteredExercises = result;

    // Also filter GymVisual exercises
    this.applyGymVisualFilters();
  }

  applyGymVisualFilters(): void {
    this.gymVisualPage = 1;
    this.fetchGymVisualExercises();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedBodyPart = 0;
    this.selectedCategory = 0;
    this.selectedExerciseType = 69;
    this.selectedGymBodyPart = 0;
    this.selectedEquipmentType = 0;
    this.selectedGender = 49;
    this.filteredExercises = [...this.exercises];
    this.currentPage = 1;
    this.gymVisualPage = 1;
    this.fetchGymVisualExercises();
  }

  get hasActiveFilters(): boolean {
    return (
      this.searchTerm.trim() !== '' ||
      this.selectedBodyPart > 0 ||
      this.selectedCategory > 0 ||
      this.selectedExerciseType !== 69 ||
      this.selectedGymBodyPart > 0 ||
      this.selectedEquipmentType > 0 ||
      this.selectedGender !== 49
    );
  }

  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = './assets/dumbbell.png';
  }

  getBodyPartName(id: number): string {
    const part = this.bodyParts.find((p) => p.id === id);
    return part ? part.name : 'Unknown';
  }

  getCategoryName(id: number): string {
    const category = this.categories.find((c) => c.id === id);
    return category ? category.name : 'Unknown';
  }

  getGymBodyPartName(id: number): string {
    if (!this.gymVisualFilters) return '';
    const part = this.gymVisualFilters.bodyParts.find((p) => p.id === id);
    return part ? part.name : '';
  }

  getEquipmentName(id: number): string {
    if (!this.gymVisualFilters) return '';
    const eq = this.gymVisualFilters.equipmentTypes.find((e) => e.id === id);
    return eq ? eq.name : '';
  }

  getExerciseTypeName(id: number): string {
    if (!this.gymVisualFilters) return '';
    const et = this.gymVisualFilters.exerciseTypes.find((e) => e.id === id);
    return et ? et.name : '';
  }

  getGenderName(id: number): string {
    if (!this.gymVisualFilters) return 'Male';
    const g = this.gymVisualFilters.genders.find((g) => g.id === id);
    return g ? g.name : 'Male';
  }

  get paginatedExercises(): Exercise[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredExercises.slice(startIndex, endIndex);
  }

  get gymVisualTotalPages(): number {
    return this.gymVisualPagination.totalPages;
  }

  get gymVisualTotalItems(): number {
    return this.gymVisualPagination.totalItems;
  }

  changeGymVisualPage(page: number): void {
    if (page >= 1 && page <= this.gymVisualTotalPages) {
      this.gymVisualPage = page;
      this.fetchGymVisualExercises();
    }
  }

  changeGymVisualPageAndScroll(page: number): void {
    if (page >= 1 && page <= this.gymVisualTotalPages) {
      this.gymVisualPage = page;
      this.fetchGymVisualExercises();
      this.scrollToTop();
    }
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  changePageAndScroll(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.scrollToTop();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.filteredExercises.length / this.pageSize);
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getGymVisualDisplayedPageNumbers(): number[] {
    return this._getPageNumbers(this.gymVisualTotalPages, this.gymVisualPage);
  }

  getDisplayedPageNumbers(): number[] {
    return this._getPageNumbers(this.totalPages, this.currentPage);
  }

  private _getPageNumbers(totalPages: number, currentPage: number): number[] {
    const maxPagesVisible = 5;

    if (totalPages <= maxPagesVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: number[] = [];
    pages.push(1);

    if (currentPage > 3) {
      pages.push(-1);
    }

    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);

    if (currentPage <= 3) {
      endPage = Math.min(totalPages - 1, 4);
    } else if (currentPage >= totalPages - 2) {
      startPage = Math.max(2, totalPages - 3);
    }

    for (let i = startPage; i <= endPage; i++) {
      if (i !== 1 && i !== totalPages) {
        pages.push(i);
      }
    }

    if (currentPage < totalPages - 2) {
      pages.push(-1);
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  }
}

function generateSortKey(id: number): number {
  const seed = id * 9301 + 49297;
  return (seed % 233280) / 233280;
}
