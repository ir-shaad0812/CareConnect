/**
 * Null-safe admin privilege guard for controller-level checks.
 *
 * @param {object|null|undefined} user
 * @returns {boolean}
 */
export const checkAdminPrivilege = (user) => {
  if (!user || typeof user !== 'object') {
    console.warn('[admin] checkAdminPrivilege called without a valid user object');
    return false;
  }

  if (typeof user.isAdmin === 'boolean') {
    return user.isAdmin;
  }

  return user.role === 'admin';
};
