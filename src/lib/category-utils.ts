
import type { Category } from './types';
import Link from 'next/link'; // Added for potential future use, not directly here

export interface HierarchicalCategoryOption {
  value: string;
  label: string;
  level: number;
  originalName: string;
  parentId?: string;
}

export interface CategoryPathPart {
  id: string;
  name: string;
}

export function getHierarchicalCategoryOptions(
  categories: Category[],
  parentId?: string,
  level = 0,
  prefix = ''
): HierarchicalCategoryOption[] {
  const options: HierarchicalCategoryOption[] = [];
  categories
    .filter(category => category.parentId === parentId)
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(category => {
      options.push({
        value: category.id,
        label: `${prefix}${category.name}`,
        level,
        originalName: category.name,
        parentId: category.parentId,
      });
      options.push(
        ...getHierarchicalCategoryOptions(categories, category.id, level + 1, `${prefix}  ↳ `)
      );
    });
  return options;
}

export function findCategoryById(categories: Category[], categoryId: string): Category | undefined {
  return categories.find(cat => cat.id === categoryId);
}

export function getCategoryPath(
  categoryId: string,
  categories: Category[]
): CategoryPathPart[] {
  const path: CategoryPathPart[] = [];
  let currentCategory = findCategoryById(categories, categoryId);

  while (currentCategory) {
    path.unshift({ id: currentCategory.id, name: currentCategory.name });
    if (currentCategory.parentId) {
      currentCategory = findCategoryById(categories, currentCategory.parentId);
    } else {
      currentCategory = undefined;
    }
  }
  return path;
}

// Wrapper function to keep the old signature for places that still expect a string,
// but the main logic is now in getCategoryPath
export function getCategoryNameWithHierarchy(
  categoryId: string,
  categories: Category[]
): string {
  const path = getCategoryPath(categoryId, categories);
  if (path.length === 0) return "Unknown Category";
  return path.map(p => p.name).join(" > ");
}


export const getAllDescendantCategoryIds = (parentId: string, allCategories: Category[]): string[] => {
  const descendants: string[] = [];
  const directChildren = allCategories.filter(cat => cat.parentId === parentId);
  for (const child of directChildren) {
    descendants.push(child.id);
    descendants.push(...getAllDescendantCategoryIds(child.id, allCategories));
  }
  return Array.from(new Set(descendants)); // Ensure unique IDs
};

export function getMainCategories(categories: Category[]): Category[] {
  return categories.filter(category => !category.parentId).sort((a, b) => a.name.localeCompare(b.name));
}

export function getSubCategories(parentId: string, categories: Category[]): Category[] {
  return categories.filter(category => category.parentId === parentId).sort((a, b) => a.name.localeCompare(b.name));
}
