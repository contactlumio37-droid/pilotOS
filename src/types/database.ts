// PilotOS — Types base de données Supabase
// Généré depuis le schéma SQL — mettre à jour avec :
// supabase gen types typescript > src/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================================
// Enums & Union types
// ============================================================
export type UserRole = 'superadmin' | 'admin' | 'manager' | 'director' | 'contributor' | 'terrain' | 'reader'
export type Plan = 'free' | 'team' | 'business' | 'pro' | 'enterprise'
export type MfaPolicy = 'disabled' | 'optional' | 'required' | 'role_based'
export type Module = 'pilotage' | 'processus' | 'ged' | 'terrain' | 'securite' | 'qse'
export type Visibility = 'public' | 'managers' | 'restricted' | 'confidential'
export type ActionStatus = 'todo' | 'in_progress' | 'done' | 'cancelled' | 'late'
export type ActionPriority = 'low' | 'medium' | 'high' | 'critical'
export type ActionOrigin = 'manual' | 'process_review' | 'codir' | 'audit' | 'incident' | 'kaizen' | 'terrain'
export type ObjectiveStatus = 'draft' | 'active' | 'completed' | 'cancelled'
export type ProjectStatus = 'draft' | 'active' | 'completed' | 'cancelled'
export type ProcessStatus = 'draft' | 'active' | 'deprecated'
export type ProcessType = 'management' | 'operational' | 'support'
export type ProcessLevel = 'process' | 'subprocess' | 'activity'
export type ReviewFrequency = 'monthly' | 'quarterly' | 'annual' | 'biannual'
export type NcSeverity = 'minor' | 'major' | 'critical'
export type NcStatus = 'open' | 'in_treatment' | 'closed'
export type TerrainCategory = 'safety' | 'quality' | 'equipment' | 'process' | 'other'
export type TerrainStatus = 'pending' | 'acknowledged' | 'converted' | 'closed'
export type DocSource = 'upload' | 'created'
export type DocStatus = 'draft' | 'in_review' | 'approved' | 'active' | 'archived' | 'obsolete'
export type DocType = 'NS' | 'PROC' | 'CR' | 'FORM' | 'REPORT' | 'INSTRUCTION' | 'OTHER'
export type TemplateType = 'procedure' | 'instruction' | 'note' | 'form' | 'report'
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing'
export type IndicatorFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
export type FeedbackCategory = 'bug' | 'suggestion' | 'question' | 'bounty'
export type FeedbackStatus = 'new' | 'confirmed' | 'in_progress' | 'resolved' | 'wont_fix' | 'duplicate'
export type FeedbackPriority = 'critical' | 'high' | 'normal' | 'low'
export type RoadmapStatus = 'shipped' | 'in_progress' | 'planned' | 'considering' | 'declined'
export type RoadmapCategory = 'feature' | 'improvement' | 'fix' | 'infrastructure'
export type BountyStatus = 'open' | 'funded' | 'in_development' | 'delivered' | 'cancelled'
export type KaizenStatus = 'planned' | 'in_progress' | 'completed'
export type DiagramType = 'native' | 'bpmn' | 'drawio'

// ============================================================
// Rows (forme retournée par SELECT)
// ============================================================
export interface Organisation {
  id: string
  name: string
  slug: string
  logo_url: string | null
  plan: Plan
  seats_included: number
  seats_extra: number
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  is_active: boolean
  default_kpi_config: Json
  terrain_module_enabled: boolean
  mfa_policy: MfaPolicy
  created_at: string
  updated_at: string
}

export interface Site {
  id: string
  organisation_id: string
  name: string
  address: string | null
  is_active: boolean
  created_at: string
}

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  job_title: string | null
  updated_at: string
}

export interface OrganisationMember {
  id: string
  organisation_id: string
  user_id: string
  role: UserRole
  site_id: string | null
  invited_by: string | null
  invited_at: string
  accepted_at: string | null
  is_active: boolean
  mfa_enabled: boolean
  mfa_enrolled_at: string | null
  kpi_config: Json
}

export interface ModuleAccess {
  id: string
  organisation_id: string
  module: Module
  is_active: boolean
  activated_at: string | null
}

export interface KpiCatalog {
  id: string
  label: string
  description: string | null
  module: string
  min_role: string
  max_per_role: Json
  is_gamification: boolean
}

export interface Template {
  id: string
  name: string
  sector: string
  type: 'process' | 'action' | 'objective' | 'kpi_set' | 'document_tree' | null
  content: Json
  is_active: boolean
  created_at: string
}

export interface StrategicObjective {
  id: string
  organisation_id: string
  site_id: string | null
  title: string
  description: string | null
  axis: string | null
  status: ObjectiveStatus
  owner_id: string | null
  kpi_label: string | null
  kpi_target: number | null
  kpi_unit: string | null
  start_date: string | null
  end_date: string | null
  visibility: Visibility
  visibility_user_ids: string[]
  created_at: string
  updated_at: string
}

