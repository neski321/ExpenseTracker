
"use client";

import React from "react";
import type { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, CornerDownRight, Folder, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { getLucideIcon } from "@/lib/icon-utils";

interface CategoryListItemProps {
  category: Category;
  level: number;
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string) => void;
  hasChildren: boolean;
}

const CategoryListItem: React.FC<CategoryListItemProps> = ({ category, level, onEdit, onDelete, hasChildren }) => {
  const IconComponent = getLucideIcon(category.iconName) || (hasChildren ? Folder : Tag);
  const indentClass = `ml-${level * 6}`;

  return (
    <Link href={`/expenses/category/${category.id}?from=categories`} className="block group" aria-label={`View expenses for ${category.name}`}>
      <Card className={cn("shadow-sm group-hover:shadow-lg transition-shadow", level > 0 && "mt-1")}>
        <CardContent className={cn("p-3 flex items-center justify-between", indentClass)}>
          <div className="flex items-center gap-3 group-hover:text-primary transition-colors">
            {level > 0 && <CornerDownRight className="h-4 w-4 text-muted-foreground" />}
            <IconComponent className="h-5 w-5 text-primary flex-shrink-0 group-hover:text-primary/80 transition-colors" />
            <span className="font-medium">{category.name}</span>
          </div>
          <div className="space-x-1 relative z-20">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(category); }}
              aria-label={`Edit category ${category.name}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(category.id); }}
              aria-label={`Delete category ${category.name}`}
              className="text-destructive hover:text-destructive/80"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

interface CategoryListProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string) => void;
}

export function CategoryList({ categories, onEdit, onDelete }: CategoryListProps) {
  const buildCategoryTree = (parentId?: string, level = 0): React.ReactNode[] => {
    return categories
      .filter(cat => cat.parentId === parentId)
      .sort((a,b) => a.name.localeCompare(b.name))
      .flatMap(cat => {
        const children = categories.filter(c => c.parentId === cat.id);
        const hasChildren = children.length > 0;
        return [
          <CategoryListItem
            key={cat.id}
            category={cat}
            level={level}
            onEdit={onEdit}
            onDelete={onDelete}
            hasChildren={hasChildren}
          />,
          ...buildCategoryTree(cat.id, level + 1)
        ];
      });
  };

  if (categories.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No categories found. Add one to get started!</p>;
  }

  const jitClasses = "ml-0 ml-6 ml-12 ml-18 ml-24 ml-30";

  return (
    <div className="space-y-1">
      <div className={jitClasses} style={{ display: 'none' }}>Ensure Tailwind JIT includes these margin classes.</div>
      {buildCategoryTree(undefined, 0)}
    </div>
  );
}
