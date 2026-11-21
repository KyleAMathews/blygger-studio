import { configureOracles } from '@tanstack/oracles';
import { studioOracleProperties } from '../test/oracle-property-registry.ts';

configureOracles({ envPrefix: 'STUDIO_ORACLE', registry: studioOracleProperties, retiredVariables: ['ORACLE_TARGET', 'ORACLE_SEED', 'ORACLE_PATH'] });