export interface CodirDecision {
  id: string
  organisation_id: string
  title: string
  description: string | null
  decision_date: string
  author_id: string | null
  objective_id: string | null
  visibility: Visibility
  visibility_user_ids: string[]
  created_at: string
}

export interface Project {
  id: string
  organisation_id: string
  site_id: string | null
  title: string
  description: string | null
  objective_id: string | null
  status: ProjectStatus
  start_date: string | null
  end_date: string | null
  visibility: Visibility
  visibility_user_ids: string[]
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Process {
  id: string
  organisation_id: string
  site_id: string | null
  parent_id: string | null
  level: ProcessLevel
  title: string
  process_code: string | null
  process_type: ProcessType
  description: string | null
  category: string | null
  version: string
  status: ProcessStatus
  owner_id: string | null
  pilot_id: string | null
  backup_pilot_id: string | null
  purpose: string | null
  scope: string | null
  inputs: string | null
  outputs: string | null
  resources: string | null
  risks: string | null
  performance_criteria: string | null
  review_frequency: ReviewFrequency
  last_review_date: string | null
  next_review_date: string | null
  health_score: number | null
  diagram_type: DiagramType | null
  diagram_data: Json | null
  visibility: Visibility
  visibility_user_ids: string[]
  created_at: string
  updated_at: string
}

export interface ProcessReview {
  id: string
  process_id: string
  organisation_id: string
  review_date: string
  reviewer_id: string | null
  status: 'draft' | 'completed'
  findings: string | null
  conclusions: string | null
  next_review_date: string | null
  created_at: string
}

export interface NonConformity {
  id: string
  organisation_id: string
  process_id: string | null
  title: string
  description: string | null
  detected_by: string | null
  detected_at: string
  severity: NcSeverity
  status: NcStatus
  created_at: string
}

export interface KaizenPlan {
  id: string
  organisation_id: string
  process_id: string | null
  title: string
  objective: string | null
  estimated_savings_hours: number | null
  status: KaizenStatus
  start_date: string | null
  end_date: string | null
  created_by: string | null
  created_at: string
}

export interface TerrainReport {
  id: string
  organisation_id: string
  site_id: string | null
  reported_by: string | null
  title: string
  location: string | null
  description: string | null
  photo_url: string | null
  category: TerrainCategory
  status: TerrainStatus
  acknowledged_by: string | null
  acknowledged_at: string | null
  action_id: string | null
  created_at: string
  updated_at: string
}

export interface Action {
  id: string
  organisation_id: string
  project_id: string | null
  process_id: string | null
  objective_id: string | null
  terrain_report_id: string | null
  process_review_id: string | null
  title: string
  description: string | null
  origin: ActionOrigin
  status: ActionStatus
  priority: ActionPriority
  due_date: string | null
  completed_at: string | null
  responsible_id: string | null
  accountable_id: string | null
  consulted_ids: string[]
  informed_ids: string[]
  visibility: Visibility
  visibility_user_ids: string[]
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ActionComment {
  id: string
  action_id: string
  user_id: string | null
  content: string
  created_at: string
}

export interface Indicator {
  id: string
  organisation_id: string
  title: string
  unit: string | null
  target_value: number | null
  warning_threshold: number | null
  critical_threshold: number | null
  frequency: IndicatorFrequency
  linked_to: 'objective' | 'process' | 'project' | 'organisation' | null
  linked_id: string | null
  owner_id: string | null
  visibility: Visibility
  visibility_user_ids: string[]
  created_at: string
}

export interface IndicatorValue {
  id: string
  indicator_id: string
  value: number
  measured_at: string
  entered_by: string | null
  note: string | null
  created_at: string
}

export interface DocumentFolder {
  id: string
  organisation_id: string
  parent_id: string | null
  name: string
  sort_order: number
  is_system: boolean
  created_at: string
}

export interface Document {
  id: string
  organisation_id: string
  folder_id: string | null
  title: string
  doc_type: DocType | null
  source: DocSource
  template_type: TemplateType | null
  content: Json | null
  file_path: string | null
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  version_major: number
  version_minor: number
  version_label: string
  previous_version_id: string | null
  doc_code: string | null
  is_master_document: boolean
  status: DocStatus
  validation_required: boolean
  redactor_id: string | null
  reviewer_id: string | null
  approver_id: string | null
  reviewed_at: string | null
  approved_at: string | null
  effective_date: string | null
  expiry_date: string | null
  distribution_list: string[]
  acknowledgment_required: boolean
  linked_process_id: string | null
  linked_action_id: string | null
  linked_project_id: string | null
  linked_objective_id: string | null
  visibility: Visibility
  visibility_user_ids: string[]
  uploaded_by: string | null
  created_at: string
  updated_at: string
}

export interface DocumentVersion {
  id: string
  document_id: string
  version_label: string
  file_path: string | null
  content: Json | null
  change_summary: string | null
  archived_at: string
  archived_by: string | null
}

export interface DocumentAcknowledgment {
  id: string
  document_id: string
  user_id: string
  acknowledged_at: string
  ip_address: string | null
}

export interface Subscription {
  id: string
  organisation_id: string
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  plan: Plan
  status: SubscriptionStatus
  seats_included: number
  seats_extra: number
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export interface StripeEvent {
  id: string
  stripe_event_id: string
  type: string
  payload: Json | null
  processed_at: string
}

export interface ImportLog {
  id: string
  organisation_id: string
  import_type: 'users' | 'processes' | 'actions' | 'indicators' | null
  file_name: string | null
  total_rows: number | null
  success_rows: number | null
  error_rows: number | null
  errors: Json | null
  imported_by: string | null
  created_at: string
}

export interface UserStreak {
  id: string
  user_id: string
  organisation_id: string
  current_streak: number
  longest_streak: number
  last_activity_date: string | null
  updated_at: string
}

export interface UserBadge {
  id: string
  user_id: string
  organisation_id: string
  badge: string
  earned_at: string
}

export interface Notification {
  id: string
  user_id: string
  organisation_id: string
  type: string
  title: string
  body: string | null
  read: boolean
  action_url: string | null
  created_at: string
}

export interface AdminAuditLog {
  id: string
  admin_id: string | null
  action: string
  target_type: string | null
  target_id: string | null
  before_state: Json | null
  after_state: Json | null
  ip_address: string | null
  created_at: string
}

export interface AiUsage {
  id: string
  organisation_id: string
  user_id: string | null
  feature: string
  tokens_used: number | null
  created_at: string
}

export interface SiteSection {
  id: string
  page: string
  section: string
  desktop_content: Json
  tablet_content: Json | null
  mobile_content: Json | null
  tablet_overrides: string[]
  mobile_overrides: string[]
  sort_order: number
  is_visible: boolean
  updated_by: string | null
  updated_at: string
}

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string | null
  cover_image_url: string | null
  published: boolean
  published_at: string | null
  seo_title: string | null
  seo_description: string | null
  author_id: string | null
  created_at: string
  updated_at: string
}

export interface NewsletterSubscriber {
  id: string
  email: string
  confirmed: boolean
  confirmed_at: string | null
  source: string | null
  created_at: string
}

export interface RoadmapItem {
  id: string
  title: string
  description: string | null
  category: RoadmapCategory | null
  status: RoadmapStatus
  version_target: string | null
  votes: number
  is_public: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface FeedbackReport {
  id: string
  title: string
  description: string | null
  category: FeedbackCategory
  status: FeedbackStatus
  priority: FeedbackPriority
  page_url: string | null
  browser: string | null
  os: string | null
  user_role: string | null
  screenshot_url: string | null
  parent_id: string | null
  vote_count: number
  resolved_in_version: string | null
  resolution_note: string | null
  reporter_id: string | null
  organisation_id: string | null
  is_anonymous: boolean
  created_at: string
  updated_at: string
}

export interface FeatureBounty {
  id: string
  feedback_id: string | null
  title: string
  description: string | null
  amount_target: number
  amount_pledged: number
  status: BountyStatus
  roadmap_item_id: string | null
  created_at: string
}

// ============================================================
// Inserts (Omit des champs auto-générés)
// ============================================================
export type OrganisationInsert = Omit<Organisation, 'id' | 'created_at' | 'updated_at'>
export type ActionInsert = Omit<Action, 'id' | 'created_at' | 'updated_at'>
export type ProcessInsert = Omit<Process, 'id' | 'created_at' | 'updated_at'>
export type ProjectInsert = Omit<Project, 'id' | 'created_at' | 'updated_at'>
export type DocumentInsert = Omit<Document, 'id' | 'version_label' | 'created_at' | 'updated_at'>
export type TerrainReportInsert = Omit<TerrainReport, 'id' | 'created_at' | 'updated_at'>
export type FeedbackReportInsert = Omit<FeedbackReport, 'id' | 'created_at' | 'updated_at'>

// ============================================================
// Types enrichis (joins fréquents)
// ============================================================
export interface ActionWithRelations extends Action {
  responsible?: Profile | null
  accountable?: Profile | null
  project?: Pick<Project, 'id' | 'title'> | null
  process?: Pick<Process, 'id' | 'title'> | null
  objective?: Pick<StrategicObjective, 'id' | 'title'> | null
}

export interface ProcessWithHealth extends Process {
  health_score: number
}

export interface OrganisationMemberWithProfile extends OrganisationMember {
  profile: Profile
}

export interface DocumentWithFolder extends Document {
  folder?: Pick<DocumentFolder, 'id' | 'name'> | null
}
