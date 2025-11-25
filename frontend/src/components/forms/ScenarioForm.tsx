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
  title: z.string().min(5),
  description: z.string().min(20),
  category: z.nativeEnum(QUIZ_CATEGORIES),
  difficulty: z.nativeEnum(DIFFICULTY_LEVELS),
  symptoms: z.array(z.string().min(1)).min(1),
  logs: z.string().optional(),
  explanation: z.string().min(50),
  steps: z.array(
    z.object({
      actionText: z.string().min(5),
      isCorrect: z.boolean(),
      feedbackCorrect: z.string().optional(),
      feedbackIncorrect: z.string().optional(),
    })
  ).min(2),
});

export function ScenarioForm({ onSubmit, defaultValues, isSubmitting }) {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'steps',
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Scenario Details */}
        <FormField name="title" render={...} />
        {/* ... other scenario fields */}

        {/* Steps */}
        {fields.map((field, index) => (
          <div key={field.id}>
            {/* Step fields */}
            <Button type="button" onClick={() => remove(index)}>Remove Step</Button>
          </div>
        ))}
        <Button type="button" onClick={() => append({ ... })}>
          Add Step
        </Button>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Scenario'}
        </Button>
      </form>
    </Form>
  );
}