export interface Product {
  id: number;
  category_id: number;
  category_name: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface Order {
  id: number;
  client_id?: number;
  courier_id?: number;
  courier_name?: string;
  type: 'table' | 'counter' | 'delivery';
  table_number?: number;
  status: 'received' | 'preparing' | 'ready' | 'delivering' | 'completed' | 'cancelled';
  total_price: number;
  address?: string;
  payment_method?: string;
  created_at: string;
  items?: OrderItem[];
}

export interface Courier {
  id: number;
  name: string;
  status: string;
}

export type ViewType = 'admin' | 'cashier' | 'kitchen' | 'delivery' | 'client';
