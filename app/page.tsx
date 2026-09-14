"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowUpRight,
  Bookmark,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  Compass,
  Globe2,
  LayoutGrid,
  MapPin,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { allSkills, Job, match, Status, Store } from "@/lib/model";
import { Sources } from "./components/sources";
import { seed } from "@/lib/seed";
import { FeedState, fetchJobFeed, feedJobs } from "@/lib/job-feed";
const JOBS_PER_PAGE = 20;
type View =
  | "Discover"
  | "Saved jobs"
  | "Applications"
  | "Sources"
  | "My profile";
export default function Home() {
  const [data, setData] = useState<Store | null>(null),
    [view, setView] = useState<View>("Discover"),
    [query, setQuery] = useState(""),
    [tab, setTab] = useState("All opportunities"),
    [skill, setSkill] = useState(""),
    [level, setLevel] = useState(""),
    [sort, setSort] = useState("match"),
    [selected, setSelected] = useState<Job | null>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [filters, setFilters] = useState(false),
    [verified, setVerified] = useState(false),
    [shownJobs, setShownJobs] = useState(JOBS_PER_PAGE);
  const [feed, setFeed] = useState<FeedState | null>(null),
    [demoJobs, setDemoJobs] = useState<Job[]>(() => seed().jobs);
  const fetching = useRef(false);
  useEffect(() => {
    void sync();
  }, []);
  useEffect(() => {
    setShownJobs(JOBS_PER_PAGE);
  }, [view, query, tab, skill, level, sort, verified, feed]);
  async function mutate(body: object) {
    const change = body as { action?: string; id?: string; status?: Status };
    if (
      change.action === "status" &&
      demoJobs.some((j) => j.id === change.id)
    ) {
      setDemoJobs((jobs) =>
        jobs.map((j) =>
          j.id === change.id ? { ...j, status: change.status! } : j,
        ),
      );
      return true;
    }
    try {
      const r = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setData(d);
      return true;
    } catch (e) {
      setNotice((e as Error).message);
      return false;
    }
  }
  async function sync() {
    if (fetching.current) return;
    fetching.current = true;
    setBusy(true);
    setNotice("");
    try {
      const result = await fetchJobFeed();
      setData((current) => result.data || current || { ...seed(), jobs: [] });
      setFeed(result.feed);
    } finally {
      fetching.current = false;
      setBusy(false);
    }
  }
  if (!data || !feed)
    return (
      <div className="loading">
        <Image
          src="/job-icon.svg"
          alt="Job Assistant"
          width={64}
          height={64}
          priority
        />
        <h2>Fetching real jobs…</h2>
        {notice && <p>{notice}</p>}
      </div>
    );
  const trackingJobs = [
    ...data.jobs.filter((j) => !j.demo),
    ...(feed.mode === "demo" ? demoJobs : []),
  ];
  const visibleJobs =
    view === "Discover" ? feedJobs(data, feed, demoJobs) : trackingJobs;
  const enriched = visibleJobs.map((job) => ({
    ...job,
    ...match(job, data.profile),
    location: job.location,
    eligibility: match(job, data.profile).location,
  }));
  const saved = trackingJobs.filter((j) => j.status === "Saved").length;
  const applications = trackingJobs.filter((j) =>
    ["Applied", "Interview", "Offer", "Rejected"].includes(j.status),
  );
  const jobs = enriched
    .filter(
      (j) =>
        j.status !== "Hidden" &&
        (view !== "Saved jobs" || j.status === "Saved") &&
        (view !== "Applications" ||
          ["Applied", "Interview", "Offer", "Rejected"].includes(j.status)) &&
        (tab === "All opportunities" || j.eligibility.group === tab) &&
        (!skill || j.skills.includes(skill)) &&
        (!level || j.level === level) &&
        (!verified || j.eligibility.eligible) &&
        `${j.title} ${j.company} ${j.skills.join(" ")} ${j.eligibility.group}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "match"
        ? b.score - a.score
        : Date.parse(b.posted) - Date.parse(a.posted),
    );
  const paginatedJobs = jobs.slice(0, shownJobs);
  const active = selected
    ? [...data.jobs.filter((j) => !j.demo), ...demoJobs].find(
        (j) => j.id === selected.id,
      )
    : null;
  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Job Assistant home">
          <Image
            className="brand-icon"
            src="/job-icon.svg"
            alt=""
            width={42}
            height={42}
            priority
          />
          <strong className="brand-name">
            Job
            <br />
            Assistant
          </strong>
        </a>
        <div className="workspace">
          <span className="avatar">B</span>
          <div>
            Personal workspace<small>Let’s find your next chapter</small>
          </div>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {(
            [
              ["Discover", Compass],
              ["Saved jobs", Bookmark],
              ["Applications", BriefcaseBusiness],
              ["Sources", Radio],
            ] as const
          ).map(([name, Icon]) => (
            <button
              key={name}
              className={view === name ? "nav-item active" : "nav-item"}
              onClick={() => {
                setView(name);
                setTab("All opportunities");
              }}
            >
              <Icon size={19} />
              {name}
              {name === "Saved jobs" && saved > 0 && (
                <span className="count">{saved}</span>
              )}
              {name === "Discover" && <span className="new-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile-card">
            <div className="small-icon">
              <Sparkles size={18} />
            </div>
            <strong>Built around you.</strong>
            <p>
              Your skills. Your ambitions.
              <br />
              Your next opportunity.
            </p>
            <button onClick={() => setView("My profile")}>
              Fine-tune your profile <ArrowUpRight size={15} />
            </button>
          </div>
          <button className="nav-item" onClick={() => setView("My profile")}>
            <Settings2 size={18} />
            My profile
          </button>
          <div className="user">
            <span className="avatar user-avatar">
              {data.profile.name[0] || "Y"}
            </span>
            <div>
              {data.profile.name}
              <small>Senior Software Engineer</small>
            </div>
            <span className="online" />
          </div>
        </div>
      </aside>
      <main>
        <header>
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />
            <span>{view}</span>
          </div>
          <div className="header-right">
            <span className="live-dot" /> Your personal job search, in focus{" "}
            <span className="header-avatar">{data.profile.name[0] || "Y"}</span>
          </div>
        </header>
        <div className="content">
          {notice && (
            <div className="notice" role="status">
              {notice}
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          <div className="page-heading">
            <div>
              <div className="eyebrow">A LITTLE CLOSER TO WHAT’S NEXT</div>
              <h1>
                {view === "Discover"
                  ? "Good things are ahead."
                  : view === "Saved jobs"
                    ? "Worth a second look."
                    : view === "Applications"
                      ? "Your next chapter, in motion."
                      : view === "Sources"
                        ? "Go straight to the source."
                        : "Make it your own."}
              </h1>
              <p>
                {view === "Discover"
                  ? "Discover opportunities that fit your skills, your location, and your ambition."
                  : view === "Saved jobs"
                    ? "A shortlist of opportunities you want to come back to."
                    : view === "Applications"
                      ? "Keep every conversation and application in one place."
                      : view === "Sources"
                        ? "Connect public company job boards and collect fresh engineering roles."
                        : "Your profile powers every match. Tell Job Assistant what you bring to the table."}
              </p>
            </div>
            <button className="primary" onClick={sync} disabled={busy}>
              <RefreshCw size={16} className={busy ? "spin" : ""} />
              {busy ? "Collecting…" : "Sync jobs"}
            </button>
          </div>
          {data?.temporary && <div className="feed-banner feed-warning" role="status"><p>Live jobs are fetched from the default sources. Saved jobs, profile edits, and source changes are temporary and may reset between requests or deployments.</p></div>}
          {feed.message && (
            <div
              className={`feed-banner ${feed.reason === "error" ? "feed-error" : "feed-warning"}`}
              role={feed.reason === "error" ? "alert" : "status"}
            >
              <Sparkles size={18} />
              <div>
                <strong>
                  {feed.mode === "demo"
                    ? "Demo preview"
                    : "Some job sources are unavailable"}
                </strong>
                <p>{feed.message}</p>
                {feed.mode === "demo" && (
                  <small>
                    Saved jobs and applications are preserved. Demo changes stay
                    in this session.
                  </small>
                )}
              </div>
              <div className="feed-actions">
                <button onClick={sync} disabled={busy}>
                  {busy ? "Fetching…" : "Retry real jobs"}
                </button>
                <button onClick={() => setView("Sources")}>
                  Manage sources <ArrowUpRight size={14} />
                </button>
              </div>
            </div>
          )}
          {view === "Sources" ? (
            <Sources sources={data.sources} mutate={mutate} />
          ) : view === "My profile" ? (
            <form
              className="panel profile-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                if (
                  await mutate({
                    action: "profile",
                    name: f.get("name"),
                    experience: Number(f.get("experience")),
                    skills: f.getAll("skills"),
                  })
                )
                  setNotice(
                    "Profile saved. Your match scores have been updated.",
                  );
              }}
            >
              <h2>Your candidate profile</h2>
              <label>
                Name
                <input name="name" defaultValue={data.profile.name} required />
              </label>
              <label>
                Years of experience
                <input
                  name="experience"
                  type="number"
                  min="0"
                  max="60"
                  defaultValue={data.profile.experience}
                />
              </label>
              <label>Your skills</label>
              <div className="skill-options">
                {allSkills.map((s) => (
                  <label key={s}>
                    <input
                      type="checkbox"
                      name="skills"
                      value={s}
                      defaultChecked={data.profile.skills.includes(s)}
                    />
                    {s}
                  </label>
                ))}
              </div>
              <p>
                Scores reflect skill coverage, role seniority, frontend focus,
                and location fit. Regional remote roles require verification.
                Experience is recorded for your profile; it is not yet used in
                scoring.
              </p>
              <button className="primary">
                Save profile <Check size={16} />
              </button>
            </form>
          ) : (
            <>
              <div className="stats">
                {[
                  {
                    label: "Opportunities",
                    value: enriched.filter((j) => j.status !== "Hidden").length,
                    icon: BriefcaseBusiness,
                    sub: "Your curated job feed",
                  },
                  {
                    label: "Strong matches",
                    value: enriched.filter(
                      (j) => j.score >= 85 && j.status !== "Hidden",
                    ).length,
                    icon: Target,
                    sub: "85% match or higher",
                  },
                  {
                    label: "Saved for later",
                    value: saved,
                    icon: Bookmark,
                    sub: "Good things to revisit",
                  },
                  {
                    label: "Applications",
                    value: applications.length,
                    icon: ArrowUpRight,
                    sub: "One step closer",
                  },
                ].map((s, i) => (
                  <div className="stat" key={s.label}>
                    <div className="stat-top">
                      {s.label}
                      <s.icon size={18} />
                    </div>
                    <div className="stat-value">
                      {s.value.toString().padStart(2, "0")}
                      <span className={"stat-pill pill-" + i}>
                        {i === 0
                          ? "Curated for you"
                          : i === 1
                            ? "Your sweet spot"
                            : i === 2
                              ? "Shortlisted"
                              : "In progress"}
                      </span>
                    </div>
                    <small>{s.sub}</small>
                  </div>
                ))}
              </div>

              <div className="jobs-heading">
                <h2>
                  {view === "Discover" ? "Your opportunities" : view}{" "}
                  <span>{jobs.length}</span>
                </h2>
                <span className="muted">A better fit, less noise.</span>
              </div>
              <div className="tabs">
                {[
                  "Bangladesh",
                  "Global Remote",
                  "Relocation",
                  "All opportunities",
                ].map((t, i) => (
                  <button
                    key={t}
                    className={tab === t ? "selected" : ""}
                    onClick={() => setTab(t)}
                  >
                    {t === "Global Remote" ? (
                      <Globe2 size={16} />
                    ) : t === "Bangladesh" ? (
                      <MapPin size={16} />
                    ) : t === "Relocation" ? (
                      <ArrowUpRight size={16} />
                    ) : (
                      <LayoutGrid size={16} />
                    )}{" "}
                    {t === "Relocation"
                      ? "Relocation / Visa"
                      : t === "All opportunities"
                        ? "All"
                        : t}
                  </button>
                ))}
              </div>
              <div className="toolbar">
                <div className="search">
                  <Search size={18} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search roles, companies, or skills…"
                    aria-label="Search jobs"
                  />
                  {query && (
                    <button
                      aria-label="Clear search"
                      onClick={() => setQuery("")}
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
                <select
                  aria-label="Filter by technology"
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                >
                  <option value="">All technologies</option>
                  {allSkills.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <button
                  className={filters ? "filter-button on" : "filter-button"}
                  onClick={() => setFilters(!filters)}
                >
                  <SlidersHorizontal size={16} />
                  Filters{(level || verified) && <span className="new-dot" />}
                </button>
                <select
                  aria-label="Sort jobs"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="match">Best match first</option>
                  <option value="date">Newest first</option>
                </select>
              </div>
              {filters && (
                <div className="extra-filters">
                  <select
                    aria-label="Seniority"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                  >
                    <option value="">All seniority levels</option>
                    <option>Senior</option>
                    <option>Lead</option>
                    <option>Staff</option>
                  </select>
                  <label>
                    <input
                      type="checkbox"
                      checked={verified}
                      onChange={(e) => setVerified(e.target.checked)}
                    />
                    Only location matches
                  </label>
                  <button
                    onClick={() => {
                      setSkill("");
                      setLevel("");
                      setVerified(false);
                      setQuery("");
                    }}
                  >
                    Reset filters
                  </button>
                </div>
              )}
              <div className="results-meta">
                <span>
                  Showing <strong>{paginatedJobs.length}</strong> of{" "}
                  <strong>{jobs.length}</strong> opportunities
                </span>
                <span>
                  <span className="tiny-dot" />
                  Matched to your profile
                </span>
              </div>
              <div className="job-list">
                {paginatedJobs.map((j) => (
                  <article key={j.id} className="job-card">
                    <div
                      className={
                        "company-icon logo-" +
                        j.company.toLowerCase().replaceAll(" ", "-")
                      }
                    >
                      {j.company === "Vercel"
                        ? "▲"
                        : j.company === "Linear"
                          ? "◒"
                          : j.company.slice(0, 1)}
                    </div>
                    <div className="job-main">
                      <div className="company-line">
                        {j.company}
                        <span>·</span>
                        <small>
                          {j.demo
                            ? "Demo"
                            : j.source.startsWith("demo")
                              ? "Demo"
                              : "Live listing"}
                        </small>
                        {j.status !== "New" && (
                          <span className="status-tag">{j.status}</span>
                        )}
                      </div>
                      <button
                        className="job-title"
                        onClick={() => setSelected(j)}
                      >
                        {j.title}
                      </button>
                      <div className="job-details">
                        <span>
                          <MapPin size={13} />
                          {j.location}
                        </span>
                        <span className="salary">{j.salary}</span>
                      </div>
                      <div className="tags">
                        {j.skills.slice(0, 5).map((s) => (
                          <span key={s}>{s}</span>
                        ))}
                        {j.eligibility.group === "Relocation" && (
                          <span className="relocation-tag">↗ Relocation</span>
                        )}
                      </div>
                    </div>
                    <div className="job-side">
                      <div className="job-side-top">
                        <button
                          className="match-badge"
                          onClick={() => setSelected(j)}
                        >
                          <span className="tiny-dot" />
                          {j.score}% match
                        </button>
                        <button
                          className={
                            j.status === "Saved" ? "bookmark saved" : "bookmark"
                          }
                          aria-label={
                            j.status === "Saved"
                              ? `Unsave ${j.title}`
                              : `Save ${j.title}`
                          }
                          onClick={() =>
                            mutate({
                              action: "status",
                              id: j.id,
                              status: j.status === "Saved" ? "New" : "Saved",
                            })
                          }
                        >
                          <Bookmark
                            size={19}
                            fill={
                              j.status === "Saved" ? "currentColor" : "none"
                            }
                          />
                        </button>
                      </div>
                      <small>
                        {Math.max(
                          0,
                          Math.floor(
                            (Date.now() - Date.parse(j.posted)) / 86400000,
                          ),
                        ) === 0
                          ? "Today"
                          : `${Math.floor((Date.now() - Date.parse(j.posted)) / 86400000)}d ago`}
                      </small>
                      <button
                        className="view-job"
                        onClick={() => setSelected(j)}
                      >
                        View opportunity <ArrowUpRight size={15} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {paginatedJobs.length < jobs.length && (
                <div
                  className="load-more"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 9,
                    padding: "24px 0 4px",
                  }}
                >
                  <button
                    className="primary"
                    onClick={() =>
                      setShownJobs((count) => count + JOBS_PER_PAGE)
                    }
                  >
                    Load more
                  </button>
                  <span style={{ fontSize: 10, color: "#99a0aa" }}>
                    {jobs.length - paginatedJobs.length} opportunities remaining
                  </span>
                </div>
              )}
              {!jobs.length && (
                <div className="empty">
                  <Search size={32} />
                  <h3>No opportunities here yet</h3>
                  <p>
                    Try another filter, save a role, or connect a new source.
                  </p>
                </div>
              )}
              <footer>
                Thoughtfully curated. Personally matched.
                <span>
                  Made for your next chapter <Sparkles size={13} />
                </span>
              </footer>
            </>
          )}
        </div>
      </main>
      {active &&
        (() => {
          const m = match(active, data.profile);
          return (
            <div className="modal-backdrop" onClick={() => setSelected(null)}>
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="job-dialog-title"
                className="modal"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="close"
                  aria-label="Close job details"
                  onClick={() => setSelected(null)}
                >
                  <X />
                </button>
                <span className="eyebrow">
                  {active.company} {active.demo ? "· DEMO LISTING" : ""}
                </span>
                <h2 id="job-dialog-title">{active.title}</h2>
                <p>
                  {active.location} · {active.salary}
                </p>
                <div className="match-summary">
                  <strong>{m.score}% match</strong>
                  <span>{m.location.note}</span>
                </div>
                <h3>Why this matches you</h3>
                <div className="reasons">
                  {m.reasons.map((r) => (
                    <div key={r.label}>
                      <span>
                        <Check size={14} />
                        {r.label}
                      </span>
                      <strong>+{r.points}</strong>
                    </div>
                  ))}
                </div>
                {m.missing.length > 0 && (
                  <p>Skills to review: {m.missing.join(", ")}</p>
                )}
                {m.location.evidence && (
                  <blockquote>“{m.location.evidence}”</blockquote>
                )}
                <h3>About the opportunity</h3>
                <p className="description">{active.description}</p>
                <div className="modal-actions">
                  <select
                    aria-label="Application status"
                    value={active.status}
                    onChange={(e) =>
                      mutate({
                        action: "status",
                        id: active.id,
                        status: e.target.value as Status,
                      })
                    }
                  >
                    {[
                      "New",
                      "Saved",
                      "Applied",
                      "Interview",
                      "Rejected",
                      "Offer",
                      "Hidden",
                    ].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  {active.url ? (
                    <a
                      className="primary"
                      href={active.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Original listing <ArrowUpRight size={16} />
                    </a>
                  ) : (
                    <span className="muted">
                      Demo job · no application link
                    </span>
                  )}
                </div>
              </section>
            </div>
          );
        })()}
    </div>
  );
}
