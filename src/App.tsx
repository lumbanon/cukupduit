import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  CirclePlay,
  Clock3,
  Download,
  Heart,
  HeartHandshake,
  LayoutDashboard,
  Leaf,
  LockKeyhole,
  RefreshCcw,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  Target,
  TrendingUp,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import { defaultProfile } from "./data/defaultProfile";
import { findRetirement } from "./engine/retirementSearch";
import {
  additionalSavingsForTarget,
  compareScenarios,
  optimizeRetirement,
} from "./engine/optimization";
import { parseProfile, validateProfile } from "./engine/validation";
import { Planner } from "./components/forms/Planner";
import {
  AllocationChart,
  CashflowChart,
  FamilyChart,
  ScenarioChart,
  WealthChart,
} from "./components/charts/Charts";
import { Field } from "./components/forms/Field";
import type { FinancialProfile, RetirementResult } from "./types";
import { downloadFile, money, number } from "./utils/format";

type View = "overview" | "plan" | "scenarios" | "insights";
const nav = [
  { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
  { id: "plan" as const, label: "My plan", icon: SlidersHorizontal },
  { id: "scenarios" as const, label: "Scenarios", icon: BarChart3 },
  { id: "insights" as const, label: "Insights", icon: Sparkles },
];

function Brand({
  mobile = false,
  onClick,
}: {
  mobile?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`brand ${mobile ? "mobile-brand" : ""}`}
      aria-label="CukupDuit home"
      onClick={onClick}
    >
      <span className="brand-mark">
        <svg viewBox="0 0 30 32" fill="none" aria-hidden="true">
          <path
            d="M15 27V13"
            stroke="#7b9460"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path d="M15 20C4 22 3 14 4 8c8-1 13 3 11 12Z" fill="#8EA66B" />
          <path d="M15 14C13 5 20 2 27 3c1 8-3 13-12 11Z" fill="#b3c399" />
          <path
            d="m8 13 7 7m0-6 7-6"
            stroke="#fff"
            strokeOpacity=".6"
            strokeWidth="1.1"
          />
        </svg>
      </span>
      <span className="brand-name">
        Cukup<span>Duit</span>
      </span>
    </button>
  );
}

