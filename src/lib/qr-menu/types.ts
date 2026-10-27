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
}

export type OrderStatus = "pending" | "in_progress" | "fulfilled" | "cancelled";

export interface QrOrder {
  id: string;
  orderNumber: string;
  roomOrTable: string;
  orderType: "room" | "table" | "poolside_garden";
  guestName?: string;
  guestPhone?: string;
  specialInstructions?: string;
  items: {
    id: string;
    title: string;
    categoryName: string;
    price: number;
    quantity: number;
    subtotal: number;
    notes?: string;
  }[];
  totalAmount: number;
  totalItems: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt?: string;
}
