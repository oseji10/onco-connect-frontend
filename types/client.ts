export interface RiskProfile {
  id: number;
  clientId: number;
  familyHistory: boolean;
  smokingStatus: "never" | "current" | "former" | null;
  alcoholConsumption: "none" | "occasional" | "regular" | null;
  weightKg: number | null;
  heightCm: number | null;
  bmi: number | null;
  hivStatus: "positive" | "negative" | "unknown" | null;
  hbvStatus: "positive" | "negative" | "unknown" | null;
  hcvStatus: "positive" | "negative" | "unknown" | null;
  comorbiditiesJson: string[] | null;
  recordedAt?: string | null;
}

export interface Client {
  clientId: number;
  facilityId: number;
  screeningId: string;
  fullName: string;
  gender: "male" | "female";
  dateOfBirth: string;
  age?: number;
  phoneNumber?: string | null;
  alternativePhoneNumber?: string | null;
  screeningCategory: "new_client" | "follow_up";
  state?: string | null;
  lga?: string | null;
  residence?: string | null;
  registrationDate: string;
  risk_profiles?: RiskProfile[];
  latest_risk_profile?: RiskProfile | null;
  outcome?: unknown;
}

export interface PaginatedClients {
  data: Client[];
  current_page: number;
  last_page: number;
  total: number;
}