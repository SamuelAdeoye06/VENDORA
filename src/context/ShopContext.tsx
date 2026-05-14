import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { categories } from '../mockData/db';
import {
  Product, Vendor, CartItem, User, ShopContextType, Order,
  Conversation, ChatMessage, Review, SearchHistory, Transaction, Category
} from '../types';
import { useAuth } from './AuthContext';
import { useFeedback } from './FeedbackContext';

// ─────────────────────────────────────────────────────────────────────────────
// WHY PRODUCTS CLEAR ON RESTART
// ─────────────────────────────────────────────────────────────────────────────
// When a vendor adds a product it is saved to Supabase (`products` table).
// On restart, `fetchShopData` queries Supabase again — but if Supabase's
// Row Level Security (RLS) has no SELECT policy, it returns 0 rows silently.
// The fix below falls back to mock data when 0 rows come back, and logs a
// clear warning so you know to add the RLS policy.
//
// ── One-time Supabase setup (run in SQL editor) ──────────────────────────────
//   -- Allow anyone to read products:
//   create policy "Public read products"
//   on products for select using (true);
//
//   -- Allow authenticated users to insert/update/delete their own products:
//   create policy "Vendors manage products"
//   on products for all to authenticated
//   using (auth.uid()::text = vendor_id)
//   with check (auth.uid()::text = vendor_id);
// ─────────────────────────────────────────────────────────────────────────────

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) throw new Error('useShop must be used within a ShopProvider');
  return context;
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const { user: authUser } = useAuth();
  const { showFeedback } = useFeedback();

  const [user, setUser] = useState<User | null>(null);
  useEffect(() => { setUser(authUser ?? null); }, [authUser]);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [dbVendors, setDbVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── Map Supabase snake_case row → camelCase Product ──────────────────────
  const mapProduct = (p: any, fallback?: Partial<Product>): Product => ({
    id: p.id,
    name: p.name ?? fallback?.name ?? '',
    price: Number(p.price ?? fallback?.price ?? 0),
    description: p.description ?? fallback?.description ?? '',
    image: p.image ?? fallback?.image ?? '',
    category: p.category ?? fallback?.category ?? '',
    vendorId: p.vendor_id ?? p.vendorId ?? fallback?.vendorId ?? '',
    vendorName: p.vendor_name ?? p.vendorName ?? fallback?.vendorName ?? 'Unknown Vendor',
    rating: Number(p.rating) || 0,
    reviews: Number(p.reviews_count ?? p.reviews) || 0,  // DB uses reviews_count
    stock: Number(p.stock ?? fallback?.stock ?? 0) || 0,
  });

  const mapVendor = (v: any): Vendor => ({
    id: v.id,
    name: v.name ?? 'Unknown Vendor',
    category: v.category ?? 'others',
    rating: Number(v.rating) || 0,
    image: v.image ?? '',
    description: v.description ?? '',
    products: [],
    reputation: v.reputation ?? 'New',
    deliveryTime: v.delivery_time ?? v.deliveryTime ?? '10-15 mins',
  });

  const mapOrder = (order: any, items: any[] = []): Order => ({
    id: order.id,
    items: items.map(item => ({
      id: item.product_id ?? item.id,
      productId: item.product_id,
      vendorId: item.products?.vendor_id,
      name: item.name,
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 1,
      image: item.image ?? '',
    })),
    total: Number(order.total) || 0,
    date: order.created_at ?? new Date().toISOString(),
    status: order.status ?? 'completed',
    deliveryMethod: order.delivery_method ?? 'pickup',
    address: order.address ?? undefined,
  });

  const isMissingColumnError = (error: any, column: string) => {
    const message = `${error?.message ?? ''} ${error?.details ?? ''}`;
    return error?.code === 'PGRST204' && message.includes(column);
  };

  const ensureVendorProfile = async (product: Product) => {
    const vendorRow = {
      id: product.vendorId,
      name: product.vendorName || 'Unknown Vendor',
      category: product.category || 'others',
      rating: 0,
      image: '',
      description: 'Campus vendor',
      reputation: 'New',
      delivery_time: '10-15 mins',
    };

    const { data, error } = await supabase
      .from('vendors')
      .upsert(vendorRow, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    if (data) {
      const savedVendor = mapVendor(data);
      setDbVendors(prev => {
        const exists = prev.some(v => v.id === savedVendor.id);
        return exists
          ? prev.map(v => v.id === savedVendor.id ? { ...v, ...savedVendor } : v)
          : [savedVendor, ...prev];
      });
    }
  };

  // ── Fetch from Supabase; fall back to mock data if RLS blocks reads ───────
  const fetchShopData = async () => {
    setIsLoading(true);
    try {
      const { data: productsData, error: pError } = await supabase
        .from('products').select('*');

      if (pError) throw pError;

      setDbProducts((productsData || []).map(p => mapProduct(p)));

      const { data: vendorsData, error: vError } = await supabase
        .from('vendors').select('*');
      if (vError) throw vError;
      setDbVendors((vendorsData || []).map(mapVendor));

      const { data: ordersData, error: oError } = await supabase
        .from('orders')
        .select('id,user_id,total,created_at,status,delivery_method,address,order_items(id,product_id,name,price,quantity,image,products(vendor_id))')
        .order('created_at', { ascending: false });
      if (oError) throw oError;
      setOrders((ordersData || []).map((order: any) => mapOrder(order, order.order_items || [])));
    } catch (error) {
      console.error('fetchShopData error:', error);
      setDbProducts([]);
      setDbVendors([]);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShopData();

    // ── Realtime: keep products in sync when any vendor adds/edits/deletes ──
    // This means a student browsing will see a new product appear without refresh.
    const channel = supabase
      .channel('products-realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'products' },
        (payload) => {
          setDbProducts(prev => {
            const exists = prev.some(p => p.id === payload.new.id);
            return exists ? prev : [mapProduct(payload.new), ...prev];
          });
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products' },
        (payload) => {
          setDbProducts(prev =>
            prev.map(p => p.id === payload.new.id ? mapProduct(payload.new) : p)
          );
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'products' },
        (payload) => {
          setDbProducts(prev => prev.filter(p => p.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Cart ──────────────────────────────────────────────────────────────────
  const addToCart = (product: Product) => {
    const existing = cart.find(i => i.id === product.id);
    if (existing) {
      showFeedback({
        type: 'success',
        title: 'Cart Updated',
        message: `${product.name} is already in your cart, so I increased the quantity.`,
        confirmText: 'Got it',
      });
      setCart(prev => prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      return;
    }

    showFeedback({
      type: 'success',
      title: 'Added to Cart',
      message: `${product.name} has been added to your cart.`,
      confirmText: 'Continue Shopping',
    });
    setCart(prev => [...prev, { ...product, quantity: 1 }]);
  };

  const removeFromCart = (productId: string) => {
    const product = cart.find(i => i.id === productId);
    if (product) {
      showFeedback({
        type: 'info',
        title: 'Removed from Cart',
        message: `${product.name} has been removed from your cart.`,
      });
    }
    setCart(prev => prev.filter(i => i.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) { removeFromCart(productId); return; }
    setCart(prev => prev.map(i => i.id === productId ? { ...i, quantity } : i));
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((t, i) => t + i.price * i.quantity, 0);
  const cartItemCount = cart.reduce((t, i) => t + i.quantity, 0);

  // ── Orders ────────────────────────────────────────────────────────────────
  const addOrder = async (items: CartItem[], total: number, deliveryMethod: 'pickup' | 'delivery', address?: string) => {
    if (!user) throw new Error('You must be logged in to place an order.');

    const { data: insertedOrder, error: orderError } = await supabase
      .from('orders')
      .insert([{
        user_id: user.id.toString(),
        total,
        status: 'completed',
        delivery_method: deliveryMethod,
        address: address || null,
      }])
      .select('id,user_id,total,created_at,status,delivery_method,address')
      .single();

    if (orderError) throw orderError;

    const orderItems = items.map(i => ({
      order_id: insertedOrder.id,
      product_id: i.id,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      image: i.image,
    }));

    const { data: insertedItems, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)
      .select('id,product_id,name,price,quantity,image,products(vendor_id)');

    if (itemsError) throw itemsError;

    const newOrder: Order = {
      id: insertedOrder.id,
      items: (insertedItems || []).map((item: any) => ({
        id: item.product_id,
        productId: item.product_id,
        vendorId: item.products?.vendor_id,
        name: item.name,
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
        image: item.image ?? '',
      })),
      total,
      date: insertedOrder.created_at,
      status: insertedOrder.status ?? 'completed',
      deliveryMethod,
      address,
    };
    setOrders(prev => [newOrder, ...prev]);
  };

  // ── Products CRUD ─────────────────────────────────────────────────────────
  const addProduct = async (newProduct: Product) => {
    await ensureVendorProfile(newProduct);

    const productRow = {
      // id omitted — Supabase generates a proper uuid automatically
      name: newProduct.name,
      price: newProduct.price,
      description: newProduct.description,
      image: newProduct.image,
      category: newProduct.category,
      vendor_id: newProduct.vendorId,   // already a uuid string from auth
      vendor_name: newProduct.vendorName,
      stock: newProduct.stock || 50,
      // rating & reviews_count default to 0 in DB — not sent on insert
    };

    const insertProduct = (row: typeof productRow | Omit<typeof productRow, 'vendor_name'>) =>
      supabase.from('products').insert([row]).select().single();

    let { data: inserted, error } = await insertProduct(productRow);

    if (isMissingColumnError(error, 'vendor_name')) {
      const { vendor_name, ...rowWithoutVendorName } = productRow;
      const retry = await insertProduct(rowWithoutVendorName);
      inserted = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    // Use the DB-generated uuid as the product id (not our PROD-timestamp string)
    const saved = inserted ? mapProduct(inserted, newProduct) : newProduct;
    setDbProducts(prev => [saved, ...prev]);
    showFeedback({
      type: 'success',
      title: 'Product Listed',
      message: `${saved.name} is now live in the marketplace.`,
    });
  };

  const deleteProduct = async (productId: string) => {
    const { data, error } = await supabase.from('products').delete().eq('id', productId).select('id').maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new Error('Product was not deleted. It may not belong to this signed-in vendor, or Supabase RLS blocked the request.');
    }
    setDbProducts(prev => prev.filter(p => p.id !== productId));
    showFeedback({
      type: 'success',
      title: 'Product Deleted',
      message: 'The listing has been removed from your store.',
    });
  };

  const updateProduct = async (productId: string, updates: Partial<Product>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.image !== undefined) dbUpdates.image = updates.image;
    if (updates.stock !== undefined) dbUpdates.stock = updates.stock;

    const { data, error } = await supabase.from('products').update(dbUpdates).eq('id', productId).select('id').maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new Error('Product was not updated. It may not belong to this signed-in vendor, or Supabase RLS blocked the request.');
    }
    setDbProducts(prev => prev.map(p => p.id === productId ? { ...p, ...updates } : p));
    showFeedback({
      type: 'success',
      title: 'Product Updated',
      message: 'Your listing changes have been saved.',
    });
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getVendorById = (id: string) => dbVendors.find(v => v.id === id);
  const getProductById = (id: string) => dbProducts.find(p => p.id === id);
  const getProductsByVendor = (vendorId: string) => dbProducts.filter(p => p.vendorId === vendorId);

  // ── User helpers ──────────────────────────────────────────────────────────
  const updateUserName = (newName: string) =>
    setUser(prev => prev ? { ...prev, name: newName } : null);

  const setUserRole = (role: 'student' | 'vendor') => {
    setUser(prev => prev ? { ...prev, role } : null);
    if (role === 'student') clearCart();
  };

  const updateUserAvatar = (avatarUrl: string) =>
    setUser(prev => prev ? { ...prev, avatarUrl } : null);

  // ── Wallet ────────────────────────────────────────────────────────────────
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const topUpWallet = (amount: number) => {
    if (!user) return;
    setUser(prev => prev ? { ...prev, walletBalance: prev.walletBalance + amount } : null);
    setTransactions(prev => [{
      id: `TRX-${Date.now()}`,
      type: 'topup', amount,
      date: new Date().toISOString(),
      status: 'completed', method: 'bank',
      description: 'Wallet funding',
    }, ...prev]);
  };

  const deductFromWallet = (amount: number): boolean => {
    if (!user || user.walletBalance < amount) return false;
    setUser(prev => prev ? { ...prev, walletBalance: prev.walletBalance - amount } : null);
    setTransactions(prev => [{
      id: `TRX-${Date.now()}`,
      type: 'payment', amount,
      date: new Date().toISOString(),
      status: 'completed', method: 'wallet',
      description: 'Order payment',
    }, ...prev]);
    return true;
  };

  // ── Messaging ─────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const sendMessage = (vendorId: string, text: string) => {
    if (!user) return;
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: user.id,
      senderName: user.name,
      text,
      timestamp: new Date().toISOString(),
    };
    setConversations(prev => {
      const existing = prev.find(c => c.vendorId === vendorId);
      if (existing) {
        return prev.map(c => c.vendorId === vendorId
          ? { ...c, messages: [...c.messages, newMessage], lastMessage: text, lastMessageTime: newMessage.timestamp }
          : c
        );
      }
      const vendor = dbVendors.find(v => v.id === vendorId);
      return [{
        id: `conv-${Date.now()}`,
        vendorId,
        vendorName: vendor?.name || 'Unknown Vendor',
        vendorImage: vendor?.image || '',
        lastMessage: text,
        lastMessageTime: newMessage.timestamp,
        unreadCount: 0,
        messages: [newMessage],
      }, ...prev];
    });
  };

  // ── Reviews ───────────────────────────────────────────────────────────────
  const [reviews, setReviews] = useState<Review[]>([]);

  const addReview = (productId: string, rating: number, comment: string) => {
    if (!user) return;
    setReviews(prev => [{
      id: `rev-${Date.now()}`,
      productId, userId: user.id, userName: user.name,
      userImage: user.avatarUrl, rating, comment,
      date: new Date().toISOString(),
    }, ...prev]);
    showFeedback({
      type: 'success',
      title: 'Review Submitted',
      message: 'Thanks for sharing your experience.',
    });
  };

  // ── Wishlist & History ────────────────────────────────────────────────────
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);
  const [recentlySearched, setRecentlySearched] = useState<SearchHistory[]>([]);

  const toggleWishlist = (productId: string) => {
    const product = dbProducts.find(p => p.id === productId);
    const isSaved = wishlist.includes(productId);
    showFeedback({
      type: isSaved ? 'info' : 'success',
      title: isSaved ? 'Removed from Wishlist' : 'Saved to Wishlist',
      message: product
        ? `${product.name} has been ${isSaved ? 'removed from' : 'added to'} your wishlist.`
        : `This item has been ${isSaved ? 'removed from' : 'added to'} your wishlist.`,
    });
    setWishlist(prev => isSaved ? prev.filter(id => id !== productId) : [productId, ...prev]);
  };

  const addToRecentlyViewed = (productId: string) =>
    setRecentlyViewed(prev => [productId, ...prev.filter(id => id !== productId)].slice(0, 20));

  const addToRecentlySearched = (query: string) => {
    if (!query.trim()) return;
    setRecentlySearched(prev => {
      const filtered = prev.filter(h => h.query.toLowerCase() !== query.toLowerCase());
      return [{ id: `search-${Date.now()}`, query, timestamp: new Date().toISOString() }, ...filtered].slice(0, 10);
    });
  };

  const clearRecentlySearched = () => setRecentlySearched([]);

  // ── Context value ─────────────────────────────────────────────────────────
  const value = {
    isLoading,
    products: dbProducts,
    vendors: dbVendors,
    cart, user, orders, categories,
    conversations, reviews, wishlist,
    recentlyViewed, recentlySearched, transactions,
    cartTotal, cartItemCount,
    addToCart, removeFromCart, updateQuantity, clearCart,
    addOrder, sendMessage, addReview,
    toggleWishlist, addToRecentlyViewed, addToRecentlySearched, clearRecentlySearched,
    getVendorById, getProductById, getProductsByVendor,
    setUserRole, updateUserAvatar, topUpWallet, deductFromWallet,
    addProduct, deleteProduct, updateProduct, updateUserName,
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}
