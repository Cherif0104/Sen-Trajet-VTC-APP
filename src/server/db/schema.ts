import {
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer | Uint8Array }>({
  dataType: () => "bytea",
  fromDriver: (v) => (Buffer.isBuffer(v) ? v : Buffer.from(v)),
});

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export type LineItem = { label: string; quantity: number; unitPrice: number };

/* ───────── Comptes & accès ───────── */

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    fullName: text("full_name").notNull(),
    phone: text("phone"),
    role: text("role").notNull().default("client"),
    accountType: text("account_type").notNull().default("particulier"),
    companyName: text("company_name"),
    companyId: text("company_id"),
    jobTitle: text("job_title"),
    address: text("address"),
    city: text("city"),
    status: text("status").notNull().default("actif"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const counters = pgTable(
  "counters",
  {
    key: text("key").notNull(),
    year: integer("year").notNull(),
    value: integer("value").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.year] })],
);

/* ───────── Fichiers ───────── */

export const files = pgTable(
  "files",
  {
    id: id(),
    name: text("name").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    data: bytea("data").notNull(),
    isPublic: boolean("is_public").notNull().default(false),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("files_entity_idx").on(t.entityType, t.entityId)],
);

export const documents = pgTable(
  "documents",
  {
    id: id(),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    docType: text("doc_type").notNull(),
    label: text("label"),
    expiresAt: date("expires_at"),
    status: text("status").notNull().default("en_attente"),
    uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("documents_entity_idx").on(t.entityType, t.entityId)],
);

/* ───────── Catalogue ───────── */

export const categories = pgTable("categories", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  image: text("image"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
});

