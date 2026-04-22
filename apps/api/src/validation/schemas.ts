import { z } from 'zod';

// ISO 3166-1 alpha-2 country codes (valid codes)
const VALID_COUNTRY_CODES = new Set([
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ',
  'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY', 'BZ',
  'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ',
  'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET',
  'FI', 'FJ', 'FK', 'FM', 'FO', 'FR',
  'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY',
  'HK', 'HM', 'HN', 'HR', 'HT', 'HU',
  'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT',
  'JE', 'JM', 'JO', 'JP',
  'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ',
  'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY',
  'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ',
  'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ',
  'OM',
  'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY',
  'QA',
  'RE', 'RO', 'RS', 'RU', 'RW',
  'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ',
  'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ',
  'UA', 'UG', 'UM', 'US', 'UY', 'UZ',
  'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU',
  'WF', 'WS',
  'YE', 'YT',
  'ZA', 'ZM', 'ZW',
]);

// Common schemas
const uuidSchema = z.string().uuid();

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)');

const countryCodeSchema = z
  .string()
  .length(2)
  .toUpperCase()
  .refine((code) => VALID_COUNTRY_CODES.has(code), {
    message: 'Invalid ISO 3166-1 alpha-2 country code',
  });

const urlSchema = z.string().url('Invalid URL format').refine(
  (url) => {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  },
  { message: 'URL must use HTTP or HTTPS protocol' }
);

const phoneSchema = z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone number format').refine(
  (phone) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  },
  { message: 'Phone number must be between 10 and 15 digits' }
);

const emailSchema = z
  .string()
  .email('Invalid email address')
  .min(1, 'Email is required')
  .max(255, 'Email must be less than 255 characters')
  .toLowerCase()
  .trim()
  .refine(
    (email) => {
      // Additional validation to prevent common disposable email domains
      const disposableDomains = [
        'tempmail.com', 'throwaway.com', 'guerrillamail.com', 'mailinator.com',
        '10minutemail.com', 'yopmail.com', 'trashmail.com',
      ];
      const domain = email.split('@')[1]?.toLowerCase();
      return !disposableDomains.includes(domain);
    },
    { message: 'Disposable email addresses are not allowed' }
  );

// Sanitization helpers
export const sanitizeString = (value: string): string => {
  return value.trim().replace(/\s+/g, ' ');
};

export const sanitizeHtml = (value: string): string => {
  // Basic HTML sanitization - remove script tags and dangerous attributes
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '');
};

// Sanitization middleware for Zod
export const sanitizeSchema = z.string().transform((value) => sanitizeString(value));

// Dog schemas
export const createDogSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  registrationNumber: z
    .string()
    .min(1, 'Registration number is required')
    .max(50, 'Registration number must be less than 50 characters')
    .trim()
    .optional(),
  sex: z.enum(['MALE', 'FEMALE'], {
    errorMap: () => ({ message: 'Sex must be MALE or FEMALE' }),
  }),
  birthDate: dateSchema.optional(),
  color: z
    .string()
    .min(1, 'Color is required')
    .max(100, 'Color must be less than 100 characters')
    .trim()
    .optional(),
  countryCode: countryCodeSchema.optional(),
  isAlive: z.boolean().optional(),
  sireId: uuidSchema.optional().nullable(),
  damId: uuidSchema.optional().nullable(),
  breederId: uuidSchema.optional().nullable(),
  organizationId: uuidSchema.optional().nullable(),
});

export const updateDogSchema = createDogSchema.partial();

export const dogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z
    .enum(['name', 'birthDate', 'registrationNumber', 'createdAt'])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  sex: z.enum(['MALE', 'FEMALE']).optional(),
  color: z.string().optional(),
  countryCode: countryCodeSchema.optional(),
  isAlive: z.coerce.boolean().optional(),
  search: z.string().min(1).max(100).optional(),
});

// User schemas
export const createUserSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .trim(),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .trim(),
  role: z.enum(['USER', 'BREEDER', 'ADMIN']).default('USER'),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .min(1, 'Email is required')
    .toLowerCase()
    .trim(),
  password: z.string().min(1, 'Password is required'),
});

export const updateUserSchema = createUserSchema
  .partial()
  .extend({
    email: z
      .string()
      .email('Invalid email address')
      .max(255, 'Email must be less than 255 characters')
      .toLowerCase()
      .trim()
      .optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password must be less than 100 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .optional(),
  });

// Breeder schemas
export const createBreederSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Name must be less than 200 characters')
    .trim(),
  kennelName: z
    .string()
    .min(1, 'Kennel name is required')
    .max(100, 'Kennel name must be less than 100 characters')
    .trim()
    .optional(),
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase()
    .trim()
    .optional(),
  phone: z
    .string()
    .min(10, 'Phone must be at least 10 characters')
    .max(20, 'Phone must be less than 20 characters')
    .optional(),
  address: z
    .string()
    .max(500, 'Address must be less than 500 characters')
    .trim()
    .optional(),
  city: z.string().max(100, 'City must be less than 100 characters').trim().optional(),
  countryCode: countryCodeSchema.optional(),
  website: z
    .string()
    .url('Invalid website URL')
    .max(255, 'Website must be less than 255 characters')
    .optional(),
  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .trim()
    .optional(),
});

export const updateBreederSchema = createBreederSchema.partial();

