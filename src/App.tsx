import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { AdminGuard } from "@/components/AdminGuard";
import Index from "./pages/Index.tsx";
import Chapters from "./pages/Chapters.tsx";
import JournalEntry from "./pages/JournalEntry.tsx";
import Gallery from "./pages/Gallery.tsx";
import Bouquet from "./pages/Bouquet.tsx";
import LoveNotes from "./pages/LoveNotes.tsx";
import Secret from "./pages/Secret.tsx";
import FutureLetters from "./pages/FutureLetters.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import AdminChapterEditor from "./pages/AdminChapterEditor.tsx";
import AdminNotesEditor from "./pages/AdminNotesEditor.tsx";
import AdminLettersEditor from "./pages/AdminLettersEditor.tsx";
import { JournalNav } from "./components/JournalNav";
import { MusicToggle } from "./components/MusicToggle";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <JournalNav />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/chapters" element={<Chapters />} />
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
            <Route path="*" element={<NotFound />} />
          </Routes>
          <MusicToggle />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
