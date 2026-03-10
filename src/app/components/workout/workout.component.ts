import {
  Component,
  OnInit,
  HostListener,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { GenericService } from '../../service/generic.service';
import { Workout } from '../../models/workout';
import { Template } from '../../models/template';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LoadingComponent } from '../loading/loading.component';
import type { Set } from '../../models/set';
import { LoginResponse } from '../../models/loginresponse';
import { Router } from '@angular/router';
import { TemplateExercise } from '../../models/templateexercise';
import { CatalogExercise } from '../exercise-modal/exercise-modal.component';
import { ExerciseModalComponent } from '../exercise-modal/exercise-modal.component';
import Sortable from 'sortablejs';
import { NotificationService } from '../../service/notification.service';
import { forkJoin, catchError, throwError } from 'rxjs';

@Component({
  selector: 'app-workout',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LoadingComponent,
    ExerciseModalComponent,
  ],
  templateUrl: './workout.component.html',
  styleUrls: ['./workout.component.css'],
})
export class WorkoutComponent implements OnInit, AfterViewInit {
  user: LoginResponse | null = null;
  templates: Template[] = []; // List of templates (one per day)
  workoutsMap: { [templateId: number]: Workout[] } = {}; // Map template ID to its workouts
  menuOpenMap: { [key: number]: boolean } = {}; // Map workout ID to its menu open state
  isLoading: boolean = false;

  // Day templates
  weekDays: string[] = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  dayTemplateMap: { [day: string]: Template } = {};

  isWorkoutModalOpen = false;
  selectedTemplate: Template | null = null;
  selectedWorkout: Workout | null = null;
  setsMap: { [exerciseIndex: number]: Set[] } = {};
  exercises: CatalogExercise[] = [];

  menuPositions: { [key: number]: { top: number; left: number } } = {};

  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<any>();

  zoomedDay: string | null = null;

  templateExercises: {
    templateExercise: TemplateExercise;
    exercise: CatalogExercise;
  }[] = [];

  templateExercisesMap: { [templateId: number]: TemplateExercise[] } = {};
  isExerciseModalOpen = false;

  zoomedExercise: TemplateExercise | null = null;
  exerciseImages: {
    [exerciseId: number]: { thumbnail?: string; image?: string };
  } = {};

  @ViewChild(ExerciseModalComponent) exerciseModalComponent:
    | ExerciseModalComponent
    | undefined;

  sortableInstances: { [day: string]: Sortable } = {};

  // Add these properties to your component
  dayMenuOpen: { [day: string]: boolean } = {};
  dayNotes: { [day: string]: string } = {};
  editingNoteDay: string | null = null;
  editingNoteText: string = '';

  // Add these properties to the component class
  // Rest Day tracking
  restDays: { [day: string]: boolean } = {};
  
  // Workout session tracking
  activeWorkoutDay: string | null = null;
  workoutSessionMinimized: boolean = false;
  workoutStartTime: Date | null = null;
  workoutElapsedTime: number = 0;
  workoutTimerInterval: any = null;
  
  // Exercise completion tracking
  exerciseCompletionStatus: { [exerciseId: number]: boolean } = {};
  setCompletionStatus: { [key: string]: boolean } = {};
  
  // Rest timer
  restTimerActive: boolean = false;
  restTimeRemaining: number = 0;
  restTimerInterval: any = null;
  restTimerDuration: number = 0;
  
  // Workout completion modal
  showWorkoutCompletionModal: boolean = false;

  constructor(
    private genericService: GenericService<any>,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    const user = localStorage.getItem('loginResponse');
    if (user) {
      this.user = JSON.parse(user) as LoginResponse;
    }

    if (!this.user) {
      console.error('User is not logged in.');
      this.router.navigate(['/login']);
      return;
    }

    this.loadDayTemplates();
    this.loadExercises();

    // Load saved day notes
    const savedNotes = localStorage.getItem('dayNotes');
    if (savedNotes) {
      try {
        this.dayNotes = JSON.parse(savedNotes);
      } catch (e) {
        console.error('Error parsing saved day notes', e);
      }
    }

    // Load saved rest days
    const savedRestDays = localStorage.getItem('restDays');
    if (savedRestDays) {
      try {
        this.restDays = JSON.parse(savedRestDays);
      } catch (e) {
        console.error('Error parsing saved rest days', e);
      }
    }
    
    // Check if there was an active workout session
    this.restoreWorkoutSession();
  }
  loadExercises(): void {
    this.genericService.getAll('exercises', { range: '0-9999' }).subscribe({
      next: (data: CatalogExercise[]) => {
        this.exercises = data;
      },
      error: (err) => {
        console.error('Error fetching exercises:', err);
      },
    });
  }
  private loadDayTemplates(): void {
    if (!this.user) {
      console.error('User is not logged in.');
      return;
    }

    this.isLoading = true;

    this.genericService
      .getAll(`template?user_uid=eq.${this.user.userId}`)
      .subscribe({
        next: (templates: Template[]) => {
          const existingDays = new Set(templates.map((t) => t.name));
          const templatesToCreate = this.weekDays.filter(
            (day) => !existingDays.has(day)
          );

          if (templatesToCreate.length > 0) {
            this.createDayTemplates(templatesToCreate, templates);
          } else {
            this.setupTemplates(templates);
          }
        },
        error: (error) => {
          console.error('Error loading templates:', error);
          // Tables might not exist yet - show empty state instead of error
          this.isLoading = false;
          if (error.status === 404) {
            this.notificationService.warning('Database tables not set up yet. Please run the migration SQL in your Supabase Dashboard.');
          }
        },
      });
  }