// Organization schemas
export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Name must be less than 200 characters')
    .trim(),
  type: z.enum(['CLUB', 'REGISTRY', 'ASSOCIATION', 'OTHER'], {
    errorMap: () => ({ message: 'Invalid organization type' }),
  }),
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase()
    .trim()
    .optional(),
  phone: z
    .string()
    .min(10, 'Phone must be at least 10 characters')
    .max(20, 'Phone must be less than 20 characters')
    .optional(),
  address: z
    .string()
    .max(500, 'Address must be less than 500 characters')
    .trim()
    .optional(),
  countryCode: countryCodeSchema.optional(),
  website: z
    .string()
    .url('Invalid website URL')
    .max(255, 'Website must be less than 255 characters')
    .optional(),
  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .trim()
    .optional(),
});

export const updateOrganizationSchema = createOrganizationSchema.partial();

// Breeding schemas
export const createBreedingSchema = z.object({
  sireId: uuidSchema,
  damId: uuidSchema,
  breedingDate: dateSchema.optional(),
  expectedBirthDate: dateSchema.optional(),
  notes: z
    .string()
    .max(2000, 'Notes must be less than 2000 characters')
    .trim()
    .optional(),
});

export const updateBreedingSchema = createBreedingSchema.partial();

// Health Record schemas
export const createHealthRecordSchema = z.object({
  dogId: uuidSchema,
  type: z.enum(['DNA_TEST', 'HIP_DYSPLASIA', 'ELBOW_DYSPLASIA', 'EYE_EXAM', 'OTHER'], {
    errorMap: () => ({ message: 'Invalid health record type' }),
  }),
  testName: z
    .string()
    .min(1, 'Test name is required')
    .max(100, 'Test name must be less than 100 characters')
    .trim(),
  testDate: dateSchema,
  result: z
    .string()
    .min(1, 'Result is required')
    .max(100, 'Result must be less than 100 characters')
    .trim(),
  laboratory: z
    .string()
    .max(100, 'Laboratory must be less than 100 characters')
    .trim()
    .optional(),
  certificateUrl: z
    .string()
    .url('Invalid certificate URL')
    .max(255, 'Certificate URL must be less than 255 characters')
    .optional(),
  notes: z
    .string()
    .max(2000, 'Notes must be less than 2000 characters')
    .trim()
    .optional(),
});

export const updateHealthRecordSchema = createHealthRecordSchema.partial();

// Show Result schemas
export const createShowResultSchema = z.object({
  dogId: uuidSchema,
  showName: z
    .string()
    .min(1, 'Show name is required')
    .max(200, 'Show name must be less than 200 characters')
    .trim(),
  showDate: dateSchema,
  organizationId: uuidSchema.optional(),
  class: z
    .string()
    .max(100, 'Class must be less than 100 characters')
    .trim()
    .optional(),
  placement: z.coerce.number().int().min(1).optional(),
  title: z.string().max(100, 'Title must be less than 100 characters').trim().optional(),
  judge: z.string().max(100, 'Judge must be less than 100 characters').trim().optional(),
  notes: z
    .string()
    .max(2000, 'Notes must be less than 2000 characters')
    .trim()
    .optional(),
});

export const updateShowResultSchema = createShowResultSchema.partial();

// Photo schemas
export const uploadPhotoSchema = z.object({
  dogId: uuidSchema,
  isPrimary: z.boolean().default(false),
  caption: z
    .string()
    .max(200, 'Caption must be less than 200 characters')
    .trim()
    .optional(),
});

// Search schemas
export const searchSchema = z.object({
  query: z
    .string()
    .min(1, 'Search query is required')
    .max(100, 'Search query must be less than 100 characters')
    .trim(),
  type: z.enum(['dogs', 'breeders', 'organizations']).default('dogs'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// Pedigree schemas
export const pedigreeQuerySchema = z.object({
  generations: z.coerce.number().int().min(1).max(10).default(5),
  format: z.enum(['html', 'json', 'tree']).default('html'),
});

// COI schemas
export const coiQuerySchema = z.object({
  generations: z.coerce.number().int().min(1).max(10).default(5),
});

// Breeding simulator schemas
export const breedingSimulatorSchema = z.object({
  sireId: uuidSchema,
  damId: uuidSchema,
});

// Import schemas
export const importSchema = z.object({
  dataSourceId: uuidSchema,
  fileType: z.enum(['CSV', 'EXCEL'], {
    errorMap: () => ({ message: 'File type must be CSV or EXCEL' }),
  }),
  skipDuplicates: z.boolean().default(false),
  fuzzyMatch: z.boolean().default(true),
});

// Pagination schemas
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  cursor: z.string().optional(),
});

// Export types
export type CreateDogInput = z.infer<typeof createDogSchema>;
export type UpdateDogInput = z.infer<typeof updateDogSchema>;
export type DogQueryInput = z.infer<typeof dogQuerySchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateBreederInput = z.infer<typeof createBreederSchema>;
export type UpdateBreederInput = z.infer<typeof updateBreederSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type CreateBreedingInput = z.infer<typeof createBreedingSchema>;
export type UpdateBreedingInput = z.infer<typeof updateBreedingSchema>;
export type CreateHealthRecordInput = z.infer<typeof createHealthRecordSchema>;
export type UpdateHealthRecordInput = z.infer<typeof updateHealthRecordSchema>;
export type CreateShowResultInput = z.infer<typeof createShowResultSchema>;
export type UpdateShowResultInput = z.infer<typeof updateShowResultSchema>;
export type UploadPhotoInput = z.infer<typeof uploadPhotoSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type PedigreeQueryInput = z.infer<typeof pedigreeQuerySchema>;
export type CoiQueryInput = z.infer<typeof coiQuerySchema>;
export type BreedingSimulatorInput = z.infer<typeof breedingSimulatorSchema>;
export type ImportInput = z.infer<typeof importSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
