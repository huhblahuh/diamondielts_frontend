// Keep the shared app skin and student studio spacing in one route policy.
// Login and app routes always use the scene; unknown routes can use plain mode.
export function isStudentStudioRoute(pathname, search = '') {
  if (pathname.startsWith('/student/speaking/') || pathname.startsWith('/student/practice/')) return true;

  const params = new URLSearchParams(search);
  if (pathname === '/student/practice') {
    return params.has('exerciseId') || params.has('exerciseid');
  }

  return /^\/student\/assignments\/[^/]+\/?$/.test(pathname) && params.has('itemId');
}

export function diamondsModeForRoute(pathname) {
  return pathname === '/login' || pathname === '/forgot-password'
    || /^\/(student|teacher|admin)(\/|$)/.test(pathname)
    ? 'scene'
    : 'plain';
}
