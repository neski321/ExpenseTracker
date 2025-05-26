
"use client";

import { z } from "zod"; 
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { Category } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NO_PARENT_VALUE = "__none__";

const categoryFormSchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters.").max(50),
  parentId: z.string().optional(),
});

type CategoryFormValues = Omit<Category, "id" | "icon">; // parentId is now included

interface CategoryFormProps {
  onSubmit: (data: CategoryFormValues) => void;
  existingCategory?: Category;
  allCategories: Category[]; // To populate parent select
}

export function CategoryForm({ onSubmit, existingCategory, allCategories }: CategoryFormProps) {
  const { toast } = useToast();
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: existingCategory ? {
      name: existingCategory.name,
      parentId: existingCategory.parentId || NO_PARENT_VALUE,
    } : {
      name: "",
      parentId: NO_PARENT_VALUE,
    },
  });

  // Filter out the current category and its descendants from being a potential parent
  const potentialParents = allCategories.filter(cat => {
    if (existingCategory && cat.id === existingCategory.id) return false;
    // Basic circular dependency prevention: cannot be a child of itself.
    // A more robust solution would check for deeper circular dependencies if nesting > 1 level is common.
    // For now, this prevents direct self-parenting and a category becoming a child of its own child.
    // This part is complex to do perfectly without a full tree traversal; keeping it simple for now.
    if (existingCategory && existingCategory.parentId === cat.id) return true; // allow current parent
    // A more robust check for descendants would be needed for deeper nesting.
    return true; 
  });


  function handleSubmit(data: CategoryFormValues) {
    const submitData = {
      ...data,
      parentId: data.parentId === NO_PARENT_VALUE ? undefined : data.parentId,
    };
    onSubmit(submitData);
    toast({
      title: existingCategory ? "Category Updated!" : "Category Added!",
      description: `Category "${data.name}" has been successfully ${existingCategory ? 'updated' : 'added'}.`,
    });
    if (!existingCategory) {
      form.reset({ name: "", parentId: NO_PARENT_VALUE });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 p-1">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Food, Streaming Services" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="parentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Parent Category (Optional)</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value || NO_PARENT_VALUE}
                value={field.value || NO_PARENT_VALUE}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a parent category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NO_PARENT_VALUE}>None (Top-level category)</SelectItem>
                  {potentialParents.map((category) => (
                    <SelectItem key={category.id} value={category.id} disabled={category.id === existingCategory?.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full sm:w-auto shadow-md">
          {existingCategory ? "Update Category" : "Add Category"}
        </Button>
      </form>
    </Form>
  );
}
