'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Plus, Calendar } from 'lucide-react';

interface JournalEntry {
  id: string;
  title?: string;
  content: string;
  mood?: string;
  entryDate: string;
}

export default function JournalEditor() {
  const [entries, setEntries] = useState<JournalEntry[]>([
    {
      id: 'j1',
      title: 'Productive Day',
      content: 'Had a great day at work. Completed several important tasks and made good progress on the project.',
      mood: 'HAPPY',
      entryDate: '2023-11-18',
    },
    {
      id: 'j2',
      title: 'Weekend Reflection',
      content: 'Spent the weekend with family. It was relaxing and recharged me for the upcoming week.',
      mood: 'NEUTRAL',
      entryDate: '2023-11-15',
    }
  ]);
  
  const [newEntry, setNewEntry] = useState({
    title: '',
    content: '',
    mood: 'NEUTRAL'
  });

  const addEntry = () => {
    if (newEntry.content.trim() === '') return;
    
    const entry: JournalEntry = {
      id: `j${entries.length + 1}`,
      title: newEntry.title || undefined,
      content: newEntry.content,
      mood: newEntry.mood,
      entryDate: new Date().toISOString().split('T')[0],
    };
    
    setEntries([entry, ...entries]);
    setNewEntry({
      title: '',
      content: '',
      mood: 'NEUTRAL'
    });
  };

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case 'VERY_HAPPY':
        return 'text-yellow-500';
      case 'HAPPY':
        return 'text-yellow-400';
      case 'NEUTRAL':
        return 'text-gray-500';
      case 'SAD':
        return 'text-blue-400';
      case 'VERY_SAD':
        return 'text-blue-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Journal</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="mb-3">
            <Input
              placeholder="Title (optional)"
              value={newEntry.title}
              onChange={(e) => setNewEntry({...newEntry, title: e.target.value})}
              className="mb-2"
            />
            <Textarea
              placeholder="Write your journal entry here..."
              value={newEntry.content}
              onChange={(e) => setNewEntry({...newEntry, content: e.target.value})}
              rows={4}
              className="mb-2"
            />
          </div>
          <div className="flex justify-between items-center">
            <select
              value={newEntry.mood}
              onChange={(e) => setNewEntry({...newEntry, mood: e.target.value})}
              className="border rounded p-2"
            >
              <option value="VERY_SAD">Very Sad 😞</option>
              <option value="SAD">Sad 😟</option>
              <option value="NEUTRAL">Neutral 😐</option>
              <option value="HAPPY">Happy 😊</option>
              <option value="VERY_HAPPY">Very Happy 😄</option>
            </select>
            <Button onClick={addEntry}>
              <Plus className="h-4 w-4 mr-1" />
              Add Entry
            </Button>
          </div>
        </div>
        
        <div className="space-y-4">
          {entries.map((entry) => (
            <Card key={entry.id} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">
                    {entry.title || 'Untitled Entry'}
                  </CardTitle>
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(entry.entryDate).toLocaleDateString()}
                    <span className={`ml-2 ${getMoodColor(entry.mood || 'NEUTRAL')}`}>
                      {entry.mood === 'VERY_HAPPY' ? '😄' : 
                       entry.mood === 'HAPPY' ? '😊' : 
                       entry.mood === 'NEUTRAL' ? '😐' : 
                       entry.mood === 'SAD' ? '😟' : '😞'}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-line">{entry.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}