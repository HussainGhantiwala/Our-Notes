import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const AdminGuard = ({ children }: { children: ReactNode }) => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-hand text-2xl text-ink-soft animate-pulse">opening the journal…</p>
      </main>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="paper p-10 max-w-md text-center rounded-sm">
          <h1 className="font-script text-4xl text-ink mb-3">just for the keeper</h1>
          <p className="font-hand text-xl text-ink-soft">this part of the journal is private.</p>
        </div>
      </main>
    );
  }
  return <>{children}</>;
};
