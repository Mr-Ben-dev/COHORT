/**
 * Typed re-export of the browser-local FHIR importer for the Next.js app.
 * The implementation lives in ./fhir-import.mjs so that the same module is
 * directly importable by Node tests (TESTS/fhir-import.test.mjs).
 *
 * TRUST BOUNDARY: parsing is browser-local — the bundle NEVER leaves the
 * device. See docs/fhir-trust.md and the module header comments.
 */

import {
  PARSER_VERSION as _PARSER_VERSION,
  SYNTHETIC_TAG_SYSTEM as _SYNTHETIC_TAG_SYSTEM,
  SYNTHETIC_TAG_CODE as _SYNTHETIC_TAG_CODE,
  computeAge as _computeAge,
  parseFhirBundle as _parseFhirBundle,
  toCircuitAttributes as _toCircuitAttributes,
  setAttestationHandler as _setAttestationHandler,
  requestAttestation as _requestAttestation,
} from './fhir-import.mjs';

export interface ConditionFlag {
  key: string;
  code: string;
  system: string;
  display: string;
  clinicalStatus: string;
  onsetDateTime?: string;
}

export interface LabResult {
  key: string;
  code: string;
  system: string;
  display: string;
  value: number;
  unit?: string;
}

export interface MedicationFlag {
  key: string;
  code: string;
  system: string;
  display: string;
  status: string;
}

export interface ExtractedAttributes {
  parserVersion: string;
  sourceLabel: 'SYNTHETIC' | 'UNVERIFIED';
  patientId?: string;
  birthDate?: string;
  age?: number;
  hasCondition: boolean;
  onMedication: boolean;
  conditions: ConditionFlag[];
  labs: LabResult[];
  medications: MedicationFlag[];
}

/** Circuit-shaped tuple for attestWithAttributes(age: Uint<8>, cond: Boolean, med: Boolean). */
export interface CircuitAttributes {
  age: number;
  hasCondition: boolean;
  onMedication: boolean;
}

export interface ParseResult {
  attributes: ExtractedAttributes;
  warnings: string[];
}

export interface AttestationRequest {
  status: 'queued' | 'submitted';
  parserVersion: string;
  attributes: ExtractedAttributes;
  circuitTuple: CircuitAttributes;
  note: string;
}

export type AttestationHandler = (
  attributes: ExtractedAttributes,
  circuitTuple: CircuitAttributes,
) => unknown;

export const PARSER_VERSION: string = _PARSER_VERSION;
export const SYNTHETIC_TAG_SYSTEM: string = _SYNTHETIC_TAG_SYSTEM;
export const SYNTHETIC_TAG_CODE: string = _SYNTHETIC_TAG_CODE;

export function computeAge(birthDate: string, asOf?: string | Date): number | undefined {
  return _computeAge(birthDate, asOf);
}

export function parseFhirBundle(
  bundle: unknown,
  options?: { asOf?: string | Date },
): ParseResult {
  return _parseFhirBundle(bundle, options) as ParseResult;
}

export function toCircuitAttributes(attributes: ExtractedAttributes): CircuitAttributes {
  return _toCircuitAttributes(attributes) as CircuitAttributes;
}

export function setAttestationHandler(fn: AttestationHandler | null): void {
  _setAttestationHandler(fn);
}

export function requestAttestation(attributes: ExtractedAttributes): AttestationRequest | unknown {
  return _requestAttestation(attributes);
}
