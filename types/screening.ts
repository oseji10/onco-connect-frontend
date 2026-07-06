export interface CervicalScreeningPayload {
  method: "via" | "pap" | "hpv";
  screeningDate: string;
  result: "negative" | "positive" | "suspicious";
  hpvResult?: string;
  hpvGenotype?: string;
  colposcopyDone: boolean;
  biopsyDone: boolean;
  biopsyResult?: "positive" | "negative";
  treatmentProvided: boolean;
  referralCompleted: boolean;
}

export interface BreastScreeningPayload {
  method: "cbe" | "mammography" | "uss";
  screeningDate: string;
  biradsScore?: string;
  breastDensity?: string;
  biopsyDone: boolean;
  histologyResult?: "negative" | "positive";
  referralOutcome?: "referred" | "not_referred";
}

export interface ColorectalScreeningPayload {
  method: "fit" | "fobt" | "colonoscopy";
  screeningDate: string;
  result: "negative" | "positive" | "suspicious";
  polypDetected: boolean;
  histologyResult?: "negative" | "positive";
  treatmentReferral?: "referred" | "not_referred";
}

export interface LiverScreeningPayload {
  hbvStatus: "positive" | "negative";
  hcvStatus: "positive" | "negative";
  method: "uss" | "afp";
  afpValue?: number;
  lesionDetected: boolean;
  treatmentReferral?: "referred" | "not_referred";
}

export interface ProstateScreeningPayload {
  psaLevel?: number;
  result: "negative" | "positive" | "suspicious";
  dreResult?: "positive" | "negative";
  ipssScore?: number;
  biopsyDone: boolean;
  gleasonScore?: string;
  transferReferral?: "referred" | "not_referred";
}

export interface OutcomePayload {
  cancerConfirmed: boolean;
  cancerType?: string;
  stageAtDiagnosis?: string;
  diagnosisDate?: string;
  linkageToTreatment: boolean;
  treatmentFacility?: string;
  treatmentInitiated?: string;
  treatmentCompleted: boolean;
  treatmentOutcome?:
    | "complete_remission"
    | "partial_remission"
    | "stable_disease"
    | "progressive_disease";
  followUpStatus?:
    | "disease_free"
    | "recurrence"
    | "long_term_survival_with_chronic_disease"
    | "treatment_related_complications";
}