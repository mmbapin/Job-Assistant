export type Status =
  | "New"
  | "Saved"
  | "Applied"
  | "Interview"
  | "Rejected"
  | "Offer"
  | "Hidden";
export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  skills: string[];
  level: string;
  posted: string;
  url: string;
  salary: string;
  source: string;
  demo?: boolean;
  status: Status;
};
export type Profile = { name: string; experience: number; skills: string[] };
export type Provider =
  | "Greenhouse"
  | "Lever"
  | "Ashby"
  | "Adzuna"
  | "Custom API"
  | "HTML"
  | "Unsupported";
export type Source = {
  id: string;
  company: string;
  board: string;
  provider: Provider;
  url?: string;
  country?: string;
  category?: "Bangladesh" | "Global";
  enabled?: boolean;
  htmlAllowed?: boolean;
  region?: "global" | "eu";
  titleFilter?: "frontend";
  detection?: string;
  lastSync?: string;
  lastCount?: number;
  error?: string;
};
export type Store = { jobs: Job[]; profile: Profile; sources: Source[] };
export const allSkills = [
  "React",
  "TypeScript",
  "Next.js",
  "Angular",
  "Node.js",
  "JavaScript",
  "GraphQL",
  "AWS",
  "Docker",
  "Redis",
];
export function classify(job: Job) {
  const text = `${job.location} ${job.description}`;
  const evidence = `${job.title}\n${job.description}`
    .split(/[.!\n]+/)
    .find(
      (s) =>
        /visa sponsorship|relocation assistance|relocation package|relocation provided|work permit sponsorship/i.test(
          s,
        ) && !/no |not |without|unavailable|do not|cannot/i.test(s),
    );
  if (/Bangladesh|Dhaka/i.test(job.location))
    return {
      group: "Bangladesh",
      eligible: true,
      note: "Based in Bangladesh",
      evidence,
    };
  if (evidence)
    return {
      group: "Relocation",
      eligible: true,
      note: "Employer mentions relocation or sponsorship; verify terms",
      evidence: evidence.trim(),
    };
  if (
    /US.only|USA.only|United States only|EU.only|UK.only|must (?:be |reside |live ).*(?:United States|Europe|USA|UK)|remote.{0,5}(?:US|USA|United States|UK|Europe)\b/i.test(
      text,
    )
  )
    return {
      group: "Other",
      eligible: false,
      note: "Location restriction excludes Bangladesh",
    };
  if (/worldwide|anywhere|global remote/i.test(text))
    return {
      group: "Global Remote",
      eligible: true,
      note: "Worldwide remote stated by employer",
    };
  if (/APAC|EMEA|remote/i.test(text))
    return {
      group: "Global Remote",
      eligible: false,
      note: "Verify Bangladesh eligibility with employer",
    };
  return {
    group: "Other",
    eligible: false,
    note: "No confirmed Bangladesh eligibility or relocation support",
  };
}
export function match(job: Job, profile: Profile) {
  const location = classify(job);
  const matched = job.skills.filter((s) =>
    profile.skills.some((p) => p.toLowerCase() === s.toLowerCase()),
  );
  const reasons = matched.map((s, i) => ({
    label: s,
    points:
      Math.round(((i + 1) * 55) / Math.max(job.skills.length, 1)) -
      Math.round((i * 55) / Math.max(job.skills.length, 1)),
  }));
  const senior = /senior|lead|staff/i.test(job.title);
  const frontend = /frontend|front.end|full.stack/i.test(job.title);
  if (senior) reasons.push({ label: "Senior-level role", points: 15 });
  if (frontend)
    reasons.push({ label: "Frontend / full-stack focus", points: 15 });
  if (location.eligible) reasons.push({ label: "Location fit", points: 15 });
  const score = Math.min(
    100,
    Math.round((matched.length / Math.max(job.skills.length, 1)) * 55) +
      (senior ? 15 : 0) +
      (frontend ? 15 : 0) +
      (location.eligible ? 15 : 0),
  );
  return {
    score,
    reasons,
    location,
    missing: job.skills.filter((s) => !matched.includes(s)),
  };
}
