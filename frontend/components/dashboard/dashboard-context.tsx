"use client";

import { createContext, Fragment, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError, type UserSummary } from "@/lib/api";
import { setActiveCurrency, type DisplayCurrency } from "@/lib/format";

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
  // Monnaie d'affichage du compte (le registre reste en USD, cf. lib/format.ts).
  displayCurrency: DisplayCurrency;
  changeDisplayCurrency: (currency: DisplayCurrency) => Promise<void>;
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
  const [eurPerUsd, setEurPerUsd] = useState<number | null>(null);

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

  const displayCurrency: DisplayCurrency = currentUser?.displayCurrency === "EUR" ? "EUR" : "USD";

  // Taux du jour, lu une fois quand le client affiche ses montants en euros. Sans taux (API de
  // marché indisponible), on retombe sur l'affichage en USD plutôt que d'inventer un cours.
  useEffect(() => {
    if (displayCurrency !== "EUR" || eurPerUsd !== null) return;
    let ignore = false;
    api
      .getEurPerUsd()
      .then((r) => {
        if (!ignore) setEurPerUsd(r.eurPerUsd);
      })
      .catch(() => {
        if (!ignore) setEurPerUsd(0);
      });
    return () => {
      ignore = true;
    };
  }, [displayCurrency, eurPerUsd]);

  // En quittant l'espace client (vitrine publique), retour à l'affichage en USD.
  useEffect(() => () => setActiveCurrency("USD", 1), []);

  const rateReady = displayCurrency === "USD" || eurPerUsd !== null;
  const effectiveCurrency: DisplayCurrency = displayCurrency === "EUR" && (eurPerUsd ?? 0) > 0 ? "EUR" : "USD";
  // Renseigné pendant le rendu, avant que les enfants ne s'affichent (cf. lib/format.ts).
  setActiveCurrency(effectiveCurrency, eurPerUsd ?? 1);

  async function changeDisplayCurrency(currency: DisplayCurrency) {
    if (!currentUser || currency === displayCurrency) return;
    await api.setDisplayCurrency(currentUser.id, currency);
    setCurrentUser({ ...currentUser, displayCurrency: currency });
  }

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
        displayCurrency: effectiveCurrency,
        changeDisplayCurrency,
        refreshToken,
        triggerRefresh: () => setRefreshToken((n) => n + 1),
      }}
    >
      {/* La monnaie d'affichage vit dans un état de module (cf. lib/format.ts) : on remonte
          l'arbre quand elle change pour que chaque montant se reformate. */}
      <Fragment key={effectiveCurrency}>{rateReady ? children : null}</Fragment>
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
