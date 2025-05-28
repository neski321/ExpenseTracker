
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

// Form values will not include iconName directly, as it's not user-editable in this form version.
// iconName will be handled during submission if needed (e.g., preserving existing iconName)
const categoryFormSchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters.").max(50),
  parentId: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>; // This is Omit<Category, "id" | "iconName"> effectively

interface CategoryFormProps {
  onSubmit: (data: Omit<Category, "id" | "iconName">) => void; // Pass data without iconName
  existingCategory?: Category;
  allCategories: Category[];
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

  const potentialParents = allCategories.filter(cat => {
    if (existingCategory && cat.id === existingCategory.id) return false;
    return true;
  });

  function handleSubmit(data: CategoryFormValues) {
    const submitData = {
      name: data.name,
      parentId: data.parentId === NO_PARENT_VALUE ? undefined : data.parentId,
      // iconName is not part of the form values here.
      // If editing, existingCategory.iconName would be preserved in the parent component.
      // If adding, iconName would be undefined by default.
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
