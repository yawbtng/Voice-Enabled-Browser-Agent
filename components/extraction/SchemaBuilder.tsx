'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Plus, Trash2, Eye, Code, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { SCHEMA_METADATA, SchemaType } from '@/lib/extraction-schemas';

interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  arrayType?: 'string' | 'number' | 'boolean' | 'object';
}

interface SchemaBuilderProps {
  onSchemaGenerated: (schema: string) => void;
  onSchemaSelected: (schemaType: SchemaType) => void;
  className?: string;
}

export function SchemaBuilder({ onSchemaGenerated, onSchemaSelected, className }: SchemaBuilderProps) {
  const [fields, setFields] = useState<SchemaField[]>([]);
  const [schemaName, setSchemaName] = useState('');
  const [previewMode, setPreviewMode] = useState<'visual' | 'code'>('visual');
  const [generating, setGenerating] = useState(false);

  const addField = () => {
    const newField: SchemaField = {
      name: '',
      type: 'string',
      description: '',
      required: true,
    };
    setFields([...fields, newField]);
  };

  const updateField = (index: number, updates: Partial<SchemaField>) => {
    const updatedFields = fields.map((field, i) => 
      i === index ? { ...field, ...updates } : field
    );
    setFields(updatedFields);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const generateSchema = () => {
    if (!schemaName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a schema name',
        variant: 'destructive',
      });
      return;
    }

    if (fields.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one field',
        variant: 'destructive',
      });
      return;
    }

    const schemaCode = generateZodSchema(schemaName, fields);
    onSchemaGenerated(schemaCode);
    
    toast({
      title: 'Schema Generated',
      description: 'Custom schema has been generated',
    });
  };

  const generateZodSchema = (name: string, fields: SchemaField[]): string => {
    const schemaFields = fields.map(field => {
      let fieldSchema = '';
      
      switch (field.type) {
        case 'string':
          fieldSchema = `z.string().describe('${field.description}')`;
          break;
        case 'number':
          fieldSchema = `z.number().describe('${field.description}')`;
          break;
        case 'boolean':
          fieldSchema = `z.boolean().describe('${field.description}')`;
          break;
        case 'array':
          const arrayType = field.arrayType || 'string';
          fieldSchema = `z.array(z.${arrayType}()).describe('${field.description}')`;
          break;
        case 'object':
          fieldSchema = `z.object({}).describe('${field.description}')`;
          break;
      }
      
      if (!field.required) {
        fieldSchema += '.optional()';
      }
      
      return `  ${field.name}: ${fieldSchema},`;
    }).join('\n');

    return `z.object({\n${schemaFields}\n})`;
  };

  const handlePredefinedSchema = (schemaType: SchemaType) => {
    onSchemaSelected(schemaType);
    toast({
      title: 'Schema Selected',
      description: `${SCHEMA_METADATA[schemaType].name} schema selected`,
    });
  };

  const clearSchema = () => {
    setFields([]);
    setSchemaName('');
  };

  const loadTemplate = (template: string) => {
    setGenerating(true);
    
    // Simulate AI generation
    setTimeout(() => {
      const templates: Record<string, SchemaField[]> = {
        'product': [
          { name: 'name', type: 'string', description: 'Product name', required: true },
          { name: 'price', type: 'string', description: 'Product price', required: true },
          { name: 'description', type: 'string', description: 'Product description', required: false },
          { name: 'rating', type: 'number', description: 'Product rating', required: false },
        ],
        'article': [
          { name: 'title', type: 'string', description: 'Article title', required: true },
          { name: 'content', type: 'string', description: 'Article content', required: true },
          { name: 'author', type: 'string', description: 'Article author', required: false },
          { name: 'publishDate', type: 'string', description: 'Publication date', required: false },
        ],
        'contact': [
          { name: 'name', type: 'string', description: 'Contact name', required: false },
          { name: 'email', type: 'string', description: 'Email address', required: false },
          { name: 'phone', type: 'string', description: 'Phone number', required: false },
          { name: 'address', type: 'string', description: 'Physical address', required: false },
        ],
      };
      
      setFields(templates[template] || []);
      setSchemaName(template);
      setGenerating(false);
      
      toast({
        title: 'Template Loaded',
        description: `${template} template loaded`,
      });
    }, 1000);
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Schema Builder
          </CardTitle>
          <CardDescription>
            Build custom Zod schemas for data extraction or use predefined templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="predefined" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="predefined">Predefined</TabsTrigger>
              <TabsTrigger value="builder">Builder</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>
            
            <TabsContent value="predefined" className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(SCHEMA_METADATA).map(([key, metadata]) => (
                  <Card 
                    key={key} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handlePredefinedSchema(key as SchemaType)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{metadata.icon}</span>
                        <h3 className="font-medium">{metadata.name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {metadata.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="builder" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Schema Name</label>
                  <Input
                    value={schemaName}
                    onChange={(e) => setSchemaName(e.target.value)}
                    placeholder="e.g., ProductSchema"
                    className="mt-1"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Fields</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={clearSchema}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                    <Button variant="outline" size="sm" onClick={addField}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Field
                    </Button>
                  </div>
                </div>
                
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <Card key={index} className="p-4">
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="text-sm font-medium">Field Name</label>
                            <Input
                              value={field.name}
                              onChange={(e) => updateField(index, { name: e.target.value })}
                              placeholder="e.g., title"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Type</label>
                            <select
                              value={field.type}
                              onChange={(e) => updateField(index, { type: e.target.value as any })}
                              className="w-full mt-1 p-2 border rounded-md"
                            >
                              <option value="string">String</option>
                              <option value="number">Number</option>
                              <option value="boolean">Boolean</option>
                              <option value="array">Array</option>
                              <option value="object">Object</option>
                            </select>
                          </div>
                        </div>
                        
                        {field.type === 'array' && (
                          <div className="mb-3">
                            <label className="text-sm font-medium">Array Type</label>
                            <select
                              value={field.arrayType || 'string'}
                              onChange={(e) => updateField(index, { arrayType: e.target.value as any })}
                              className="w-full mt-1 p-2 border rounded-md"
                            >
                              <option value="string">String</option>
                              <option value="number">Number</option>
                              <option value="boolean">Boolean</option>
                              <option value="object">Object</option>
                            </select>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="text-sm font-medium">Description</label>
                            <Input
                              value={field.description}
                              onChange={(e) => updateField(index, { description: e.target.value })}
                              placeholder="e.g., The main title"
                              className="mt-1"
                            />
                          </div>
                          <div className="flex items-center gap-2 mt-6">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => updateField(index, { required: e.target.checked })}
                              className="rounded"
                            />
                            <label className="text-sm font-medium">Required</label>
                          </div>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeField(index)}
                          className="w-full"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove Field
                        </Button>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
                
                <div className="flex items-center gap-2">
                  <Button onClick={generateSchema} disabled={fields.length === 0}>
                    <Save className="h-4 w-4 mr-2" />
                    Generate Schema
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPreviewMode(previewMode === 'visual' ? 'code' : 'visual')}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {previewMode === 'visual' ? 'Show Code' : 'Show Visual'}
                  </Button>
                </div>
                
                {fields.length > 0 && (
                  <Card className="p-4">
                    <h3 className="font-medium mb-2">Schema Preview</h3>
                    <ScrollArea className="h-32">
                      <pre className="text-xs bg-muted p-3 rounded">
                        {generateZodSchema(schemaName || 'CustomSchema', fields)}
                      </pre>
                    </ScrollArea>
                  </Card>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="templates" className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {['product', 'article', 'contact'].map(template => (
                  <Card 
                    key={template} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => loadTemplate(template)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium capitalize">{template} Template</h3>
                          <p className="text-sm text-muted-foreground">
                            Load a predefined {template} schema template
                          </p>
                        </div>
                        {generating && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
