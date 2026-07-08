// ─── Shared constants for the ICW Speaker Registration Module ───────────────
// Deliberately self-contained (doesn't import from the abstracts/
// registration modules) since folder layout across pages isn't assumed.
// Some lists (TITLES, COUNTRIES, PHONE_COUNTRY_CODES, NIGERIAN_STATES) are
// intentionally duplicated from registration-constants.ts / abstract-types.ts
// — consolidate into one shared file later if useful.

export const SESSION_TYPES = ["Keynote", "Plenary", "Panel", "Breakout"] as const;
export type SessionType = typeof SESSION_TYPES[number];

export const SUB_THEMES = [
  {
    value: "policy-leadership-governance",
    label: "Sub-theme 1: Policy, Leadership, and Governance for Equitable Cancer Control",
  },
  {
    value: "research-innovation-data",
    label: "Sub-theme 2: Research, Innovation, and Data for Evidence-Driven Cancer Solutions",
  },
  {
    value: "quality-care-implementation",
    label: "Sub-theme 3: Quality Cancer Care, Implementation, and Patient-Centred Practice",
  },
] as const;
export type SubThemeValue = typeof SUB_THEMES[number]["value"];

export const PARTICIPATION_TYPES = ["Physical", "Virtual"] as const;
export type ParticipationType = typeof PARTICIPATION_TYPES[number];

export const YES_NO = ["Yes", "No"] as const;

export const BIO_WORD_LIMIT = 150;
export const SESSION_DESCRIPTION_WORD_LIMIT = 300;

export const TITLES = [
  "Prof", "Dr", "Pharm", "Nrs", "Mr", "Mrs", "Ms",
  "Chief", "Imam", "Pastor", "Barrister", "Engr", "Arc",
];

export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "FCT Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina",
  "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun",
  "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba",
  "Yobe", "Zamfara",
];

export const COUNTRIES = [
  "Nigeria",
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola",
  "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium",
  "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina",
  "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic",
  "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Brazzaville)",
  "Congo (DRC)", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia",
  "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea",
  "Estonia", "Eswatini", "Ethiopia",
  "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada",
  "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Honduras", "Hungary",
  "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel",
  "Italy", "Ivory Coast",
  "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya",
  "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta",
  "Mauritania", "Mauritius", "Mexico", "Moldova", "Monaco", "Mongolia",
  "Montenegro", "Morocco", "Mozambique", "Myanmar",
  "Namibia", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger",
  "North Korea", "North Macedonia", "Norway",
  "Oman",
  "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay", "Peru",
  "Philippines", "Poland", "Portugal",
  "Qatar",
  "Romania", "Russia", "Rwanda",
  "Saint Lucia", "Samoa", "San Marino", "Sao Tome and Principe",
  "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone",
  "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia",
  "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka",
  "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo",
  "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan",
  "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom",
  "United States", "Uruguay", "Uzbekistan",
  "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
  "Yemen",
  "Zambia", "Zimbabwe",
];

export const PHONE_COUNTRY_CODES = [
  { country: "Nigeria", dial: "+234" },
  { country: "Ghana", dial: "+233" },
  { country: "Kenya", dial: "+254" },
  { country: "South Africa", dial: "+27" },
  { country: "Egypt", dial: "+20" },
  { country: "Ethiopia", dial: "+251" },
  { country: "Cameroon", dial: "+237" },
  { country: "Senegal", dial: "+221" },
  { country: "Tanzania", dial: "+255" },
  { country: "Uganda", dial: "+256" },
  { country: "Ivory Coast", dial: "+225" },
  { country: "United Kingdom", dial: "+44" },
  { country: "United States / Canada", dial: "+1" },
  { country: "India", dial: "+91" },
  { country: "China", dial: "+86" },
  { country: "France", dial: "+33" },
  { country: "Germany", dial: "+49" },
  { country: "United Arab Emirates", dial: "+971" },
  { country: "Saudi Arabia", dial: "+966" },
  { country: "Other", dial: "" },
] as const;

export const DEFAULT_PHONE_COUNTRY_CODE = "+234";

export type SpeakerStatus = "submitted" | "confirmed" | "rejected";

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function formatDate(dateString: string) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}