const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

export const getBetaLimits = () => ({
  maxFileSizeBytes: parsePositiveInt(process.env.BETA_MAX_FILE_SIZE_BYTES, 2621440),
  userMaxDatasets: parsePositiveInt(process.env.BETA_USER_MAX_DATASETS, 2),
  datasetMaxAssets: parsePositiveInt(process.env.BETA_DATASET_MAX_ASSETS, 20),
  userMaxStorageBytes: parsePositiveInt(process.env.BETA_USER_MAX_STORAGE_BYTES, 83886080),
  userMaxActiveContracts: parsePositiveInt(process.env.BETA_USER_MAX_ACTIVE_CONTRACTS, 2),
  publicRegisterLimit: parsePositiveInt(process.env.BETA_PUBLIC_REGISTER_LIMIT, 30),
  maxRegisteredUsers: parsePositiveInt(process.env.BETA_MAX_REGISTERED_USERS, 50),
});
