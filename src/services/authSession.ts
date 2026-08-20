import {createAuthSession} from '@/services/authSessionCore'

const authSession = createAuthSession({
  sharedStorage: window.localStorage,
  tabStorage: window.sessionStorage
})

export default authSession
