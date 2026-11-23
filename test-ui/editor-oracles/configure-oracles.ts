import { configureOracles } from '@tanstack/oracles';
import { formattingOracleProperties } from './property-registry-oracle.ts';

// Preserve formatting’s established ORACLE_* replay environment.
configureOracles({ envPrefix: 'ORACLE', registry: formattingOracleProperties });
