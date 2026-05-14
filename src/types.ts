export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  vendorId: string;
  vendorName: string;
  image: string;
  description: string;
  rating: number;
  reviews: number;
  stock?: number;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  rating: number;
  image: string;
  description: string;
  products: string[];
  reputation: string;
  deliveryTime: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Review {
  id: string;
  productId: string;
  userId: string | number;
  userName: string;
  userImage?: string;
  rating: number;
  comment: string;
  date: string;
}

export interface ChatMessage {
  id: string;
  senderId: string | number;
  senderName: string;
  text: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorImage: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: ChatMessage[];
}

export interface OrderItem {
  id: string;
  productId?: string;
  vendorId?: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  date: string;
  status: 'pending' | 'completed' | 'cancelled';
  deliveryMethod: 'pickup' | 'delivery';
  address?: string;
}

export interface User {
  id: string | number;
  name: string;
  role: 'student' | 'vendor';
  email: string;
  walletBalance: number;
  avatarUrl?: string;
}

export interface SearchHistory {
  id: string;
  query: string;
  timestamp: string;
}

export interface Transaction {
  id: string;
  type: 'topup' | 'payment' | 'refund';
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  method: 'wallet' | 'bank' | 'card';
  description?: string;
}

export interface ShopContextType {
  isLoading: boolean;
  products: Product[];
  vendors: Vendor[];
  cart: CartItem[];
  user: User | null;
  orders: Order[];
  categories: Category[];
  conversations: Conversation[];
  reviews: Review[];
  wishlist: string[];
  recentlyViewed: string[];
  recentlySearched: SearchHistory[];
  transactions: Transaction[];
  cartTotal: number;
  cartItemCount: number;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  addOrder: (items: CartItem[], total: number, deliveryMethod: 'pickup' | 'delivery', address?: string) => Promise<void>;
  sendMessage: (vendorId: string, text: string) => void;
  addReview: (productId: string, rating: number, comment: string) => void;
  toggleWishlist: (productId: string) => void;
  addToRecentlyViewed: (productId: string) => void;
  addToRecentlySearched: (query: string) => void;
  clearRecentlySearched: () => void;
  getVendorById: (vendorId: string) => Vendor | undefined;
  getProductById: (productId: string) => Product | undefined;
  getProductsByVendor: (vendorId: string) => Product[];
  setUserRole: (role: 'student' | 'vendor') => void;
  updateUserAvatar: (url: string) => void;
  topUpWallet: (amount: number) => void;
  deductFromWallet: (amount: number) => boolean;
  addProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  updateProduct: (productId: string, updates: Partial<Product>) => Promise<void>;
  updateUserName: (newName: string) => void;
}
