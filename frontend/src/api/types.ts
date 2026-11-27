// Shapes returned by the API (mirror backend/app/schemas)

export type SnapshotKind = "PR" | "QR";
export type Dataset = "PR" | "BU" | "BV";

// --------------------------------------------------------------------------- uploads & history
export type UploadResult = {
  kind: SnapshotKind;
  date: string;
  filename: string | null;
  replaced: boolean;
  counts: Partial<Record<Dataset, number>>;
  sheets: string[];
};

export type UploadResponse = { results: UploadResult[] };

export type SnapshotInfo = {
  filename: string | null;
  uploaded_at: string;
  counts: Partial<Record<Dataset, number>>;
};

export type SnapshotDay = { date: string; PR: SnapshotInfo | null; QR: SnapshotInfo | null };

// --------------------------------------------------------------------------- dashboard
export type DatasetHeadline = {
  label: string;
  total: number;
  aged: number;
  oldest: number;
  prev_date: string | null;
  prev_total: number | null;
  new: number | null;
  cleared: number | null;
};

export type BuyerCounts = { buyer: string } & Record<Dataset, number | null>;

export type Overview = {
  date: string | null;
  aged_days: number;
  datasets: Partial<Record<Dataset, DatasetHeadline | null>>;
  buyers: BuyerCounts[];
};

// --------------------------------------------------------------------------- pivots
export type BuyerAging = { buyer: string; counts: Record<string, number>; total: number };
export type BuyerCategories = { buyer: string; total: number; categories: { category: string; count: number }[] };

export type Summary = {
  dataset: Dataset;
  label: string;
  date: string;
  aged_days: number;
  aging_columns: number[];
  buyers: BuyerAging[];
  column_totals: Record<string, number>;
  total: number;
  categories: BuyerCategories[];
};

// --------------------------------------------------------------------------- items
export type Item = {
  doc_no: string;
  doc_date: string | null;
  description: string | null;
  category: string | null;
  category_raw: string | null;
  buyer: string | null;
  buyer_raw: string | null;
  requestor: string | null;
  department: string | null;
  approver: string | null;
  status: string | null;
  aging_days: number | null;
  vendor: string | null;
  total_price: number | null;
  currency: string | null;
  cost_block: string | null;
  cer_no: string | null;
  mer_no: string | null;
  expenditure_type: string | null;
  last_operate: string | null;
  submission_date: string | null;
  is_new: boolean;
};

export type ItemsOut = {
  dataset: Dataset;
  date: string;
  prev_date: string | null;
  aged_days: number;
  items: Item[];
  cleared: Item[];
};

// --------------------------------------------------------------------------- trend
export type Trend = {
  dataset: Dataset;
  label: string;
  month: string;
  days: string[];
  snapshot_days: string[];
  buyers: { buyer: string; values: Record<string, number | null>; avg: number | null }[];
  total: { values: Record<string, number | null>; avg: number | null };
};