  private createDayTemplates(
    daysToCreate: string[],
    existingTemplates: Template[]
  ): void {
    // Create all day templates that don't exist yet
    const promises: Promise<Template>[] = daysToCreate.map((day) => {
      return new Promise((resolve, reject) => {
        const newTemplate: Omit<Template, 'id'> = {
          name: day,
          description: `${day} workout plan`,
          workout_id: null,
          user_uid: this.user!.userId,
        };

        this.genericService.create('template', newTemplate).subscribe(
          (template: Template) => resolve(template),
          (error) => reject(error)
        );
      });
    });

    // Wait for all templates to be created
    Promise.all(promises)
      .then((newTemplates) => {
        const allTemplates = [...existingTemplates, ...newTemplates.filter(Boolean)];
        this.setupTemplates(allTemplates);
      })
      .catch((error) => {
        console.error('Error creating day templates:', error);
        // Still set up whatever templates already exist
        if (existingTemplates.length > 0) {
          this.setupTemplates(existingTemplates);
        } else {
          this.isLoading = false;
        }
      });
  }

  private setupTemplates(templates: Template[]): void {
    // Setup the templates sorted by day order
    this.templates = [];

    // Map each day to its template
    this.weekDays.forEach((day) => {
      const template = templates.find((t) => t.name === day);
      if (template) {
        this.templates.push(template);
        this.dayTemplateMap[day] = template;
        this.workoutsMap[template.id] = []; // Initialize workouts array
        this.loadWorkouts(template.id); // Load workouts for this day
        this.templateExercisesMap[template.id] = []; // Initialize exercises array
        this.loadTemplateExercises(template.id); // Load exercises for this template
      }
    });

    this.isLoading = false;
  }

  loadWorkouts(templateId: number): void {
    this.genericService
      .getAll(`workout?template_id=eq.${templateId}`)
      .subscribe(
        (workouts: Workout[]) => {
          this.workoutsMap[templateId] = workouts || [];
        },
        (error) => {
          console.error('Error loading workouts:', error);
          this.workoutsMap[templateId] = [];
        }
      );
  }

  loadTemplateExercises(templateId: number): void {
    this.genericService
      .getAll(`templateexercise?template_id=eq.${templateId}`)
      .subscribe(
        (exercises: TemplateExercise[]) => {
          // Sort exercises by order field if available
          this.templateExercisesMap[templateId] = exercises
            ? exercises.sort((a, b) => {
                // Handle undefined or null order values
                const orderA =
                  a.order !== undefined ? a.order : Number.MAX_SAFE_INTEGER;
                const orderB =
                  b.order !== undefined ? b.order : Number.MAX_SAFE_INTEGER;
                return orderA - orderB;
              })
            : [];

          // Rest of your existing code...
        },
        (error) => {
          console.error('Error loading template exercises:', error);
          this.templateExercisesMap[templateId] = [];
        }
      );
  }

  getWorkoutsForDay(day: string): Workout[] {
    const template = this.dayTemplateMap[day];
    return template ? this.workoutsMap[template.id] || [] : [];
  }

  getExercisesForDay(day: string): TemplateExercise[] {
    const template = this.dayTemplateMap[day];
    return template ? this.templateExercisesMap[template.id] || [] : [];
  }

  getDayTemplate(day: string): Template {
    return this.dayTemplateMap[day];
  }

  isToday(day: string): boolean {
    const today = new Date().getDay();
    // Convert from JS day (0=Sunday) to our format (0=Monday)
    const dayIndex = (today + 6) % 7;
    return this.weekDays[dayIndex] === day;
  }

  toggleWorkoutMenu(exerciseId: number, event: MouseEvent): void {
    event.stopPropagation();

    // Close all other menus first
    Object.keys(this.menuOpenMap).forEach((key) => {
      const id = parseInt(key);
      if (id !== exerciseId) {
        this.menuOpenMap[id] = false;

        // Remove menu-open class from all other workout cards
        const allCards = document.querySelectorAll('.workout-card');
        allCards.forEach((card) => {
          if (card.getAttribute('data-exercise-id') === String(id)) {
            card.classList.remove('menu-open');
          }
        });
      }
    });

    // Toggle the current menu
    this.menuOpenMap[exerciseId] = !this.menuOpenMap[exerciseId];

    // Find the workout card and add/remove menu-open class
    const workoutCard = event.target
      ? (event.target as HTMLElement).closest('.workout-card')
      : null;

    if (workoutCard) {
      if (this.menuOpenMap[exerciseId]) {
        workoutCard.classList.add('menu-open');
      } else {
        workoutCard.classList.remove('menu-open');
      }
    }
  }

