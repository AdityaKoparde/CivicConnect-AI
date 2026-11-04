/** Shared types mirroring docs/api-documentation.md (the authoritative contract). */

export type Role = 'SUPER_ADMIN' | 'DEPARTMENT_ADMIN' | 'DEPARTMENT_OFFICER' | 'CITIZEN';

export interface UserView {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone: string | null;
  departmentId: string | null;
  departmentName: string | null;
  jurisdictionId: string | null;
  isActive: boolean;
  createdAt: string;
}

export type ComplaintStatus =
  | 'SUBMITTED'
  | 'ACKNOWLEDGED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'AWAITING_CITIZEN_INFO'
  | 'RESOLVED'
  | 'REJECTED'
  | 'ESCALATED';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Trilingual {
  en: string;
  kn: string;
  hi: string;
}

export interface Category {
  key: string;
  label: Trilingual;
  description?: Partial<Trilingual>;
  icon?: string;
  active: boolean;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  type: string;
  description?: string | null;
  categories: string[];
  jurisdictionLevel?: string | null;
  district?: string | null;
  isDemo: boolean;
  active: boolean;
  complaintCount?: number;
  contactEmail?: string | null;
}

export interface ComplaintSummary {
  id: string;
  complaintId: string;
  category: string;
  priority: Priority;
  status: ComplaintStatus;
  district: string | null;
  city: string | null;
  landmark: string | null;
  departmentId: string | null;
  departmentName: string | null;
  officerName?: string | null;
  aiConfidence?: number;
  requiresManualReview?: boolean;
  emergency?: boolean;
  safetyRisk?: boolean;
  language?: string;
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string | null;
  citizenName?: string;
  isDemo: boolean;
}

export interface ComplaintUpdate {
  id: string;
  kind: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  note: string | null;
  isPublic?: boolean;
  actorName?: string | null;
  actorRole?: string | null;
  createdAt: string;
}

export interface ComplaintDetail extends ComplaintSummary {
  originalText: string;
  normalizedText?: string;
  summary?: string | null;
  aiReasoning?: string | null;
  aiProvider?: string;
  routingExplanation?: string | null;
  trackingHashPresent?: boolean;
  duplicateOfComplaintId?: string | null;
  resolutionNote?: string | null;
  auditTrail?: unknown[];
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface PublicStats {
  totalComplaints: number;
  resolvedComplaints: number;
  pendingComplaints: number;
  activeDepartments: number;
  districtsCovered: number;
  isDemoData: boolean;
  lastUpdated: string;
}

export interface AdminStats {
  overview: {
    total: number;
    newLast24h: number;
    pending: number;
    inProgress: number;
    resolved: number;
    escalated: number;
    critical: number;
    awaitingCitizen: number;
  };
  byCategory: { key: string; label: string; count: number }[];
  byDepartment: { id: string; name: string; count: number }[];
  byDistrict: { district: string | null; count: number }[];
  monthly: { month: string; total: number; resolved: number }[];
  priorityDistribution: { priority: Priority; count: number }[];
  pendingTrend: { date: string; pending: number }[];
  resolutionRate: number;
  isDemoData: boolean;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  complaintId?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  language?: string | null;
  createdAt: string;
}

export interface ConversationState {
  slots: Record<string, unknown>;
  missing: string[];
  understanding: AIUnderstanding | null;
  turn: number;
  emergencyHandled: boolean;
}

export interface AIUnderstanding {
  original_text: string;
  detected_language: string;
  normalized_description: string;
  category: string;
  category_label: Trilingual;
  entities: Record<string, string | null>;
  priority: string;
  safety_risk: boolean;
  emergency: boolean;
  recommended_department: string;
  confidence: number;
  reasoning: string;
  requires_manual_review: boolean;
  ai_provider: string;
  classification_method?: string;
}

export interface Conversation {
  id: string;
  language: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  state: ConversationState;
  complaintId?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface ChatResponse {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  understanding: AIUnderstanding | null;
  nextAction: string;
  needsConfirmation: boolean;
  confirmationSummary: string | null;
  emergency: { isEmergency: boolean; guidance: string | null; callNumber: string };
  missingSlots: string[];
  suggestedReplies: string[];
  state: ConversationState;
  aiProvider: 'demo' | 'openai';
}

export interface ConfirmResponse {
  complaint: {
    id: string;
    complaintId: string;
    status: ComplaintStatus;
    category: string;
    priority: Priority;
    departmentName: string;
    departmentCode: string;
    routingExplanation: string;
    requiresManualReview: boolean;
    emergency: boolean;
    createdAt: string;
  };
  trackingToken: string;
  conversationId: string;
}

export interface TrackResult {
  complaint: {
    complaintId: string;
    status: ComplaintStatus;
    category: string;
    categoryLabel: Trilingual;
    priority: Priority;
    district: string | null;
    city: string | null;
    landmark: string | null;
    departmentName: string | null;
    submittedAt: string;
    resolvedAt: string | null;
    language: string;
    history: { status: string; note: string | null; at: string; byRole: string }[];
    publicUpdates: { kind: string; note: string; at: string }[];
  };
}

export interface MapPoint {
  district?: string | null;
  complaintId?: string;
  category: string;
  status: ComplaintStatus;
  priority: Priority;
  count?: number;
  latitude: number;
  longitude: number;
  departmentName?: string | null;
}
