export type Role = 'owner' | 'contributor';
export type AssessmentStatus = 'draft' | 'interview' | 'review' | 'approved' | 'rejected';
export type AssuranceRating = 'High' | 'Reasonable' | 'Limited' | 'Very Limited' | null;

export interface AssessmentItem {
  id: string;
  orgId: string;
  title: string;
  status: AssessmentStatus;
  assuranceRating: AssuranceRating;
  extractedData: string | null;
  evidenceText: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  entity: string;
  details: string;
  timestamp: string;
}

export interface ExtractedData {
  basis_met: boolean;
  s9_met: boolean;
  s10_met: boolean;
  reasoning: string;
}

export interface GenUIToolCall {
  tool: "free_text" | "yes_no" | "checkbox_cards";
  question: string;
  options?: string[];
}
