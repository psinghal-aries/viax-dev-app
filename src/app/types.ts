// Shared shapes returned by the VIAX API routes.

// --- VIAX catalog (live) ---
export interface Money {
  amount?: string;
  units?: {code?: string};
}

export interface EnumValue {
  code?: string;
  name?: string;
}

// A VIAX TwouCourse/TwouProgram node. Fields are optional since list vs. detail differ.
export interface ViaxCatalogNode {
  maId: string;
  maName?: string;
  maDescription?: string;
  imageUrl?: string;
  tBrandText?: string;
  tPrimarySubjectArea?: string;
  tLevelType?: string;
  tEnrollmentCount?: number;
  tCatalogActive?: boolean;
  tAlacartePurchasable?: boolean;
  tSeatPrice?: Money;
  tProgramType?: EnumValue;
  [key: string]: unknown;
}

export interface ViaxConnection {
  items: ViaxCatalogNode[];
  totalCount: number;
  pageInfo: {hasNextPage: boolean; endCursor?: string};
}

// --- edX Partner API (catalog sync source) ---
export interface PartnerSubject {
  name?: string;
  language_code?: string;
}

export interface PartnerOwner {
  uuid?: string;
  key?: string;
  name?: string;
}

export interface PartnerCourseRunStatus {
  key?: string;
  status?: string;
  uuid?: string;
}

// A Partner API course element (GET /products/courses{suffix}?uuid=... | key=...).
export interface PartnerCourseNode {
  key: string;
  uuid: string;
  title?: string;
  short_description?: string;
  full_description?: string;
  level_type?: string;
  subjects?: PartnerSubject[];
  owners?: PartnerOwner[];
  image?: string;
  marketing_url?: string;
  url_slug?: string;
  enrollment_count?: number;
  skills?: string[];
  skill_names?: string[];
  expected_learning_items?: string[];
  prerequisites_raw?: string;
  syllabus_raw?: string;
  faq?: string;
  learner_testimonials?: string;
  course_run_statuses?: PartnerCourseRunStatus[];
  // Course-run selection hints — see selectCourseRun() in server/partner-api.ts.
  advertised_course_run_uuid?: string;
  canonical_course_run_key?: string;
  b2c_subscription_inclusion?: boolean;
  excluded_from_search?: boolean;
  has_ofac_restrictions?: boolean;
  modified?: string;
  data_modified_timestamp?: string;
  [key: string]: unknown;
}

// A Partner API course-run element (GET /products/course-runs{suffix}?course_uuid=...).
export interface PartnerCourseRunStaffRef {
  uuid?: string;
  given_name?: string;
  family_name?: string;
  sort_value?: number;
}

export interface PartnerSeat {
  sku?: string;
  type?: string;
  price?: number;
  currency_id?: string;
  credit_hours?: number | null;
  credit_provider?: string | null;
  bulk_sku?: string | null;
}

export interface PartnerCourseRunNode {
  key: string;
  uuid: string;
  course?: string;
  course_uuid?: string;
  title?: string;
  status?: string;
  availability?: string;
  pacing_type?: string;
  start?: string | null;
  end?: string | null;
  enrollment_start?: string | null;
  enrollment_end?: string | null;
  is_enrollable?: boolean;
  is_marketable?: boolean;
  staff?: PartnerCourseRunStaffRef[];
  instructors?: PartnerCourseRunStaffRef[];
  seats?: PartnerSeat[];
  first_enrollable_paid_seat_price?: number | null;
  enrollment_count?: number;
  has_ofac_restrictions?: boolean;
  modified?: string;
  [key: string]: unknown;
}

// A Partner API instructor element (GET /products/instructors{suffix}?uuid=...).
export interface PartnerInstructorOrgRef {
  uuid?: string | null;
  key?: string | null;
  name?: string | null;
}

export interface PartnerInstructorNode {
  uuid: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  slug?: string;
  bio_url?: string;
  image_url?: string;
  organization?: PartnerInstructorOrgRef[];
  [key: string]: unknown;
}

