/**
 * Beta Limit Configuration
 * Handles fetching beta limits from environment variables with safe fallbacks.
 */

const getIntEnv = (key: string, defaultValue: number): number => {
  const val = import.meta.env[key];
  if (!val) return defaultValue;
  const parsed = Number(val);
  return Number.isNaN(parsed) || !Number.isInteger(parsed) || parsed <= 0
    ? defaultValue
    : parsed;
};

// Defaults
const DEFAULT_MAX_FILE_SIZE_BYTES = 2621440; // 2.5 MB
const DEFAULT_USER_MAX_DATASETS = 2;
const DEFAULT_DATASET_MAX_ASSETS = 20;
const DEFAULT_USER_MAX_STORAGE_BYTES = 83886080; // 80 MB
const DEFAULT_USER_MAX_ACTIVE_CONTRACTS = 2;
const DEFAULT_PUBLIC_REGISTER_LIMIT = 30;
const DEFAULT_MAX_REGISTERED_USERS = 50;

export const betaLimits = {
  get maxFileSizeBytes() {
    return getIntEnv('VITE_BETA_MAX_FILE_SIZE_BYTES', DEFAULT_MAX_FILE_SIZE_BYTES);
  },
  get maxFileSizeMbLabel() {
    const mb = this.maxFileSizeBytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  },
  get userMaxDatasets() {
    return getIntEnv('VITE_BETA_USER_MAX_DATASETS', DEFAULT_USER_MAX_DATASETS);
  },
  get datasetMaxAssets() {
    return getIntEnv('VITE_BETA_DATASET_MAX_ASSETS', DEFAULT_DATASET_MAX_ASSETS);
  },
  get userMaxStorageBytes() {
    return getIntEnv('VITE_BETA_USER_MAX_STORAGE_BYTES', DEFAULT_USER_MAX_STORAGE_BYTES);
  },
  get userMaxStorageMbLabel() {
    const mb = this.userMaxStorageBytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  },
  get userMaxActiveContracts() {
    return getIntEnv('VITE_BETA_USER_MAX_ACTIVE_CONTRACTS', DEFAULT_USER_MAX_ACTIVE_CONTRACTS);
  },
  get publicRegisterLimit() {
    return getIntEnv('VITE_BETA_PUBLIC_REGISTER_LIMIT', DEFAULT_PUBLIC_REGISTER_LIMIT);
  },
  get maxRegisteredUsers() {
    return getIntEnv('VITE_BETA_MAX_REGISTERED_USERS', DEFAULT_MAX_REGISTERED_USERS);
  }
};
