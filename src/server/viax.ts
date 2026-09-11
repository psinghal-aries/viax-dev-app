import 'server-only';
import type {Money} from '@/app/types';

// VIAX GraphQL access for the catalog browser. Mirrors @viax/core: Keycloak client-credentials
// token (IAM_URL + VAULT_SERVICE_CUSTOMER_CLIENT_ID/SECRET) -> Bearer against API_GW_URL, and the
// Relay-style filterTwouCourse/filterTwouProgram connections (_first/_after cursor pagination).

const IAM_URL = process.env.IAM_URL;
const API_GW_URL = process.env.API_GW_URL;
const CLIENT_ID = process.env.VAULT_SERVICE_CUSTOMER_CLIENT_ID;
const CLIENT_SECRET = process.env.VAULT_SERVICE_CUSTOMER_CLIENT_SECRET;

export const PAGE_SIZE = 24;

export interface PageInfo {
  hasNextPage: boolean;
  endCursor?: string;
}

export interface Connection<T> {
  items: T[];
  totalCount: number;
  pageInfo: PageInfo;
}

export type ViaxNode = Record<string, unknown> & {maId: string; maName?: string};

let cachedToken: {value: string; expiresAt: number} | undefined;

async function getAccessToken(): Promise<string> {
  if (!IAM_URL) throw new Error('IAM_URL is not set');
  if (!CLIENT_ID || !CLIENT_SECRET) throw new Error('VAULT_SERVICE_CUSTOMER_CLIENT_ID/SECRET is not set');
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'client_credentials',
  });
  const res = await fetch(IAM_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Auth failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as {access_token?: string; expires_in?: number};
  if (!data.access_token) throw new Error('Auth response missing access_token');
  const ttl = (data.expires_in ?? 300) * 1000;
  const value = `Bearer ${data.access_token}`;
  cachedToken = {value, expiresAt: Date.now() + ttl - 30_000};
  return value;
}

