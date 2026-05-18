import React, { useEffect, useRef } from "react";
import { Outlet, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  LogOut,
  ClipboardList,
  BarChart3,
  Shield,
  BookOpen,
  GraduationCap,
  CheckCircle,
  Upload,
  Activity,
  Moon,
  Sun,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { UserRole } from "@/types";
import { ttsService } from "@/services/tts";
import { isRouteAudioMuted, setRouteAudioMuted } from "@/lib/routeAudio";
import { pickText, resolveLanguage } from "@/lib/locale";

const roleNavItems: Record<
  UserRole,
  {
    title: string;
    url: string;
    icon: React.ElementType;
    description?: string;
    descriptionAm?: string;
  }[]
> = {
  admin: [
    {
      title: "Dashboard",
      url: "/admin",
      icon: LayoutDashboard,
      description: "System metrics and overview",
      descriptionAm: "የስርዓት አጠቃላይ እይታ",
    },
    {
      title: "Users",
      url: "/admin/users",
      icon: Users,
      description: "Manage students & examiners",
      descriptionAm: "ተማሪዎችን እና ፈታኞችን ያስተዳድሩ",
    },
    {
      title: "Approvals",
      url: "/admin/approvals",
      icon: CheckCircle,
      description: "Review pending exam requests",
      descriptionAm: "የፈተና ጥያቄዎችን ይገምግሙ",
    },
    {
      title: "Audit Logs",
      url: "/admin/audit",
      icon: Shield,
      description: "Security & compliance logs",
      descriptionAm: "የደህንነት ምዝግብ ማስታወሻዎች",
    },
    {
      title: "Bulk Import",
      url: "/admin/bulk-import",
      icon: Upload,
      description: "Import accounts from CSV",
      descriptionAm: "ተማሪዎችን በጅምላ ያስገቡ",
    },
    {
      title: "System Settings",
      url: "/admin/system-settings",
      icon: Settings,
      description: "Global defaults & rules",
      descriptionAm: "የስርዓት ቅንብሮች እና ህጎች",
    },
  ],
  examiner: [
    {
      title: "Dashboard",
      url: "/examiner",
      icon: LayoutDashboard,
      description: "Exams created & pass rates",
      descriptionAm: "የፈተና አፈጻጸም አጠቃላይ እይታ",
    },
    {
      title: "My Exams",
      url: "/examiner/exams",
      icon: FileText,
      description: "Manage exam papers & drafts",
      descriptionAm: "ፈተናዎችዎን ያስተዳድሩ",
    },
    {
      title: "Questions",
      url: "/examiner/questions",
      icon: BookOpen,
      description: "Author exam questions",
      descriptionAm: "ፈተና ጥያቄዎችን ያዘጋጁ",
    },
    {
      title: "Results",
      url: "/examiner/results",
      icon: BarChart3,
      description: "View student score reports",
      descriptionAm: "የተማሪ ውጤቶችን ይገምግሙ",
    },
    {
      title: "Monitor",
      url: "/examiner/monitor",
      icon: Activity,
      description: "Live exam proctoring monitor",
      descriptionAm: "የቀጥታ ፈተና ክትትል",
    },
  ],
  student: [
    {
      title: "Dashboard",
      url: "/student",
      icon: LayoutDashboard,
      description: "Access assigned exams",
      descriptionAm: "የተቀመጡ ፈተናዎችን ይክፈቱ",
    },
    {
      title: "My Exams",
      url: "/student/exams",
      icon: ClipboardList,
      description: "Take scheduled assessments",
      descriptionAm: "ፈተናዎችን ይውሰዱ",
    },
    {
      title: "Results",
      url: "/student/results",
      icon: GraduationCap,
      description: "View results and review exams",
      descriptionAm: "ውጤቶችዎን እና ማብራሪያዎችን ይመልከቱ",
    },
  ],
};

function AppSidebar() {
  const { user, logout, preferences, updatePreferences } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const location = useLocation();
  const hasReadSidebarIntroRef = useRef(false);
  const sidebarMenuModeIndexRef = useRef<number>(-1);
  const lastSpokenPromptRef = useRef("");
  const sidebarScanTimeoutRef = useRef<number | null>(null);
  const sidebarScanActiveRef = useRef(false);
  const [isRouteMuted, setIsRouteMuted] = React.useState(false);
  const language = resolveLanguage(preferences.language);
  const t = (en: string, am: string) => pickText(language, en, am);

  if (!user) return null;
  const baseNavItems = roleNavItems[user.role] || [];
  const navItems = baseNavItems.map((item) => {
    let title = item.title;
    let description = "";

    if (user.role === "student") {
      title =
        item.url === "/student"
          ? t("Dashboard", "ዳሽቦርድ")
          : item.url === "/student/exams"
            ? t("My Exams", "የእኔ ፈተናዎች")
            : item.url === "/student/results"
              ? t("Results", "ውጤቶች")
              : item.title;
    } else {
      title = t(item.title, item.title);
    }

    if (item.description) {
      description = t(item.description, item.descriptionAm || "");
    }

    return {
      ...item,
      title,
      description,
    };
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleTheme = () => {
    updatePreferences({
      theme: preferences.theme === "dark" ? "light" : "dark",
    });
  };

  const toggleTTS = () => {
    const nextEnabled = !preferences.tts.enabled;
    updatePreferences({
      tts: {
        ...preferences.tts,
        enabled: nextEnabled,
      },
    });
    sessionStorage.setItem("enaes_manually_muted", nextEnabled ? "false" : "true");
    if (!nextEnabled) {
      ttsService.stop();
    }
  };

  useEffect(() => {
    setIsRouteMuted(isRouteAudioMuted(location.pathname));
  }, [location.pathname]);

  const prepareStudentVoiceRoute = (url: string) => {
    if (user.role !== "student") return;
    if (!url.startsWith("/student")) return;

    sessionStorage.setItem("studentVoiceStartRoute", url);
    if (url === "/student") {
      // Backward-compatible signal for dashboard listeners.
      sessionStorage.setItem("studentDashboardVoiceStart", "1");
      window.dispatchEvent(new Event("student-dashboard-selected"));
    }
  };

  const stopSidebarAutoScan = () => {
    sidebarScanActiveRef.current = false;
    if (sidebarScanTimeoutRef.current !== null) {
      window.clearTimeout(sidebarScanTimeoutRef.current);
      sidebarScanTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (!user || user.role !== "student") return;
    if (location.pathname !== "/student") return;
    if (hasReadSidebarIntroRef.current) return;

    hasReadSidebarIntroRef.current = true;

    const introText =
      language === "am"
        ? `እንኳን ደህና መጡ ${user.firstName}. አሁን በኢትዮጵያ ብሔራዊ ተደራሽ ፈተና ስርዓት የተማሪ ዳሽቦርድ ላይ ነዎት። በፖርታሉ ውስጥ ለመንቀሳቀስ የጎን ምናሌውን ይጠቀሙ።`
        : `Welcome ${user.firstName}. You are now in the Ethiopian National Accessible Exam System student dashboard. Use the sidebar to move through the portal.`;

    let cleanupFallback: (() => void) | undefined;

    const speakMenuOption = async (index: number) => {
      const item = navItems[index];
      if (!item) return;
      const prompt =
        language === "am"
          ? `የጎን ምናሌ ምርጫ ${index + 1} ከ ${navItems.length}: ${item.title}. ${item.title} ለመክፈት Enter ይጫኑ። ይህን ምርጫ ለመድገም Alt + R ይጫኑ።`
          : `Sidebar option ${index + 1} of ${navItems.length}: ${item.title}. Press Enter to open ${item.title}. Press Alt plus R to repeat this option.`;
      lastSpokenPromptRef.current = prompt;
      try {
        await ttsService.speak(prompt, language);
      } catch {
        // Ignore speech failures while scanning.
      }
    };

    const speakAndQueueNext = async () => {
      if (!sidebarScanActiveRef.current || navItems.length === 0) return;

      const currentIndex =
        sidebarMenuModeIndexRef.current >= 0
          ? sidebarMenuModeIndexRef.current
          : 0;
      sidebarMenuModeIndexRef.current = currentIndex;
      await speakMenuOption(currentIndex);

      if (!sidebarScanActiveRef.current) return;

      sidebarScanTimeoutRef.current = window.setTimeout(() => {
        if (!sidebarScanActiveRef.current || navItems.length === 0) return;
        const nextIndex =
          (sidebarMenuModeIndexRef.current + 1) % navItems.length;
        sidebarMenuModeIndexRef.current = nextIndex;
        void speakAndQueueNext();
      }, 1400);
    };

    const startSidebarAutoScan = () => {
      if (navItems.length === 0) return;

      stopSidebarAutoScan();
      sidebarScanActiveRef.current = true;

      sidebarMenuModeIndexRef.current = 0;
      void speakAndQueueNext();
    };

    // Prime first option immediately so Enter can open it even while intro is speaking.
    sidebarMenuModeIndexRef.current = 0;

    const readIntro = async () => {
      try {
        lastSpokenPromptRef.current = introText;
        await ttsService.speak(introText, language);
        startSidebarAutoScan();
      } catch {
        const onFirstInteraction = () => {
          void (async () => {
            await ttsService.speak(introText, language);
            startSidebarAutoScan();
          })();
          window.removeEventListener("pointerdown", onFirstInteraction);
          window.removeEventListener("keydown", onFirstInteraction);
          window.removeEventListener("touchstart", onFirstInteraction);
        };

        window.addEventListener("pointerdown", onFirstInteraction, {
          once: true,
        });
        window.addEventListener("keydown", onFirstInteraction, { once: true });
        window.addEventListener("touchstart", onFirstInteraction, {
          once: true,
        });

        cleanupFallback = () => {
          window.removeEventListener("pointerdown", onFirstInteraction);
          window.removeEventListener("keydown", onFirstInteraction);
          window.removeEventListener("touchstart", onFirstInteraction);
        };
      }
    };

    const timer = window.setTimeout(() => {
      void readIntro();
    }, 450);

    return () => {
      window.clearTimeout(timer);
      stopSidebarAutoScan();
      cleanupFallback?.();
    };
  }, [language, location.pathname, navItems, user]);

  useEffect(() => {
    if (!user) return;

    const getSidebarChoicesPrompt = () => {
      if (navItems.length === 0) return "";
      const options = navItems
        .map((item, index) =>
          language === "am"
            ? `ምርጫ ${index + 1}, ${item.title}`
            : `option ${index + 1}, ${item.title}`,
        )
        .join(". ");
      return language === "am"
        ? `የጎን ምናሌ ምርጫዎች፡ ${options}. አሁን ያለውን ምርጫ ለመክፈት Enter ይጫኑ። የጎን ምናሌ ምርጫዎችን እንደገና ለመስማት Alt + R ይጫኑ።`
        : `Sidebar choices are: ${options}. Press Enter to open the current choice. Press Alt plus R to hear sidebar choices again.`;
    };

    const repeatLastPrompt = async () => {
      const shouldReadChoices =
        user.role === "student" &&
        location.pathname.startsWith("/student") &&
        sidebarMenuModeIndexRef.current < 0;

      const text = shouldReadChoices
        ? getSidebarChoicesPrompt()
        : lastSpokenPromptRef.current;
      if (!text) return;

      lastSpokenPromptRef.current = text;
      try {
        await ttsService.speak(text, language);
      } catch {
        // Ignore speech failures here.
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key.toLowerCase() === "r") {
        if (
          location.pathname === "/student/exams" ||
          location.pathname === "/student/results"
        ) {
          return;
        }
        event.preventDefault();
        void repeatLastPrompt();
        return;
      }

      if (event.key === "Enter" && sidebarMenuModeIndexRef.current >= 0) {
        const target = event.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.tagName === "SELECT" ||
            target.isContentEditable)
        ) {
          return;
        }

        event.preventDefault();
        const selected = navItems[sidebarMenuModeIndexRef.current];
        sidebarMenuModeIndexRef.current = -1;
        stopSidebarAutoScan();
        if (!selected) return;

        if (selected.url.startsWith("/student")) {
          sessionStorage.setItem("studentVoiceStartRoute", selected.url);

          if (selected.url === "/student") {
            // Backward-compatible signal for existing dashboard listeners.
            sessionStorage.setItem("studentDashboardVoiceStart", "1");
            window.dispatchEvent(new Event("student-dashboard-selected"));
          }
        }

        const confirmation =
          language === "am"
            ? `${selected.title} በመክፈት ላይ። የጎን ምናሌ ምርጫዎችን እንደገና ለመስማት Alt + R ይጫኑ።`
            : `Opening ${selected.title}. To hear sidebar choices again, press Alt plus R.`;
        lastSpokenPromptRef.current = confirmation;
        void ttsService.speak(confirmation, language);
        navigate(selected.url);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [language, location.pathname, navigate, navItems, user]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <GraduationCap className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-sidebar-foreground font-display">
                ENAES
              </span>
              <span className="text-[10px] text-sidebar-foreground/60">
                Exam System
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[10px] tracking-wider">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                    className="h-auto py-2"
                  >
                    <NavLink
                      to={item.url}
                      end
                      onClick={() => {
                        stopSidebarAutoScan();
                        sidebarMenuModeIndexRef.current = -1;
                        prepareStudentVoiceRoute(item.url);
                      }}
                      className="hover:bg-sidebar-accent/50 flex items-start py-2.5 px-3 w-full"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-3 h-5 w-5 mt-0.5 shrink-0" />
                      {!collapsed && (
                        <div className="flex flex-col text-left min-w-0">
                          <span className="font-semibold text-sm leading-tight">
                            {item.title}
                          </span>
                          {item.description && (
                            <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight whitespace-normal break-words">
                              {item.description}
                            </span>
                          )}
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 space-y-2">
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            aria-label="Toggle theme"
          >
            {preferences.theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          {user.role === "student" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTTS}
              className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              aria-label={!preferences.tts.enabled ? "Unmute this page" : "Mute this page"}
            >
              {!preferences.tts.enabled ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        {!collapsed && (
          <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent/30 p-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[10px] text-sidebar-foreground/50 capitalize">
                {user.role}
              </p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 h-8 text-xs"
          aria-label="Log out"
        >
          <LogOut className="mr-2 h-3.5 w-3.5" />
          {!collapsed && "Log out"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function DashboardLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sm text-muted-foreground font-medium">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b bg-card/80 backdrop-blur-sm px-4 sticky top-0 z-30">
            <SidebarTrigger className="mr-3" />
            <div className="flex-1" />
            <span className="text-xs text-muted-foreground hidden sm:block">
              Ethiopian National Accessible Exam System
            </span>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
