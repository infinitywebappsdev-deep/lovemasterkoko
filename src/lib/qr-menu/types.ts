export interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  order: number;
  description?: string;
  icon?: string;
  isActive: boolean;
}

export type DietaryTag = "Spicy" | "Chef Special" | "Vegetarian" | "Halal" | "Gluten-Free" | "Sweet" | "Seafood" | "Platter";

export interface MenuItem {
  id: string;
  categoryId: string;
  categoryName: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  dietary: DietaryTag[];
  isAvailable: boolean;
  isFeatured?: boolean;
  preparationTime?: string;
  order: number;
  updatedAt?: string;
}

export interface DishAddon {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  cartKey?: string;
  item: MenuItem;
  quantity: number;
  selectedAddons?: DishAddon[];
  notes?: string;
  unitPrice?: number;
}

export type ServiceRequestType = "water" | "cutlery" | "clean" | "waiter" | "bill" | "ice" | "other";

export interface ServiceRequest {
  id: string;
  roomOrTable: string;
  orderType: "room" | "table" | "poolside_garden";
  type: ServiceRequestType;
  title: string;
  notes?: string;
  paymentMethod?: string;
  createdAt: string;
  status: "pending" | "resolved";
}export type OrderStatus = "pending" | "in_progress" | "fulfilled" | "cancelled";

/** Timestamped snapshot of an ordered menu item, so menu price changes
 *  never alter an already-placed order (FoodApp-style OrderItem pattern). */
export interface OrderedItemSnapshot {
  id: string;
  title: string;
  categoryName: string;
  priceAtOrder: number;
  quantity: number;
  subtotal: number;
  notes?: string;
}

export interface QrOrder {
  id: string;
  orderNumber: string;
  roomOrTable: string;
  orderType: "room" | "table" | "poolside_garden";
  guestName?: string;
  guestPhone?: string;
  specialInstructions?: string;
  /** Snapshot of item details at the moment of order — prices never change after placement. */
  items: OrderedItemSnapshot[];
  totalAmount: number;
  totalItems: number;
  status: OrderStatus;
  /** When the guest submitted the order (Firestore Timestamp ISO). */
  createdAt: string;
  /** When kitchen moved the order to in_progress, if applicable. */
  kitchenStartedAt?: string;
  /** When kitchen marked the order fulfilled, if applicable. */
  fulfilledAt?: string;
  updatedAt?: string;
}
