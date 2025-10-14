'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Element } from '@/lib/observation-schemas';
import { Copy, ExternalLink, Eye, Code, Info } from 'lucide-react';

interface ElementInspectorProps {
  element: Element;
  onClose?: () => void;
  className?: string;
}

export function ElementInspector({ element, onClose, className }: ElementInspectorProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'attributes' | 'selector'>('details');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

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
                Element Inspector
              </CardTitle>
              <CardDescription>
                Detailed analysis of selected element
              </CardDescription>
            </div>
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Element Overview */}
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">{element.description}</h3>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={getCategoryColor(element.category)}>
                  {element.category}
                </Badge>
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
              {element.text && (
                <p className="text-sm text-gray-600">
                  <strong>Text:</strong> "{element.text}"
                </p>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Info className="h-4 w-4 inline mr-2" />
              Details
            </button>
            <button
              onClick={() => setActiveTab('attributes')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'attributes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Code className="h-4 w-4 inline mr-2" />
              Attributes
            </button>
            <button
              onClick={() => setActiveTab('selector')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'selector'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Code className="h-4 w-4 inline mr-2" />
              Selector
            </button>
          </div>

          {/* Tab Content */}
          <div className="min-h-[200px]">
            {activeTab === 'details' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Category</label>
                    <p className="text-sm">{element.category}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Visibility</label>
                    <p className="text-sm">{element.isVisible ? 'Visible' : 'Hidden'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Interactivity</label>
                    <p className="text-sm">{element.isInteractive ? 'Interactive' : 'Static'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Text Content</label>
                    <p className="text-sm">{element.text || 'No text content'}</p>
                  </div>
                </div>

                {element.position && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-2 block">Position & Dimensions</label>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {element.position.x !== undefined && (
                        <div>
                          <span className="text-gray-600">X:</span>
                          <span className="ml-2">{element.position.x}px</span>
                        </div>
                      )}
                      {element.position.y !== undefined && (
                        <div>
                          <span className="text-gray-600">Y:</span>
                          <span className="ml-2">{element.position.y}px</span>
                        </div>
                      )}
                      {element.position.width !== undefined && (
                        <div>
                          <span className="text-gray-600">Width:</span>
                          <span className="ml-2">{element.position.width}px</span>
                        </div>
                      )}
                      {element.position.height !== undefined && (
                        <div>
                          <span className="text-gray-600">Height:</span>
                          <span className="ml-2">{element.position.height}px</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'attributes' && (
              <div className="space-y-4">
                {element.attributes && Object.keys(element.attributes).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(element.attributes).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="font-mono text-sm font-medium">{key}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">{value}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(value)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No attributes available</p>
                )}
              </div>
            )}

            {activeTab === 'selector' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-2 block">XPath Selector</label>
                  <div className="relative">
                    <ScrollArea className="h-32 w-full border rounded-md p-3 bg-gray-50">
                      <pre className="text-xs font-mono whitespace-pre-wrap">
                        {element.selector}
                      </pre>
                    </ScrollArea>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(element.selector)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(element.selector)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy XPath
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Convert XPath to CSS selector (basic conversion)
                      const cssSelector = element.selector
                        .replace(/\/\//g, ' ')
                        .replace(/\[@([^=]+)="([^"]+)"\]/g, '[$1="$2"]')
                        .replace(/\/\//g, ' ')
                        .trim();
                      copyToClipboard(cssSelector);
                    }}
                  >
                    <Code className="h-4 w-4 mr-2" />
                    Copy CSS
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Simulate clicking the element
                console.log('Simulating click on element:', element.selector);
              }}
              disabled={!element.isInteractive}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Simulate Click
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Highlight element in browser
                console.log('Highlighting element:', element.selector);
              }}
            >
              <Eye className="h-4 w-4 mr-2" />
              Highlight
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
