export type Role = 'ADMIN' | 'ASSET_MANAGER' | 'DEPARTMENT_HEAD' | 'EMPLOYEE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'ACTIVE' | 'INACTIVE';
  departmentId: string | null;
  department?: { id: string; name: string } | null;
}

export type AssetStatus =
  | 'AVAILABLE'
  | 'ALLOCATED'
  | 'RESERVED'
  | 'UNDER_MAINTENANCE'
  | 'LOST'
  | 'RETIRED'
  | 'DISPOSED';

export interface Asset {
  id: string;
  assetTag: string;
  name: string;
  categoryId: string;
  category?: { id: string; name: string; customFields?: any };
  serialNumber?: string | null;
  acquisitionDate?: string | null;
  acquisitionCost?: string | null;
  condition: 'NEW' | 'GOOD' | 'FAIR' | 'POOR';
  location?: string | null;
  photoUrl?: string | null;
  customFieldValues?: Record<string, any> | null;
  isBookable: boolean;
  status: AssetStatus;
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
}

export interface Department {
  id: string;
  name: string;
  headId?: string | null;
  parentId?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  head?: { id: string; name: string } | null;
  parent?: { id: string; name: string } | null;
  _count?: { members: number; assets: number };
}

export interface Category {
  id: string;
  name: string;
  customFields?: { key: string; label: string; type: string }[] | null;
  _count?: { assets: number };
}
