import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { AuthProvider } from "@/hooks/useAuth";
import { AdminGuard } from "@/components/AdminGuard";
import {
  clearSpotifyAuthCallbackFromUrl,
  clearSpotifyAuthState,
  exchangeSpotifyCodeForAccessToken,
} from "@/lib/spotifyAuth";
import Index from "./pages/Index.tsx";
import Chapters from "./pages/Chapters.tsx";
import JournalEntry from "./pages/JournalEntry.tsx";
import Gallery from "./pages/Gallery.tsx";
import Bouquet from "./pages/Bouquet.tsx";
import LoveNotes from "./pages/LoveNotes.tsx";
import Secret from "./pages/Secret.tsx";
import FutureLetters from "./pages/FutureLetters.tsx";
import Mixtapes from "./pages/Mixtapes.tsx";
import MixtapeDetail from "./pages/MixtapeDetail.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import AdminChapterEditor from "./pages/AdminChapterEditor.tsx";
import AdminNotesEditor from "./pages/AdminNotesEditor.tsx";
import AdminLettersEditor from "./pages/AdminLettersEditor.tsx";
import AdminMixtapesEditor from "./pages/AdminMixtapesEditor.tsx";
import { JournalNav } from "./components/JournalNav";
import { MusicToggle } from "./components/MusicToggle";

const queryClient = new QueryClient();

const SpotifyTokenHandler = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const authError = params.get("error");

    if (authError) {
      clearSpotifyAuthState();
      clearSpotifyAuthCallbackFromUrl();
      toast.error("Spotify connection was cancelled.");
      return;
    }

    if (!code) return;

    let cancelled = false;

    void (async () => {
      try {
        await exchangeSpotifyCodeForAccessToken(code);
        if (cancelled) return;
        clearSpotifyAuthCallbackFromUrl();
        toast.success("Spotify connected.");
      } catch (error) {
        clearSpotifyAuthState();
        clearSpotifyAuthCallbackFromUrl();
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Spotify connection failed.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SpotifyTokenHandler />
        <AuthProvider>
          <JournalNav />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/chapters" element={<Chapters />} />
            <Route path="/mixtapes" element={<Mixtapes />} />
            <Route path="/mixtapes/:id" element={<MixtapeDetail />} />
            <Route path="/chapter/:id" element={<JournalEntry />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/bouquet" element={<Bouquet />} />
            <Route path="/notes" element={<LoveNotes />} />
            <Route path="/letters" element={<FutureLetters />} />
            <Route path="/secret" element={<Secret />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
            <Route path="/admin/chapter/:id" element={<AdminGuard><AdminChapterEditor /></AdminGuard>} />
            <Route path="/admin/notes" element={<AdminGuard><AdminNotesEditor /></AdminGuard>} />
            <Route path="/admin/letters" element={<AdminGuard><AdminLettersEditor /></AdminGuard>} />
            <Route path="/admin/mixtapes" element={<AdminGuard><AdminMixtapesEditor /></AdminGuard>} />
            <Route path="/callback" element={<div />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <MusicToggle />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
