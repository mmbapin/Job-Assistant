import { readCareerPage } from "./sources";

type Opening = {
  id?: string | number;
  jobOpeningName?: string;
  departmentLabel?: string;
  location?: { city?: string; state?: string; addressCountry?: string };
  atsLocation?: { city?: string };
  jobOpeningStatus?: string;
  description?: string;
};
export function isWsdMatch(job: Opening) {
  return (
    job.departmentLabel?.trim().toLowerCase() === "development" &&
    (job.atsLocation?.city || job.location?.city)?.trim().toLowerCase() ===
      "dhaka"
  );
}
// Use the public careers endpoints. The legacy embed endpoint is disallowed
// by robots.txt, and is deliberately not used for collection.
export async function collectWsd(read: typeof readCareerPage = readCareerPage) {
  const body = JSON.parse(await read("https://wsd.bamboohr.com/careers/list"));
  if (!Array.isArray(body.result))
    throw Error("Unexpected WSD careers response");
  if (
    typeof body.meta?.totalCount === "number" &&
    body.meta.totalCount > body.result.length
  )
    throw Error("WSD returned an incomplete list of openings");
  const result = [];
  for (const row of body.result as Opening[]) {
    if (!row || !isWsdMatch(row)) continue;
    if (!/^\d+$/.test(String(row.id)))
      throw Error("WSD returned an invalid job ID");
    const response = JSON.parse(
      await read(`https://wsd.bamboohr.com/careers/${row.id}/detail`),
    );
    const job: Opening = response.result?.jobOpening;
    if (!job || !job.jobOpeningName || typeof job.description !== "string")
      throw Error("Unexpected WSD job detail response");
    if (job.jobOpeningStatus !== "Open" || !isWsdMatch(job)) continue;
    result.push({
      id: String(row.id),
      title: job.jobOpeningName.trim(),
      description: job.description,
      location: [
        job.atsLocation?.city || job.location?.city,
        job.location?.state,
        job.location?.addressCountry,
      ]
        .filter(Boolean)
        .join(", "),
      url: `https://wsd.bamboohr.com/careers/${row.id}`,
    });
  }
  return result;
}
