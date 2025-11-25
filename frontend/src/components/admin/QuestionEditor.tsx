'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Trash } from 'lucide-react';

const questionSchema = z.object({
  questionText: z.string().min(10),
  explanation: z.string().min(10),
  options: z.array(
    z.object({
      text: z.string().min(1),
      isCorrect: z.boolean(),
    })
  ).min(2),
});

export function QuestionEditor({ question, onSave, onCancel }) {
  const form = useForm({
    resolver: zodResolver(questionSchema),
    defaultValues: question,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'options',
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">
        <FormField
          control={form.control}
          name="questionText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Question Text</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div>
          <h4 className="font-medium">Options</h4>
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2 mt-2">
              <FormField
                control={form.control}
                name={`options.${index}.isCorrect`}
                render={({ field: checkboxField }) => (
                  <FormControl>
                    <Checkbox
                      checked={checkboxField.value}
                      onCheckedChange={checkboxField.onChange}
                    />
                  </FormControl>
                )}
              />
              <FormField
                control={form.control}
                name={`options.${index}.text`}
                render={({ field: inputField }) => (
                  <FormControl>
                    <Input {...inputField} />
                  </FormControl>
                )}
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                <Trash className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button type="button" onClick={() => append({ text: '', isCorrect: false })} className="mt-2">
            Add Option
          </Button>
        </div>
        <FormField
          control={form.control}
          name="explanation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Explanation</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Form>
  );
}