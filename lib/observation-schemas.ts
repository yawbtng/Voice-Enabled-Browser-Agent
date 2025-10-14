import { z } from 'zod';

// Base Element Schema
export const ElementSchema = z.object({
  selector: z.string().describe('XPath selector for the element'),
  description: z.string().describe('Human-readable description of the element'),
  category: z.enum([
    'button',
    'input',
    'link',
    'image',
    'text',
    'container',
    'form',
    'navigation',
    'table',
    'list',
    'modal',
    'dropdown',
    'checkbox',
    'radio',
    'textarea',
    'select',
    'video',
    'audio',
    'iframe',
    'other'
  ]).describe('Category of the element'),
  attributes: z.record(z.string()).optional().describe('Element attributes'),
  text: z.string().optional().describe('Text content of the element'),
  isVisible: z.boolean().default(true).describe('Whether the element is visible'),
  isInteractive: z.boolean().default(false).describe('Whether the element is interactive'),
  position: z.object({
    x: z.number().optional(),
    y: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  }).optional().describe('Element position and dimensions'),
});

export type Element = z.infer<typeof ElementSchema>;

// Button Element Schema
export const ButtonElementSchema = ElementSchema.extend({
  category: z.literal('button'),
  text: z.string().optional().describe('Button text'),
  isEnabled: z.boolean().default(true).describe('Whether the button is enabled'),
  buttonType: z.enum(['submit', 'button', 'reset']).optional().describe('Button type'),
});

export type ButtonElement = z.infer<typeof ButtonElementSchema>;

// Input Element Schema
export const InputElementSchema = ElementSchema.extend({
  category: z.literal('input'),
  inputType: z.enum([
    'text',
    'email',
    'password',
    'number',
    'tel',
    'url',
    'search',
    'date',
    'time',
    'datetime-local',
    'month',
    'week',
    'color',
    'file',
    'hidden',
    'checkbox',
    'radio',
    'range',
    'submit',
    'reset',
    'button'
  ]).describe('Input type'),
  placeholder: z.string().optional().describe('Input placeholder text'),
  isRequired: z.boolean().default(false).describe('Whether the input is required'),
  isDisabled: z.boolean().default(false).describe('Whether the input is disabled'),
  value: z.string().optional().describe('Current input value'),
});

export type InputElement = z.infer<typeof InputElementSchema>;

// Link Element Schema
export const LinkElementSchema = ElementSchema.extend({
  category: z.literal('link'),
  text: z.string().optional().describe('Link text'),
  href: z.string().optional().describe('Link URL'),
  target: z.enum(['_self', '_blank', '_parent', '_top']).optional().describe('Link target'),
  isExternal: z.boolean().default(false).describe('Whether the link is external'),
});

export type LinkElement = z.infer<typeof LinkElementSchema>;

// Form Element Schema
export const FormElementSchema = ElementSchema.extend({
  category: z.literal('form'),
  action: z.string().optional().describe('Form action URL'),
  method: z.enum(['get', 'post', 'put', 'delete']).optional().describe('Form method'),
  inputs: z.array(InputElementSchema).optional().describe('Form inputs'),
  buttons: z.array(ButtonElementSchema).optional().describe('Form buttons'),
});

export type FormElement = z.infer<typeof FormElementSchema>;

// Navigation Element Schema
export const NavigationElementSchema = ElementSchema.extend({
  category: z.literal('navigation'),
  links: z.array(LinkElementSchema).optional().describe('Navigation links'),
  isMainNavigation: z.boolean().default(false).describe('Whether this is the main navigation'),
});

export type NavigationElement = z.infer<typeof NavigationElementSchema>;

// Table Element Schema
export const TableElementSchema = ElementSchema.extend({
  category: z.literal('table'),
  headers: z.array(z.string()).optional().describe('Table headers'),
  rows: z.array(z.array(z.string())).optional().describe('Table rows'),
  rowCount: z.number().optional().describe('Number of rows'),
  columnCount: z.number().optional().describe('Number of columns'),
});

export type TableElement = z.infer<typeof TableElementSchema>;

// Image Element Schema
export const ImageElementSchema = ElementSchema.extend({
  category: z.literal('image'),
  src: z.string().optional().describe('Image source URL'),
  alt: z.string().optional().describe('Image alt text'),
  width: z.number().optional().describe('Image width'),
  height: z.number().optional().describe('Image height'),
});

export type ImageElement = z.infer<typeof ImageElementSchema>;

// Modal Element Schema
export const ModalElementSchema = ElementSchema.extend({
  category: z.literal('modal'),
  title: z.string().optional().describe('Modal title'),
  isOpen: z.boolean().default(false).describe('Whether the modal is open'),
  hasCloseButton: z.boolean().default(false).describe('Whether the modal has a close button'),
});

export type ModalElement = z.infer<typeof ModalElementSchema>;

// Page Structure Schema
export const PageStructureSchema = z.object({
  title: z.string().optional().describe('Page title'),
  url: z.string().describe('Page URL'),
  elements: z.array(ElementSchema).describe('All observed elements'),
  sections: z.array(z.object({
    name: z.string().describe('Section name'),
    elements: z.array(z.string()).describe('Element selectors in this section'),
    description: z.string().optional().describe('Section description'),
  })).optional().describe('Page sections'),
  forms: z.array(FormElementSchema).optional().describe('Page forms'),
  navigation: z.array(NavigationElementSchema).optional().describe('Page navigation'),
  interactiveElements: z.object({
    buttons: z.array(ButtonElementSchema).optional(),
    inputs: z.array(InputElementSchema).optional(),
    links: z.array(LinkElementSchema).optional(),
  }).optional().describe('Interactive elements grouped by type'),
});

