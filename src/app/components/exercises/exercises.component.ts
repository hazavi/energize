import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { GenericService } from '../../service/generic.service';
import { Exercise } from '../../models/exercise';
import { BodyPart } from '../../models/bodypart';
import { Category } from '../../models/category';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LoadingComponent } from '../loading/loading.component';
import { Observable } from 'rxjs';

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
  pageSize: number = 12;

  // Search and filter properties
  searchTerm: string = '';
  selectedBodyPart: number = 0; // 0 means all
  selectedCategory: number = 0; // 0 means all

  constructor(
    private genericService: GenericService<any>,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadBodyParts();
    this.loadCategories();
    this.loadExercises();
  }

  loadExercises(): void {
    this.isLoading = true;
    this.genericService.getAll('exercise').subscribe({
      next: (exercises) => {
        // Process exercises
        let processedExercises = exercises.map((exercise) => ({
          ...exercise,
          base64Thumbnail: exercise.thumbnail || './asset/dumbbell.png',
          // Add a sortKey based on exercise ID for deterministic sorting
          sortKey: generateSortKey(exercise.id),
        }));

        // Sort by the deterministic sort key
        processedExercises.sort((a, b) => a.sortKey - b.sortKey);

        this.exercises = processedExercises;
        this.filteredExercises = [...this.exercises]; // Initialize filtered exercises
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
    console.log('Applying filters:', {
      searchTerm: this.searchTerm,
      selectedBodyPart: this.selectedBodyPart,
      selectedCategory: this.selectedCategory,
    });

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

    console.log('Filtered exercises:', result.length);

    // Update filtered exercises
    this.filteredExercises = result;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedBodyPart = 0;
    this.selectedCategory = 0;
    this.filteredExercises = [...this.exercises];
    this.currentPage = 1;
  }

  get hasActiveFilters(): boolean {
    return (
      this.searchTerm.trim() !== '' ||
      this.selectedBodyPart > 0 ||
      this.selectedCategory > 0
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

  get paginatedExercises(): Exercise[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredExercises.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredExercises.length / this.pageSize);
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

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Add this method to your component class
  getDisplayedPageNumbers(): number[] {
    const maxPagesVisible = 5;
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;

    if (totalPages <= maxPagesVisible) {
      // If we have fewer pages than the max visible, show all pages
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Always include first page, last page, current page, and 1-2 pages around current page
    const pages: number[] = [];

    // Always add page 1
    pages.push(1);

    // If current page is far from page 1, add ellipsis
    if (currentPage > 3) {
      pages.push(-1); // -1 represents ellipsis
    }

    // Add pages around current page
    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);

    // Adjust to show at least 3 pages in the middle when possible
    if (currentPage <= 3) {
      endPage = Math.min(totalPages - 1, 4);
    } else if (currentPage >= totalPages - 2) {
      startPage = Math.max(2, totalPages - 3);
    }

    for (let i = startPage; i <= endPage; i++) {
      if (i !== 1 && i !== totalPages) {
        // Avoid duplicates
        pages.push(i);
      }
    }

    // If current page is far from last page, add ellipsis
    if (currentPage < totalPages - 2) {
      pages.push(-1); // -1 represents ellipsis
    }

    // Always add last page
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  }
}

// Add this helper function somewhere in your component
function generateSortKey(id: number): number {
  // Create a deterministic "random" value using the exercise ID
  // This ensures the same exercises will always get the same sort order
  // Use a simple hash function (you can adjust this algorithm if needed)
  const seed = id * 9301 + 49297;
  return (seed % 233280) / 233280;
}