  addExerciseToTemplate(template: Template, day?: string): void {
    if (!template && day) {
      // Template not loaded yet — create it on the fly
      this.createTemplateForDay(day).then((newTemplate) => {
        if (newTemplate) {
          this.openExerciseModalForTemplate(newTemplate);
        } else {
          this.notificationService.error('Failed to create template. Please reload the page.');
        }
      });
      return;
    }
    if (!template) {
      this.notificationService.error('Template not available. Please reload the page.');
      return;
    }
    this.openExerciseModalForTemplate(template);
  }

  private openExerciseModalForTemplate(template: Template): void {
    const currentExerciseCount =
      this.templateExercisesMap[template.id]?.length || 0;

    if (currentExerciseCount >= 10) {
      this.notificationService.warning(
        'You can only add up to 10 exercises per template.'
      );
      return;
    }

    this.selectedTemplate = template;
    this.templateExercises = [];
    this.isExerciseModalOpen = true;
  }

  private createTemplateForDay(day: string): Promise<Template | null> {
    if (!this.user) return Promise.resolve(null);

    // First try to find an existing template for this day
    return new Promise((resolve) => {
      this.genericService
        .getAll(`template?user_uid=eq.${this.user!.userId}&name=eq.${day}`)
        .subscribe({
          next: (existing: any[]) => {
            if (existing && existing.length > 0) {
              const template = existing[0] as Template;
              this.dayTemplateMap[day] = template;
              if (!this.templates.find((t) => t.id === template.id)) {
                this.templates.push(template);
              }
              this.templateExercisesMap[template.id] = this.templateExercisesMap[template.id] || [];
              this.workoutsMap[template.id] = this.workoutsMap[template.id] || [];
              this.loadTemplateExercises(template.id);
              resolve(template);
            } else {
              // Create new template
              const newTemplate: any = {
                name: day,
                description: `${day} workout plan`,
                workout_id: null,
                user_uid: this.user!.userId,
              };
              this.genericService.create('template', newTemplate).subscribe({
                next: (template: any) => {
                  this.dayTemplateMap[day] = template;
                  this.templates.push(template);
                  this.templateExercisesMap[template.id] = [];
                  this.workoutsMap[template.id] = [];
                  resolve(template);
                },
                error: (err) => {
                  console.error('Error creating template for', day, err);
                  resolve(null);
                },
              });
            }
          },
          error: (err) => {
            console.error('Error looking up template for', day, err);
            resolve(null);
          },
        });
    });
  }

  closeExerciseModal(): void {
    this.isExerciseModalOpen = false;
    this.selectedTemplate = null;
  }

  saveTemplateExercises(templateExercises: TemplateExercise[]): void {
    if (!this.selectedTemplate) {
      console.error('No template selected.');
      return;
    }
  
    const templateId = this.selectedTemplate.id;
  
    // Check current exercise count + new exercises against the limit
    const currentCount = this.templateExercisesMap[templateId]?.length || 0;
    const newExercisesCount = templateExercises.filter(
      (ex) => !ex.id || ex.id === 0
    ).length;
  
    if (currentCount + newExercisesCount > 10) {
      this.notificationService.warning(
        `You can only have 10 exercises per template. (${currentCount} existing + ${newExercisesCount} new)`
      );
      return;
    }
  
    // Check if any exercise is being edited (has an ID > 0)
    const existingExercises = templateExercises.filter((ex) => ex.id > 0);
    const newExercises = templateExercises.filter((ex) => !ex.id || ex.id === 0);
  
    // Show loading indicator
    this.isLoading = true;
  
    // Handle updates for existing exercises and creation for new ones
    const updatePromises = existingExercises.map(
      (exercise) =>
        new Promise<TemplateExercise>((resolve, reject) => {
          this.genericService
            .updateById('templateexercise', exercise.id, {
              template_id: exercise.template_id,
              exercise_id: exercise.exercise_id,
              sets: exercise.sets,
            })
            .subscribe({
              next: (updatedExercise: TemplateExercise) => resolve(updatedExercise),
              error: (error) => reject(error)
            });
        })
    );
  
    // Handle creation for new exercises
    const createPromises = newExercises.map(
      (exercise, index) =>
        new Promise<TemplateExercise>((resolve, reject) => {
          // Get the next order value
          const currentExercises = this.templateExercisesMap[templateId] || [];
          const maxOrder =
            currentExercises.length > 0
              ? Math.max(
                  ...currentExercises.map((e) =>
                    e.order !== undefined ? e.order : 0
                  )
                )
              : -1;
  
          this.genericService
            .create('templateexercise', {
              template_id: templateId,
              exercise_id: exercise.exercise_id,
              sets: exercise.sets,
              order: maxOrder + index + 1,
            })
            .subscribe({
              next: (createdExercise: TemplateExercise) => resolve(createdExercise),
              error: (error) => reject(error)
            });
        })
    );
  
    // Wait for all operations to complete
    Promise.all([...updatePromises, ...createPromises])
      .then((exercises) => {
        this.notificationService.success(
          `Successfully ${newExercises.length > 0 ? 'added' : 'updated'} exercises to template`
        );
        
        this.isExerciseModalOpen = false;
        this.selectedTemplate = null;
        
        // Refresh template exercises from the server instead of reloading
        this.loadTemplateExercises(templateId);
      })
      .catch((error) => {
        console.error('Error saving template exercises:', error);
        this.notificationService.error('Failed to save exercises to template. Please try again.');
      })
      .finally(() => {
        // Hide loading indicator
        this.isLoading = false;
      });
  }

