// Shared dev-bypass helper
// When running locally without Google OAuth credentials, we use a fake user
// so the app is fully testable without any OAuth setup.

export const DEV_BYPASS =
  process.env.NODE_ENV === 'development' &&
  (!process.env.GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID.startsWith('replace_'));

export const DEV_USER = {
  id:    'dev-user-local',
  name:  'Dev User',
  email: 'dev@localhost',
  image: null as null,
};