async function viaxRequest<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  if (!API_GW_URL) throw new Error('API_GW_URL is not set');
  const token = await getAccessToken();
  const res = await fetch(API_GW_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Accept: 'application/json', Authorization: token},
    body: JSON.stringify({query, variables}),
  });
  if (!res.ok) throw new Error(`VIAX GraphQL ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as {data?: Record<string, T>; errors?: {message: string}[]};
  if (json.errors?.length) throw new Error(`VIAX GraphQL error: ${json.errors.map((e) => e.message).join('; ')}`);
  const field = Object.keys(json.data ?? {})[0];
  return (json.data as Record<string, T>)[field];
}

// maId is interpolated into the _filter string; keep only safe characters to avoid filter injection.
function safe(value: string): string {
  return value.replace(/[^A-Za-z0-9:_+.\- ]/g, '');
}

const LIST_COURSE_FIELDS = `
  maId maName maDescription imageUrl
  tBrandText tPrimarySubjectArea tLevelType tEnrollmentCount
  tCatalogActive tAlacartePurchasable
  tSeatPrice { amount units { code } }`;

const DETAIL_COURSE_FIELDS = `
  ${LIST_COURSE_FIELDS}
  tShortDescription tCourseKey tMarketingSlug tLanguage tUrlCourse
  tPacingType { code name } tMode { code name } tStatus { code name }
  tDurationLow tDurationHigh tDurationUnit { code }
  tEffortLow tEffortHigh tEffortUnit { code }
  tSkills tExpectedLearningItems tPrerequisites tSyllabus tFaq tTranscriptLanguages
  tOrgLogoUrl tTestimonials
  tInstructors { tGivenName tFamilyName tOrganization tImageUrl tPosition }
  tSchools { tName tLogoUrl }
  tB2cSubscriptionInclusion tExcludedFromSearch tHasOfacRestrictions
  tSyncVersion tSourceModifiedAt`;

const LIST_PROGRAM_FIELDS = `
  maId maName maDescription imageUrl
  tBrandText tPrimarySubjectArea tLevelType tEnrollmentCount
  tCatalogActive tAlacartePurchasable
  tProgramType { code name }`;

const DETAIL_PROGRAM_FIELDS = `
  ${LIST_PROGRAM_FIELDS}
  tSubtitle tMarketingHook tMarketingSlug tLanguage tUrlProgram tBannerImageUrl tOrgLogoUrl
  tStatus { code name }
  tDurationLow tDurationHigh tEffortLow tEffortHigh tTotalHoursOfEffort
  tSkills tExpectedLearningItems tRelatedTopics tFaq
  tHidden tExcludedFromSearch tHasOfacRestrictions tOfacComment
  tSyncVersion tSourceModifiedAt
  tInstructors { tGivenName tFamilyName tOrganization tImageUrl tPosition }
  tCourses { maId maName }`;

interface RawConnection {
  totalCount: number;
  edges: {node: ViaxNode}[];
  pageInfo: PageInfo;
}

type Entity = 'filterTwouCourse' | 'filterTwouProgram';

async function fetchConnection(
  entity: Entity,
  fields: string,
  filter: string,
  first: number,
  after?: string,
): Promise<Connection<ViaxNode>> {
  const query = `query List($filter: String, $first: Int, $after: String) {
    ${entity}(_filter: $filter, _first: $first, _after: $after) {
      totalCount
      edges { node { ${fields} } }
      pageInfo { hasNextPage endCursor }
    }
  }`;
  const conn = await viaxRequest<RawConnection>(query, {filter, first, after});
  return {
    items: (conn?.edges ?? []).map((e) => e.node),
    totalCount: conn?.totalCount ?? 0,
    pageInfo: conn?.pageInfo ?? {hasNextPage: false},
  };
}

async function fetchByIdInternal(entity: Entity, fields: string, maId: string): Promise<ViaxNode | null> {
  const query = `query One($filter: String) {
    ${entity}(_first: 1, _filter: $filter) { edges { node { ${fields} } } }
  }`;
  const conn = await viaxRequest<{edges: {node: ViaxNode}[]}>(query, {filter: `maId = '${safe(maId)}'`});
  return conn?.edges?.[0]?.node ?? null;
}

const DEFAULT_FILTER = 'tCatalogActive = true';

export function fetchCourses(first = PAGE_SIZE, after?: string) {
  return fetchConnection('filterTwouCourse', LIST_COURSE_FIELDS, DEFAULT_FILTER, first, after);
}

export function fetchPrograms(first = PAGE_SIZE, after?: string) {
  return fetchConnection('filterTwouProgram', LIST_PROGRAM_FIELDS, DEFAULT_FILTER, first, after);
}

export function fetchCourse(maId: string) {
  return fetchByIdInternal('filterTwouCourse', DETAIL_COURSE_FIELDS, maId);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function fetchCourseByKey(courseKey: string): Promise<ViaxNode | null> {
  const query = `query One($filter: String) {
    filterTwouCourse(_first: 1, _filter: $filter) { edges { node { ${DETAIL_COURSE_FIELDS} } } }
  }`;
  const conn = await viaxRequest<{edges: {node: ViaxNode}[]}>(query, {
    filter: `tCourseKey = '${safe(courseKey)}'`,
  });
  return conn?.edges?.[0]?.node ?? null;
}

// maId (VIAX's own id) is the same uuid the edX Partner API assigns a course, and tCourseKey
// mirrors the Partner API's course `key` (e.g. "RiceX+APESx") — so a course uuid or key from
// the Partner API resolves in VIAX via maId or tCourseKey respectively.
export function fetchCourseByIdentifier(idOrKey: string) {
  const trimmed = idOrKey.trim();
  return UUID_RE.test(trimmed) ? fetchCourse(trimmed) : fetchCourseByKey(trimmed);
}

export function fetchProgram(maId: string) {
  return fetchByIdInternal('filterTwouProgram', DETAIL_PROGRAM_FIELDS, maId);
}

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

interface RawOrderNode {
  uid: string;
  tOrderNumber?: string;
  hiConsistsOf: {uid: string; biiName?: string; tCourseRunKey?: string}[];
}

const ORDER_FIELDS = 'uid tOrderNumber hiConsistsOf { uid biiName tCourseRunKey }';

const CREATE_ORDER_WITH_ITEM = `mutation CreateOrderWithItem($input: TwouOrderInput) {
  createTwouOrder(input: $input) { uid }
}`;

const UPDATE_ORDER_ADD_ITEM = `mutation UpdateOrderAddItem($input: TwouOrderInput) {
  updateTwouOrder(input: $input) { uid }
}`;

async function fetchOrderNode(orderId: string): Promise<RawOrderNode | null> {
  const query = `query GetOrder($filter: String) {
    filterTwouOrder(_filter: $filter, _first: 1) { edges { node { ${ORDER_FIELDS} } } }
  }`;
  const conn = await viaxRequest<{edges: {node: RawOrderNode}[]}>(query, {filter: `uid = '${safe(orderId)}'`});
  return conn?.edges?.[0]?.node ?? null;
}

// Resolves each order item's display data (name/price/image) by looking its maId back up
// against the catalog, since TwouOrderItem itself only stores the course reference.
async function toOrderSummary(node: RawOrderNode): Promise<OrderSummary> {
  const items = await Promise.all(
    node.hiConsistsOf.map(async (item): Promise<OrderItemSummary> => {
      const courseMaId = item.tCourseRunKey ?? '';
      const course = courseMaId ? await fetchCourse(courseMaId) : null;
      return {
        itemId: item.uid,
        maId: courseMaId,
        courseName: (course?.maName as string | undefined) ?? item.biiName ?? 'Course',
        imageUrl: course?.imageUrl as string | undefined,
        price: course?.tSeatPrice as Money | undefined,
      };
    }),
  );
  return {orderId: node.uid, orderNumber: node.tOrderNumber ?? '', items};
}

export async function getOrder(orderId: string): Promise<OrderSummary> {
  const node = await fetchOrderNode(orderId);
  if (!node) throw new Error(`Order ${orderId} not found`);
  return toOrderSummary(node);
}

// Anonymous cart: this app has no user session, so the order is created without a party
// attached. `orderId` (if given) is the browser's persisted cart order; when it no longer
// resolves (e.g. dev data reset) a fresh order is created instead of failing.
export async function addItemToOrder(orderId: string | undefined, maId: string): Promise<OrderSummary> {
  const course = await fetchCourse(maId);
  if (!course) throw new Error(`Course ${maId} not found`);
  const courseName = (course.maName as string | undefined) ?? maId;
  const newItem = {biiName: courseName, tCourseRunKey: maId};

  const existing = orderId ? await fetchOrderNode(orderId) : null;

  let orderUid: string;
  if (existing) {
    const keepRefs = existing.hiConsistsOf.map((i) => ({pk: {typeName: 'TwouOrderItem', value: i.uid}}));
    const result = await viaxRequest<{uid: string}>(UPDATE_ORDER_ADD_ITEM, {
      input: {pk: {typeName: 'TwouOrder', value: existing.uid}, hiConsistsOf: [...keepRefs, newItem]},
    });
    orderUid = result.uid;
  } else {
    const result = await viaxRequest<{uid: string}>(CREATE_ORDER_WITH_ITEM, {
      input: {biName: 'Cart order', tOrderNumber: `CMUI-${Date.now()}`, hiConsistsOf: [newItem]},
    });
    orderUid = result.uid;
  }

  return getOrder(orderUid);
}