  deleteConfirmId: number | null = null;

  deleteTemplateExercise(templateId: number, exerciseId: number): void {
    if (this.deleteConfirmId !== exerciseId) {
      this.deleteConfirmId = exerciseId;
      return;
    }
    
    this.deleteConfirmId = null;
    this.genericService.deleteById('templateexercise', exerciseId).subscribe({
      next: () => {
        this.templateExercisesMap[templateId] = this.templateExercisesMap[
          templateId
        ].filter((e) => e.id !== exerciseId);
        this.menuOpenMap[exerciseId] = false;
        this.notificationService.success('Exercise removed');
      },
      error: (error) => {
        console.error('Error deleting template exercise:', error);
        this.notificationService.error('Failed to remove exercise');
      },
    });
  }

  openDayZoom(day: string): void {
    this.zoomedDay = day;
    document.body.style.overflow = 'hidden';

    // Initialize drag-and-drop for zoomed day after a brief delay for DOM to update
    setTimeout(() => {
      this.initDragAndDropForZoomedDay();
    }, 300);
  }

  closeDayZoom(): void {
    this.zoomedDay = null;
    // Re-enable body scrolling
    document.body.style.overflow = 'auto';
  }

  openExerciseDetail(exercise: TemplateExercise): void {
    this.zoomedExercise = exercise;
    // Prevent body scrolling when zoom is open
    document.body.style.overflow = 'hidden';
  }

  closeExerciseDetail(): void {
    this.zoomedExercise = null;
    // Re-enable body scrolling
    document.body.style.overflow = 'auto';
  }

  getExerciseThumbnail(exerciseId: number): string {
    const exercise = this.exercises.find((e) => e.id === exerciseId);
    return exercise?.gif_url || './assets/dumbbell.png';
  }

  getExerciseFullImage(exerciseId: number): string {
    const exercise = this.exercises.find((e) => e.id === exerciseId);
    return exercise?.gif_url || './assets/dumbbell.png';
  }

  getSetsPreview(exercise: TemplateExercise): string {
    if (!exercise.sets || exercise.sets.length === 0) return '';

    const firstSet = exercise.sets[0];
    return `${firstSet.reps} × ${firstSet.weight} ${firstSet.weightUnit}`;
  }

  @HostListener('document:click', ['$event'])
  closeAllMenus(event: MouseEvent): void {
    // Only close menus if the click wasn't on a menu toggle button
    const target = event.target as HTMLElement;
    if (
      !target.closest('.menu-toggle') &&
      !target.closest('.day-menu-toggle')
    ) {
      // Close workout menus
      Object.keys(this.menuOpenMap).forEach((key) => {
        this.menuOpenMap[parseInt(key)] = false;
      });

      // Close day menus
      Object.keys(this.dayMenuOpen).forEach((day) => {
        this.dayMenuOpen[day] = false;
      });
    }
  }

