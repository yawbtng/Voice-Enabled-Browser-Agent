import { z } from 'zod';

/**
 * Predefined Zod schemas for common data extraction patterns
 * These schemas provide structured validation for extracted data
 */

// Article/Blog Post Schema
export const ArticleSchema = z.object({
  title: z.string().describe('The main title of the article'),
  content: z.string().describe('The main content/body of the article'),
  author: z.string().optional().describe('The author of the article'),
  publishDate: z.string().optional().describe('Publication date'),
  url: z.string().optional().describe('URL of the article'),
  tags: z.array(z.string()).optional().describe('Tags or categories'),
  summary: z.string().optional().describe('Article summary or excerpt'),
  wordCount: z.number().optional().describe('Approximate word count'),
});

export type Article = z.infer<typeof ArticleSchema>;

// Product/E-commerce Schema
export const ProductSchema = z.object({
  name: z.string().describe('Product name'),
  price: z.string().describe('Product price'),
  description: z.string().optional().describe('Product description'),
  image: z.string().optional().describe('Product image URL'),
  availability: z.string().optional().describe('Stock availability'),
  rating: z.number().optional().describe('Product rating'),
  reviews: z.array(z.object({
    text: z.string().describe('Review text'),
    rating: z.number().describe('Review rating'),
    author: z.string().optional().describe('Review author'),
    date: z.string().optional().describe('Review date'),
  })).optional().describe('Product reviews'),
  specifications: z.record(z.string()).optional().describe('Product specifications'),
  category: z.string().optional().describe('Product category'),
});

export type Product = z.infer<typeof ProductSchema>;

// Table/Data Grid Schema
export const TableSchema = z.object({
  headers: z.array(z.string()).describe('Table column headers'),
  rows: z.array(z.array(z.string())).describe('Table data rows'),
  title: z.string().optional().describe('Table title or caption'),
  summary: z.string().optional().describe('Table summary'),
});

export type Table = z.infer<typeof TableSchema>;

// Form Schema
export const FormSchema = z.object({
  title: z.string().optional().describe('Form title'),
  fields: z.array(z.object({
    name: z.string().describe('Field name'),
    type: z.string().describe('Field type (text, email, password, etc.)'),
    label: z.string().optional().describe('Field label'),
    placeholder: z.string().optional().describe('Field placeholder'),
    required: z.boolean().optional().describe('Whether field is required'),
  })).describe('Form fields'),
  submitButton: z.string().optional().describe('Submit button text'),
});

export type Form = z.infer<typeof FormSchema>;

// Contact Information Schema
export const ContactSchema = z.object({
  name: z.string().optional().describe('Contact name'),
  email: z.string().optional().describe('Email address'),
  phone: z.string().optional().describe('Phone number'),
  address: z.string().optional().describe('Physical address'),
  website: z.string().optional().describe('Website URL'),
  socialMedia: z.array(z.object({
    platform: z.string().describe('Social media platform'),
    url: z.string().describe('Social media URL'),
  })).optional().describe('Social media links'),
});

export type Contact = z.infer<typeof ContactSchema>;

// Job Listing Schema
export const JobListingSchema = z.object({
  title: z.string().describe('Job title'),
  company: z.string().describe('Company name'),
  location: z.string().optional().describe('Job location'),
  description: z.string().describe('Job description'),
  requirements: z.array(z.string()).optional().describe('Job requirements'),
  salary: z.string().optional().describe('Salary information'),
  type: z.string().optional().describe('Job type (full-time, part-time, etc.)'),
  postedDate: z.string().optional().describe('Date posted'),
  applicationUrl: z.string().optional().describe('Application URL'),
});

export type JobListing = z.infer<typeof JobListingSchema>;

// Event Schema
export const EventSchema = z.object({
  title: z.string().describe('Event title'),
  date: z.string().optional().describe('Event date'),
  time: z.string().optional().describe('Event time'),
  location: z.string().optional().describe('Event location'),
  description: z.string().optional().describe('Event description'),
  organizer: z.string().optional().describe('Event organizer'),
  price: z.string().optional().describe('Event price'),
  url: z.string().optional().describe('Event URL'),
});

export type Event = z.infer<typeof EventSchema>;

// Generic List Schema
export const ListSchema = z.object({
  title: z.string().optional().describe('List title'),
  items: z.array(z.string()).describe('List items'),
  description: z.string().optional().describe('List description'),
});

export type List = z.infer<typeof ListSchema>;

// Schema Registry for easy access
export const EXTRACTION_SCHEMAS = {
  article: ArticleSchema,
  product: ProductSchema,
  table: TableSchema,
  form: FormSchema,
  contact: ContactSchema,
  job: JobListingSchema,
  event: EventSchema,
  list: ListSchema,
} as const;

export type SchemaType = keyof typeof EXTRACTION_SCHEMAS;

// Utility function to get schema by type
export function getSchema(type: SchemaType) {
  return EXTRACTION_SCHEMAS[type];
}

// Utility function to validate data against schema
export function validateExtractionData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

// Schema metadata for UI display
export const SCHEMA_METADATA = {
  article: {
    name: 'Article',
    description: 'Extract article content, title, author, and metadata',
    icon: '📄',
  },
  product: {
    name: 'Product',
    description: 'Extract product information, price, reviews, and specifications',
    icon: '🛍️',
  },
  table: {
    name: 'Table',
    description: 'Extract tabular data with headers and rows',
    icon: '📊',
  },
  form: {
    name: 'Form',
    description: 'Extract form fields, labels, and structure',
    icon: '📝',
  },
  contact: {
    name: 'Contact',
    description: 'Extract contact information and social media links',
    icon: '👤',
  },
  job: {
    name: 'Job Listing',
    description: 'Extract job postings with requirements and details',
    icon: '💼',
  },
  event: {
    name: 'Event',
    description: 'Extract event details, date, location, and information',
    icon: '📅',
  },
  list: {
    name: 'List',
    description: 'Extract simple lists and bullet points',
    icon: '📋',
  },
} as const;
