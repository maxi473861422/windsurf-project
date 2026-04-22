import { prisma } from '../index';
import { redisClient } from '../index';
import ExcelJS from 'exceljs';
import csv from 'csv-parser';
import { Readable } from 'stream';

/**
 * Sistema Modular de Importación de Datos para GSD Atlas
 * 
 * Características:
 * 1. Importación manual (formularios)
 * 2. Importación CSV
 * 3. Importación Excel
 * 4. Sistema adaptable para scraping estructurado
 * 5. Registro de fuente de cada dato
 * 6. Sistema para evitar duplicados inteligentes (comparación difusa)
 * 7. Normalización automática de nombres
 */

// Tipos de fuentes de datos
export enum DataSourceType {
  MANUAL = 'MANUAL',
  CSV = 'CSV',
  EXCEL = 'EXCEL',
  API = 'API',
  SCRAPING = 'SCRAPING',
  MIGRATION = 'MIGRATION',
}

// Resultado de comparación difusa
export interface FuzzyMatch {
  dogId: string;
  score: number;
  matchedFields: string[];
  confidence: 'high' | 'medium' | 'low';
}

// Resultado de importación
export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
  duplicates: Array<{ row: number; existingId: string; score: number }>;
}

// Datos normalizados de perro
export interface NormalizedDogData {
  name: string;
  registrationNumber?: string;
  chipNumber?: string;
  sex: 'MALE' | 'FEMALE';
  birthDate?: Date;
  color?: string;
  country?: string;
  sireName?: string;
  sireRegistrationNumber?: string;
  damName?: string;
  damRegistrationNumber?: string;
  breederName?: string;
  breederKennel?: string;
  healthRecords?: any[];
  titles?: any[];
  source: DataSourceType;
  sourceUrl?: string;
  sourceId?: string;
}

/**
 * Servicio de Normalización de Nombres
 * Utiliza varias técnicas para normalizar nombres de perros
 */
export class NameNormalizer {
  private static readonly COMMON_PREFIXES = [
    'von', 'vom', 'aus', 'von der', 'vom', 'im', 'in der', 'am', 'an der'
  ];

  private static readonly TITLE_PREFIXES = [
    'VDH', 'ADRK', 'SV', 'AKC', 'KC', 'CKC', 'FCI'
  ];

  /**
   * Normaliza un nombre de perro
   */
  static normalize(name: string): string {
    if (!name) return '';

    let normalized = name
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-']/g, '');

    // Remover títulos prefijos
    for (const prefix of this.TITLE_PREFIXES) {
      normalized = normalized.replace(new RegExp(`^${prefix}\\s*`, ''), '');
    }

    return normalized.trim();
  }

  /**
   * Extrae el nombre base (sin prefijos de kennel)
   */
  static extractBaseName(name: string): string {
    const normalized = this.normalize(name);
    const parts = normalized.split(' ');

    // Si el nombre tiene prefijo de kennel, extraer el nombre base
    for (let i = 0; i < parts.length; i++) {
      if (this.COMMON_PREFIXES.includes(parts[i].toLowerCase())) {
        return parts.slice(i + 1).join(' ');
      }
    }

    return normalized;
  }

  /**
   * Compara dos nombres usando similitud de Jaro-Winkler
   */
  static compareNames(name1: string, name2: string): number {
    const norm1 = this.normalize(name1);
    const norm2 = this.normalize(name2);

    return this.jaroWinkler(norm1, norm2);
  }

