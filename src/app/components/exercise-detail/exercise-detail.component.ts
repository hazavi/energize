import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GenericService } from '../../service/generic.service';

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
  selector: 'app-exercise-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './exercise-detail.component.html',
  styleUrls: ['./exercise-detail.component.css'],
})
export class ExerciseDetailComponent implements OnInit {
  exercise: CatalogExercise | null = null;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private genericService: GenericService<CatalogExercise>
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.router.navigate(['/exercises']);
      return;
    }
    this.genericService.getById('exercises', id).subscribe({
      next: (data) => {
        this.exercise = data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.router.navigate(['/exercises']);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/exercises']);
  }

  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = './assets/dumbbell.png';
  }
}
