'use client';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface QuizQuestionProps {
  question: {
    id: string;
    questionText: string;
    options: {
      id: string;
      text: string;
    }[];
  };
  selectedAnswer: string | undefined;
  onAnswerSelect: (optionId: string) => void;
}

export function QuizQuestion({ question, selectedAnswer, onAnswerSelect }: QuizQuestionProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">{question.questionText}</h2>
      <RadioGroup
        value={selectedAnswer}
        onValueChange={onAnswerSelect}
        className="space-y-2"
      >
        {question.options.map((option, index) => (
          <div key={option.id} className="flex items-center space-x-2">
            <RadioGroupItem value={option.id} id={option.id} />
            <Label htmlFor={option.id} className="flex-1">
              <span className="font-mono mr-2">{String.fromCharCode(65 + index)}.</span>
              {option.text}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}