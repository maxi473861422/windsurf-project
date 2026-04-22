import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GSD Atlas API',
      version: '1.0.0',
      description: `
        API for GSD Atlas - Global German Shepherd Dog Database.
        
        ## Authentication
        Most endpoints require authentication using a JWT token. Include the token in the Authorization header:
        
        \`Authorization: Bearer <your-jwt-token>\`
        
        ## Rate Limiting
        The API implements rate limiting to prevent abuse:
        - Standard API: 200 requests per 15 minutes
        - Authentication: 5 requests per 15 minutes
        - Search: 30 requests per minute
        - Import: 10 imports per hour
        
        Rate limit headers are included in responses:
        - \`X-RateLimit-Limit\`: Request limit
        - \`X-RateLimit-Remaining\`: Remaining requests
        - \`X-RateLimit-Reset\`: Reset timestamp
      `,
      contact: {
        name: 'GSD Atlas Support',
        email: 'support@gsdatlas.com',
        url: 'https://gsdatlas.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
      {
        url: 'https://staging-api.gsdatlas.com',
        description: 'Staging server',
      },
      {
        url: 'https://api.gsdatlas.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from authentication endpoint',
        },
      },
      schemas: {
        Dog: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            name: {
              type: 'string',
              description: 'Dog name',
              example: 'Max von Haus',
            },
            registrationNumber: {
              type: 'string',
              description: 'Official registration number',
              example: 'SZ 123456',
            },
            sex: {
              type: 'string',
              enum: ['MALE', 'FEMALE'],
              description: 'Dog sex',
            },
            birthDate: {
              type: 'string',
              format: 'date',
              description: 'Birth date',
              example: '2020-01-15',
            },
            color: {
              type: 'string',
              description: 'Dog color',
              example: 'Black and Tan',
            },
            countryCode: {
              type: 'string',
              description: 'Country code',
              example: 'DE',
            },
            isAlive: {
              type: 'boolean',
              description: 'Whether the dog is alive',
              example: true,
            },
            coi5Gen: {
              type: 'number',
              description: 'COI 5 generations',
              example: 0.125,
            },
            coi10Gen: {
              type: 'number',
              description: 'COI 10 generations',
              example: 0.25,
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
              example: 'Dog not found',
            },
            code: {
              type: 'string',
              description: 'Error code',
              example: 'NOT_FOUND',
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total: {
              type: 'integer',
              description: 'Total number of items',
              example: 1000,
            },
            limit: {
              type: 'integer',
              description: 'Items per page',
              example: 20,
            },
            offset: {
              type: 'integer',
              description: 'Number of items skipped',
              example: 0,
            },
            hasMore: {
              type: 'boolean',
              description: 'Whether there are more items',
              example: true,
            },
            nextCursor: {
              type: 'string',
              description: 'Cursor for next page (if using cursor pagination)',
              example: 'eyJpZCI6IjEyMyIsImNyZWF0ZWRBdCI6IjIwMjQtMDEtMDEifQ==',
              nullable: true,
            },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/Dog' },
            },
            pagination: {
              $ref: '#/components/schemas/Pagination',
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/routes/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
