export interface GymVisualExercise {
  id: number;
  name: string;
  gifUrl: string;
  detailUrl: string;
  reference: string;
}

export interface GymVisualFilterOption {
  id: number;
  name: string;
  count?: number | null;
}

export interface GymVisualFilters {
  exerciseTypes: GymVisualFilterOption[];
  bodyParts: GymVisualFilterOption[];
  equipmentTypes: GymVisualFilterOption[];
  genders: GymVisualFilterOption[];
}

export interface GymVisualPagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export interface GymVisualSearchResponse {
  exercises: GymVisualExercise[];
  pagination: GymVisualPagination;
  filters: {
    gender: number;
    exerciseType: number;
    bodyPart: number;
    equipment: number;
  };
}

