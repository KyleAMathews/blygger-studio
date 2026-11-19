import { configureOracles } from '@tanstack/oracles';
import { workerOracleProperties } from './oracle-property-registry.ts';

configureOracles({ envPrefix: 'WORKER_ORACLE', registry: workerOracleProperties, retiredVariables: ['ORACLE_TARGET', 'ORACLE_SEED', 'ORACLE_PATH'] });
