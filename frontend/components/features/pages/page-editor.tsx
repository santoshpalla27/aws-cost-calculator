'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical, Type, Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, ToggleLeft, Quote, Code, Minus, Image, Film, FileText, Youtube, Table, Bell } from 'lucide-react';

type BlockType = 
  | 'PARAGRAPH' 
  | 'HEADING_1' 
  | 'HEADING_2' 
  | 'HEADING_3'
  | 'BULLET_LIST'
  | 'NUMBERED_LIST'
  | 'TODO'
  | 'TOGGLE'
  | 'QUOTE'
  | 'CODE'
  | 'DIVIDER'
  | 'IMAGE'
  | 'VIDEO'
  | 'FILE'
  | 'EMBED'
  | 'TABLE'
  | 'CALLOUT'
  | 'DATABASE';

interface Block {
  id: string;
  type: BlockType;
  content: string;
  properties?: any;
}

export default function PageEditor() {
  const [title, setTitle] = useState('New Page');
  const [blocks, setBlocks] = useState<Block[]>([
    {
      id: 'block1',
      type: 'HEADING_1',
      content: 'Welcome to your page',
    },
    {
      id: 'block2',
      type: 'PARAGRAPH',
      content: 'Start writing your thoughts here...',
    }
  ]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  const addBlock = (type: BlockType, index?: number) => {
    const newBlock: Block = {
      id: `block${blocks.length + 1}`,
      type,
      content: '',
    };

    if (index !== undefined) {
      const newBlocks = [...blocks];
      newBlocks.splice(index + 1, 0, newBlock);
      setBlocks(newBlocks);
    } else {
      setBlocks([...blocks, newBlock]);
    }
    
    setActiveBlockId(newBlock.id);
  };

  const updateBlock = (id: string, content: string) => {
    setBlocks(blocks.map(block => 
      block.id === id ? { ...block, content } : block
    ));
  };

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter(block => block.id !== id));
    if (activeBlockId === id) {
      setActiveBlockId(null);
    }
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(block => block.id === id);
    if (index === -1) return;

    if ((direction === 'up' && index === 0) || 
        (direction === 'down' && index === blocks.length - 1)) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    setBlocks(newBlocks);
  };

  const renderBlockContent = (block: Block) => {
    const isActive = activeBlockId === block.id;
    
    switch (block.type) {
      case 'HEADING_1':
        return (
          <h1 
            className="text-3xl font-bold focus:outline-none"
            contentEditable={isActive}
            suppressContentEditableWarning
            onBlur={(e) => updateBlock(block.id, e.currentTarget.textContent || '')}
          >
            {block.content || 'Heading 1'}
          </h1>
        );
      case 'HEADING_2':
        return (
          <h2 
            className="text-2xl font-bold focus:outline-none"
            contentEditable={isActive}
            suppressContentEditableWarning
            onBlur={(e) => updateBlock(block.id, e.currentTarget.textContent || '')}
          >
            {block.content || 'Heading 2'}
          </h2>
        );
      case 'HEADING_3':
        return (
          <h3 
            className="text-xl font-bold focus:outline-none"
            contentEditable={isActive}
            suppressContentEditableWarning
            onBlur={(e) => updateBlock(block.id, e.currentTarget.textContent || '')}
          >
            {block.content || 'Heading 3'}
          </h3>
        );
      case 'PARAGRAPH':
        return (
          <p 
            className="focus:outline-none min-h-[1.5em]"
            contentEditable={isActive}
            suppressContentEditableWarning
            onBlur={(e) => updateBlock(block.id, e.currentTarget.textContent || '')}
          >
            {block.content || <span className="text-gray-400">Type '/' for commands</span>}
          </p>
        );
      case 'BULLET_LIST':
        return (
          <ul className="list-disc list-inside focus:outline-none" contentEditable={isActive} suppressContentEditableWarning>
            <li>{block.content || 'List item'}</li>
          </ul>
        );
      case 'NUMBERED_LIST':
        return (
          <ol className="list-decimal list-inside focus:outline-none" contentEditable={isActive} suppressContentEditableWarning>
            <li>{block.content || 'List item'}</li>
          </ol>
        );
      case 'TODO':
        return (
          <div className="flex items-center">
            <input type="checkbox" className="mr-2" />
            <span 
              className={`focus:outline-none ${block.content ? '' : 'text-gray-400'}`}
              contentEditable={isActive}
              suppressContentEditableWarning
              onBlur={(e) => updateBlock(block.id, e.currentTarget.textContent || '')}
            >
              {block.content || 'To-do item'}
            </span>
          </div>
        );
      case 'QUOTE':
        return (
          <blockquote 
            className="border-l-4 border-gray-300 pl-4 italic focus:outline-none"
            contentEditable={isActive}
            suppressContentEditableWarning
            onBlur={(e) => updateBlock(block.id, e.currentTarget.textContent || '')}
          >
            {block.content || 'This is a quote'}
          </blockquote>
        );
      case 'CODE':
        return (
          <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto focus:outline-none">
            <code 
              contentEditable={isActive}
              suppressContentEditableWarning
              onBlur={(e) => updateBlock(block.id, e.currentTarget.textContent || '')}
            >
              {block.content || '// Code block'}
            </code>
          </pre>
        );
      case 'DIVIDER':
        return <hr className="my-4" />;
      case 'TOGGLE':
        return (
          <details className="focus:outline-none">
            <summary 
              contentEditable={isActive}
              suppressContentEditableWarning
              onBlur={(e) => updateBlock(block.id, e.currentTarget.textContent || '')}
            >
              {block.content || 'Toggle heading'}
            </summary>
            <div className="ml-4 mt-2">Toggle content</div>
          </details>
        );
      default:
        return (
          <div 
            className="focus:outline-none min-h-[1.5em]"
            contentEditable={isActive}
            suppressContentEditableWarning
            onBlur={(e) => updateBlock(block.id, e.currentTarget.textContent || '')}
          >
            {block.content || `Block of type: ${block.type}`}
          </div>
        );
    }
  };

  const getBlockIcon = (type: BlockType) => {
    switch (type) {
      case 'HEADING_1': return <Heading1 className="h-4 w-4" />;
      case 'HEADING_2': return <Heading2 className="h-4 w-4" />;
      case 'HEADING_3': return <Heading3 className="h-4 w-4" />;
      case 'BULLET_LIST': return <List className="h-4 w-4" />;
      case 'NUMBERED_LIST': return <ListOrdered className="h-4 w-4" />;
      case 'TODO': return <CheckSquare className="h-4 w-4" />;
      case 'TOGGLE': return <ToggleLeft className="h-4 w-4" />;
      case 'QUOTE': return <Quote className="h-4 w-4" />;
      case 'CODE': return <Code className="h-4 w-4" />;
      case 'DIVIDER': return <Minus className="h-4 w-4" />;
      case 'IMAGE': return <Image className="h-4 w-4" />;
      case 'VIDEO': return <Film className="h-4 w-4" />;
      case 'FILE': return <FileText className="h-4 w-4" />;
      case 'EMBED': return <Youtube className="h-4 w-4" />;
      case 'TABLE': return <Table className="h-4 w-4" />;
      case 'CALLOUT': return <Bell className="h-4 w-4" />;
      default: return <Type className="h-4 w-4" />;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-9 text-2xl font-bold border-none focus-visible:ring-0 focus-visible:ring-offset-0"
          placeholder="Page title"
        />
        <div className="flex space-x-1">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => addBlock('HEADING_1')}
          >
            <Heading1 className="h-4 w-4 mr-1" />
            H1
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => addBlock('HEADING_2')}
          >
            <Heading2 className="h-4 w-4 mr-1" />
            H2
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => addBlock('PARAGRAPH')}
          >
            <Type className="h-4 w-4 mr-1" />
            Text
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => addBlock('BULLET_LIST')}
          >
            <List className="h-4 w-4 mr-1" />
            List
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => addBlock('TODO')}
          >
            <CheckSquare className="h-4 w-4 mr-1" />
            Todo
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-auto">
        <div className="space-y-2">
          {blocks.map((block, index) => (
            <div 
              key={block.id} 
              className={`group flex items-start p-1 rounded ${activeBlockId === block.id ? 'bg-blue-50' : ''}`}
              onClick={() => setActiveBlockId(block.id)}
            >
              <div className="opacity-0 group-hover:opacity-100 flex space-x-1 mr-2 p-1">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveBlock(block.id, 'up');
                  }}
                >
                  ↑
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveBlock(block.id, 'down');
                  }}
                >
                  ↓
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteBlock(block.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="flex-grow">
                {renderBlockContent(block)}
              </div>
              
              <div className="opacity-0 group-hover:opacity-100 ml-2 p-1">
                <Badge variant="secondary" className="text-xs">
                  {getBlockIcon(block.type)}
                  {block.type}
                </Badge>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 flex justify-center">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => addBlock('PARAGRAPH', blocks.length - 1)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Block
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}