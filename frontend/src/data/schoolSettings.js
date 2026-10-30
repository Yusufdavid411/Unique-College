import { schoolInfo as defaults } from "./siteData.js";

export const schoolSettingsSections = [
  { id: "identity", title: "School identity", fields: [
    { key: "institution_name", property: "name", label: "Institution name", maxLength: 200 },
    { key: "short_name", property: "shortName", label: "Short name", maxLength: 200 },
    { key: "location", property: "location", label: "Town / location", maxLength: 200 },
    { key: "motto", property: "motto", label: "Motto", maxLength: 200 },
    { key: "established", property: "established", label: "Date established", maxLength: 100 },
    { key: "registration_number", property: "registrationNumber", label: "Registration number", maxLength: 100 },
    { key: "admission_session", property: "admissionSession", label: "Academic session label", maxLength: 200 },
    { key: "approval", property: "approval", label: "Approval / accreditation statement", multiline: true, maxLength: 5000 }
  ] },
  { id: "contact", title: "Contact details", fields: [
    { key: "address", property: "address", label: "School address", multiline: true, maxLength: 1000 },
    { key: "contact_email", property: "email", label: "Contact email", type: "email", maxLength: 254 },
    { key: "contact_phone", property: "phoneDisplay", label: "Contact phone numbers", maxLength: 200 },
    { key: "website", property: "website", label: "Website domain", maxLength: 253 }
  ] },
  { id: "website", title: "Website information", fields: [
    { key: "about", property: "about", label: "About the school", multiline: true, maxLength: 5000 },
    { key: "identity", property: "identity", label: "Registered identity statement", multiline: true, maxLength: 5000 },
    { key: "profile", property: "profile", label: "School profile", multiline: true, maxLength: 5000 },
    { key: "mission", property: "mission", label: "Mission", multiline: true, maxLength: 5000 },
    { key: "vision", property: "vision", label: "Vision", multiline: true, maxLength: 5000 },
    { key: "philosophy", property: "philosophy", label: "Philosophy", multiline: true, maxLength: 5000 },
    { key: "objective", property: "objective", label: "Objective", multiline: true, maxLength: 5000 }
  ] }
];

export function schoolInfoFromSettings(values = {}) {
  const information = { ...defaults };
  for (const field of schoolSettingsSections.flatMap((section) => section.fields)) {
    if (typeof values[field.key] === "string" && values[field.key].trim()) information[field.property] = values[field.key];
  }
  if (!values.about) information.about = defaults.about.replace(defaults.address, information.address).replace(defaults.established, information.established);
  if (!values.identity) information.identity = defaults.identity.replace(defaults.registrationNumber, information.registrationNumber);
  information.phones = information.phoneDisplay.split(",").map((phone) => phone.trim()).filter(Boolean);
  return information;
}

export function schoolSettingsFormValues(values = {}) {
  const information = schoolInfoFromSettings(values);
  return Object.fromEntries(schoolSettingsSections.flatMap((section) => section.fields).map((field) => [field.key, information[field.property]]));
}