  // Add this helper method to your component class
  getExerciseName(id: number): string {
    const exercise = this.exercises.find((p) => p.id === id);
    return exercise ? exercise.name : 'Unknown';
  }
  getExerciseInstructions(id: number): string {
    const exercise = this.exercises.find((p) => p.id === id);
    return exercise?.description || '';
  }

  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = './assets/dumbbell.png'; // Fallback to default image
  }

  formatInstructions(instructions: string): { text: string; isTip: boolean }[] {
    if (!instructions) return [];

    // Split by periods, but keep the period in each sentence
    const sentences = instructions.match(/[^.!?]+[.!?]+/g) || [];

    return sentences.map((sentence) => {
      const trimmedSentence = sentence.trim();
      const isTip = trimmedSentence.includes('Tip:');

      // If it's a tip, clean up the text (remove "Tip:" prefix)
      const text = isTip
        ? trimmedSentence.replace('Tip:', '').trim()
        : trimmedSentence;

      return { text, isTip };
    });
  }

  editTemplateExercise(exercise: TemplateExercise): void {
    this.selectedTemplate = this.findTemplateByExerciseId(exercise.template_id);

    const exerciseDetails = this.exercises.find(
      (e) => e.id === exercise.exercise_id
    );
    if (!exerciseDetails) {
      console.error('Exercise details not found');
      return;
    }

    this.templateExercises = [
      {
        templateExercise: exercise,
        exercise: exerciseDetails,
      },
    ];

    // Pre-populate the sets
    const setsMap: { [exerciseIndex: number]: Set[] } = {};
    if (exercise.sets && exercise.sets.length > 0) {
      setsMap[0] = exercise.sets;
    } else {
      setsMap[0] = [
        {
          reps: 10,
          weight: 20,
          weightUnit: 'kg',
        },
      ];
    }

    // Open the exercise modal for editing
    this.isExerciseModalOpen = true;

    // Pass the sets to the exercise modal
    // You'll need to add this to your exercise-modal component
    setTimeout(() => {
      if (this.exerciseModalComponent) {
        this.exerciseModalComponent.setsMap = setsMap;
        this.exerciseModalComponent.isEditing = true;
      }
    });
  }

  private findTemplateByExerciseId(templateId: number): Template | null {
    return this.templates.find((t) => t.id === templateId) || null;
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initDragAndDrop();
      this.setupHoverScroll(); // Add this line
    }, 1000);
  }

  // Initialize drag-and-drop functionality for all day cards
  private initDragAndDrop(): void {
    this.weekDays.forEach((day) => {
      const exerciseList = document.querySelector(
        `#day-${day} .workout-list`
      ) as HTMLElement;
      if (!exerciseList) return;

      // Create a drop line element
      let dropLine = document.createElement('div');
      dropLine.className = 'drop-line';
      dropLine.style.display = 'none';
      exerciseList.appendChild(dropLine);

      this.sortableInstances[day] = Sortable.create(exerciseList, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        forceFallback: true, // Better mobile support
        onStart: (evt) => {
          document.body.classList.add('dragging');
        },
        onMove: (evt, originalEvt) => {
          const containerRect = evt.to.getBoundingClientRect();
          const mouseY =
            (originalEvt as MouseEvent).clientY - containerRect.top;

          // Find the closest position to insert
          const items = Array.from(
            evt.to.querySelectorAll('.workout-card:not(.sortable-ghost)')
          );

          // First element or empty list
          if (
            items.length === 0 ||
            mouseY < (items[0] as HTMLElement).offsetTop
          ) {
            dropLine.style.top = '0px';
            dropLine.style.display = 'block';
            return true;
          }

          // Between elements or at the end
          for (let i = 0; i < items.length; i++) {
            const currentItem = items[i] as HTMLElement;
            const currentMiddle =
              currentItem.offsetTop + currentItem.offsetHeight / 2;

            if (mouseY < currentMiddle && i === 0) {
              // Before first item
              dropLine.style.top = `${currentItem.offsetTop - 2}px`;
              dropLine.style.display = 'block';
              return true;
            } else if (mouseY < currentMiddle) {
              // Between items
              dropLine.style.top = `${currentItem.offsetTop - 2}px`;
              dropLine.style.display = 'block';
              return true;
            } else if (i === items.length - 1) {
              // After last item
              dropLine.style.top = `${
                currentItem.offsetTop + currentItem.offsetHeight + 2
              }px`;
              dropLine.style.display = 'block';
              return true;
            }
          }

          return true;
        },
        onEnd: (evt) => {
          document.body.classList.remove('dragging');
          dropLine.style.display = 'none';

          if (evt.oldIndex !== evt.newIndex) {
            this.handleExerciseReorder(day, evt.oldIndex!, evt.newIndex!);
          }
        },
      });
    });
  }

  // Initialize drag-and-drop for zoomed day
  private initDragAndDropForZoomedDay(): void {
    if (!this.zoomedDay) return;

    const zoomedExerciseList = document.querySelector(
      '.overlay-body .workout-list'
    ) as HTMLElement;
    if (!zoomedExerciseList) return;

    // Create a drop line element
    const dropLine = document.createElement('div');
    dropLine.className = 'sortable-drop-line';
    dropLine.style.display = 'none';
    zoomedExerciseList.appendChild(dropLine);

    this.sortableInstances['zoomed'] = new Sortable(zoomedExerciseList, {
      animation: 150,
      handle: '.drag-handle',
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      onStart: (evt) => {
        document.body.classList.add('dragging');
      },
      onChange: (evt) => {
        // Update the drop line position
        const container = evt.to;
        const items = Array.from(
          container.querySelectorAll('.workout-card:not(.sortable-ghost)')
        );
        const dropIndex = evt.newIndex || 0;

        if (dropIndex >= items.length) {
          // Dropping at the end
          const lastItem = items[items.length - 1];
          if (lastItem) {
            const rect = lastItem.getBoundingClientRect();
            dropLine.style.top = `${
              rect.bottom - container.getBoundingClientRect().top
            }px`;
            dropLine.style.display = 'block';
          } else {
            dropLine.style.display = 'none';
          }
        } else {
          // Dropping between items
          const targetItem = items[dropIndex];
          const rect = targetItem.getBoundingClientRect();
          dropLine.style.top = `${
            rect.top - container.getBoundingClientRect().top - 1
          }px`;
          dropLine.style.display = 'block';
        }
      },
      onEnd: (evt) => {
        // Hide the drop line
        const container = evt.to;
        const dropLine = container.querySelector('.sortable-drop-line');
        if (dropLine) (dropLine as HTMLElement).style.display = 'none';

        // Remove dragging class
        document.body.classList.remove('dragging');

        this.handleExerciseReorder(
          this.zoomedDay!,
          evt.oldIndex!,
          evt.newIndex!
        );
      },
    });
  }

  // Handle the reordering of exercises
  private handleExerciseReorder(
    day: string,
    oldIndex: number,
    newIndex: number
  ): void {
    if (oldIndex === newIndex) return;

    const template = this.dayTemplateMap[day];
    if (!template) return;

    const exercises = [...this.templateExercisesMap[template.id]];
    const draggedExercise = exercises[oldIndex];

    // Remove from old position and add at new position
    exercises.splice(oldIndex, 1);
    exercises.splice(newIndex, 0, draggedExercise);

    // Update the order in the database (we'll add an "order" field to the model)
    // First, update local state
    this.templateExercisesMap[template.id] = exercises;

    // Then, send updates to the backend to save the new order
    this.updateExercisesOrder(template.id, exercises);
  }

  // Update the order of exercises in the backend
  private updateExercisesOrder(
    templateId: number,
    exercises: TemplateExercise[]
  ): void {
    const updateObservables = exercises.map((exercise, index) => {
      // Create a minimal update payload with just the fields we want to update
      const updatePayload = {
        order: index, // Just update the order field
      };
      return this.genericService
        .updateById('templateexercise', exercise.id, updatePayload)
        .pipe(
          catchError((err) => {
            console.error(`Error updating exercise ${exercise.id}:`, err);
            return throwError(
              () =>
                new Error(
                  `Failed to update exercise ${exercise.id}: ${err.message}`
                )
            );
          })
        );
    });

    // This part was missing - actually execute the observables
    if (updateObservables.length === 0) {
      console.log('No exercises to update order');
      return;
    }

    forkJoin(updateObservables)
      .pipe(
        catchError((err) => {
          console.error('Error saving exercise order:', err);
          this.notificationService.error('Failed to save exercise order');
          return throwError(() => err);
        })
      )
      .subscribe({
        error: (error) => {
          console.error('Failed to update exercise order:', error);
          this.notificationService.error('Failed to save exercise order');
        },
      });
  }

  // Toggle day menu dropdown
  toggleDayMenu(day: string, event: MouseEvent): void {
    event.stopPropagation();

    // Close all other menus first
    Object.keys(this.dayMenuOpen).forEach((d) => {
      if (d !== day) this.dayMenuOpen[d] = false;
    });

    // Toggle this day's menu
    this.dayMenuOpen[day] = !this.dayMenuOpen[day];
  }

  // Edit day note
  editDayNote(day: string): void {
    this.editingNoteDay = day;
    this.editingNoteText = this.dayNotes[day] || '';
    this.dayMenuOpen[day] = false;
  }

  saveDayNote(): void {
    if (!this.editingNoteDay) return;
    
    const text = this.editingNoteText.trim();
    if (text === '') {
      delete this.dayNotes[this.editingNoteDay];
    } else {
      this.dayNotes[this.editingNoteDay] = text;
    }
    
    localStorage.setItem('dayNotes', JSON.stringify(this.dayNotes));
    this.editingNoteDay = null;
    this.editingNoteText = '';
  }

  cancelDayNote(): void {
    this.editingNoteDay = null;
    this.editingNoteText = '';
  }

  private setupHoverScroll(): void {
    const weekCalendar = document.querySelector('.week-calendar') as HTMLElement;
    const leftIndicator = document.getElementById('scroll-left');
    const rightIndicator = document.getElementById('scroll-right');
    
    if (!weekCalendar || !leftIndicator || !rightIndicator) return;
    
    // Remove all hover-related event listeners
    
    // Only add click event for scrolling
    leftIndicator.addEventListener('click', () => {
      // Calculate visible width
      const cardWidth = 350; // Average card width
      const scrollAmount = cardWidth;
      
      // Animate the scroll smoothly
      weekCalendar.scrollBy({
        left: -scrollAmount,
        behavior: 'smooth'
      });
    });
    
    rightIndicator.addEventListener('click', () => {
      // Calculate visible width
      const cardWidth = 350; // Average card width
      const scrollAmount = cardWidth;
      
      // Animate the scroll smoothly
      weekCalendar.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
    });
  }

  // Rest day methods
  isRestDay(day: string): boolean {
    return !!this.restDays[day];
  }
  
  toggleRestDay(day: string): void {
    if (this.isRestDay(day)) {
      delete this.restDays[day];
    } else {
      this.restDays[day] = true;
    }
    
    // Save to localStorage
    localStorage.setItem('restDays', JSON.stringify(this.restDays));
  }
  
  // Workout session methods
  startWorkout(day: string): void {
    // Don't allow starting a new workout if one is already in progress
    if (this.activeWorkoutDay) {
      this.notificationService.warning('You already have an active workout session.');
      return;
    }
    
    this.activeWorkoutDay = day;
    this.workoutStartTime = new Date();
    this.workoutElapsedTime = 0;
    this.workoutSessionMinimized = false;
    
    // Reset completion status
    this.exerciseCompletionStatus = {};
    this.setCompletionStatus = {};
    
    // Start the workout timer
    this.startWorkoutTimer();
    
    // Prevent body scrolling
    document.body.style.overflow = 'hidden';
    
    // Save current workout state
    this.saveWorkoutSession();
  }
  
  startWorkoutTimer(): void {
    if (this.workoutTimerInterval) {
      clearInterval(this.workoutTimerInterval);
    }
    
    this.workoutTimerInterval = setInterval(() => {
      if (!this.workoutStartTime) return;
      
      const now = new Date();
      this.workoutElapsedTime = now.getTime() - this.workoutStartTime.getTime();
      this.saveWorkoutSession();
    }, 1000);
  }
  
  formatWorkoutTime(ms: number): string {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    
    const formattedHours = hours > 0 ? `${hours}:` : '';
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = seconds.toString().padStart(2, '0');
    
    return `${formattedHours}${formattedMinutes}:${formattedSeconds}`;
  }
  
  minimizeWorkoutSession(): void {
    this.workoutSessionMinimized = true;
    // Allow body scrolling when minimized
    document.body.style.overflow = 'auto';
    this.saveWorkoutSession();
    
    // Force Angular change detection by using setTimeout
    setTimeout(() => {
      console.log('Workout minimized, state:', this.workoutSessionMinimized);
    }, 0);
  }
  
  maximizeWorkoutSession(): void {
    this.workoutSessionMinimized = false;
    // Prevent body scrolling when maximized
    document.body.style.overflow = 'hidden';
    this.saveWorkoutSession();
    
    // Force Angular change detection by using setTimeout
    setTimeout(() => {
      console.log('Workout maximized, state:', this.workoutSessionMinimized);
    }, 0);
  }
  
  confirmFinishWorkout(): void {
    this.showWorkoutCompletionModal = true;
  }
  
  finishWorkout(): void {
    // Stop the workout timer
    if (this.workoutTimerInterval) {
      clearInterval(this.workoutTimerInterval);
      this.workoutTimerInterval = null;
    }
    
    // Save the workout history
    if (this.activeWorkoutDay && this.user) {
      const completedExercises = this.getCompletedExercisesCount();
      const totalExercises = this.getTotalExercisesCount();
      
      // Get the final workout duration to save
      const finalWorkoutDuration = this.workoutElapsedTime;
      
      const workoutHistory = {
        user_uid: this.user.userId,
        day: this.activeWorkoutDay,
        date: new Date().toISOString(),
        duration: finalWorkoutDuration,
        exercises_completed: completedExercises,
        total_exercises: totalExercises
      };
      
      this.genericService.create('workout_history', workoutHistory).subscribe(
        (response) => {
          console.log('Workout history saved successfully:', response);
          this.notificationService.success('Workout completed and saved to history!');
        },
        (error) => {
          console.error('Error saving workout history:', error);
          console.error('Request payload:', workoutHistory);
          this.notificationService.error('Failed to save workout history');
        }
      );
    }
    
    // Reset workout state - do this AFTER saving the history
    const dayCompleted = this.activeWorkoutDay; // Store the day before resetting
    this.activeWorkoutDay = null;
    this.workoutSessionMinimized = false;
    this.workoutStartTime = null;
    
    // Important: Reset this AFTER saving workout history
    this.workoutElapsedTime = 0; 
    this.showWorkoutCompletionModal = false;
    
    // Re-enable body scrolling
    document.body.style.overflow = 'auto';
    
    // Clear saved workout session
    localStorage.removeItem('activeWorkoutSession');
    
    console.log(`Workout for ${dayCompleted} finished and timer stopped`);
  }
  
  // Exercise & set completion methods
  toggleExerciseCompletion(exerciseId: number): void {
    this.exerciseCompletionStatus[exerciseId] = !this.exerciseCompletionStatus[exerciseId];
    
    // If marking as complete, also mark all sets as complete
    const exercise = this.getExerciseById(exerciseId);
    if (exercise && this.exerciseCompletionStatus[exerciseId]) {
      exercise.sets?.forEach((_, index) => {
        this.setCompletionStatus[`${exerciseId}-${index}`] = true;
      });
    }
    
    this.saveWorkoutSession();
  }
  
  toggleSetCompletion(exerciseId: number, setIndex: number): void {
    const key = `${exerciseId}-${setIndex}`;
    this.setCompletionStatus[key] = !this.setCompletionStatus[key];
    
    // Check if all sets are completed, if so, mark exercise as completed
    const exercise = this.getExerciseById(exerciseId);
    if (exercise && exercise.sets) {
      const allSetsCompleted = exercise.sets.every((_, i) => 
        this.setCompletionStatus[`${exerciseId}-${i}`]);
      
      if (allSetsCompleted) {
        this.exerciseCompletionStatus[exerciseId] = true;
      } else {
        this.exerciseCompletionStatus[exerciseId] = false;
      }
    }
    
    this.saveWorkoutSession();
  }
  
  getExerciseById(exerciseId: number): TemplateExercise | null {
    if (!this.activeWorkoutDay) return null;
    
    const exercises = this.getExercisesForDay(this.activeWorkoutDay);
    return exercises.find(ex => ex.id === exerciseId) || null;
  }
  
  getCompletedExercisesCount(): number {
    if (!this.activeWorkoutDay) return 0;
    
    const exercises = this.getExercisesForDay(this.activeWorkoutDay);
    return exercises.filter(ex => this.exerciseCompletionStatus[ex.id]).length;
  }
  
  getTotalExercisesCount(): number {
    if (!this.activeWorkoutDay) return 0;
    return this.getExercisesForDay(this.activeWorkoutDay).length;
  }
  
  // Rest timer methods
  startRestTimer(seconds: number): void {
    if (this.restTimerActive) {
      this.cancelRestTimer();
    }
    
    this.restTimerActive = true;
    this.restTimerDuration = seconds;
    this.restTimeRemaining = seconds;
    
    // Play a sound to indicate rest timer started
    const audio = new Audio('assets/timer-start.mp3');
    audio.play().catch(err => console.log('Audio play failed:', err));
    
    this.restTimerInterval = setInterval(() => {
      this.restTimeRemaining--;
      
      if (this.restTimeRemaining <= 0) {
        this.finishRestTimer();
      }
    }, 1000);
  }
  
  cancelRestTimer(): void {
    if (this.restTimerInterval) {
      clearInterval(this.restTimerInterval);
      this.restTimerInterval = null;
    }
    
    this.restTimerActive = false;
  }
  
  finishRestTimer(): void {
    this.cancelRestTimer();
    
    // Play a sound to indicate rest timer finished
    const audio = new Audio('assets/timer-end.mp3');
    audio.play().catch(err => console.log('Audio play failed:', err));
    
    // Show notification
    this.notificationService.info('Rest period completed!');
  }
  
  getRestTimerProgress(): number {
    if (!this.restTimerActive || this.restTimerDuration === 0) return 0;
    
    const progress = (this.restTimeRemaining / this.restTimerDuration) * 283;
    return 283 - progress; // SVG circle animation works in reverse
  }
  
  formatRestTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  showCustomTimerInput: boolean = false;
  customTimerValue: string = '';

  promptCustomRestTimer(): void {
    this.showCustomTimerInput = !this.showCustomTimerInput;
    this.customTimerValue = '';
  }

  submitCustomTimer(): void {
    const secondsNum = parseInt(this.customTimerValue, 10);
    if (isNaN(secondsNum) || secondsNum <= 0) {
      this.notificationService.warning('Please enter a valid positive number.');
      return;
    }
    this.showCustomTimerInput = false;
    this.customTimerValue = '';
    this.startRestTimer(secondsNum);
  }
  
  // Session persistence methods
  saveWorkoutSession(): void {
    if (!this.activeWorkoutDay) return;
    
    const session = {
      day: this.activeWorkoutDay,
      startTime: this.workoutStartTime?.getTime(),
      elapsedTime: this.workoutElapsedTime,
      minimized: this.workoutSessionMinimized,
      exerciseStatus: this.exerciseCompletionStatus,
      setStatus: this.setCompletionStatus
    };
    
    localStorage.setItem('activeWorkoutSession', JSON.stringify(session));
  }
  
  restoreWorkoutSession(): void {
    const savedSession = localStorage.getItem('activeWorkoutSession');
    if (!savedSession) return;
    
    try {
      const session = JSON.parse(savedSession);
      
      this.activeWorkoutDay = session.day;
      this.workoutSessionMinimized = session.minimized;
      this.exerciseCompletionStatus = session.exerciseStatus || {};
      this.setCompletionStatus = session.setStatus || {};
      
      if (session.startTime) {
        this.workoutStartTime = new Date(session.startTime);
        this.workoutElapsedTime = session.elapsedTime || 0;
        this.startWorkoutTimer();
      }
      
      // Set body scroll state based on minimized status
      document.body.style.overflow = this.workoutSessionMinimized ? 'auto' : 'hidden';
      
      // Add or remove class based on minimized state
      if (this.workoutSessionMinimized) {
        document.body.classList.add('workout-session-minimized');
      } else {
        document.body.classList.remove('workout-session-minimized');
      }
      
    } catch (e) {
      console.error('Error restoring workout session', e);
      localStorage.removeItem('activeWorkoutSession');
    }
  }
  
  // Clean up timers when component is destroyed
  ngOnDestroy(): void {
    // Make sure to clear any ongoing timers
    if (this.workoutTimerInterval) {
      clearInterval(this.workoutTimerInterval);
      this.workoutTimerInterval = null;
    }
    if (this.restTimerInterval) {
      clearInterval(this.restTimerInterval);
      this.restTimerInterval = null;
    }
    
    // Save any active session data before destroying
    this.saveWorkoutSession();
  }
}
