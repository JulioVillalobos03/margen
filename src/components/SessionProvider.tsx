import React, { createContext, useContext } from 'react';
import { useAuth, type AuthController } from '../services/auth';
const SessionContext = createContext<AuthController | null>(null);
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  return <SessionContext.Provider value={auth}>{children}</SessionContext.Provider>;
}
export function useSession() {
  const auth = useContext(SessionContext);
  if (!auth) throw new Error('Falta el proveedor de sesión.');
  return auth;
}
