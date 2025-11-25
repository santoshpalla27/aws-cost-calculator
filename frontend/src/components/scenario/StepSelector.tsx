'use client';

import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle } from 'lucide-react';

interface Step {
  id: string;
  actionText: string;
}

interface StepResult {
  isCorrect: boolean;
}

interface StepSelectorProps {
  steps: Step[];
  selectedSteps: string[];
  stepResults: Map<string, StepResult>;
  onStepSelect: (stepId: string) => void;
  isComplete: boolean;
}

export function StepSelector({
  steps,
  selectedSteps,
  stepResults,
  onStepSelect,
  isComplete,
}: StepSelectorProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Resolution Steps</h3>
      <p className="text-sm text-muted-foreground">
        Select the steps in the correct order to resolve the issue.
      </p>
      <div className="space-y-2">
        {steps.map((step) => {
          const isSelected = selectedSteps.includes(step.id);
          const result = stepResults.get(step.id);

          return (
            <Button
              key={step.id}
              variant={isSelected ? (result?.isCorrect ? 'default' : 'destructive') : 'outline'}
              onClick={() => onStepSelect(step.id)}
              disabled={isSelected || isComplete}
              className="w-full justify-start"
            >
              {isSelected ? (
                result?.isCorrect ? (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )
              ) : null}
              {step.actionText}
            </Button>
          );
        })}
      </div>
    </div>
  );
}