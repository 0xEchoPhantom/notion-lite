export type Ability = string;
export type Responsibility = string;

import type { TaskCompany } from './task';

export interface Assignee {
  id: string;
  name: string;
  email?: string;
  company?: TaskCompany;
  abilities: Ability[]; // things they can do well
  responsibilities: Responsibility[]; // areas they own
  notes?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssigneeCreateInput {
  name: string;
  email?: string;
  company?: TaskCompany;
  abilities?: Ability[];
  responsibilities?: Responsibility[];
  notes?: string;
  active?: boolean;
}
