import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  GraduationCap,
  Loader2,
  Contrast,
  Type,
  Volume2,
  Keyboard,
  Ear,
  Accessibility,
} from "lucide-react";
import { ttsService } from "@/services/tts";
import { getSystemSettingsApi } from "@/services/api";
import { pickText, resolveLanguage } from "@/lib/locale";

const HIGH_CONTRAST_KEY = "enaes_student_portal_high_contrast";
const LARGE_TEXT_KEY = "enaes_student_portal_large_text";
const STUDENT_FAILED_ATTEMPTS_KEY = "enaes_student_failed_login_attempts";

export default function StudentPortalAuthPage() {
  const { user, isAuthenticated, login, registerStudent } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(true);
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(5);
  const [defaultLanguage, setDefaultLanguage] = useState<"en" | "am">("en");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const hasAutoStartedRef = useRef(false);
  const suppressInstructionNarrationRef = useRef(false);
  const language = resolveLanguage(defaultLanguage);
  const t = (en: string, am: string) => pickText(language, en, am);

  useEffect(() => {
    setHighContrast(localStorage.getItem(HIGH_CONTRAST_KEY) === "true");
    const storedLargeText = localStorage.getItem(LARGE_TEXT_KEY);
    setLargeText(storedLargeText === null ? true : storedLargeText === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem(HIGH_CONTRAST_KEY, String(highContrast));
  }, [highContrast]);

  useEffect(() => {
    localStorage.setItem(LARGE_TEXT_KEY, String(largeText));
  }, [largeText]);

  useEffect(() => {
    const storedFailedAttempts = Number(
      localStorage.getItem(STUDENT_FAILED_ATTEMPTS_KEY) ?? "0",
    );
    setFailedAttempts(
      Number.isFinite(storedFailedAttempts) ? storedFailedAttempts : 0,
    );

    const loadSystemSettings = async () => {
      try {
        const settings = await getSystemSettingsApi();
        setMaxLoginAttempts(settings.maxLoginAttempts);
        setDefaultLanguage(resolveLanguage(settings.defaultLanguage));
      } catch {
        // Keep fallback when backend is temporarily unavailable.
      }
    };

    void loadSystemSettings();
  }, []);

  const readInstructions = useCallback(async (): Promise<boolean> => {
    if (suppressInstructionNarrationRef.current || isAuthenticated) {
      return false;
    }

    const instruction =
      mode === "login"
        ? language === "am"
          ? "ወደ ተማሪ ፖርታል መግቢያ እንኳን ደህና መጡ። መጀመሪያ ኢሜይልዎን ያስገቡ። ሁለተኛ የይለፍ ቃልዎን ያስገቡ። ሶስተኛ Student Login ይምረጡ። የቁልፍ እገዛ: የኢሜይል መስኩን ለማተኮር Alt + I ይጫኑ፣ መመሪያዎቹን እንደገና ለመስማት Alt + R ይጫኑ።"
          : "Welcome to the student portal login. Step one, enter your email address. Step two, enter your password. Step three, choose Student Login. Keyboard help: press Alt plus I to focus the email field, and Alt plus R to hear these instructions again."
        : language === "am"
          ? "ወደ ተማሪ መለያ ምዝገባ እንኳን ደህና መጡ። መጀመሪያ ስምዎን ያስገቡ። ሁለተኛ የአባት ስምዎን ያስገቡ። ሶስተኛ የመለያ ቁጥር ካለ ያስገቡ። አራተኛ ኢሜይል እና የይለፍ ቃል ያስገቡ። አምስተኛ Create Student Account ይምረጡ። የቁልፍ እገዛ: የኢሜይል መስኩን ለማተኮር Alt + I ይጫኑ፣ መመሪያዎቹን እንደገና ለመስማት Alt + R ይጫኑ።"
          : "Welcome to student account registration. Step one, enter your first name. Step two, enter your last name. Step three, optionally enter your account number. Step four, enter your email address and password. Step five, choose Create Student Account. Keyboard help: press Alt plus I to focus the email field, and Alt plus R to hear these instructions again.";
    if (language === "am" && !ttsService.hasVoiceForLanguage("am")) {
      setStatusMessage(
        t(
          "No Amharic voice is installed on this device. Please install an Amharic speech voice in Windows language settings.",
          "በዚህ መሣሪያ ላይ የአማርኛ ድምጽ አልተጫነም። በዊንዶውስ ቋንቋ ቅንብሮች ውስጥ የአማርኛ የንግግር ድምጽ ያክሉ።",
        ),
      );
    } else {
      setStatusMessage(
        t("Reading instructions aloud.", "መመሪያዎች በድምጽ እየተነበቡ ነው።"),
      );
    }
    try {
      await ttsService.speak(instruction, language);
      emailRef.current?.focus();
      return true;
    } catch {
      setStatusMessage(
        t(
          "Auto speech was blocked. It will start on your first interaction.",
          "ራስ-ሰር ድምጽ ተከልክሏል። በመጀመሪያ ግንኙነትዎ ላይ ይጀምራል።",
        ),
      );
      return false;
    }
  }, [isAuthenticated, language, mode, t]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key.toLowerCase() === "i") {
        event.preventDefault();
        emailRef.current?.focus();
      }
      if (event.altKey && event.key.toLowerCase() === "r") {
        event.preventDefault();
        void readInstructions();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [readInstructions]);

  useEffect(() => {
    if (hasAutoStartedRef.current) return;
    hasAutoStartedRef.current = true;

    let cleanupFallback: (() => void) | undefined;

    const attachFirstInteractionFallback = () => {
      const onFirstInteraction = (event: Event) => {
        const target = event.target as HTMLElement | null;
        const isSubmitAction =
          event instanceof KeyboardEvent
            ? event.key === "Enter"
            : Boolean(target?.closest('button[type="submit"]'));

        if (isSubmitAction || suppressInstructionNarrationRef.current) {
          window.removeEventListener("pointerdown", onFirstInteraction);
          window.removeEventListener("keydown", onFirstInteraction);
          window.removeEventListener("touchstart", onFirstInteraction);
          return;
        }

        emailRef.current?.focus();
        setStatusMessage(
          t(
            "Auto speech was blocked. Press Alt plus R or choose Read Instructions Aloud.",
            "ራስ-ሰር ድምጽ ተከልክሏል። Alt + R ይጫኑ ወይም መመሪያዎችን በድምጽ አንብብ ይምረጡ።",
          ),
        );
        window.removeEventListener("pointerdown", onFirstInteraction);
        window.removeEventListener("keydown", onFirstInteraction);
        window.removeEventListener("touchstart", onFirstInteraction);
      };

      window.addEventListener("pointerdown", onFirstInteraction, {
        once: true,
      });
      window.addEventListener("keydown", onFirstInteraction, { once: true });
      window.addEventListener("touchstart", onFirstInteraction, { once: true });

      cleanupFallback = () => {
        window.removeEventListener("pointerdown", onFirstInteraction);
        window.removeEventListener("keydown", onFirstInteraction);
        window.removeEventListener("touchstart", onFirstInteraction);
      };
    };

    const timer = window.setTimeout(async () => {
      emailRef.current?.focus();
      const ok = await readInstructions();
      if (!ok) attachFirstInteractionFallback();
    }, 400);

    return () => {
      window.clearTimeout(timer);
      cleanupFallback?.();
    };
  }, [readInstructions, t]);

  const textSizeClasses = useMemo(
    () =>
      largeText
        ? {
            title: "text-3xl",
            body: "text-base",
            input: "h-12 text-base",
            button: "h-12 text-base",
            hint: "text-sm",
          }
        : {
            title: "text-2xl",
            body: "text-sm",
            input: "h-10 text-sm",
            button: "h-10 text-sm",
            hint: "text-xs",
          },
    [largeText],
  );

  if (isAuthenticated && user) {
    if (user.role === "student") return <Navigate to="/student" />;
    return <Navigate to="/" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    suppressInstructionNarrationRef.current = true;
    ttsService.stop();
    setError("");
    setStatusMessage("");

    if (mode === "login" && failedAttempts >= maxLoginAttempts) {
      suppressInstructionNarrationRef.current = false;
      setError(
        language === "am"
          ? `ብዙ ጊዜ ያልተሳካ ሙከራ አድርገዋል። የ ${maxLoginAttempts} ገደብ ደርሰዋል።`
          : `Too many failed attempts. You have reached the limit of ${maxLoginAttempts}.`,
      );
      setStatusMessage(
        t(
          "Login blocked due to too many failed attempts.",
          "በብዙ ያልተሳኩ ሙከራዎች ምክንያት መግቢያ ተከልክሏል።",
        ),
      );
      return;
    }

    setIsLoading(true);

    const result =
      mode === "login"
        ? await login({ email, password })
        : await registerStudent({
            email,
            password,
            firstName,
            lastName,
            accountNumber: accountNumber || undefined,
          });

    setIsLoading(false);

    if (!result.success) {
      suppressInstructionNarrationRef.current = false;
      if (mode === "login") {
        const nextFailedAttempts = failedAttempts + 1;
        setFailedAttempts(nextFailedAttempts);
        localStorage.setItem(
          STUDENT_FAILED_ATTEMPTS_KEY,
          String(nextFailedAttempts),
        );
      }
      setError(result.error ?? t("Authentication failed", "ማረጋገጥ አልተሳካም"));
      setStatusMessage(
        result.error ?? t("Authentication failed", "ማረጋገጥ አልተሳካም"),
      );
      return;
    }

    if (result.role !== "student") {
      suppressInstructionNarrationRef.current = false;
      setError(
        t(
          "Use the Admin/Examiner portal for this account.",
          "ለዚህ መለያ የአስተዳዳሪ/ፈታኝ ፖርታል ይጠቀሙ።",
        ),
      );
      setStatusMessage(
        t(
          "Use the Admin and Examiner portal for this account.",
          "ለዚህ መለያ የአስተዳዳሪ እና የፈታኝ ፖርታል ይጠቀሙ።",
        ),
      );
      return;
    }

    localStorage.removeItem(STUDENT_FAILED_ATTEMPTS_KEY);
    setFailedAttempts(0);
    sessionStorage.setItem("studentVoiceStartRoute", "/student");
    sessionStorage.setItem("studentDashboardVoiceStart", "1");

    setStatusMessage(
      t(
        "Login successful. Redirecting to student dashboard.",
        "መግቢያ ተሳክቷል። ወደ ተማሪ ዳሽቦርድ በመሄድ ላይ።",
      ),
    );

    window.location.href = "/student";
  };

  const handlePageClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Ignore clicks inside form input fields so typing isn't interrupted
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable
    ) {
      return;
    }

    // Otherwise, trigger the spoken instructions
    void readInstructions();
  };

  return (
    <div
      onClick={handlePageClick}
      className={`min-h-screen p-4 sm:p-6 flex items-center justify-center ${highContrast ? "bg-black text-white" : "bg-background"}`}
      role="main"
      aria-label={t("Student authentication portal", "የተማሪ ማረጋገጫ ፖርታል")}
    >
      <a href="#student-auth-form" className="skip-link">
        {t("Skip to student authentication form", "ወደ ተማሪ ማረጋገጫ ቅጽ ዝለል")}
      </a>
      <div className="w-full max-w-6xl rounded-3xl overflow-hidden border shadow-elevated bg-card">
        <div className="grid lg:grid-cols-2">
          <aside
            className={`relative p-8 sm:p-10 ${highContrast ? "bg-black border-r border-yellow-300" : "bg-gradient-primary text-primary-foreground"}`}
          >
            <div
              className={`${highContrast ? "hidden" : "absolute inset-0 opacity-20"}`}
            >
              <div className="absolute top-6 left-4 w-56 h-56 rounded-full bg-accent blur-3xl" />
              <div className="absolute bottom-6 right-0 w-64 h-64 rounded-full bg-white/40 blur-3xl" />
            </div>
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs tracking-wide bg-white/15">
                <Accessibility className="h-3.5 w-3.5" />{" "}
                {t("Inclusive by Design", "በተደራሽነት የተነደፈ")}
              </div>
              <h2
                className={`mt-4 font-display font-bold leading-tight ${largeText ? "text-4xl" : "text-3xl"}`}
              >
                Student
                <br />
                <span
                  className={`${highContrast ? "text-yellow-300" : "text-accent"}`}
                >
                  {t("Accessible Portal", "ተደራሽ ፖርታል")}
                </span>
              </h2>
              <p
                className={`mt-4 max-w-md ${textSizeClasses.body} ${highContrast ? "text-white" : "text-primary-foreground/90"}`}
              >
                {t(
                  "Designed for blind and visually impaired learners with keyboard-first navigation, readable layouts, and optional spoken guidance.",
                  "ለዓይነ ስውራን እና ለዕይታ ችግር ያላቸው ተማሪዎች በቁልፍ የሚጀምር መተግበሪያ፣ ቀላል ንባብ እና አማራጭ የድምጽ መመሪያ ጋር ተዘጋጅቷል።",
                )}
              </p>

              <div className="mt-7 space-y-3">
                <div
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 ${highContrast ? "bg-white text-black" : "bg-white/15"}`}
                >
                  <Ear className="h-4 w-4" />
                  <span className={textSizeClasses.hint}>
                    {t(
                      "Read instructions aloud at any time",
                      "መመሪያዎችን በማንኛውም ጊዜ በድምጽ ያዳምጡ",
                    )}
                  </span>
                </div>
                <div
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 ${highContrast ? "bg-white text-black" : "bg-white/15"}`}
                >
                  <Keyboard className="h-4 w-4" />
                  <span className={textSizeClasses.hint}>
                    {t(
                      "Keyboard shortcuts: Alt + I focuses email, Alt + R reads instructions",
                      "የቁልፍ አቋራጮች: Alt + I ወደ ኢሜይል ያተኩራል፣ Alt + R መመሪያዎችን ያነባል",
                    )}
                  </span>
                </div>
              </div>
            </div>
          </aside>

          <section
            className={`p-8 sm:p-10 ${highContrast ? "bg-black text-white" : "bg-card"}`}
          >
            <Card
              className={`border-0 shadow-none ${highContrast ? "bg-black text-white" : ""}`}
            >
              <CardHeader className="px-0 pt-0">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                  <GraduationCap className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className={`font-display ${textSizeClasses.title}`}>
                  {mode === "login"
                    ? t("Student Login", "የተማሪ መግቢያ")
                    : t("Create Student Account", "የተማሪ መለያ ፍጠር")}
                </CardTitle>
                <p
                  className={`${textSizeClasses.body} ${highContrast ? "text-white/90" : "text-muted-foreground"}`}
                >
                  {mode === "login"
                    ? t("Access your exam dashboard", "ወደ ፈተና ዳሽቦርድዎ ይግቡ")
                    : t(
                        "Register to start your exam journey",
                        "የፈተና ጉዞዎን ለመጀመር ይመዝገቡ",
                      )}
                </p>

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    className={textSizeClasses.button}
                    onClick={() => setHighContrast((prev) => !prev)}
                    aria-pressed={highContrast}
                  >
                    <Contrast className="mr-2 h-4 w-4" />
                    {highContrast
                      ? t("Normal Theme", "መደበኛ ገጽታ")
                      : t("High Contrast", "ከፍተኛ ተቃራኒ")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={textSizeClasses.button}
                    onClick={() => setLargeText((prev) => !prev)}
                    aria-pressed={largeText}
                  >
                    <Type className="mr-2 h-4 w-4" />
                    {largeText
                      ? t("Normal Text", "መደበኛ ጽሑፍ")
                      : t("Large Text", "ትልቅ ጽሑፍ")}
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  className={`mt-2 ${textSizeClasses.button}`}
                  onClick={() => void readInstructions()}
                >
                  <Volume2 className="mr-2 h-4 w-4" />{" "}
                  {t("Read Instructions Aloud", "መመሪያዎችን በድምጽ አንብብ")}
                </Button>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="sr-only" aria-live="polite">
                  {statusMessage}
                </div>

                <form
                  className="space-y-4"
                  onSubmit={handleSubmit}
                  id="student-auth-form"
                >
                  {mode === "register" && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="firstName">
                            {t("First Name", "ስም")}
                          </Label>
                          <Input
                            id="firstName"
                            className={textSizeClasses.input}
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="lastName">
                            {t("Last Name", "የአባት ስም")}
                          </Label>
                          <Input
                            id="lastName"
                            className={textSizeClasses.input}
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="accountNumber">
                          {t("Account Number (optional)", "የመለያ ቁጥር (አማራጭ)")}
                        </Label>
                        <Input
                          id="accountNumber"
                          className={textSizeClasses.input}
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          placeholder={t("STU-2026-001", "STU-2026-001")}
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="email">{t("Email", "ኢሜይል")}</Label>
                    <Input
                      id="email"
                      ref={emailRef}
                      className={textSizeClasses.input}
                      type="email"
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          passwordRef.current?.focus();
                        }
                      }}
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">{t("Password", "የይለፍ ቃል")}</Label>
                    <Input
                      id="password"
                      ref={passwordRef}
                      className={textSizeClasses.input}
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete={
                        mode === "login" ? "current-password" : "new-password"
                      }
                    />
                  </div>

                  {error && (
                    <div
                      className={`rounded-md border p-2 ${textSizeClasses.body} ${highContrast ? "border-red-200 bg-red-50 text-red-800" : "border-destructive/30 bg-destructive/10 text-destructive"}`}
                      role="alert"
                    >
                      {error}
                    </div>
                  )}

                  {mode === "login" && maxLoginAttempts > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t("Failed attempts", "ያልተሳኩ ሙከራዎች")}: {failedAttempts}/
                      {maxLoginAttempts}
                    </p>
                  )}

                  <Button
                    className={`w-full bg-gradient-primary ${textSizeClasses.button}`}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("Please wait...", "እባክዎ ይጠብቁ...")}
                      </>
                    ) : mode === "login" ? (
                      t("Student Login", "የተማሪ መግቢያ")
                    ) : (
                      t("Create Student Account", "የተማሪ መለያ ፍጠር")
                    )}
                  </Button>
                </form>

                <div
                  className={`mt-4 flex items-center justify-between ${textSizeClasses.body}`}
                >
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => {
                      setError("");
                      setStatusMessage("");
                      setMode(mode === "login" ? "register" : "login");
                    }}
                  >
                    {mode === "login"
                      ? t("Create account", "መለያ ፍጠር")
                      : t("Already have an account? Login", "መለያ አለዎት? ይግቡ")}
                  </button>

                  <Link
                    to="/portal"
                    className={
                      highContrast
                        ? "text-white/80 hover:underline"
                        : "text-muted-foreground hover:underline"
                    }
                  >
                    {t("Back to portal list", "ወደ ፖርታል ዝርዝር ተመለስ")}
                  </Link>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
