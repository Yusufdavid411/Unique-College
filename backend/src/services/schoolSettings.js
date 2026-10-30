import { z } from "zod";

const shortText = z.string().trim().min(1).max(200);
const longText = z.string().trim().min(1).max(5000);
const website = z.string().trim().min(3).max(253).refine((value) => {
  try {
    const url = new URL(value.startsWith("https://") ? value : `https://${value}`);
    return url.protocol === "https:" && !url.username && !url.password && url.hostname.includes(".") && url.pathname === "/" && !url.search && !url.hash;
  } catch { return false; }
}, "Enter a website domain, for example www.uniquecollegekwali.com");

export const schoolSettingsSchema = z.object({
  institution_name: shortText,
  short_name: shortText,
  location: shortText,
  address: z.string().trim().min(3).max(1000),
  contact_email: z.string().trim().email().max(254),
  contact_phone: z.string().trim().min(5).max(200),
  website,
  motto: shortText,
  established: z.string().trim().min(1).max(100),
  registration_number: z.string().trim().min(1).max(100),
  approval: longText,
  admission_session: shortText,
  about: longText,
  identity: longText,
  profile: longText,
  mission: longText,
  vision: longText,
  philosophy: longText,
  objective: longText
});
export const schoolSettingKeys = Object.keys(schoolSettingsSchema.shape);
export const schoolSettingsPatchSchema = schoolSettingsSchema.partial().strict().refine((value) => Object.keys(value).length > 0, "Choose at least one school detail to update");
const contactKeys = new Set(["address", "contact_email", "contact_phone", "website"]);
const contentKeys = new Set(["about", "identity", "profile", "mission", "vision", "philosophy", "objective"]);
export const schoolSettingGroup = (key) => contactKeys.has(key) ? "contact" : contentKeys.has(key) ? "website" : "identity";

export async function readSchoolSettings(database) {
  const rows = await database.siteSetting.findMany({ where: { key: { in: schoolSettingKeys } }, select: { key: true, value: true } });
  return Object.fromEntries(rows.filter((row) => schoolSettingKeys.includes(row.key)).map((row) => [row.key, row.value]));
}
