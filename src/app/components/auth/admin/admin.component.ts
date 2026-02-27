import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GenericService } from '../../../service/generic.service';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';

@Component({
  selector: 'app-admin',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    NgxPaginationModule
],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class AdminComponent implements OnInit {
  currentView: string = 'bodyparts'; // Tracks the current view (bodyparts, categories, exercises)
  bodyParts: any[] = [];
  categories: any[] = [];
  exercises: any[] = [];
  newBodyPart: any = {}; // Stores the body part being added or edited
  newCategory: any = {}; // Stores the category being added or edited
  newExercise: any = {}; // Stores the exercise being added or edited
  imagePreview: string | null = null; // Stores the thumbnail preview for exercises
  isModalOpen: boolean = false; // Tracks modal visibility

  // Pagination variables
  bodyPartsPage: number = 1;
  categoriesPage: number = 1;
  exercisesPage: number = 1;
  itemsPerPage: number = 9;

  constructor(
    private genericService: GenericService<any>,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadBodyParts();
    this.loadCategories();
    this.loadExercises();
  }

  // Load body parts
  loadBodyParts(): void {
    this.genericService.getAll('bodypart').subscribe(
      (data) => (this.bodyParts = data),
      (error) => console.error('Error loading body parts:', error)
    );
  }

  // Load categories
  loadCategories(): void {
    this.genericService.getAll('category').subscribe(
      (data) => (this.categories = data),
      (error) => console.error('Error loading categories:', error)
    );
  }

  // Load exercises
  loadExercises(): void {
    this.genericService.getAll('exercise').subscribe(
      (data) => (this.exercises = data),
      (error) => console.error('Error loading exercises:', error)
    );
  }

  // Open modal for adding or editing
  openModal(): void {
    this.isModalOpen = true;

    if (this.currentView === 'bodyparts') {
      this.newBodyPart = {};
    } else if (this.currentView === 'categories') {
      this.newCategory = {};
    } else if (this.currentView === 'exercises') {
      this.newExercise = {};
      this.imagePreview = null;
    }
  }

  // Close modal
  closeModal(): void {
    this.isModalOpen = false;
    this.newBodyPart = {};
    this.newCategory = {};
    this.newExercise = {};
    this.imagePreview = null;
  }

  // Add or update entry
  addOrUpdateEntry(): void {
    if (this.currentView === 'bodyparts') {
      if (this.newBodyPart.bodyPartId) {
        // Update body part
        this.genericService
          .updateById(
            'bodyparts',
            this.newBodyPart.bodyPartId,
            this.newBodyPart
          )
          .subscribe(
            () => {
              this.loadBodyParts();
              this.snackBar.open('Body part updated successfully!', '', {
                duration: 2000,
                verticalPosition: 'top',
                horizontalPosition: 'center',
                panelClass: ['success-snackbar'],
              });
              this.closeModal();
            },
            (error) => console.error('Error updating body part:', error)
          );
      } else {
        // Add body part
        this.genericService.create('bodypart', this.newBodyPart).subscribe(
          () => {
            this.loadBodyParts();
            this.snackBar.open('Body part added successfully!', '', {
              duration: 2000,
              verticalPosition: 'top',
              horizontalPosition: 'center',
              panelClass: ['success-snackbar'],
            });
            this.closeModal();
          },
          (error) => console.error('Error adding body part:', error)
        );
      }
    } else if (this.currentView === 'categories') {
      if (this.newCategory.categoryId) {
        // Update category
        this.genericService
          .updateById('category', this.newCategory.categoryId, this.newCategory)
          .subscribe(
            () => {
              this.loadCategories();
              this.snackBar.open('Category updated successfully!', '', {
                duration: 2000,
                verticalPosition: 'top',
                horizontalPosition: 'center',
                panelClass: ['success-snackbar'],
              });
              this.closeModal();
            },
            (error) => console.error('Error updating category:', error)
          );
      } else {
        // Add category
        this.genericService.create('category', this.newCategory).subscribe(
          () => {
            this.loadCategories();
            this.snackBar.open('Category added successfully!', 'close', {
              duration: 2000,
              verticalPosition: 'top',
              horizontalPosition: 'center',
              panelClass: ['success-snackbar'],
            });
            this.closeModal();
          },
          (error) => console.error('Error adding category:', error)
        );
      }
    } else if (this.currentView === 'exercises') {
      if (this.newExercise.id) {
        // Update exercise
        this.genericService
          .updateById('exercise', this.newExercise.id, this.newExercise)
          .subscribe(
            () => {
              this.loadExercises();
              this.snackBar.open('Exercise updated successfully!', '', {
                duration: 2000,
                verticalPosition: 'top',
                horizontalPosition: 'center',
                panelClass: ['success-snackbar'],
              });
              this.closeModal();
            },
            (error) => console.error('Error updating exercise:', error)
          );
      } else {
        // Add exercise
        this.genericService.create('exercise', this.newExercise).subscribe(
          () => {
            this.loadExercises();
            this.snackBar.open('Exercise added successfully!', '', {
              duration: 2000,
              verticalPosition: 'top',
              horizontalPosition: 'center',
              panelClass: ['success-snackbar'],
            });
            this.closeModal();
          },
          (error) => console.error('Error adding exercise:', error)
        );
      }
    }
  }

  // Delete entry
  deleteBodyPart(id: number): void {
    this.genericService.deleteById('bodypart', id).subscribe(
      () => {
        this.loadBodyParts();
        this.snackBar.open('Body part deleted successfully!', '', {
          duration: 2000,
          verticalPosition: 'top',
          horizontalPosition: 'center',
          panelClass: ['success-snackbar'],
        });
      },
      (error) => console.error('Error deleting body part:', error)
    );
  }

  deleteCategory(id: number): void {
    this.genericService.deleteById('category', id).subscribe(
      () => {
        this.loadCategories();
        this.snackBar.open('Category deleted successfully!', '', {
          duration: 2000,
          verticalPosition: 'top',
          horizontalPosition: 'center',
          panelClass: ['success-snackbar'],
        });
      },
      (error) => console.error('Error deleting category:', error)
    );
  }

  deleteExercise(id: number): void {
    this.genericService.deleteById('exercise', id).subscribe(
      () => {
        this.loadExercises();
        this.snackBar.open('Exercise deleted successfully!', '', {
          duration: 2000,
          verticalPosition: 'top',
          horizontalPosition: 'center',
          panelClass: ['success-snackbar'],
        });
      },
      (error) => console.error('Error deleting exercise:', error)
    );
  }

  // Edit body part
  editBodyPart(bodyPart: any): void {
    this.newBodyPart = { ...bodyPart };
    this.openModal();
  }

  // Edit category
  editCategory(category: any): void {
    this.newCategory = { ...category };
    this.openModal();
  }

  // Edit exercise
  editExercise(exercise: any): void {
    this.newExercise = { ...exercise };
    this.imagePreview = exercise.thumbnail || null;
    this.openModal();
  }

  // Handle file input for exercise thumbnails
  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        this.imagePreview = base64String; // Preview the image
        this.newExercise.thumbnail = base64String; // Save the full base64 string
      };
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
      };
      reader.readAsDataURL(file); // Read the file as a data URL
    }
  }

  // Helper methods to get names by ID
  getBodyPartName(bodyPartId: number): string {
    const bodyPart = this.bodyParts.find((part) => part.id === bodyPartId);
    return bodyPart ? bodyPart.name : 'Unknown';
  }

  getCategoryName(categoryId: number): string {
    const category = this.categories.find((cat) => cat.id === categoryId);
    return category ? category.name : 'Unknown';
  }
}
