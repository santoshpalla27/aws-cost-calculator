'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { QUIZ_CATEGORIES, DIFFICULTY_LEVELS } from '@/utils/constants';

const formSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  category: z.nativeEnum(QUIZ_CATEGORIES),
  difficulty: z.nativeEnum(DIFFICULTY_LEVELS),
  questions: z.array(
    z.object({
      questionText: z.string().min(10),
      options: z.array(
        z.object({
          text: z.string().min(1),
          isCorrect: z.boolean(),
        })
      ).min(2),
      explanation: z.string().min(10),
    })
  ).min(1),
});

export function QuizForm({ onSubmit, defaultValues, isSubmitting }) {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues,
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'questions',
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Quiz Details */}
        <FormField name="title" render={...} />
        <FormField name="category" render={...} />
        {/* ... other quiz fields */}

        {/* Questions */}
        {fields.map((field, index) => (
          <div key={field.id}>
            {/* Question fields */}
            <Button type="button" onClick={() => remove(index)}>Remove Question</Button>
          </div>
        ))}
        <Button type="button" onClick={() => append({ ... })}>
          Add Question
        </Button>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Quiz'}
        </Button>
      </form>
    </Form>
  );
}