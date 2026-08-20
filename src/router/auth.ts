import type {RouteLocationRaw, Router} from 'vue-router'
import authSession from '@/services/authSession'

const DEFAULT_AUTHENTICATED_ROUTE: RouteLocationRaw = {path: '/'}

export const takePostLoginTarget = (router: Router): RouteLocationRaw => {
  const returnPath = authSession.takeReturnPath()
  if (!returnPath) {
    return DEFAULT_AUTHENTICATED_ROUTE
  }

  const resolved = router.resolve(returnPath)
  if (resolved.matched.length === 0 || resolved.path === '/login' || resolved.meta.public === true) {
    return DEFAULT_AUTHENTICATED_ROUTE
  }

  return {
    path: resolved.path,
    query: resolved.query,
    hash: resolved.hash
  }
}