// A Partner API ed-org element (GET /products/ed-orgs{suffix}?uuid=...).
export interface PartnerEdOrgNode {
  uuid: string;
  key?: string;
  name?: string;
  description?: string;
  marketing_url?: string;
  logo_image_url?: string;
  slug?: string;
  [key: string]: unknown;
}

// A Partner API program element (GET /products/programs{suffix}?uuid=... — no `key` param exists
// for programs, unlike courses).
export interface PartnerProgramOrgRef {
  uuid?: string | null;
  key?: string | null;
  name?: string | null;
}

export interface PartnerProgramNameRef {
  name?: string | null;
}

export interface PartnerProgramLanguageRef {
  language_code?: string | null;
}

export interface PartnerProgramLearningItem {
  sort_value?: number | null;
  value?: string | null;
}

export interface PartnerProgramSkillName {
  field_0?: string | null;
}

export interface PartnerProgramCourseRef {
  sort_value?: number | null;
  key?: string | null;
  title?: string | null;
  uuid?: string | null;
}

export interface PartnerProgramPriceRange {
  currency?: string | null;
  min?: number | null;
  max?: number | null;
  total?: number | null;
}

export interface PartnerProgramStaffRef {
  uuid?: string;
  given_name?: string;
  family_name?: string;
  sort_value?: number;
}

export interface PartnerProgramNode {
  uuid: string;
  title?: string;
  subtitle?: string;
  marketing_hook?: string;
  type?: string;
  status?: string;
  hidden?: boolean;
  marketing_slug?: string;
  marketing_url?: string;
  banner_image_url?: string;
  organization_logo_override?: string;
  authoring_organizations?: PartnerProgramOrgRef[];
  subjects?: PartnerSubject[];
  // Overrides win when present — see the TwouProgram schema comments this mirrors.
  primary_subject_override?: PartnerProgramNameRef[] | null;
  level_type_override?: PartnerProgramNameRef[] | null;
  languages?: PartnerProgramLanguageRef[] | null;
  language_override?: string;
  labels?: PartnerProgramNameRef[] | null;
  weeks_to_complete_min?: number | null;
  weeks_to_complete_max?: number | null;
  min_hours_effort_per_week?: number | null;
  max_hours_effort_per_week?: number | null;
  total_hours_of_effort?: number | null;
  expected_learning_items?: PartnerProgramLearningItem[];
  skills?: string[] | null;
  skill_names?: PartnerProgramSkillName[] | null;
  faq?: string;
  enrollment_count?: number;
  excluded_from_search?: boolean;
  has_ofac_restrictions?: boolean | null;
  ofac_comment?: string;
  modified?: string;
  data_modified_timestamp?: string;
  courses?: PartnerProgramCourseRef[];
  price_ranges?: PartnerProgramPriceRange[];
  staff?: PartnerProgramStaffRef[];
  [key: string]: unknown;
}

// Result of applying the course-run selection rule (see selectCourseRun() in server/partner-api.ts):
// prefer the course's advertised run, else its canonical run key, else the first run returned.
export type CourseRunSelectionRule = 'advertised_course_run_uuid' | 'canonical_course_run_key' | 'first_available' | 'none';

export interface CourseRunSelection {
  rule: CourseRunSelectionRule;
  run: PartnerCourseRunNode | null;
  totalRuns: number;
  // run.first_enrollable_paid_seat_price, else the first run.seats entry with price > 0, else null.
  seatPrice: number | null;
  // Derived from run.seats[].type: highest of professional > verified > audit, dropping
  // credit/honor seats (a credit seat rides on top of a verified/audit seat, not its own mode).
  seatType: string | null;
}

// --- Orders / cart (POST /api/viax/orders, GET /api/viax/orders/[id]) ---
export interface OrderItemSummary {
  itemId: string;
  maId: string;
  courseName: string;
  imageUrl?: string;
  price?: Money;
}

export interface OrderSummary {
  orderId: string;
  orderNumber: string;
  items: OrderItemSummary[];
}
