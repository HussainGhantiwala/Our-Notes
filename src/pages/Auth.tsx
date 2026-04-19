import { useState, FormEvent, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { TapeDecoration } from "@/components/TapeDecoration";
import { FloatingPetals } from "@/components/FloatingPetals";
import { toast } from "sonner";

const Auth = () => {
  const { signIn, signUp, user, loading } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) nav("/admin", { replace: true });
  }, [user, loading, nav]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const fn = mode === "signin" ? signIn : signUp;
    const { error } = await fn(email, password);
    setBusy(false);
    if (error) {
      toast.error(error);
    } else if (mode === "signup") {
      toast.success("Welcome — your private journal is ready.");
    } else {
      toast.success("Welcome back.");
    }
  };

  return (
    <>
      <FloatingPetals count={5} />
      <main className="relative min-h-screen pt-28 pb-16 px-4 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20, rotate: -2 }}
          animate={{ opacity: 1, y: 0, rotate: -1 }}
          transition={{ duration: 0.7 }}
          className="paper relative w-full max-w-md p-10 rounded-sm"
        >
          <TapeDecoration variant="pink" rotate={-6} className="-top-3 left-10" />
          <TapeDecoration variant="yellow" rotate={5} className="-top-3 right-10" />

          <p className="font-ui text-xs tracking-[0.4em] text-ink-soft uppercase text-center mb-2">
            a private door
          </p>
          <h1 className="font-script text-5xl text-ink text-center mb-1">
            {mode === "signin" ? "Welcome back" : "Begin our journal"}
          </h1>
          <p className="font-hand text-lg text-ink-soft text-center mb-6 italic">
            {mode === "signin" ? "sign in to keep writing" : "the first to sign up becomes the keeper"}
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="font-print text-sm text-ink-soft">email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full bg-transparent border-b-2 border-ink/20 focus:border-rose outline-none font-hand text-2xl text-ink py-1 transition-colors"
              />
            </label>
            <label className="block">
              <span className="font-print text-sm text-ink-soft">password</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full bg-transparent border-b-2 border-ink/20 focus:border-rose outline-none font-hand text-2xl text-ink py-1 transition-colors"
              />
            </label>

            <button
              type="submit"
              disabled={busy}
              className="w-full mt-4 bg-rose/90 hover:bg-rose text-cream font-hand text-2xl py-3 rounded-sm shadow-lift transition-all disabled:opacity-60"
            >
              {busy ? "..." : mode === "signin" ? "open the journal" : "create the journal"}
            </button>
          </form>

          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-5 w-full text-center font-hand text-ink-soft hover:text-rose"
          >
            {mode === "signin" ? "first time? begin our journal →" : "already have an account? sign in →"}
          </button>

          <Link to="/" className="block mt-4 text-center font-print text-sm text-ink-soft hover:text-rose">
            ← back to our story
          </Link>
        </motion.div>
      </main>
    </>
  );
};

export default Auth;