function GrowthIllustration() {
  return (
    <svg
      className="growth-illustration"
      viewBox="0 0 190 190"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="103" cy="166" rx="65" ry="11" fill="#cfdcbd" />
      <path
        d="M47 156V124h26v32M82 156V101h26v55M117 156V74h26v82"
        fill="#a9bc90"
        fillOpacity=".45"
        stroke="#a4b88a"
        strokeWidth="1"
      />
      <path
        d="M31 113c34 3 67-18 107-68"
        stroke="#8cA56c"
        strokeWidth="1.5"
        strokeDasharray="3 5"
      />
      <path
        d="m124 47 17-7-2 18"
        stroke="#8ca56c"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M109 157v-51c0-13 9-19 18-23"
        stroke="#6e8950"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M109 133c-27 2-35-15-32-34 23-1 38 14 32 34Z" fill="#8EA66B" />
      <path d="M109 114c-2-25 13-39 36-38 4 22-11 40-36 38Z" fill="#a3b889" />
      <path d="m88 111 21 22m0-20 23-25" stroke="#dbe7cb" strokeWidth="1" />
      <rect x="94" y="153" width="31" height="12" rx="3" fill="#d8b8a0" />
      <path d="M97 164h25l-3 13h-19l-3-13Z" fill="#d3ad92" />
      <circle cx="47" cy="70" r="15" fill="#fff9d6" stroke="#d7d9b8" />
      <path
        d="M48 62v16m4-12h-6a3 3 0 0 0 0 6h3a3 3 0 0 1 0 6h-6"
        stroke="#aaa96f"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Metric({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Wallet;
}) {
  return (
    <div className="metric-card">
      <div className="metric-top">
        <span>{label}</span>
        <span className="metric-icon">
          <Icon />
        </span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-foot">
        <ArrowUpRight />
        <span>{note}</span>
      </div>
    </div>
  );
}
function MoneyToggle({
  real,
  setReal,
}: {
  real: boolean;
  setReal: (b: boolean) => void;
}) {
  return (
    <div className="segmented" aria-label="Projection value basis">
      <button aria-pressed={!real} onClick={() => setReal(false)}>
        Nominal
      </button>
      <button aria-pressed={real} onClick={() => setReal(true)}>
        Today's MYR
      </button>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement;
    const node = ref.current;
    node?.querySelector<HTMLElement>("button")?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && node) {
        const items = Array.from(
          node.querySelectorAll<HTMLElement>(
            'button,a,input,select,[tabindex="0"]',
          ),
        );
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = overflow;
      prev?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const [profile, setProfile] = useState<FinancialProfile>(() =>
    structuredClone(defaultProfile),
  );
  const [view, setView] = useState<View>("overview");
  const [mode, setMode] = useState<"quick" | "advanced">("quick");
  const [step, setStep] = useState(0);
  const [real, setReal] = useState(false);
  const [accounts, setAccounts] = useState(false);
  const [edited, setEdited] = useState(false);
  const [modal, setModal] = useState<
    "how" | "share" | "reset" | "assumptions" | null
  >(null);
  const [toast, setToast] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const reduced = useReducedMotion();
  const deferred = useDeferredValue(profile);
  const errors = useMemo(() => validateProfile(deferred), [deferred]);
  const result = useMemo(
    () => (errors.length ? null : findRetirement(deferred)),
    [deferred, errors],
  );
  const changeProfile = (next: FinancialProfile) => {
    setProfile(next);
    setEdited(true);
  };
  const go = (next: View) => {
    setView(next);
    window.scrollTo({ top: 0, behavior: reduced ? "instant" : "smooth" });
  };
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(id);
  }, [toast]);
  const closeModal = useMemo(() => () => setModal(null), []);
  const summary = result
    ? `CukupDuit — ${result.retirementAge === null ? "Retirement not yet feasible" : `Estimated financial freedom at age ${number(result.retirementAge)} (${result.retirementYear})`}. Projected accessible retirement assets: ${money(result.simulation.retirementAccessibleAssets)}. Required accessible capital: ${money(result.simulation.requiredCapital)}. Planning through age ${profile.lifeExpectancy}. Inheritance ${result.simulation.inheritanceMet ? "funded" : "not fully funded"}. Deterministic assumptions, not a guarantee. https://lumbanon.github.io/cukupduit/`
    : "CukupDuit — Please review your inputs.";
  const exportJSON = () => {
    downloadFile(
      new Blob([JSON.stringify({ version: 1, profile }, null, 2)], {
        type: "application/json",
      }),
      "cukupduit-plan.json",
    );
    setToast("Your plan was exported to your device.");
  };
  const importJSON = async (file: File) => {
    try {
      if (file.size > 1_000_000)
        throw new Error("Choose a plan smaller than 1 MB.");
      const data: unknown = JSON.parse(await file.text());
      const imported = parseProfile(
        typeof data === "object" && data !== null && "profile" in data
          ? (data as { profile: unknown }).profile
          : data,
      );
      changeProfile(imported);
      setToast(
        "Plan imported. Your previous session inputs have been replaced.",
      );
    } catch (e) {
      setToast(
        e instanceof Error ? e.message : "This file could not be imported.",
      );
    }
  };
  const image = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 720;
    const c = canvas.getContext("2d");
    if (!c) return;
    c.fillStyle = "#FAFAF7";
    c.fillRect(0, 0, 1200, 720);
    c.fillStyle = "#e5ecdb";
    c.fillRect(45, 45, 1110, 630);
    c.fillStyle = "#6b8251";
    c.font = "bold 30px sans-serif";
    c.fillText("CukupDuit", 95, 110);
    c.fillStyle = "#30352D";
    c.font = "48px sans-serif";
    c.fillText("Your future, a little clearer.", 95, 200);
    c.font = "110px sans-serif";
    c.fillText(
      result?.retirementAge === null
        ? "Keep exploring"
        : `Age ${result?.retirementAge === undefined ? "—" : number(result.retirementAge)}`,
      90,
      345,
    );
    c.font = "23px sans-serif";
    c.fillText(
      `Accessible retirement assets: ${money(result?.simulation.retirementAccessibleAssets ?? 0)}`,
      95,
      425,
    );
    c.fillText(
      `Required accessible capital: ${money(result?.simulation.requiredCapital ?? 0)}`,
      95,
      470,
    );
    c.fillText(
      `Planning through age ${profile.lifeExpectancy} · ${result?.simulation.inheritanceMet ? "Legacy funded" : "Legacy needs attention"}`,
      95,
      515,
    );
    c.fillStyle = "#74796F";
    c.font = "17px sans-serif";
    c.fillText(
      "Illustrative projection. Outcomes are uncertain. Educational planning tool.",
      95,
      600,
    );
    c.fillText("lumbanon.github.io/cukupduit", 95, 630);
    canvas.toBlob((blob) => {
      if (blob) downloadFile(blob, "cukupduit-summary.png");
    }, "image/png");
    setModal(null);
  };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Brand onClick={() => go("overview")} />
        <div className="brand-caption">Know when you've got enough.</div>
        <div className="nav-label">YOUR WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {nav.map((n) => (
            <button
              key={n.id}
              className={view === n.id ? "active" : ""}
              aria-current={view === n.id ? "page" : undefined}
              onClick={() => go(n.id)}
            >
              <n.icon />
              <span>{n.label}</span>
              {view === n.id && <i className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-note">
            <ShieldCheck />
            <strong>Your numbers stay yours.</strong>Everything is calculated on
            your device. No accounts, no tracking, no automatic saving.
          </div>
          <div className="sidebar-footer">
            <Sprout />
            <span>A little clarity. A bigger future.</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Your workspace
            <ChevronRight size={12} />
            <strong>{nav.find((n) => n.id === view)?.label}</strong>
          </div>
          <Brand mobile onClick={() => go("overview")} />
          <div className="top-actions">
            <span className="local-badge">
              <LockKeyhole />
              Private by design
            </span>
            <button
              className="icon-button"
              title="Import saved plan"
              aria-label="Import saved plan"
              onClick={() => fileRef.current?.click()}
            >
              <Upload />
            </button>
            <button
              className="icon-button"
              title="Export plan as JSON"
              aria-label="Export plan as JSON"
              onClick={exportJSON}
            >
              <Download />
            </button>
            <button
              className="icon-button"
              title="Share summary"
              aria-label="Share summary"
              onClick={() => setModal("share")}
            >
              <Share2 />
            </button>
            <button
              className="icon-button"
              title="Reset plan"
              aria-label="Reset plan"
              onClick={() => setModal("reset")}
            >
              <RefreshCcw />
            </button>
            <div className="avatar" aria-hidden="true">
              <Leaf size={15} />
            </div>
          </div>
          <input
            type="file"
            accept=".json,application/json"
            className="sr-only"
            tabIndex={-1}
            ref={fileRef}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importJSON(f);
              e.target.value = "";
            }}
          />
        </header>
        <main className="main-content" id="main">
          <div className="page-heading">
            <div>
              <div className="page-eyebrow">A LIFE WELL PLANNED</div>
              <h1>
                {view === "overview"
                  ? "Your future, a little clearer."
                  : view === "plan"
                    ? "Every good future starts with a plan."
                    : view === "scenarios"
                      ? "Small changes. Different futures."
                      : "Find your next best step."}
              </h1>
              <p>
                {view === "overview"
                  ? "A little planning today. More freedom tomorrow."
                  : view === "plan"
                    ? "Start with what you know. Refine as you go."
                    : view === "scenarios"
                      ? "Explore the possibilities behind your financial freedom."
                      : "Turn your financial picture into a little more possibility."}
              </p>
            </div>
            <span className="example-pill">
              <i />
              {edited ? "Your session plan" : "Illustrative example plan"}
            </span>
          </div>
          {errors.length > 0 && (
            <div className="error-banner" role="alert">
              <strong>A few inputs need attention.</strong>
              {errors.map((e, i) => (
                <div key={i}>{e}</div>
              ))}
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 7 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: reduced ? 1 : 0 }}
              transition={{ duration: 0.18 }}
            >
              {view === "overview" && result && (
                <Overview
                  profile={deferred}
                  result={result}
                  real={real}
                  setReal={setReal}
                  accounts={accounts}
                  setAccounts={setAccounts}
                  onPlan={() => {
                    setStep(0);
                    go("plan");
                  }}
                  onHow={() => setModal("how")}
                  onInsights={() => go("insights")}
                />
              )}
              {view === "plan" && (
                <>
                  <div className="planner-intro">
                    <div>
                      <h2>Let's make this yours.</h2>
                      <p>
                        Inputs stay in this session. Export your plan to keep a
                        copy.
                      </p>
                    </div>
                    <div className="segmented" aria-label="Planning mode">
                      <button
                        aria-pressed={mode === "quick"}
                        onClick={() => setMode("quick")}
                      >
                        Quick mode
                      </button>
                      <button
                        aria-pressed={mode === "advanced"}
                        onClick={() => setMode("advanced")}
                      >
                        Advanced mode
                      </button>
                    </div>
                  </div>
                  <div className="planner-layout">
                    <div className="planner-card">
                      <Planner
                        profile={profile}
                        onChange={changeProfile}
                        mode={mode}
                        step={step}
                        onStepChange={setStep}
                        onResults={() => go("overview")}
                      />
                    </div>
                    <aside
                      className="planner-aside"
                      aria-label="Live retirement estimate"
                    >
                      <h3>Your CukupDuit age</h3>
                      <div className="aside-age">
                        {result?.retirementAge === undefined || result.retirementAge === null
                          ? "—"
                          : number(result.retirementAge)}
                        <span> years</span>
                      </div>
                      <p>
                        {result?.retirementAge === null
                          ? "This plan needs a few more adjustments."
                          : `That's ${result?.yearsUntilRetirement === undefined || result.yearsUntilRetirement === null ? "—" : number(result.yearsUntilRetirement)} years to a little more freedom.`}
                      </p>
                      <div className="aside-divider" />
                      <div className="aside-row">
                        <span>Accessible capital</span>
                        <strong>
                          {money(
                            result?.simulation.retirementAccessibleAssets ?? 0,
                            true,
                          )}
                        </strong>
                      </div>
                      <div className="aside-row">
                        <span>Required capital</span>
                        <strong>
                          {money(result?.simulation.requiredCapital ?? 0, true)}
                        </strong>
                      </div>
                      <div className="aside-row">
                        <span>Planning horizon</span>
                        <strong>Age {profile.lifeExpectancy}</strong>
                      </div>
                      <div className="aside-divider" />
                      <p className="small-note">
                        Live projections use your assumptions. Future returns
                        and outcomes are uncertain.
                      </p>
                    </aside>
                  </div>
                </>
              )}
              {view === "scenarios" && result && (
                <Scenarios
                  profile={deferred}
                  onChange={changeProfile}
                  real={real}
                  setReal={setReal}
                />
              )}
              {view === "insights" && result && (
                <Insights
                  profile={deferred}
                  result={result}
                  real={real}
                  setReal={setReal}
                />
              )}
            </motion.div>
          </AnimatePresence>
          <footer className="main-footer">
            <span>
              Made for your peace of mind. CukupDuit is an educational planning
              tool.
              <br />
              Projections are based on assumptions and do not guarantee future
              results.
            </span>
            <div className="footer-links">
              <button onClick={() => setModal("assumptions")}>
                Assumptions & privacy
              </button>
              <a
                href="https://github.com/lumbanon/cukupduit"
                target="_blank"
                rel="noreferrer"
              >
                Open source{" "}
                <ArrowUpRight size={10} style={{ display: "inline" }} />
              </a>
            </div>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {modal === "how" && (
        <Modal title="A clearer future, in a few steps." onClose={closeModal}>
          <p>
            CukupDuit tests retirement ages using your complete monthly plan,
            through your chosen planning horizon.
          </p>
          <div className="how-steps">
            {[
              [
                "Start where you are",
                "Add your age, savings and the amount you can put aside each month.",
              ],
              [
                "Make room for life",
                "Include your retirement lifestyle, children, education and the legacy you want to leave.",
              ],
              [
                "Explore your enough",
                "Compare assumptions and discover which changes could bring financial freedom closer.",
              ],
            ].map(([h, p], i) => (
              <div className="how-step" key={h}>
                <span>{i + 1}</span>
                <div>
                  <h3>{h}</h3>
                  <p>{p}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="modal-actions">
            <button
              className="primary-button"
              onClick={() => {
                setModal(null);
                go("plan");
              }}
            >
              Let's build my plan
              <ArrowRight />
            </button>
          </div>
        </Modal>
      )}
      {modal === "share" && (
        <Modal title="Share a little clarity." onClose={closeModal}>
          <p>
            Your summary includes financial values and your retirement estimate.
            Share it only with people you trust. Copying or downloading happens
            on your device; CukupDuit does not send your plan anywhere.
          </p>
          <div className="form-note">{summary}</div>
          <div className="modal-actions">
            <button className="subtle-button" onClick={image}>
              <ArrowDownToLine />
              Download image
            </button>
            <button
              className="primary-button"
              onClick={() => {
                void navigator.clipboard
                  .writeText(summary)
                  .then(() => {
                    setToast("Summary copied.");
                    setModal(null);
                  })
                  .catch(() =>
                    setToast(
                      "Clipboard unavailable. Download a summary image instead.",
                    ),
                  );
              }}
            >
              Copy summary
              <Share2 />
            </button>
          </div>
        </Modal>
      )}
      {modal === "reset" && (
        <Modal title="Start with a fresh perspective?" onClose={closeModal}>
          <p>
            This replaces your current session with the illustrative example
            plan. Export your JSON first if you want to keep your inputs.
          </p>
          <div className="modal-actions">
            <button className="subtle-button" onClick={closeModal}>
              Keep my plan
            </button>
            <button
              className="primary-button"
              onClick={() => {
                setProfile(structuredClone(defaultProfile));
                setEdited(false);
                setStep(0);
                setModal(null);
                setToast("Example plan restored.");
              }}
            >
              Reset to example
              <RefreshCcw />
            </button>
          </div>
        </Modal>
      )}
      {modal === "assumptions" && (
        <Modal title="Clear assumptions. Private numbers." onClose={closeModal}>
          <Assumptions />
        </Modal>
      )}
    </div>
  );
}

function Overview({
  profile,
  result,
  real,
  setReal,
  accounts,
  setAccounts,
  onPlan,
  onHow,
  onInsights,
}: {
  profile: FinancialProfile;
  result: RetirementResult;
  real: boolean;
  setReal: (b: boolean) => void;
  accounts: boolean;
  setAccounts: (b: boolean) => void;
  onPlan: () => void;
  onHow: () => void;
  onInsights: () => void;
}) {
  const s = result.simulation;
  const current = s.points[0];
  const targetAge = result.retirementAge ?? s.retirementAge;
  const factor = real
    ? Math.pow(1 + profile.inflation, targetAge - profile.currentAge)
    : 1;
  const progress =
    s.requiredCapital > 0
      ? Math.min(
          100,
          Math.max(
            0,
            ((current?.accessibleAssets ?? 0) /
              (s.requiredCapital /
                Math.pow(
                  1 + profile.inflation,
                  targetAge - profile.currentAge,
                ))) *
              100,
          ),
        )
      : 100;
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-overline">
            <Sprout />
            GROW INTO YOUR NEXT CHAPTER
          </div>
          <h2>
            When Will You Have <br />
            <em>Cukup Duit?</em>
          </h2>
          <p>
            Discover when you can achieve financial freedom, plan your ideal
            retirement, and see how today's decisions shape your future.
          </p>
          <div className="hero-buttons">
            <button className="primary-button" onClick={onPlan}>
              Calculate My Financial Freedom
              <ArrowRight size={14} />
            </button>
            <button className="text-button" onClick={onHow}>
              <CirclePlay size={15} />
              How It Works
            </button>
          </div>
        </div>
        <div className="hero-result">
          <div className="result-kicker">
            <Sparkles />
            YOUR CUKUPDUIT AGE
          </div>
          {result.retirementAge !== null ? (
            <div className="hero-age">
              {number(result.retirementAge)}
              <span>years old</span>
            </div>
          ) : (
            <div className="empty-result">
              A little more planning
              <br />
              could get you there.
            </div>
          )}
          <p>
            {result.retirementAge !== null
              ? `You're on track to have enough for your next chapter in ${result.retirementYear}.`
              : "Retirement is not feasible within your planning horizon."}
          </p>
          <div className="hero-result-bottom">
            {result.retirementAge !== null ? (
              <>
                <Check />
                Sustainable to age {profile.lifeExpectancy}, under these
                assumptions
              </>
            ) : (
              <>
                <CircleHelp />
                Explore your plan and the insights below
              </>
            )}
          </div>
          <GrowthIllustration />
        </div>
      </section>
      {result.retirementAge === null && (
        <div className="error-banner">
          {result.explanation} Cumulative unfunded amount: {money(s.shortfall)}.
          The chart shows your evaluated plan at age {number(s.retirementAge)}.
        </div>
      )}
      <section className="metric-grid" aria-label="Your retirement estimate">
        <Metric
          label="Years to financial freedom"
          value={
            result.yearsUntilRetirement === null
              ? "Not yet feasible"
              : `${number(result.yearsUntilRetirement)} years`
          }
          note={
            result.retirementYear
              ? `Your next chapter starts in ${result.retirementYear}`
              : "Adjust savings, spending or your horizon"
          }
          icon={Clock3}
        />
        <Metric
          label="Required accessible capital"
          value={money(s.requiredCapital / factor, true)}
          note={
            real
              ? "In today's purchasing power"
              : "At retirement, using the full simulation"
          }
          icon={Target}
        />
        <Metric
          label="Projected accessible assets"
          value={money(s.retirementAccessibleAssets / factor, true)}
          note={
            real
              ? "In today's purchasing power"
              : "Available when retirement begins"
          }
          icon={Wallet}
        />
        <Metric
          label="Monthly retirement lifestyle"
          value={money(s.monthlyRetirementSpending / factor)}
          note="Including travel & healthcare budgets"
          icon={Heart}
        />
      </section>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Your wealth, over time</h2>
              <p>From the life you have to the life you're building.</p>
            </div>
            <MoneyToggle real={real} setReal={setReal} />
          </div>
          <div className="chart-legend">
            <span>
              <i className="legend-line" />
              Net worth
            </span>
            <span>
              <i className="legend-line dashed" />
              Accessible investments
            </span>
          </div>
          <WealthChart
            simulation={s}
            profile={profile}
            real={real}
            showAccounts={accounts}
          />
          <div className="chart-footer">
            <span>
              <CalendarDays />
              Age {profile.currentAge}–{profile.lifeExpectancy} ·{" "}
              {real ? "Today's MYR" : "Nominal MYR"}
            </span>
            <button
              className="text-button"
              aria-pressed={accounts}
              onClick={() => setAccounts(!accounts)}
            >
              {accounts ? "Hide" : "Show"} account breakdown
              <ChevronRight size={10} />
            </button>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>A little of everything</h2>
              <p>Your current asset mix.</p>
            </div>
            <Wallet size={16} color="#9aa58b" />
          </div>
          <AllocationChart profile={profile} />
        </section>
      </div>
      <div className="dashboard-grid">
        <section className="panel progress-panel">
          <h2>Every ringgit is a step closer.</h2>
          <div className="progress-heading">
            <span>Your accessible capital progress</span>
            <strong>{number(progress)}%</strong>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="Current accessible assets toward required capital in today's money"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-footer">
            <span>{money(current?.accessibleAssets ?? 0, true)} today</span>
            <span>
              Target:{" "}
              {money(
                s.requiredCapital /
                  Math.pow(
                    1 + profile.inflation,
                    targetAge - profile.currentAge,
                  ),
                true,
              )}{" "}
              in today's MYR
            </span>
          </div>
        </section>
        <section className="panel progress-panel">
          <h2>A legacy to look forward to.</h2>
          <div className="progress-heading">
            <span>Inheritance at age {profile.legacy.distributionAge}</span>
            <span
              className={`status-chip ${s.inheritanceMet ? "" : "caution"}`}
            >
              {s.inheritanceMet ? (
                <Check size={11} />
              ) : (
                <CircleHelp size={11} />
              )}{" "}
              {s.inheritanceMet ? "Funded" : "Needs attention"}
            </span>
          </div>
          <p className="small-note" style={{ marginTop: 14 }}>
            Target {money(s.inheritanceTarget, true)} · projected distribution{" "}
            {money(s.inheritanceFunded, true)}. Evaluated at your chosen date.
          </p>
        </section>
      </div>
      <div className="insight-strip">
        <Sparkles />
        <div>
          <h3>Your future has room to grow.</h3>
          <p>
            A few small, consistent changes could bring financial freedom
            closer. See what your numbers say.
          </p>
        </div>
        <button className="text-button" onClick={onInsights}>
          Explore your insights
          <ArrowRight size={13} />
        </button>
      </div>
      <details className="panel details-panel">
        <summary>What sits behind your CukupDuit age?</summary>
        <p>{result.explanation}</p>
        <p>
          Projected total net worth at retirement: {money(s.retirementNetWorth)}
          . Net worth includes illiquid property and restricted investments;
          only accessible liquid assets can fund withdrawals.
        </p>
        <p>
          Required accessible capital is the minimum total accessible portfolio
          needed at retirement after retaining restricted accounts and property.
          It is found by rerunning the monthly simulation. It is not a 4% rule
          estimate.
        </p>
        <p>
          The optional 4% heuristic gives{" "}
          {money(
            (profile.retirement.monthlySpending * 12 +
              profile.retirement.annualTravel +
              profile.retirement.annualHealthcare) /
              0.04,
          )}{" "}
          in your entered spending basis. It does not account for your exact
          horizon, restrictions, family or legacy obligations and is not a
          guaranteed safe withdrawal rate.
        </p>
        {s.warnings.map((w) => (
          <p key={w}>{w}</p>
        ))}
      </details>
    </>
  );
}

function Scenarios({
  profile,
  onChange,
  real,
  setReal,
}: {
  profile: FinancialProfile;
  onChange: (p: FinancialProfile) => void;
  real: boolean;
  setReal: (b: boolean) => void;
}) {
  const scenarios = useMemo(() => compareScenarios(profile), [profile]);
  const change = (key: keyof FinancialProfile["customScenario"], v: number) =>
    onChange({
      ...profile,
      customScenario: { ...profile.customScenario, [key]: v },
    });
  return (
    <div className="view-stack">
      <div className="scenario-cards">
        {scenarios.map((s) => (
          <section
            className={`scenario-card ${s.id === "base" ? "base" : ""}`}
            key={s.id}
          >
            <h3>{s.name}</h3>
            <div className="scenario-age">
              {s.result.retirementAge === null ? "—" : number(s.result.retirementAge)}
              <span>
                {s.result.retirementAge === null ? "not feasible" : "years old"}
              </span>
            </div>
            <p>
              Returns {s.assumptions.returnAdjustment >= 0 ? "+" : ""}
              {number(s.assumptions.returnAdjustment * 100)} pp
              <br />
              Inflation {s.assumptions.inflationAdjustment >= 0 ? "+" : ""}
              {number(s.assumptions.inflationAdjustment * 100)} pp
              <br />
              Spending ×{number(s.assumptions.spendingMultiplier)}
            </p>
          </section>
        ))}
      </div>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Four ways your future could unfold</h2>
            <p>
              Each line uses that scenario's earliest feasible retirement age,
              or the target age if no candidate is feasible.
            </p>
          </div>
          <MoneyToggle real={real} setReal={setReal} />
        </div>
        <ScenarioChart scenarios={scenarios} profile={profile} real={real} />
      </section>
      <section className="planner-card">
        <div className="section-heading">
          <div>
            <h2>Make room for your own what-if.</h2>
            <p>
              Custom adjustments are relative to your base plan. Percentage
              points apply to annual rates.
            </p>
          </div>
          <SlidersHorizontal size={19} color="#8EA66B" />
        </div>
        <div className="form-grid">
          <Field
            label="Return adjustment"
            value={profile.customScenario.returnAdjustment * 100}
            onChange={(v) => change("returnAdjustment", v / 100)}
            min={-20}
            max={20}
            step={0.5}
            suffix="pp"
          />
          <Field
            label="Inflation adjustment"
            value={profile.customScenario.inflationAdjustment * 100}
            onChange={(v) => change("inflationAdjustment", v / 100)}
            min={-10}
            max={20}
            step={0.5}
            suffix="pp"
          />
          <Field
            label="Contribution growth adjustment"
            value={profile.customScenario.contributionGrowthAdjustment * 100}
            onChange={(v) => change("contributionGrowthAdjustment", v / 100)}
            min={-20}
            max={30}
            step={0.5}
            suffix="pp"
          />
          <Field
            label="Retirement spending multiplier"
            value={profile.customScenario.spendingMultiplier}
            onChange={(v) => change("spendingMultiplier", v)}
            min={0}
            max={3}
            step={0.05}
            suffix="×"
          />
          <Field
            label="Fee adjustment"
            value={profile.customScenario.feeAdjustment * 100}
            onChange={(v) => change("feeAdjustment", v / 100)}
            min={-5}
            max={5}
            step={0.1}
            suffix="pp"
          />
        </div>
        <div className="form-note">
          These are deterministic illustrations, not probability forecasts.
          Higher returns are uncertain. Rate assumptions are bounded to valid
          simulation ranges.
        </div>
      </section>
    </div>
  );
}

function Insights({
  profile,
  result,
  real,
  setReal,
}: {
  profile: FinancialProfile;
  result: RetirementResult;
  real: boolean;
  setReal: (b: boolean) => void;
}) {
  const options = useMemo(() => optimizeRetirement(profile), [profile]);
  const s = result.simulation;
  const retirementFactor = Math.pow(
    1 + profile.inflation,
    s.retirementAge - profile.currentAge,
  );
  const extraForTarget = useMemo(
    () =>
      profile.targetRetirementAge === undefined
        ? null
        : additionalSavingsForTarget(profile, profile.targetRetirementAge),
    [profile],
  );
  const familyImpact = useMemo(
    () =>
      profile.children.length
        ? findRetirement({
            ...profile,
            children: [],
            legacy: {
              ...profile.legacy,
              totalAmount:
                profile.legacy.totalAmount +
                profile.legacy.perChild * profile.children.length,
              perChild: 0,
            },
          })
        : null,
    [profile],
  );
  const top = [...profile.accounts].sort((a, b) => b.balance - a.balance)[0];
  return (
    <div className="view-stack">
      <div className="optimizer-heading">
        <div className="hero-overline">
          <Sparkles />
          YOUR NEXT CHAPTER, A LITTLE SOONER
        </div>
        <h2>How Can You Have Cukup Duit Earlier?</h2>
        <p>
          Each option reruns your complete monthly plan. Only calculated
          improvements are marked as time saved.
        </p>
      </div>
      <section className="panel">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>What you could change</th>
                <th>Original age</th>
                <th>New age</th>
                <th>Time saved</th>
                <th>Legacy / plan</th>
              </tr>
            </thead>
            <tbody>
              {options.map((o) => (
                <tr key={o.id}>
                  <td>
                    {o.title}
                    <small>
                      {o.description}
                      {o.uncertain ? " · Uncertain market assumption" : ""}
                      {o.additionalMonthlySavings > 0
                        ? ` · +${money(o.additionalMonthlySavings)}/month`
                        : ""}
                    </small>
                  </td>
                  <td>
                    {result.retirementAge === null
                      ? "Not feasible"
                      : number(result.retirementAge)}
                  </td>
                  <td>
                    {o.retirementAge === null
                      ? "Not feasible"
                      : number(o.retirementAge)}
                  </td>
                  <td>
                    <span
                      className={`status-chip ${o.improves ? "" : "caution"}`}
                    >
                      {o.improves
                        ? result.retirementAge === null
                          ? "Now feasible"
                          : `${number(o.yearsSaved)} years`
                        : "No earlier age"}
                    </span>
                  </td>
                  <td>
                    {o.inheritanceMet ? "Funded" : "Shortfall"} /{" "}
                    {o.sustainable ? "sustainable" : "unfunded"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="info-grid">
        <section className="info-card">
          <TrendingUp />
          <h3>Inflation changes what enough looks like.</h3>
          <p>
            At the evaluated retirement age of {number(s.retirementAge)}, your
            monthly lifestyle is {money(s.monthlyRetirementSpending)} nominal,
            or {money(s.monthlyRetirementSpending / retirementFactor)} in
            today's purchasing power. Your inflation assumption is{" "}
            {number(profile.inflation * 100)}% per year.
          </p>
        </section>
        <section className="info-card">
          <LockKeyhole />
          <h3>Timing matters as much as total wealth.</h3>
          <p>
            {money(s.points[0]?.restrictedAssets ?? 0)} is currently restricted.
            Investments open at your configured withdrawal ages; property
            becomes spendable only after a configured sale.{" "}
            {top
              ? `${top.name} is your largest current asset, at ${money(top.balance)}.`
              : "Add an investment account to start your wealth projection."}
          </p>
        </section>
        <section className="info-card">
          <HeartHandshake />
          <h3>Room for the people you love.</h3>
          <p>
            Your plan includes {profile.children.length}{" "}
            {profile.children.length === 1 ? "child" : "children"} and{" "}
            {money(s.childCosts)} in projected support, education and gifts
            across the full horizon. Household-included costs are excluded from
            additional withdrawals.
            {familyImpact && (
              <>
                {" "}
                With the same total legacy and no child expenses, financial
                freedom is{" "}
                {familyImpact.retirementAge === null
                  ? "still infeasible"
                  : `estimated at age ${number(familyImpact.retirementAge)}`}
                ; required accessible capital is{" "}
                {money(familyImpact.simulation.requiredCapital, true)}.
              </>
            )}
          </p>
        </section>
        <section className="info-card">
          <Target />
          <h3>
            {profile.targetRetirementAge
              ? "Your target, put to the test."
              : "Your legacy, at the right time."}
          </h3>
          <p>
            {result.targetSimulation
              ? `Retirement at your target age ${profile.targetRetirementAge} is ${result.targetSimulation.feasible ? "feasible under your assumptions" : `not yet feasible, with ${money(result.targetSimulation.shortfall)} in cumulative unfunded obligations`}. `
              : ""}
            Your {money(s.inheritanceTarget)} inheritance target is{" "}
            {s.inheritanceMet ? "funded" : "not fully funded"} at age{" "}
            {profile.legacy.distributionAge}.
            {profile.targetRetirementAge !== undefined && (
              <>
                {" "}
                {extraForTarget === null
                  ? "Additional savings alone cannot fund this target under the current assumptions."
                  : extraForTarget > 0
                    ? `An additional ${money(extraForTarget)} per month could fund your target age under the same assumptions.`
                    : "Your current savings budget already supports this target."}
              </>
            )}
          </p>
        </section>
      </div>
      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>Your retirement cash flow</h2>
            <p>
              Annual living expenses, investment growth and portfolio
              withdrawals.
            </p>
          </div>
          <MoneyToggle real={real} setReal={setReal} />
        </div>
        <CashflowChart simulation={s} profile={profile} real={real} />
      </div>
      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>For their next chapter, too.</h2>
            <p>
              Support, education, university funding and gifts, by your age.
            </p>
          </div>
          <Heart size={18} color="#D8A2A2" />
        </div>
        <FamilyChart simulation={s} profile={profile} real={real} />
      </div>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Your net worth, with the full picture.</h2>
            <p>Current balances, before future contributions and growth.</p>
          </div>
        </div>
        <div className="net-worth-grid">
          {[
            ["Total assets", s.points[0]?.totalAssets ?? 0],
            ["Total liabilities", s.points[0]?.liabilities ?? 0],
            ["Net worth", s.points[0]?.netWorth ?? 0],
            ["Investable assets", s.points[0]?.investableAssets ?? 0],
            ["Accessible assets", s.points[0]?.accessibleAssets ?? 0],
            ["Illiquid assets", s.points[0]?.illiquidAssets ?? 0],
          ].map(([label, v]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{money(Number(v))}</strong>
            </div>
          ))}
        </div>
      </section>
      <details className="panel details-panel">
        <summary>Understand the model before making a decision</summary>
        <Assumptions />
      </details>
    </div>
  );
}

function Assumptions() {
  return (
    <>
      <p>
        All calculations run locally in this browser. We do not use cookies,
        localStorage, accounts, analytics, or a backend. Refreshing starts a new
        session. Exported JSON contains your inputs and custom scenario, so keep
        that file private.
      </p>
      <p>
        Returns are deterministic effective annual rates, converted monthly
        using (1 + annual rate)^(1/12) − 1. Contributions, returns, fees, taxes
        and withdrawals follow the timing documented in the repository.
        Investment returns, inflation and financial outcomes are uncertain.
      </p>
      <p>
        Account contributions allocate your savings budget; they are not added a
        second time. Family costs marked as included in your household are not
        charged again. Property mortgages are tracked separately from other
        liabilities; do not also enter the same mortgage as a debt.
      </p>
      <p>
        EPF access ages and ASNB returns are editable assumptions, not
        statements of current withdrawal policy or product eligibility. The
        model does not implement all product rules, tax law, estate law or
        investment volatility. Legal estate planning requires separate advice.
      </p>
      <p>
        Every candidate month is simulated through your chosen life expectancy.
        Monthly cash flows respect withdrawal eligibility and priority; illiquid
        property cannot meet a cash shortfall before sale. A result is feasible
        only when spending, family obligations, reserve and dated legacy goals
        can be funded.
      </p>
      <p>
        Required capital is a simulation-derived accessible cash requirement
        with restricted assets and future property sales retained. It assumes
        pre-retirement obligations have been met and cannot erase earlier
        shortfalls. Inheritance is distributed
        at its configured date rather than ring-fenced at retirement. The
        planning horizon is an assumption; living longer can change the result.
      </p>
      <p>
        CukupDuit provides educational financial planning, not personalized
        professional financial advice. Use multiple scenarios and review
        assumptions regularly.
      </p>
    </>
  );
}
