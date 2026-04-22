export interface Dog {
  id: string;
  name: string;
  registrationNumber?: string;
  sex: 'MALE' | 'FEMALE';
  birthDate?: Date;
  color?: string;
  weight?: number;
  height?: number;
  hipScore?: number;
  elbowScore?: number;
  eyeCertification?: string;
  titles: string[];
  notes?: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  sireId?: string;
  damId?: string;
  breederId: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'USER' | 'BREEDER' | 'ADMIN';
  createdAt: Date;
  updatedAt: Date;
}

export interface Breeding {
  id: string;
  date: Date;
  notes?: string;
  sireId: string;
  damId: string;
  breederId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PedigreeNode {
  dog: Dog;
  sire?: PedigreeNode;
  dam?: PedigreeNode;
  generation: number;
}

export interface BreedingSimulation {
  sire: Dog;
  dam: Dog;
  coi: number; // Coefficient of Inbreeding
  ancestry: {
    commonAncestors: Array<{
      dog: Dog;
      contribution: number;
    }>;
  };
  healthRisks: {
    hipDysplasia: {
      risk: number;
      sireScore?: number;
      damScore?: number;
    };
    elbowDysplasia: {
      risk: number;
      sireScore?: number;
      damScore?: number;
    };
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