  /**
   * Algoritmo Jaro-Winkler para comparación de strings
   */
  private static jaroWinkler(s1: string, s2: string): number {
    if (s1 === s2) return 1;

    const len1 = s1.length;
    const len2 = s2.length;

    if (len1 === 0 || len2 === 0) return 0;

    const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;
    const s1Matches = new Array(len1).fill(false);
    const s2Matches = new Array(len2).fill(false);

    let matches = 0;
    let transpositions = 0;

    for (let i = 0; i < len1; i++) {
      const start = Math.max(0, i - matchDistance);
      const end = Math.min(i + matchDistance + 1, len2);

      for (let j = start; j < end; j++) {
        if (s2Matches[j] || s1[i] !== s2[j]) continue;
        s1Matches[i] = true;
        s2Matches[j] = true;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0;

    let k = 0;
    for (let i = 0; i < len1; i++) {
      if (!s1Matches[i]) continue;
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }

    const jaro = (
      matches / len1 +
      matches / len2 +
      (matches - transpositions / 2) / matches
    ) / 3;

    // Ajuste de Winkler para prefijos comunes
    let prefix = 0;
    for (let i = 0; i < Math.min(len1, len2, 4); i++) {
      if (s1[i] === s2[i]) prefix++;
      else break;
    }

    return jaro + prefix * 0.1 * (1 - jaro);
  }
}

/**
 * Servicio de Detección de Duplicados
 * Usa comparación difusa para identificar posibles duplicados
 */
export class DuplicateDetector {
  private static readonly SIMILARITY_THRESHOLD = 0.85;
  private static readonly REGISTRATION_WEIGHT = 0.4;
  private static readonly NAME_WEIGHT = 0.3;
  private static readonly BIRTHDATE_WEIGHT = 0.2;
  private static readonly BREEDER_WEIGHT = 0.1;

  /**
   * Busca duplicados para un perro
   */
  static async findDuplicates(data: NormalizedDogData): Promise<FuzzyMatch[]> {
    const matches: FuzzyMatch[] = [];

    // Búsqueda por número de registro exacto
    if (data.registrationNumber) {
      const exactMatches = await prisma.dog.findMany({
        where: {
          registrationNumber: data.registrationNumber,
          deletedAt: null,
        },
        select: { id: true, name: true, registrationNumber: true, birthDate: true },
      });

      for (const match of exactMatches) {
        matches.push({
          dogId: match.id,
          score: 1.0,
          matchedFields: ['registrationNumber'],
          confidence: 'high',
        });
      }
    }

    // Búsqueda por nombre similar
    const similarNameThreshold = this.SIMILARITY_THRESHOLD;
    const allDogs = await prisma.dog.findMany({
      where: {
        sex: data.sex,
        deletedAt: null,
      },
      select: { id: true, name: true, registrationNumber: true, birthDate: true, breeder: true },
      take: 100, // Limitar para rendimiento
    });

    for (const dog of allDogs) {
      const nameSimilarity = NameNormalizer.compareNames(data.name, dog.name);

      if (nameSimilarity >= similarNameThreshold) {
        const score = this.calculateOverallScore(data, dog, nameSimilarity);
        
        if (score >= 0.7) {
          const matchedFields = ['name'];
          if (data.birthDate && dog.birthDate) {
            const dateDiff = Math.abs(data.birthDate.getTime() - dog.birthDate.getTime());
            if (dateDiff < 86400000) { // 1 día
              matchedFields.push('birthDate');
            }
          }

          matches.push({
            dogId: dog.id,
            score,
            matchedFields,
            confidence: score >= 0.9 ? 'high' : score >= 0.8 ? 'medium' : 'low',
          });
        }
      }
    }

    // Ordenar por score y eliminar duplicados
    const uniqueMatches = matches
      .sort((a, b) => b.score - a.score)
      .filter((match, index, self) => 
        index === self.findIndex(m => m.dogId === match.dogId)
      )
      .slice(0, 10); // Top 10 matches

    return uniqueMatches;
  }

  /**
   * Calcula score general de similitud
   */
  private static calculateOverallScore(
    data: NormalizedDogData,
    existing: any,
    nameSimilarity: number
  ): number {
    let score = 0;

    // Nombre
    score += nameSimilarity * this.NAME_WEIGHT;

    // Número de registro
    if (data.registrationNumber && existing.registrationNumber) {
      const regSimilarity = NameNormalizer.compareNames(
        data.registrationNumber,
        existing.registrationNumber
      );
      score += regSimilarity * this.REGISTRATION_WEIGHT;
    }

    // Fecha de nacimiento
    if (data.birthDate && existing.birthDate) {
      const dateDiff = Math.abs(data.birthDate.getTime() - existing.birthDate.getTime());
      const daysDiff = dateDiff / 86400000;
      if (daysDiff <= 1) {
        score += 1 * this.BIRTHDATE_WEIGHT;
      } else if (daysDiff <= 7) {
        score += 0.8 * this.BIRTHDATE_WEIGHT;
      } else if (daysDiff <= 30) {
        score += 0.5 * this.BIRTHDATE_WEIGHT;
      }
    }

    // Criador
    if (data.breederName && existing.breeder) {
      const breederSimilarity = NameNormalizer.compareNames(
        data.breederName,
        existing.breeder.kennelName || existing.breeder.legalName || ''
      );
      score += breederSimilarity * this.BREEDER_WEIGHT;
    }

    return Math.min(score, 1);
  }
}

/**
 * Servicio de Importación de Datos
 * Orquesta todo el proceso de importación
 */
export class ImportService {
  /**
   * Importa datos desde un archivo CSV
   */
  static async importFromCSV(
    file: Buffer,
    source: DataSourceType.CSV,
    options: {
      skipDuplicates?: boolean;
      updateExisting?: boolean;
      batchSize?: number;
    } = {}
  ): Promise<ImportResult> {
    const result: ImportResult = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      duplicates: [],
    };

    const { skipDuplicates = true, updateExisting = false, batchSize = 100 } = options;

    try {
      const records = await this.parseCSV(file);
      
      for (let i = 0; i < records.length; i++) {
        try {
          const normalizedData = this.normalizeRecord(records[i], source);
          
          // Verificar duplicados
          if (skipDuplicates) {
            const duplicates = await DuplicateDetector.findDuplicates(normalizedData);
            if (duplicates.length > 0 && duplicates[0].score >= 0.9) {
              result.duplicates.push({
                row: i + 1,
                existingId: duplicates[0].dogId,
                score: duplicates[0].score,
              });
              result.skipped++;
              continue;
            }
          }

          // Importar o actualizar
          await this.importDog(normalizedData, updateExisting);
          result.imported++;

        } catch (error) {
          result.errors.push({
            row: i + 1,
            message: error instanceof Error ? error.message : 'Error desconocido',
          });
        }
      }

      // Cachear resultados
      await this.cacheImportResult(result);

      return result;
    } catch (error) {
      throw new Error(`Error al procesar CSV: ${error}`);
    }
  }

  /**
   * Importa datos desde un archivo Excel
   */
  static async importFromExcel(
    file: Buffer,
    source: DataSourceType.EXCEL,
    options: {
      skipDuplicates?: boolean;
      updateExisting?: boolean;
      sheetName?: string;
    } = {}
  ): Promise<ImportResult> {
    const result: ImportResult = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      duplicates: [],
    };

    const { skipDuplicates = true, updateExisting = false, sheetName } = options;

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(Buffer.from(file));
      const sheet = sheetName ? workbook.getWorksheet(sheetName) : workbook.worksheets[0];
      
      if (!sheet) {
        throw new Error('No se encontró hoja en el archivo Excel');
      }

      const records: any[] = [];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row
        const rowData: any = {};
        sheet.getRow(1).eachCell((cell, colNumber) => {
          const header = cell.value?.toString();
          if (header) {
            rowData[header] = row.getCell(colNumber).value;
          }
        });
        if (Object.keys(rowData).length > 0) {
          records.push(rowData);
        }
      });

      for (let i = 0; i < records.length; i++) {
        try {
          const normalizedData = this.normalizeRecord(records[i], source);
          
          if (skipDuplicates) {
            const duplicates = await DuplicateDetector.findDuplicates(normalizedData);
            if (duplicates.length > 0 && duplicates[0].score >= 0.9) {
              result.duplicates.push({
                row: i + 1,
                existingId: duplicates[0].dogId,
                score: duplicates[0].score,
              });
              result.skipped++;
              continue;
            }
          }

          await this.importDog(normalizedData, updateExisting);
          result.imported++;

        } catch (error) {
          result.errors.push({
            row: i + 1,
            message: error instanceof Error ? error.message : 'Error desconocido',
          });
        }
      }

      await this.cacheImportResult(result);
      return result;
    } catch (error) {
      throw new Error(`Error al procesar Excel: ${error}`);
    }
  }

  /**
   * Importa datos manualmente (desde formulario)
   */
  static async importManually(
    data: NormalizedDogData,
    options: {
      skipDuplicates?: boolean;
      updateExisting?: boolean;
    } = {}
  ): Promise<{ dogId: string; wasDuplicate: boolean }> {
    const { skipDuplicates = true, updateExisting = false } = options;

    if (skipDuplicates) {
      const duplicates = await DuplicateDetector.findDuplicates(data);
      if (duplicates.length > 0 && duplicates[0].score >= 0.9) {
        if (updateExisting) {
          await this.updateDog(duplicates[0].dogId, data);
          return { dogId: duplicates[0].dogId, wasDuplicate: true };
        }
        return { dogId: duplicates[0].dogId, wasDuplicate: true };
      }
    }

    const dogId = await this.importDog(data, updateExisting);
    return { dogId, wasDuplicate: false };
  }

  /**
   * Importa datos desde scraping estructurado
   */
  static async importFromScraping(
    data: NormalizedDogData[],
    sourceUrl: string,
    options: {
      skipDuplicates?: boolean;
      updateExisting?: boolean;
    } = {}
  ): Promise<ImportResult> {
    const result: ImportResult = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      duplicates: [],
    };

    const { skipDuplicates = true, updateExisting = false } = options;

    for (let i = 0; i < data.length; i++) {
      try {
        const normalizedData = {
          ...data[i],
          source: DataSourceType.SCRAPING,
          sourceUrl,
        };

        if (skipDuplicates) {
          const duplicates = await DuplicateDetector.findDuplicates(normalizedData);
          if (duplicates.length > 0 && duplicates[0].score >= 0.9) {
            result.duplicates.push({
              row: i + 1,
              existingId: duplicates[0].dogId,
              score: duplicates[0].score,
            });
            result.skipped++;
            continue;
          }
        }

        await this.importDog(normalizedData, updateExisting);
        result.imported++;

      } catch (error) {
        result.errors.push({
          row: i + 1,
          message: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }

    await this.cacheImportResult(result);
    return result;
  }

  /**
   * Parsea un archivo CSV
   */
  private static async parseCSV(file: Buffer): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const records: any[] = [];
      const stream = Readable.from(file);

      stream
        .pipe(csv())
        .on('data', (data) => records.push(data))
        .on('end', () => resolve(records))
        .on('error', reject);
    });
  }

  /**
   * Normaliza un registro de datos
   */
  private static normalizeRecord(record: any, source: DataSourceType): NormalizedDogData {
    return {
      name: NameNormalizer.normalize(record.name || record.nombre || ''),
      registrationNumber: record.registrationNumber || record.numeroRegistro || record.registro,
      chipNumber: record.chipNumber || record.chip || record.microchip,
      sex: (record.sex || record.sexo || 'MALE').toUpperCase() === 'FEMALE' ? 'FEMALE' : 'MALE',
      birthDate: record.birthDate || record.fechaNacimiento ? new Date(record.birthDate || record.fechaNacimiento) : undefined,
      color: record.color || record.colour,
      country: record.country || record.pais,
      sireName: record.sireName || record.padre || record.sire,
      sireRegistrationNumber: record.sireRegistrationNumber || record.registroPadre,
      damName: record.damName || record.madre || record.dam,
      damRegistrationNumber: record.damRegistrationNumber || record.registroMadre,
      breederName: record.breederName || record.criador || record.breeder,
      breederKennel: record.breederKennel || record.afijo || record.kennel,
      source,
      sourceUrl: record.sourceUrl,
      sourceId: record.sourceId,
    };
  }

  /**
   * Importa un perro individual
   */
  private static async importDog(
    data: NormalizedDogData,
    updateExisting: boolean
  ): Promise<string> {
    // Buscar o crear criador
    let breederId: string | undefined;
    if (data.breederName || data.breederKennel) {
      const breeder = await this.findOrCreateBreeder(data);
      breederId = breeder.id;
    }

    // Buscar padres
    let sireId: string | undefined;
    let damId: string | undefined;

    if (data.sireName) {
      sireId = await this.findOrCreateParent(data.sireName, data.sireRegistrationNumber, 'MALE');
    }

    if (data.damName) {
      damId = await this.findOrCreateParent(data.damName, data.damRegistrationNumber, 'FEMALE');
    }

    // Crear perro
    const dog = await prisma.dog.create({
      data: {
        name: data.name,
        registrationNumber: data.registrationNumber,
        chipNumber: data.chipNumber,
        sex: data.sex,
        birthDate: data.birthDate,
        color: data.color,
        country: data.country,
        sireId,
        damId,
        breederId,
        // Registrar fuente
        dataSource: {
          create: {
            type: data.source,
            url: data.sourceUrl,
            externalId: data.sourceId,
          },
        },
      },
    });

    return dog.id;
  }

  /**
   * Actualiza un perro existente
   */
  private static async updateDog(dogId: string, data: NormalizedDogData): Promise<void> {
    await prisma.dog.update({
      where: { id: dogId },
      data: {
        name: data.name,
        registrationNumber: data.registrationNumber,
        chipNumber: data.chipNumber,
        color: data.color,
        country: data.country,
        // Actualizar fuente
        dataSource: {
          create: {
            type: data.source,
            url: data.sourceUrl,
            externalId: data.sourceId,
          },
        },
      },
    });
  }

  /**
   * Busca o crea un criador
   */
  private static async findOrCreateBreeder(data: NormalizedDogData) {
    const kennelName = data.breederKennel || data.breederName;
    
    const existing = await prisma.organization.findFirst({
      where: {
        kennelName: kennelName,
      },
    });

    if (existing) return existing;

    return prisma.organization.create({
      data: {
        kennelName,
        legalName: data.breederName,
        type: 'BREEDER',
      },
    });
  }

  /**
   * Busca o crea un padre/madre
   */
  private static async findOrCreateParent(
    name: string,
    registrationNumber?: string,
    sex?: 'MALE' | 'FEMALE'
  ): Promise<string | undefined> {
    if (!name) return undefined;

    const existing = await prisma.dog.findFirst({
      where: {
        name: NameNormalizer.normalize(name),
        registrationNumber,
        sex,
      },
    });

    if (existing) return existing.id;

    // Crear registro mínimo del padre
    const parent = await prisma.dog.create({
      data: {
        name: NameNormalizer.normalize(name),
        registrationNumber,
        sex: sex || 'MALE',
      },
    });

    return parent.id;
  }

  /**
   * Cachea el resultado de importación
   */
  private static async cacheImportResult(result: ImportResult): Promise<void> {
    const cacheKey = `import:result:${Date.now()}`;
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(result));
  }

  /**
   * Genera plantilla de importación
   */
  static async generateTemplate(format: 'csv' | 'excel'): Promise<Buffer> {
    const template = [
      {
        name: 'Nombre del Perro',
        registrationNumber: 'Número de Registro',
        chipNumber: 'Número de Chip',
        sex: 'MALE/FEMALE',
        birthDate: 'YYYY-MM-DD',
        color: 'Color',
        country: 'País',
        sireName: 'Nombre del Padre',
        sireRegistrationNumber: 'Registro del Padre',
        damName: 'Nombre de la Madre',
        damRegistrationNumber: 'Registro de la Madre',
        breederName: 'Nombre del Criador',
        breederKennel: 'Afijo/Kennel',
      },
    ];

    if (format === 'csv') {
      const header = Object.keys(template[0]).join(',');
      const row = Object.values(template[0]).join(',');
      return Buffer.from(`${header}\n${row}\n`);
    } else {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Template');
      
      // Add headers
      const headers = Object.keys(template[0]);
      worksheet.addRow(headers);
      
      // Add data row
      const values = Object.values(template[0]);
      worksheet.addRow(values);
      
      // Style headers
      worksheet.getRow(1).font = { bold: true };
      
      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);
    }
  }
}

export default ImportService;
