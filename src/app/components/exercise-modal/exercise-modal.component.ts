import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { GenericService } from '../../service/generic.service';
import { Template } from '../../models/template';
import type { Set } from '../../models/set';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { TemplateExercise } from '../../models/templateexercise';

/** Matches the Supabase `exercises` table */
export interface CatalogExercise {
  id: number;
  name: string;
  gif_url: string;
  exercise_type: string;
  body_part: string[];
  equipment: string[];
  description?: string;
  steps?: string;
  tip?: string;
}

@Component({
  selector: 'app-exercise-modal',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './exercise-modal.component.html',
  styleUrls: ['./exercise-modal.component.css'],
  animations: [
    trigger('fadeAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms', style({ opacity: 1 })),
      ]),
      transition(':leave', [animate('300ms', style({ opacity: 0 }))]),
    ]),
    trigger('slideAnimation', [
      transition(':enter', [
        style({ transform: 'translateY(20px)', opacity: 0 }),
        animate('300ms', style({ transform: 'translateY(0)', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('300ms', style({ transform: 'translateY(20px)', opacity: 0 })),
      ]),
    ]),
    trigger('fadeInAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms 150ms', style({ opacity: 1 })),
      ]),
    ]),
  ],
})
export class ExerciseModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<TemplateExercise[]>();
  @Input() selectedTemplate: Template | null = null;
  @Input() templateExercises: {
    templateExercise: TemplateExercise;
    exercise: CatalogExercise;
  }[] = [];

  exercises: CatalogExercise[] = [];
  selectedExercises: CatalogExercise[] = [];
  isExerciseModalOpen = false;
  isLoading = false;
  exercisesLoaded = false;

  searchTerm = '';
  setsMap: { [exerciseIndex: number]: Set[] } = {};

  isEditing = false;

  /** Filter state */
  filterBodyPart = '';
  filterEquipment = '';
  bodyPartOptions: string[] = [];
  equipmentOptions: string[] = [];

  constructor(private genericService: GenericService<any>) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true && !this.exercisesLoaded) {
      this.loadExercises();
    }
  }

  get filteredExercises(): CatalogExercise[] {
    let result = this.exercises;
    const term = this.searchTerm.toLowerCase().trim();

    if (term) {
      result = result.filter(
        (ex) =>
          ex.name?.toLowerCase().includes(term) ||
          ex.exercise_type?.toLowerCase().includes(term)
      );
    }

    if (this.filterBodyPart) {
      result = result.filter((ex) => ex.body_part?.includes(this.filterBodyPart));
    }

    if (this.filterEquipment) {
      result = result.filter((ex) => ex.equipment?.includes(this.filterEquipment));
    }

    return result;
  }

  loadExercises(): void {
    this.isLoading = true;
    this.genericService.getAll('exercises', { range: '0-9999' }).subscribe({
      next: (data: CatalogExercise[]) => {
        this.exercises = data;
        this.exercisesLoaded = true;
        this.buildFilterOptions();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching exercises:', err);
        this.isLoading = false;
      },
    });
  }

  buildFilterOptions(): void {
    const parts = new Set<string>();
    const equip = new Set<string>();
    for (const ex of this.exercises) {
      if (ex.body_part) ex.body_part.forEach((b) => parts.add(b));
      if (ex.equipment) ex.equipment.forEach((e) => equip.add(e));
    }
    this.bodyPartOptions = [...parts].sort();
    this.equipmentOptions = [...equip].sort();
  }

  openExerciseModal(): void {
    this.isExerciseModalOpen = true;
  }

  closeExerciseModal(): void {
    this.isExerciseModalOpen = false;
  }

  toggleExerciseSelection(exercise: CatalogExercise): void {
    const index = this.selectedExercises.findIndex((e) => e.id === exercise.id);
    if (index !== -1) {
      this.selectedExercises.splice(index, 1);
    } else {
      if (this.selectedExercises.length < 10) {
        this.selectedExercises.push(exercise);
      } else {
        alert('A template cannot have more than 10 exercises.');
      }
    }
  }

  isSelected(exercise: CatalogExercise): boolean {
    return this.selectedExercises.some((e) => e.id === exercise.id);
  }

  confirmExerciseSelection(): void {
    this.templateExercises = this.selectedExercises.map((exercise) => ({
      templateExercise: {
        id: 0,
        template_id: this.selectedTemplate?.id || 0,
        exercise_id: exercise.id,
      },
      exercise,
    }));

    this.templateExercises.forEach((_, index) => {
      if (!this.setsMap[index]) {
        this.setsMap[index] = [{ reps: 10, weight: 20, weightUnit: 'kg' }];
      }
    });

    this.closeExerciseModal();
  }

  removeSet(exerciseIndex: number, setIndex: number): void {
    if (this.setsMap[exerciseIndex]) {
      this.setsMap[exerciseIndex].splice(setIndex, 1);
    }
  }

  addSet(exerciseIndex: number): void {
    if (!this.setsMap[exerciseIndex]) {
      this.setsMap[exerciseIndex] = [];
    }
    this.setsMap[exerciseIndex].push({ reps: 10, weight: 20, weightUnit: 'kg' });
  }

  toggleWeightUnit(set: Set): void {
    set.weightUnit = set.weightUnit === 'kg' ? 'lbs' : 'kg';
  }

  handleImageError(event: Event): void {
    (event.target as HTMLImageElement).src = './assets/dumbbell.png';
  }

  saveExercises(): void {
    if (!this.selectedTemplate) {
      alert('No template selected.');
      return;
    }

    if (this.templateExercises.length === 0) {
      alert('Please add at least one exercise to the template.');
      return;
    }

    this.isLoading = true;

    const templateExercisesData: TemplateExercise[] =
      this.templateExercises.map((item, index) => ({
        id: item.templateExercise.id,
        template_id: this.selectedTemplate?.id || 0,
        exercise_id: item.exercise.id,
        sets: this.setsMap[index] || [],
      }));

    if (this.isEditing && templateExercisesData[0].id > 0) {
      this.genericService
        .updateById('templateexercise', templateExercisesData[0].id, templateExercisesData[0])
        .subscribe({
          next: () => {
            this.isLoading = false;
            this.save.emit(templateExercisesData);
            this.close.emit();
            this.isEditing = false;
          },
          error: (err) => {
            console.error('Error updating template exercise:', err);
            this.isLoading = false;
            alert('Failed to update exercise. Please try again.');
          },
        });
    } else {
      this.isLoading = false;
      this.save.emit(templateExercisesData);
      this.close.emit();
    }
  }
}
