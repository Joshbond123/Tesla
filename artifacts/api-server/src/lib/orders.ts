import type { SupabaseClient } from "@supabase/supabase-js";

export type TimelineItem = { stage: string; timestamp: string | null; completed: boolean };

export type OrderResponse = {
  orderId: string; trackingNumber: string; email: string; entryId: string;
  selectedCar: Record<string, string>;
  deliveryDetails: Record<string, string>;
  deliveryMethod: Record<string, string | number>;
  paymentMethod: Record<string, string>;
  status: string; orderDate: string; estimatedDelivery: string;
  timeline: TimelineItem[];
};

export type UserOrder = Omit<OrderResponse, "email" | "entryId">;

// Supabase embedded relations come back as either a single object or an array
// depending on the relationship cardinality; normalize to the first row.
export function firstRelated<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}

export function mapTimeline(rows: unknown): TimelineItem[] {
  return ((rows ?? []) as any[])
    .sort((a, b) => a.stage_order - b.stage_order)
    .map((t) => ({ stage: t.stage, timestamp: t.timestamp, completed: t.completed }));
}

const ORDER_WITH_RELATIONS =
  "order_id,tracking_number,status,order_date,estimated_delivery,delivery_method,payment_method,selected_cars(data),delivery_details(data),tracking_data(stage,stage_order,timestamp,completed)";

// Load the most recent order for a user, normalized to the dashboard shape.
// Returns null when the user has no order (or on any lookup failure).
export async function loadUserOrder(supabase: SupabaseClient, userId: string): Promise<UserOrder | null> {
  try {
    const { data: fullOrder } = await supabase
      .from("orders")
      .select(ORDER_WITH_RELATIONS)
      .eq("user_id", userId)
      .order("order_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!fullOrder) return null;
    const car = firstRelated<{ data?: Record<string, string> }>(fullOrder.selected_cars);
    const delivery = firstRelated<{ data?: Record<string, string> }>(fullOrder.delivery_details);
    return {
      orderId: fullOrder.order_id, trackingNumber: fullOrder.tracking_number, status: fullOrder.status,
      orderDate: fullOrder.order_date, estimatedDelivery: fullOrder.estimated_delivery,
      deliveryMethod: fullOrder.delivery_method || {}, paymentMethod: fullOrder.payment_method || {},
      selectedCar: car?.data || {}, deliveryDetails: delivery?.data || {}, timeline: mapTimeline(fullOrder.tracking_data),
    };
  } catch {
    return null;
  }
}
