// ─── Shared constants for conference registration ──────────────────────────
// Imported by both registration-management.tsx (admin) and the public
// registration page, so category/country/state lists can't drift apart.

export const CATEGORY_MAP = {
  "Doctor": "doctor",
  "Pharmacist": "pharmacist",
  "Nurse": "nurse",
  "Lab Scientist": "lab_scientist",
  "Radiographer": "radiographer",
  "Medical Physicist": "medical_physicist",
  "Other Health Worker": "other_health_worker",
  "Researcher": "researcher",
  "Government Official": "government_official",
  "Development Partner": "development_partner",
  "Student": "student",
  "Cancer Advocate": "cancer_advocate",
  "Cancer Survivor": "cancer_survivor",
  "Media Representative": "media_representative",
  "General Public": "general_public",
} as const;

export const REVERSE_CATEGORY_MAP = Object.fromEntries(
  Object.entries(CATEGORY_MAP).map(([display, backend]) => [backend, display])
);

export const CATEGORY_DISPLAY_NAMES = Object.keys(CATEGORY_MAP);

export function getCategoryBackendValue(displayName: string): string {
  return CATEGORY_MAP[displayName as keyof typeof CATEGORY_MAP] || displayName;
}

export function getCategoryDisplayName(backendValue: string): string {
  return REVERSE_CATEGORY_MAP[backendValue] || backendValue;
}

export const TITLES = [
  "Prof",
  "Dr",
  "Pharm",
  "Nrs",
  "Mr",
  "Mrs",
  "Ms",
  "Chief",
  "Imam",
  "Pastor",
  "Barrister",
  "Engr",
  "Arc",
];

export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "FCT Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina",
  "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun",
  "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba",
  "Yobe", "Zamfara",
];

export const PARTICIPATION_TYPES = ["Physical", "Virtual"];
export const GENDERS = ["Male", "Female"];
export const YES_NO = ["Yes", "No"];

// Countries for "Country of Origin". Nigeria pinned first since it's the
// overwhelming majority of registrants; the rest alphabetical.
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

// Phone country codes — a curated subset covering Nigeria + common
// countries for this conference's audience, not the full ITU list.
// Extend as needed.
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