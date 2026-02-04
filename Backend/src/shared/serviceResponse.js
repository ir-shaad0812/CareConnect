// ============================================
// SHARED SERVICE RESPONSE HELPERS
// Provides a consistent service response contract
// ============================================

const withLegacy = (base, legacy = {}) => ({
  ...base,
  ...legacy,
});

export const successResponse = ({ message, code = 'SUCCESS', data = {}, legacy = {} }) => {
  return withLegacy(
    {
      success: true,
      message,
      code,
      data,
    },
    legacy,
  );
};

export const failureResponse = ({ message, code = 'FAILED', data = {}, legacy = {} }) => {
  return withLegacy(
    {
      success: false,
      message,
      code,
      data,
    },
    legacy,
  );
};

export default {
  successResponse,
  failureResponse,
};
