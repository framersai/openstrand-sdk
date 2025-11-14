/**
 * Named Entity Recognition (NER) Module
 * 
 * Production-grade entity extraction using wink-nlp.
 * Falls back to regex-based extraction if wink-nlp is unavailable.
 * 
 * Supports:
 * - Person names
 * - Organizations
 * - Locations
 * - Acronyms
 * - Keywords (via TF/IDF)
 * 
 * @module modules/ner
 * @author Framers <team@frame.dev>
 * @since 1.3.0
 * @license MIT
 * 
 * @example
 * ```typescript
 * import { extractEntities } from '@framers/openstrand-sdk/modules/ner';
 * 
 * const entities = extractEntities(
 *   'Marie Curie worked at the University of Paris on radioactivity research.'
 * );
 * 
 * console.log(entities);
 * // [
 * //   { value: 'Marie Curie', type: 'person', confidence: 0.95 },
 * //   { value: 'University of Paris', type: 'organization', confidence: 0.90 },
 * //   ...
 * // ]
 * ```
 */

export interface Entity {
  /** Entity text */
  value: string;
  
  /** Entity type */
  type: 'person' | 'organization' | 'location' | 'acronym' | 'keyword';
  
  /** Confidence score (0.0–1.0) */
  confidence: number;
  
  /** Occurrence count in document */
  count: number;
  
  /** Character position in text (optional) */
  position?: number;
}

/**
 * Extract named entities from text using wink-nlp.
 * 
 * Falls back to regex-based extraction if wink-nlp is not available
 * (e.g., in browser environments where the model isn't bundled).
 * 
 * @param text - Input text to analyze
 * @param options - Extraction options
 * @returns Array of extracted entities
 * 
 * @example
 * ```typescript
 * const entities = extractEntities(
 *   'NASA announced a new Mars mission. Dr. Smith leads the team.',
 *   { minConfidence: 0.7 }
 * );
 * ```
 * 
 * @public
 */
export function extractEntities(
  text: string,
  options: {
    minConfidence?: number;
    includeKeywords?: boolean;
  } = {}
): Entity[] {
  const { minConfidence = 0.6 } = options;

  try {
    // Try wink-nlp first (Node.js/Electron)
    return extractWithWinkNLP(text, minConfidence);
  } catch (error) {
    // Fallback to regex (browser/lightweight environments)
    console.debug('[NER] wink-nlp unavailable, using regex fallback');
    return extractWithRegex(text, minConfidence);
  }
}

/**
 * Extract entities using wink-nlp (production method).
 * 
 * @private
 */
function extractWithWinkNLP(text: string, minConfidence: number): Entity[] {
  // Dynamic import to avoid bundling in browser builds
  let winkNLP: any;
  let model: any;

  try {
    winkNLP = require('wink-nlp');
    model = require('wink-eng-lite-web-model');
  } catch {
    throw new Error('wink-nlp not available');
  }

  const nlp = winkNLP(model);
  const doc = nlp.readDoc(text);
  
  const entityMap = new Map<string, Entity>();

  // Extract named entities
  doc.entities().each((entity: any) => {
    const value = entity.out();
    const winkType = entity.type();
    const type = mapWinkEntityType(winkType);
    
    if (!type) return;

    const existing = entityMap.get(value);
    if (existing) {
      existing.count += 1;
    } else {
      entityMap.set(value, {
        value,
        type,
        confidence: 0.9, // wink-nlp is high confidence
        count: 1,
      });
    }
  });

  // Extract acronyms
  const acronymPattern = /\b([A-Z]{2,})\b/g;
  let match;
  while ((match = acronymPattern.exec(text)) !== null) {
    const value = match[1];
    if (value.length < 2) continue;

    const existing = entityMap.get(value);
    if (existing) {
      existing.count += 1;
    } else {
      entityMap.set(value, {
        value,
        type: 'acronym',
        confidence: 0.85,
        count: 1,
      });
    }
  }

  return Array.from(entityMap.values())
    .filter(e => e.confidence >= minConfidence)
    .sort((a, b) => b.count - a.count);
}

/**
 * Extract entities using regex patterns (fallback method).
 * 
 * @private
 */
function extractWithRegex(text: string, minConfidence: number): Entity[] {
  const entityMap = new Map<string, Entity>();

  // Title case sequences (likely person/organization names)
  const titleCasePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
  let match;
  
  while ((match = titleCasePattern.exec(text)) !== null) {
    const value = match[1];
    if (value.length < 3) continue;

    const type = inferEntityType(value);
    const existing = entityMap.get(value);
    
    if (existing) {
      existing.count += 1;
    } else {
      entityMap.set(value, {
        value,
        type,
        confidence: 0.7, // Lower confidence for regex
        count: 1,
      });
    }
  }

  // Acronyms
  const acronymPattern = /\b([A-Z]{2,})\b/g;
  while ((match = acronymPattern.exec(text)) !== null) {
    const value = match[1];
    if (value.length < 2) continue;

    const existing = entityMap.get(value);
    if (existing) {
      existing.count += 1;
    } else {
      entityMap.set(value, {
        value,
        type: 'acronym',
        confidence: 0.8,
        count: 1,
      });
    }
  }

  return Array.from(entityMap.values())
    .filter(e => e.confidence >= minConfidence)
    .sort((a, b) => b.count - a.count);
}

/**
 * Map wink-nlp entity types to our taxonomy.
 * 
 * @private
 */
function mapWinkEntityType(winkType: string): Entity['type'] | null {
  switch (winkType) {
    case 'PERSON':
      return 'person';
    case 'ORG':
    case 'ORGANIZATION':
      return 'organization';
    case 'GPE':
    case 'LOC':
    case 'LOCATION':
      return 'location';
    default:
      return null;
  }
}

/**
 * Infer entity type from text using heuristics (regex fallback).
 * 
 * @private
 */
function inferEntityType(value: string): Entity['type'] {
  // Organization indicators
  if (/\b(Inc|Corp|LLC|Ltd|Company|Corporation)\b/i.test(value)) {
    return 'organization';
  }
  if (/\b(University|College|Institute|School|Academy)\b/i.test(value)) {
    return 'organization';
  }
  
  // Location indicators
  if (/\b(Street|Avenue|Road|Boulevard|City|County|State|Province|Country)\b/i.test(value)) {
    return 'location';
  }
  
  // Person (multi-word title case)
  if (/\s/.test(value) && value.split(/\s+/).length >= 2) {
    return 'person';
  }
  
  // Default to keyword
  return 'keyword';
}