export type PageStructure = z.infer<typeof PageStructureSchema>;

// Interactive Elements Schema
export const InteractiveElementsSchema = z.object({
  buttons: z.array(ButtonElementSchema).optional().describe('All buttons on the page'),
  inputs: z.array(InputElementSchema).optional().describe('All inputs on the page'),
  links: z.array(LinkElementSchema).optional().describe('All links on the page'),
  forms: z.array(FormElementSchema).optional().describe('All forms on the page'),
  totalCount: z.number().describe('Total number of interactive elements'),
});

export type InteractiveElements = z.infer<typeof InteractiveElementsSchema>;

// Observation Request Schema
export const ObservationRequestSchema = z.object({
  instruction: z.string().describe('Natural language instruction for observation'),
  filters: z.object({
    categories: z.array(z.string()).optional().describe('Element categories to include'),
    isVisible: z.boolean().optional().describe('Filter by visibility'),
    isInteractive: z.boolean().optional().describe('Filter by interactivity'),
  }).optional().describe('Filters to apply to observation'),
  searchQuery: z.string().optional().describe('Search query for semantic matching'),
  maxElements: z.number().min(1).max(1000).default(100).describe('Maximum number of elements to return'),
});

export type ObservationRequest = z.infer<typeof ObservationRequestSchema>;

// Observation Result Schema
export const ObservationResultSchema = z.object({
  id: z.string().describe('Unique observation ID'),
  instruction: z.string().describe('Original instruction'),
  elements: z.array(ElementSchema).describe('Observed elements'),
  categories: z.record(z.number()).describe('Element count by category'),
  totalElements: z.number().describe('Total number of elements found'),
  status: z.enum(['success', 'failed']).describe('Observation status'),
  timestamp: z.number().describe('Observation timestamp'),
  error: z.string().optional().describe('Error message if failed'),
  retryCount: z.number().default(0).describe('Number of retries attempted'),
  confidence: z.number().min(0).max(1).optional().describe('Confidence score'),
});

export type ObservationResult = z.infer<typeof ObservationResultSchema>;

// Element Search Result Schema
export const ElementSearchResultSchema = z.object({
  query: z.string().describe('Search query'),
  results: z.array(ElementSchema).describe('Matching elements'),
  totalResults: z.number().describe('Total number of results'),
  categories: z.record(z.number()).describe('Result count by category'),
});

export type ElementSearchResult = z.infer<typeof ElementSearchResultSchema>;

// Predefined Observation Schemas
export const OBSERVATION_SCHEMAS = {
  element: ElementSchema,
  button: ButtonElementSchema,
  input: InputElementSchema,
  link: LinkElementSchema,
  form: FormElementSchema,
  navigation: NavigationElementSchema,
  table: TableElementSchema,
  image: ImageElementSchema,
  modal: ModalElementSchema,
  pageStructure: PageStructureSchema,
  interactiveElements: InteractiveElementsSchema,
  observationRequest: ObservationRequestSchema,
  observationResult: ObservationResultSchema,
  elementSearchResult: ElementSearchResultSchema,
} as const;

// Element Category Mapping
export const ELEMENT_CATEGORIES = {
  button: ['button', 'btn', 'submit', 'click'],
  input: ['input', 'textbox', 'field', 'form'],
  link: ['link', 'anchor', 'href', 'url'],
  image: ['image', 'img', 'picture', 'photo'],
  text: ['text', 'paragraph', 'heading', 'title'],
  container: ['container', 'div', 'section', 'article'],
  form: ['form', 'form-group', 'form-container'],
  navigation: ['nav', 'navigation', 'menu', 'navbar'],
  table: ['table', 'grid', 'data-table'],
  list: ['list', 'ul', 'ol', 'li'],
  modal: ['modal', 'dialog', 'popup', 'overlay'],
  dropdown: ['dropdown', 'select', 'menu'],
  checkbox: ['checkbox', 'check', 'tick'],
  radio: ['radio', 'option', 'choice'],
  textarea: ['textarea', 'text-area', 'multiline'],
  select: ['select', 'dropdown', 'option'],
  video: ['video', 'player', 'media'],
  audio: ['audio', 'sound', 'player'],
  iframe: ['iframe', 'embed', 'frame'],
  other: ['other', 'unknown', 'misc'],
} as const;

// Helper function to categorize element by description
export function categorizeElementByDescription(description: string): Element['category'] {
  const lowerDesc = description.toLowerCase();
  
  for (const [category, keywords] of Object.entries(ELEMENT_CATEGORIES)) {
    if (keywords.some(keyword => lowerDesc.includes(keyword))) {
      return category as Element['category'];
    }
  }
  
  return 'other';
}

// Helper function to determine if element is interactive
export function isElementInteractive(category: string): boolean {
  const interactiveCategories = [
    'button', 'input', 'link', 'form', 'checkbox', 'radio', 
    'textarea', 'select', 'dropdown', 'modal'
  ];
  
  return interactiveCategories.includes(category);
}
