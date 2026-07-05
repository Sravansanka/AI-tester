export interface User {
  username: string;
  password: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
}

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}
