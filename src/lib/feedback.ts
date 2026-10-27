export type Feedback = {
  id: string;
  rating: number | null;
  comment: string | null;
  product_name: string | null;
  customer_name: string | null;
  customer_id: string | null;
  customer_code: string | null;
  order_number: string | null;
  order_id: string | null;
  branch_name: string | null;
  branch_id: string | null;
  branch_code: string | null;
  channel: string | null;
  created_at: string;
};
