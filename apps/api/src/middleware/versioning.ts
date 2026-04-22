import { Request, Response, NextFunction } from 'express';

// Supported API versions
export const SUPPORTED_VERSIONS = ['v1', 'v2'] as const;
export const DEFAULT_VERSION = 'v1' as const;

export type ApiVersion = typeof SUPPORTED_VERSIONS[number];

// Extend Express Request to include version
declare global {
  namespace Express {
    interface Request {
      apiVersion?: ApiVersion;
    }
  }
}

/**
 * Extract API version from request
 * Priority: 1. Header (X-API-Version), 2. URL path (/v1/...), 3. Default
 */
export function extractApiVersion(req: Request): ApiVersion {
  // Check header first
  const headerVersion = req.headers['x-api-version'] as string;
  if (headerVersion && SUPPORTED_VERSIONS.includes(headerVersion as ApiVersion)) {
    return headerVersion as ApiVersion;
  }

  // Check URL path
  const pathVersion = req.path.match(/^\/(v\d+)\//)?.[1];
  if (pathVersion && SUPPORTED_VERSIONS.includes(pathVersion as ApiVersion)) {
    return pathVersion as ApiVersion;
  }

  // Return default
  return DEFAULT_VERSION;
}

/**
 * Middleware to add API version to request
 */
export function apiVersioning(req: Request, res: Response, next: NextFunction) {
  const version = extractApiVersion(req);
  req.apiVersion = version;
  
  // Add version to response headers
  res.setHeader('API-Version', version);
  res.setHeader('API-Supported-Versions', SUPPORTED_VERSIONS.join(', '));
  
  next();
}

/**
 * Middleware to validate API version
 */
export function validateApiVersion(versions: ApiVersion[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const version = req.apiVersion || DEFAULT_VERSION;
    
    if (!versions.includes(version)) {
      res.setHeader('API-Version', req.apiVersion || DEFAULT_VERSION);
      res.setHeader('API-Supported-Versions', SUPPORTED_VERSIONS.join(', '));
      return res.status(400).json({
        error: 'Unsupported API Version',
        message: `Version ${version} is not supported for this endpoint`,
        supportedVersions: versions,
      });
    }
    
    next();
  };
}

/**
 * Middleware to deprecate an API version
 */
export function deprecateApiVersion(version: ApiVersion, message?: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.apiVersion === version) {
      res.setHeader('Deprecation', 'true');
      res.setHeader('Sunset', new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toUTCString()); // 6 months
      res.setHeader('Link', `</api/${DEFAULT_VERSION}${req.path}>; rel="successor-version"`);
      res.setHeader('Warning', `299 - "Deprecation: ${version} is deprecated. Use ${DEFAULT_VERSION} instead."`);
    }
    next();
  };
}

/**
 * Create versioned route path
 */
export function versionedPath(path: string, version?: ApiVersion): string {
  const v = version || DEFAULT_VERSION;
  return `/${v}${path}`;
}
