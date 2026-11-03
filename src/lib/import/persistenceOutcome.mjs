export function getImportPersistenceOutcome(persistenceErrors) {
  if (persistenceErrors.length > 0) {
    return {
      status: 500,
      partial: true,
      message: 'Import was only partially applied. Review the import session before retrying.',
    };
  }

  return {
    status: 200,
    partial: false,
    message: null,
  };
}
