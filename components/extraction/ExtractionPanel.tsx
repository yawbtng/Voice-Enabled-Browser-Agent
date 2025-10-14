'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Download, Copy, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ExtractionResult {
  id: string;
  instruction: string;
  schema: any;
  data: any;
  status: 'success' | 'failed';
  timestamp: number;
  error?: string;
  retryCount: number;
  confidence?: number;
}

interface ExtractionPanelProps {
  sessionId: string;
  onExtract: (instruction: string, schemaType?: string) => Promise<ExtractionResult>;
  className?: string;
}

export function ExtractionPanel({ sessionId, onExtract, className }: ExtractionPanelProps) {
  const [extractions, setExtractions] = useState<ExtractionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [schemaType, setSchemaType] = useState<string>('custom');
  const [showRawData, setShowRawData] = useState<Record<string, boolean>>({});

  // Load extraction history on mount
  useEffect(() => {
    loadExtractionHistory();
  }, [sessionId]);

  const loadExtractionHistory = async () => {
    try {
      const response = await fetch(`/api/extract?sessionId=${sessionId}`);
      const result = await response.json();
      
      if (result.success) {
        setExtractions(result.data);
      }
    } catch (error) {
      console.error('Failed to load extraction history:', error);
    }
  };

  const handleExtract = async () => {
    if (!instruction.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an extraction instruction',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await onExtract(instruction, schemaType);
      setExtractions(prev => [result, ...prev]);
      setInstruction('');
      
      toast({
        title: 'Extraction Complete',
        description: result.status === 'success' 
          ? 'Data extracted successfully' 
          : `Extraction failed: ${result.error}`,
        variant: result.status === 'success' ? 'default' : 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to execute extraction',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (extractionId: string) => {
    const extraction = extractions.find(e => e.id === extractionId);
    if (!extraction) return;

    setLoading(true);
    try {
      const result = await onExtract(extraction.instruction, schemaType);
      setExtractions(prev => prev.map(e => e.id === extractionId ? result : e));
      
      toast({
        title: 'Retry Complete',
        description: result.status === 'success' 
          ? 'Data extracted successfully' 
          : `Extraction failed: ${result.error}`,
        variant: result.status === 'success' ? 'default' : 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to retry extraction',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyData = async (data: any) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      toast({
        title: 'Copied',
        description: 'Data copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy data',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadData = async (data: any, filename: string) => {
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: data,
          filename: filename,
          format: 'json'
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Exported',
          description: `Data exported to ${result.filePath}`,
        });
      } else {
        toast({
          title: 'Export Failed',
          description: result.error || 'Failed to export data',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Export Error',
        description: 'Failed to export data',
        variant: 'destructive',
      });
    }
  };

  const toggleRawData = (extractionId: string) => {
    setShowRawData(prev => ({
      ...prev,
      [extractionId]: !prev[extractionId],
    }));
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const schemaTypes = [
    { value: 'custom', label: 'Custom', description: 'AI-generated schema' },
    { value: 'article', label: 'Article', description: 'Blog posts, news articles' },
    { value: 'product', label: 'Product', description: 'E-commerce products' },
    { value: 'table', label: 'Table', description: 'Tabular data' },
    { value: 'form', label: 'Form', description: 'Form fields and structure' },
    { value: 'contact', label: 'Contact', description: 'Contact information' },
    { value: 'job', label: 'Job', description: 'Job listings' },
    { value: 'event', label: 'Event', description: 'Events and meetings' },
    { value: 'list', label: 'List', description: 'Simple lists' },
  ];

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Data Extraction
          </CardTitle>
          <CardDescription>
            Extract structured data from web pages using AI-powered schemas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="extract" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="extract">Extract Data</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="extract" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Extraction Instruction</label>
                  <textarea
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder="e.g., extract all products with name and price"
                    className="w-full mt-1 p-3 border rounded-md resize-none"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Schema Type</label>
                  <select
                    value={schemaType}
                    onChange={(e) => setSchemaType(e.target.value)}
                    className="w-full mt-1 p-2 border rounded-md"
                  >
                    {schemaTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label} - {type.description}
                      </option>
                    ))}
                  </select>
                </div>
                
                <Button 
                  onClick={handleExtract} 
                  disabled={loading || !instruction.trim()}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    'Extract Data'
                  )}
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="history" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Extraction History</h3>
                <Button variant="outline" size="sm" onClick={loadExtractionHistory}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
              
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {extractions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No extractions yet. Start by extracting some data!
                    </div>
                  ) : (
                    extractions.map((extraction) => (
                      <Card key={extraction.id} className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{extraction.instruction}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatTimestamp(extraction.timestamp)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={extraction.status === 'success' ? 'default' : 'destructive'}
                            >
                              {extraction.status}
                            </Badge>
                            {extraction.confidence && (
                              <Badge variant="outline">
                                {Math.round(extraction.confidence * 100)}% confidence
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {extraction.status === 'success' && extraction.data && (
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleRawData(extraction.id)}
                              >
                                {showRawData[extraction.id] ? (
                                  <EyeOff className="h-4 w-4 mr-2" />
                                ) : (
                                  <Eye className="h-4 w-4 mr-2" />
                                )}
                                {showRawData[extraction.id] ? 'Hide' : 'Show'} Data
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopyData(extraction.data)}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copy
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadData(extraction.data, `extraction-${extraction.id}`)}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Export JSON
                              </Button>
                            </div>
                            
                            {showRawData[extraction.id] && (
                              <div className="bg-muted p-3 rounded-md">
                                <pre className="text-xs overflow-auto">
                                  {JSON.stringify(extraction.data, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {extraction.status === 'failed' && (
                          <div className="mt-3">
                            <p className="text-sm text-destructive mb-2">
                              Error: {extraction.error}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRetry(extraction.id)}
                              disabled={loading}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Retry
                            </Button>
                          </div>
                        )}
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
