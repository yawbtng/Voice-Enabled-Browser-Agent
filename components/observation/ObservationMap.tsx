'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Element, ObservationResult } from '@/lib/observation-schemas';
import { Search, Eye, RefreshCw, Download, Trash2 } from 'lucide-react';

interface ObservationMapProps {
  sessionId: string;
  onElementSelect?: (element: Element) => void;
  className?: string;
}

export function ObservationMap({ sessionId, onElementSelect, className }: ObservationMapProps) {
  const [observationResult, setObservationResult] = useState<ObservationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [instruction, setInstruction] = useState('observe all interactive elements');

  const categories = [
    'all', 'button', 'input', 'link', 'form', 'navigation', 
    'table', 'image', 'text', 'container', 'modal', 'other'
  ];

  const executeObservation = async () => {
    if (!instruction.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/observe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instruction: instruction.trim(),
          sessionId,
          searchQuery: searchQuery || undefined,
          filters: filterCategory !== 'all' ? { categories: [filterCategory] } : undefined,
          maxElements: 100,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setObservationResult(data.data);
      } else {
        setError(data.error || 'Failed to execute observation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = async () => {
    try {
      const response = await fetch(`/api/observe?sessionId=${sessionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setObservationResult(null);
        setError(null);
      }
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  const exportResults = () => {
    if (!observationResult) return;

    const dataStr = JSON.stringify(observationResult, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `observation-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredElements = observationResult?.elements.filter(element => {
    const matchesSearch = !searchQuery || 
      element.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      element.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || element.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  }) || [];

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      button: 'bg-blue-100 text-blue-800',
      input: 'bg-green-100 text-green-800',
      link: 'bg-purple-100 text-purple-800',
      form: 'bg-orange-100 text-orange-800',
      navigation: 'bg-pink-100 text-pink-800',
      table: 'bg-yellow-100 text-yellow-800',
      image: 'bg-indigo-100 text-indigo-800',
      text: 'bg-gray-100 text-gray-800',
      container: 'bg-slate-100 text-slate-800',
      modal: 'bg-red-100 text-red-800',
      other: 'bg-neutral-100 text-neutral-800',
    };
    return colors[category] || colors.other;
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Observation Map
              </CardTitle>
              <CardDescription>
                Observe and analyze page elements with semantic search
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportResults}
                disabled={!observationResult}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearHistory}
                disabled={!observationResult}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Controls */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter observation instruction..."
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && executeObservation()}
                className="flex-1"
              />
              <Button 
                onClick={executeObservation} 
                disabled={isLoading || !instruction.trim()}
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Search elements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Results */}
          {observationResult && (
            <Tabs defaultValue="elements" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="elements">Elements ({filteredElements.length})</TabsTrigger>
                <TabsTrigger value="categories">Categories</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
              </TabsList>

              <TabsContent value="elements" className="mt-4">
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {filteredElements.map((element, index) => (
                      <Card 
                        key={index} 
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => onElementSelect?.(element)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {element.description}
                              </p>
                              <p className="text-xs text-gray-500 font-mono truncate mt-1">
                                {element.selector}
                              </p>
                              {element.text && (
                                <p className="text-xs text-gray-600 mt-1">
                                  Text: "{element.text}"
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col gap-1 ml-2">
                              <Badge className={getCategoryColor(element.category)}>
                                {element.category}
                              </Badge>
                              <div className="flex gap-1">
                                {element.isInteractive && (
                                  <Badge variant="outline" className="text-xs">
                                    Interactive
                                  </Badge>
                                )}
                                {element.isVisible && (
                                  <Badge variant="outline" className="text-xs">
                                    Visible
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="categories" className="mt-4">
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(observationResult.categories).map(([category, count]) => (
                    <Card key={category}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <Badge className={getCategoryColor(category)}>
                            {category}
                          </Badge>
                          <span className="text-2xl font-bold">{count}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="summary" className="mt-4">
                <div className="space-y-4">
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2">Observation Summary</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Total Elements:</span>
                          <span className="ml-2 font-medium">{observationResult.totalElements}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Status:</span>
                          <Badge className={observationResult.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {observationResult.status}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-gray-600">Instruction:</span>
                          <span className="ml-2 font-medium">{observationResult.instruction}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Timestamp:</span>
                          <span className="ml-2 font-medium">
                            {new Date(observationResult.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
