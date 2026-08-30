"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError, type UserSummary } from "@/lib/api";

interface DashboardContextValue {
  // Compte réellement connecté (session cookie httpOnly, cf. AuthController.me) — plus
  // de sélecteur libre entre comptes : un client authentifié n'a accès qu'à ses propres
  // données (cf. assertSelfOrAdmin côté API). `selectedUserId`/`selectedUser` sont
  // conservés sous ce nom pour ne pas rebaptiser toutes les pages qui les consomment déjà
  // (ledger, transactions, cards, wallets restent des routes /users/:userId/...).
  selectedUser: UserSummary | null;
  selectedUserId: string | null;
  authLoading: boolean;
  authError: string | null;
  logout: () => Promise<void>;
  // Incrémenté après toute mutation (dépôt, retrait, gage, remboursement) pour que
  // chaque page (même sur une autre route) sache qu'elle doit recharger ses données.
  refreshToken: number;
  triggerRefresh: () => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserSummary | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  // Restaure la session au chargement de l'app depuis le cookie httpOnly (relit la base
  // côté serveur à chaque fois, cf. AuthController.me — pas seulement le JWT décodé, pour
  // refléter un éventuel changement de rôle/KYC sans exiger une reconnexion).
  useEffect(() => {
    let ignore = false;
    api
      .me()
      .then((user) => {
        if (ignore) return;
        setCurrentUser(user);
        setAuthLoading(false);
      })
      .catch((err) => {
        if (ignore) return;
        // 401 = simplement pas connecté, pas une erreur à afficher (AuthGate redirige
        // vers /login) — seule une vraie panne réseau/serveur est surfacée.
        if (!(err instanceof ApiError) || err.status !== 401) {
          setAuthError(err instanceof ApiError ? err.message : "Une erreur inattendue est survenue.");
        }
        setCurrentUser(null);
        setAuthLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  async function logout() {
    await api.logout().catch(() => {
      // Le cookie peut déjà avoir expiré côté serveur — on nettoie l'état local dans
      // tous les cas, pas la peine de bloquer la déconnexion sur cette erreur.
    });
    setCurrentUser(null);
  }

  return (
    <DashboardContext.Provider
      value={{
        selectedUser: currentUser,
        selectedUserId: currentUser?.id ?? null,
        authLoading,
        authError,
        logout,
        refreshToken,
        triggerRefresh: () => setRefreshToken((n) => n + 1),
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard doit être utilisé sous DashboardProvider");
  }
  return ctx;
}