export const features = pgTable("features", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  icon: text("icon"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

export const owners = pgTable("owners", {
  id: id(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  companyName: text("company_name"),
  address: text("address"),
  city: text("city"),
  status: text("status").notNull().default("prospect"),
  payoutDetails: text("payout_details"),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const vehicles = pgTable(
  "vehicles",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    brand: text("brand").notNull(),
    model: text("model").notNull(),
    version: text("version"),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    ownerId: uuid("owner_id").references(() => owners.id, { onDelete: "set null" }),
    year: integer("year"),
    transmission: text("transmission"),
    fuel: text("fuel"),
    seats: integer("seats"),
    doors: integer("doors"),
    luggage: text("luggage"),
    color: text("color"),
    plate: text("plate"),
    mileage: integer("mileage"),
    shortDescription: text("short_description"),
    description: text("description"),
    usages: text("usages"),
    priceDay: integer("price_day"),
    priceWeek: integer("price_week"),
    priceMonth: integer("price_month"),
    pricesValidated: boolean("prices_validated").notNull().default(false),
    withDriver: text("with_driver").notNull().default("sur_demande"),
    commercialStatus: text("commercial_status").notNull().default("sur_demande"),
    technicalStatus: text("technical_status").notNull().default("operationnel"),
    publicationStatus: text("publication_status").notNull().default("brouillon"),
    featured: boolean("featured").notNull().default(false),
    coverImage: text("cover_image"),
    customFeatures: jsonb("custom_features").$type<string[]>().notNull().default([]),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("vehicles_pub_idx").on(t.publicationStatus)],
);

export const vehicleFeatures = pgTable(
  "vehicle_features",
  {
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    featureId: uuid("feature_id")
      .notNull()
      .references(() => features.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.vehicleId, t.featureId] })],
);

export const vehicleImages = pgTable("vehicle_images", {
  id: id(),
  vehicleId: uuid("vehicle_id")
    .notNull()
    .references(() => vehicles.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  alt: text("alt"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

/* ───────── CRM & demandes ───────── */

export const customers = pgTable(
  "customers",
  {
    id: id(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    type: text("type").notNull().default("particulier"),
    fullName: text("full_name").notNull(),
    companyName: text("company_name"),
    email: text("email"),
    phone: text("phone"),
    city: text("city"),
    address: text("address"),
    source: text("source").notNull().default("site"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("customers_email_idx").on(t.email), index("customers_phone_idx").on(t.phone)],
);

export const requests = pgTable(
  "requests",
  {
    id: id(),
    reference: text("reference").notNull().unique(),
    kind: text("kind").notNull().default("reservation"),
    serviceType: text("service_type").notNull(),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    vehicleId: uuid("vehicle_id").references(() => vehicles.id, { onDelete: "set null" }),
    startDate: date("start_date"),
    startTime: text("start_time"),
    endDate: date("end_date"),
    endTime: text("end_time"),
    pickup: text("pickup"),
    destination: text("destination"),
    passengers: integer("passengers"),
    duration: text("duration"),
    withDriver: boolean("with_driver").notNull().default(true),
    details: text("details"),
    contactName: text("contact_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    accountType: text("account_type").notNull().default("particulier"),
    companyName: text("company_name"),
    companyRole: text("company_role"),
    billingInfo: text("billing_info"),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    status: text("status").notNull().default("nouvelle"),
    assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
    internalNotes: text("internal_notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("requests_status_idx").on(t.status),
    index("requests_customer_idx").on(t.customerId),
    index("requests_user_idx").on(t.userId),
  ],
);

export const requestHistory = pgTable(
  "request_history",
  {
    id: id(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    note: text("note"),
    byUserId: uuid("by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("request_history_req_idx").on(t.requestId)],
);

export const quotes = pgTable("quotes", {
  id: id(),
  number: text("number").notNull().unique(),
  requestId: uuid("request_id").references(() => requests.id, { onDelete: "set null" }),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  status: text("status").notNull().default("brouillon"),
  items: jsonb("items").$type<LineItem[]>().notNull().default([]),
  subtotal: integer("subtotal").notNull().default(0),
  taxRate: integer("tax_rate").notNull().default(18),
  taxAmount: integer("tax_amount").notNull().default(0),
  total: integer("total").notNull().default(0),
  validUntil: date("valid_until"),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/* ───────── Exploitation ───────── */

export const drivers = pgTable("drivers", {
  id: id(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  email: text("email"),
  licenseNumber: text("license_number"),
  licenseExpiry: date("license_expiry"),
  languages: text("languages"),
  status: text("status").notNull().default("actif"),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const missions = pgTable(
  "missions",
  {
    id: id(),
    reference: text("reference").notNull().unique(),
    requestId: uuid("request_id").references(() => requests.id, { onDelete: "set null" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    vehicleId: uuid("vehicle_id").references(() => vehicles.id, { onDelete: "set null" }),
    driverId: uuid("driver_id").references(() => drivers.id, { onDelete: "set null" }),
    startAt: timestamp("start_at", { withTimezone: true }),
    endAt: timestamp("end_at", { withTimezone: true }),
    pickup: text("pickup"),
    destination: text("destination"),
    status: text("status").notNull().default("planifiee"),
    mileageStart: integer("mileage_start"),
    mileageEnd: integer("mileage_end"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("missions_start_idx").on(t.startAt)],
);

export const maintenance = pgTable("maintenance", {
  id: id(),
  vehicleId: uuid("vehicle_id")
    .notNull()
    .references(() => vehicles.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  status: text("status").notNull().default("planifie"),
  scheduledDate: date("scheduled_date"),
  dueMileage: integer("due_mileage"),
  completedDate: date("completed_date"),
  cost: integer("cost"),
  provider: text("provider"),
  notes: text("notes"),
  createdAt: createdAt(),
});

/* ───────── Propriétaires partenaires ───────── */

export const ownerSubmissions = pgTable("owner_submissions", {
  id: id(),
  reference: text("reference").notNull().unique(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => owners.id, { onDelete: "cascade" }),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  year: integer("year"),
  plate: text("plate"),
  mileage: integer("mileage"),
  fuel: text("fuel"),
  transmission: text("transmission"),
  seats: integer("seats"),
  condition: text("condition"),
  availability: text("availability"),
  ownerConditions: text("owner_conditions"),
  status: text("status").notNull().default("soumis"),
  inspectionDate: date("inspection_date"),
  proposal: text("proposal"),
  adminNotes: text("admin_notes"),
  vehicleId: uuid("vehicle_id").references(() => vehicles.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const submissionHistory = pgTable("submission_history", {
  id: id(),
  submissionId: uuid("submission_id")
    .notNull()
    .references(() => ownerSubmissions.id, { onDelete: "cascade" }),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  note: text("note"),
  byUserId: uuid("by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

/* ───────── Contrats & finances ───────── */

export const contracts = pgTable("contracts", {
  id: id(),
  number: text("number").notNull().unique(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  ownerId: uuid("owner_id").references(() => owners.id, { onDelete: "set null" }),
  vehicleId: uuid("vehicle_id").references(() => vehicles.id, { onDelete: "set null" }),
  requestId: uuid("request_id").references(() => requests.id, { onDelete: "set null" }),
  startDate: date("start_date"),
  endDate: date("end_date"),
  amount: integer("amount"),
  terms: text("terms"),
  status: text("status").notNull().default("brouillon"),
  sharedWithParty: boolean("shared_with_party").notNull().default(false),
  fileId: uuid("file_id").references(() => files.id, { onDelete: "set null" }),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const invoices = pgTable("invoices", {
  id: id(),
  number: text("number").notNull().unique(),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  requestId: uuid("request_id").references(() => requests.id, { onDelete: "set null" }),
  quoteId: uuid("quote_id").references(() => quotes.id, { onDelete: "set null" }),
  status: text("status").notNull().default("brouillon"),
  items: jsonb("items").$type<LineItem[]>().notNull().default([]),
  subtotal: integer("subtotal").notNull().default(0),
  taxRate: integer("tax_rate").notNull().default(18),
  taxAmount: integer("tax_amount").notNull().default(0),
  total: integer("total").notNull().default(0),
  amountPaid: integer("amount_paid").notNull().default(0),
  issuedAt: date("issued_at"),
  dueAt: date("due_at"),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const payments = pgTable("payments", {
  id: id(),
  direction: text("direction").notNull().default("encaissement"),
  invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
  ownerId: uuid("owner_id").references(() => owners.id, { onDelete: "set null" }),
  contractId: uuid("contract_id").references(() => contracts.id, { onDelete: "set null" }),
  amount: integer("amount").notNull(),
  method: text("method").notNull(),
  reference: text("reference"),
  paidAt: date("paid_at").notNull(),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const expenses = pgTable("expenses", {
  id: id(),
  category: text("category").notNull(),
  vehicleId: uuid("vehicle_id").references(() => vehicles.id, { onDelete: "set null" }),
  label: text("label").notNull(),
  amountHt: integer("amount_ht").notNull(),
  taxAmount: integer("tax_amount").notNull().default(0),
  amountTtc: integer("amount_ttc").notNull(),
  spentAt: date("spent_at").notNull(),
  supplier: text("supplier"),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

/* ───────── Contenus & communication ───────── */

export const partners = pgTable("partners", {
  id: id(),
  name: text("name").notNull(),
  sector: text("sector"),
  website: text("website"),
  logoUrl: text("logo_url"),
  authorizationConfirmed: boolean("authorization_confirmed").notNull().default(false),
  isPublished: boolean("is_published").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

export const testimonials = pgTable("testimonials", {
  id: id(),
  authorName: text("author_name").notNull(),
  authorRole: text("author_role"),
  company: text("company"),
  content: text("content").notNull(),
  rating: integer("rating"),
  status: text("status").notNull().default("en_attente"),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const messages = pgTable("messages", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("nouveau"),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    audience: text("audience"),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.userId), index("notifications_aud_idx").on(t.audience)],
);

export const emailOutbox = pgTable("email_outbox", {
  id: id(),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  html: text("html").notNull(),
  status: text("status").notNull().default("en_attente"),
  error: text("error"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: updatedAt(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    details: jsonb("details"),
    ip: text("ip"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt)],
);
