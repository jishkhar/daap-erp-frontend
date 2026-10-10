// TanStack Query keys for the portal's hooks (src/hooks), in one place because a save in one area refreshes screens owned by another
// (placing an order changes the orders list, the customer's history and stock). Each area's first key is the prefix that invalidates
// everything in it. Keys do not carry the signed-in person: the cache is cleared when that changes (lib/queryClient).

type Params = Record<string, string | number | boolean | null | undefined>;

export const queryKeys = {
  orders: ["erp", "orders"] as const,
  orderList: (params: Params) => ["erp", "orders", "list", params] as const,
  order: (id: string) => ["erp", "orders", "detail", id] as const,

  customers: ["erp", "customers"] as const,
  customerList: (params: Params) =>
    ["erp", "customers", "list", params] as const,
  customer: (id: string) => ["erp", "customers", "detail", id] as const,
  storeCredit: (id: string) => ["erp", "customers", "credit", id] as const,

  products: ["erp", "products"] as const,
  productList: (params: Params) => ["erp", "products", "list", params] as const,

  inventory: ["erp", "inventory"] as const,
  stockLevels: (params: Params) =>
    ["erp", "inventory", "levels", params] as const,
  stockConsolidated: (params: Params) =>
    ["erp", "inventory", "consolidated", params] as const,
  stockMovements: (params: Params) =>
    ["erp", "inventory", "ledger", params] as const,

  transfers: ["erp", "transfers"] as const,
  transferList: (params: Params) =>
    ["erp", "transfers", "list", params] as const,
  transfer: (id: string) => ["erp", "transfers", "detail", id] as const,

  taxes: ["erp", "taxes"] as const,
  taxRules: ["erp", "taxes", "rules"] as const,
  taxBands: ["erp", "taxes", "bands"] as const,
  gstRegistrations: ["erp", "taxes", "gst-registrations"] as const,

  branches: ["erp", "branches"] as const,
  branch: (id: string) => ["erp", "branches", "detail", id] as const,
  branchSchedule: (id: string) => ["erp", "branches", "schedule", id] as const,
  terminals: ["erp", "terminals"] as const,
  terminal: (id: string) => ["erp", "terminals", "detail", id] as const,
  branchTerminals: (id: string) => ["erp", "terminals", "branch", id] as const,
  cashiers: ["erp", "terminals", "cashiers"] as const,
  branchCashiers: (id: string) => ["erp", "terminals", "cashiers", id] as const,
  terminalSyncHealth: (id: string, problemsOnly: boolean, limit: number) =>
    ["erp", "terminals", "sync-health", id, problemsOnly, limit] as const,

  recommerce: ["erp", "recommerce"] as const,
  recommerceSummary: ["erp", "recommerce", "summary"] as const,
  recommerceAssets: (params: Params) =>
    ["erp", "recommerce", "assets", params] as const,
  recommerceAsset: (id: string) => ["erp", "recommerce", "asset", id] as const,
  priceGuides: ["erp", "recommerce", "price-guides"] as const,

  activity: ["erp", "activity"] as const,
  activityList: (params: Params) =>
    ["erp", "activity", "list", params] as const,
  recordActivity: (params: Params) =>
    ["erp", "activity", "record", params] as const,

  channels: ["erp", "channels"] as const,
  channelReadiness: (channel: string) =>
    ["erp", "channels", "readiness", channel] as const,
  channelBranches: ["erp", "channels", "branches"] as const,
  channelClients: ["erp", "channels", "clients"] as const,
  terminalSummary: ["erp", "terminals", "summary"] as const,
  whatsapp: ["erp", "whatsapp"] as const,
  whatsappAccount: ["erp", "whatsapp", "account"] as const,
  whatsappTemplates: ["erp", "whatsapp", "templates"] as const,

  analytics: ["erp", "analytics"] as const,
  today: (params: Params) => ["erp", "analytics", "today", params] as const,
  salesOverview: (params: Params) =>
    ["erp", "analytics", "sales", params] as const,
  recentOrders: (params: Params) =>
    ["erp", "orders", "recent", params] as const,
  lowStock: (params: Params) => ["erp", "inventory", "low", params] as const,

  // HR (leave and attendance) uses the portal API (/api/portal/...), so it has its own prefix.
  hrLeave: ["hr", "leave"] as const,
  hrLeaveMine: ["hr", "leave", "mine"] as const,
  hrLeaveRequests: (status: string) =>
    ["hr", "leave", "requests", status] as const,
  hrAttendance: ["hr", "attendance"] as const,
  hrClockToday: ["hr", "attendance", "today"] as const,
  hrMyMonth: (month: string, refreshKey: string) =>
    ["hr", "attendance", "my-month", month, refreshKey] as const,
  hrTeamDay: (date: string) => ["hr", "attendance", "team-day", date] as const,
  hrTeamMonth: (month: string) =>
    ["hr", "attendance", "team-month", month] as const,
  hrAttendanceSettings: ["hr", "attendance", "settings"] as const,

  billing: ["erp", "billing"] as const,
  servicePlans: (service: string) =>
    ["erp", "billing", "plans", service] as const,

  tenant: ["erp", "tenant"] as const,
  tenantView: ["erp", "tenant", "view"] as const,
  onboarding: ["erp", "onboarding"] as const,

  team: ["erp", "team"] as const,
  teamUsers: ["erp", "team", "users"] as const,
  roles: ["erp", "team", "roles"] as const,

  procurement: ["erp", "procurement"] as const,
  purchaseOrderList: (params: Params) =>
    ["erp", "procurement", "orders", params] as const,
  purchaseOrder: (id: string) => ["erp", "procurement", "order", id] as const,
  purchaseRequestList: (params: Params) =>
    ["erp", "procurement", "requests", params] as const,
  suppliers: ["erp", "procurement", "suppliers"] as const,
  supplierStatement: (id: string) =>
    ["erp", "procurement", "supplier-statement", id] as const,
  goodsReceipt: (id: string) =>
    ["erp", "procurement", "goods-receipt", id] as const,

  finance: ["erp", "finance"] as const,
  financeSummary: (params: Params) =>
    ["erp", "finance", "summary", params] as const,
  financeReport: (name: string, params: Params) =>
    ["erp", "finance", "reports", name, params] as const,
  expenseList: (params: Params) =>
    ["erp", "finance", "expenses", params] as const,
  expenseCategories: ["erp", "finance", "expense-categories"] as const,
  journalList: (params: Params) =>
    ["erp", "finance", "journal", params] as const,
  journalEntry: (id: string) =>
    ["erp", "finance", "journal-entry", id] as const,
  accounts: ["erp", "finance", "accounts"] as const,
  unreconciled: ["erp", "finance", "unreconciled"] as const,
  settlements: ["erp", "finance", "settlements"] as const,
  taxDocuments: (params: Params) =>
    ["erp", "finance", "tax-documents", params] as const,
};
