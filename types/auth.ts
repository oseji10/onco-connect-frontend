export interface Facility {
  id: number;
  facilityName: string;
  facilityCode: string;
  facilityState?: string | null;
  facilityLga?: string | null;
  facilityAddress?: string | null;
}

export interface User {
  id: number;
  facilityId: number | null;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string | null;
  alternativePhoneNumber?: string | null;
  role: string;
  facility?: Facility | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  user: User;
}