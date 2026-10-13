'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

interface OrderItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  customer_city: string;
  delivery_type: string;
  customer_address?: string;
  customer_neighborhood?: string;
  payment_method: string;
  notes?: string;
  items: OrderItem[];
  subtotal?: number;
  delivery_cost?: number;
  total: number;
  status: 'pendiente' | 'completado' | 'cancelado';
}

interface Product {
  id: string;
  title: string;
  description: string;
  full_description?: string;
  price: number;
  stock: number;
  image_url: string;
  images?: string[];
  active: boolean;
  featured?: boolean;
  category?: string;
}

interface Profile {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone?: string;
  accepted_terms: boolean;
}

type DateFilter = 'all' | 'today' | 'week' | 'month';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'inventory' | 'customers'>('dashboard');
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copiedEmails, setCopiedEmails] = useState<boolean>(false);

  // Estados: Crear Producto
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createCategory, setCreateCategory] = useState('Tecnología');
  const [createPrice, setCreatePrice] = useState<number | ''>('');
  const [createStock, setCreateStock] = useState<number | ''>(5);
  const [createDescription, setCreateDescription] = useState('');
  const [createFullDescription, setCreateFullDescription] = useState('');
  const [createFeatured, setCreateFeatured] = useState<boolean>(false);
  const [createFiles, setCreateFiles] = useState<File[]>([]);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Estados: Editar Producto
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('Tecnología');
  const [editPrice, setEditPrice] = useState<number | ''>('');
  const [editStock, setEditStock] = useState<number | ''>(0);
  const [editDescription, setEditDescription] = useState('');
  const [editFullDescription, setEditFullDescription] = useState('');
  const [editFeatured, setEditFeatured] = useState<boolean>(false);
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editNewFiles, setEditNewFiles] = useState<File[]>([]);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user?.email === 'tiradogalvismauricio68@gmail.com') {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      setAuthChecking(false);
    }
    checkSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);

    if (loginEmail.trim().toLowerCase() !== 'tiradogalvismauricio68@gmail.com') {
      setLoginError('Credenciales o permisos no válidos.');
      setIsLoggingIn(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword,
      });

      if (error) {
        setLoginError('Acceso denegado: ' + error.message);
      } else if (data.session) {
        setIsAuthenticated(true);
      }
    } catch (err: any) {
      setLoginError(err?.message || 'Error al iniciar sesión');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, productsRes, profilesRes] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('products').select('*').order('title', { ascending: true }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      ]);

      if (ordersRes.data) setOrders(ordersRes.data as Order[]);
      if (productsRes.data) setProducts(productsRes.data as Product[]);
      if (profilesRes.data) setProfiles(profilesRes.data as Profile[]);
    } catch (err) {
      console.error('Error cargando datos del panel admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  // APROBAR PEDIDO Y DESCONTAR STOCK AUTOMÁTICAMENTE
  const handleApproveOrderAndDeductStock = async (order: Order) => {
    setUpdatingId(order.id);
    try {
      // 1. Descontar unidades de cada producto en la base de datos
      if (Array.isArray(order.items)) {
        for (const item of order.items) {
          const currentProd = products.find((p) => p.id === item.id);
          if (currentProd) {
            const updatedStock = Math.max(0, Number(currentProd.stock) - Number(item.quantity));
            await supabase
              .from('products')
              .update({ stock: updatedStock })
              .eq('id', item.id);
          }
        }
      }

      // 2. Marcar pedido como completado
      const { error } = await supabase
        .from('orders')
        .update({ status: 'completado' })
        .eq('id', order.id);

      if (error) {
        alert('Error al aprobar: ' + error.message);
      } else {
        alert('✓ Pedido aprobado exitosamente. Stock actualizado en el inventario.');
        await fetchData();
      }
    } catch (err: any) {
      alert('Error: ' + err?.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm('¿Seguro que deseas cancelar este pedido?')) return;
    setUpdatingId(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelado' })
        .eq('id', orderId);

      if (error) alert('Error: ' + error.message);
      else await fetchData();
    } catch (err: any) {
      alert('Error: ' + err?.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleProductActive = async (productId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase.from('products').update({ active: !currentActive }).eq('id', productId);
      if (error) alert('Error: ' + error.message);
      else {
        setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, active: !currentActive } : p)));
      }
    } catch (err: any) {
      alert('Error: ' + err?.message);
    }
  };

  const handleToggleProductFeatured = async (productId: string, currentFeatured: boolean) => {
    try {
      const { error } = await supabase.from('products').update({ featured: !currentFeatured }).eq('id', productId);
      if (error) alert('Error al actualizar banner: ' + error.message);
      else {
        setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, featured: !currentFeatured } : p)));
      }
    } catch (err: any) {
      alert('Error: ' + err?.message);
    }
  };

  const handleUpdateStock = async (productId: string, newStock: number) => {
    if (newStock < 0) return;
    try {
      const { error } = await supabase.from('products').update({ stock: newStock }).eq('id', productId);
      if (error) alert('Error: ' + error.message);
      else {
        setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p)));
      }
    } catch (err: any) {
      alert('Error: ' + err?.message);
    }
  };

  const handleDeleteProduct = async (productId: string, title: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar permanentemente "${title}"?`)) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) alert('Error: ' + error.message);
      else {
        setProducts((prev) => prev.filter((p) => p.id !== productId));
        alert('Producto eliminado exitosamente.');
      }
    } catch (err: any) {
      alert('Error: ' + err?.message);
    }
  };

  const uploadFilesToStorage = async (files: File[]): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      const cleanName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const { error } = await supabase.storage.from('products').upload(cleanName, file, {
        cacheControl: '3600',
        upsert: true,
      });
      if (!error) {
        const { data } = supabase.storage.from('products').getPublicUrl(cleanName);
        if (data?.publicUrl) urls.push(data.publicUrl);
      }
    }
    return urls;
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle || createPrice === '' || createStock === '') {
      setCreateError('Por favor completa título, precio y stock.');
      return;
    }
    setIsCreating(true);
    setCreateError(null);
    try {
      const uploadedUrls = await uploadFilesToStorage(createFiles);
      const mainImg = uploadedUrls.length > 0 ? uploadedUrls[0] : '/logo.png';
      const imagesList = uploadedUrls.length > 0 ? uploadedUrls : [mainImg];

      const { data, error } = await supabase.from('products').insert([
        {
          title: createTitle,
          category: createCategory,
          price: Number(createPrice),
          stock: Number(createStock),
          description: createDescription,
          full_description: createFullDescription || createDescription,
          image_url: mainImg,
          images: imagesList,
          active: true,
          featured: createFeatured,
        },
      ]).select();

      if (error) setCreateError(error.message);
      else {
        if (data) setProducts((prev) => [data[0] as Product, ...prev]);
        setShowAddModal(false);
        setCreateTitle('');
        setCreatePrice('');
        setCreateStock(5);
        setCreateDescription('');
        setCreateFullDescription('');
        setCreateFeatured(false);
        setCreateFiles([]);
        alert('¡Producto creado exitosamente!');
      }
    } catch (err: any) {
      setCreateError(err?.message || 'Error al crear');
    } finally {
      setIsCreating(false);
    }
  };

  const startEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setEditTitle(prod.title);
    setEditCategory(prod.category || 'Tecnología');
    setEditPrice(prod.price);
    setEditStock(prod.stock);
    setEditDescription(prod.description || '');
    setEditFullDescription(prod.full_description || prod.description || '');
    setEditFeatured(Boolean(prod.featured));
    
    const existingImgs = prod.images && prod.images.length > 0
      ? prod.images
      : (prod.image_url ? [prod.image_url] : []);
    setEditImages([...existingImgs]);
    setEditNewFiles([]);
    setEditError(null);
  };

  const moveImageLeft = (index: number) => {
    if (index === 0) return;
    setEditImages((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const moveImageRight = (index: number) => {
    if (index === editImages.length - 1) return;
    setEditImages((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const removeImageAt = (index: number) => {
    setEditImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editTitle || editPrice === '' || editStock === '') {
      setEditError('Título, precio y stock son obligatorios.');
      return;
    }

    setIsUpdating(true);
    setEditError(null);

    try {
      let newlyUploadedUrls: string[] = [];
      if (editNewFiles.length > 0) {
        newlyUploadedUrls = await uploadFilesToStorage(editNewFiles);
      }

      const finalImages = [...editImages, ...newlyUploadedUrls];
      const finalMainImage = finalImages.length > 0 ? finalImages[0] : '/logo.png';

      const { data, error } = await supabase
        .from('products')
        .update({
          title: editTitle,
          category: editCategory,
          price: Number(editPrice),
          stock: Number(editStock),
          description: editDescription,
          full_description: editFullDescription || editDescription,
          featured: editFeatured,
          image_url: finalMainImage,
          images: finalImages.length > 0 ? finalImages : [finalMainImage],
        })
        .eq('id', editingProduct.id)
        .select();

      if (error) {
        setEditError('Error al actualizar: ' + error.message);
      } else {
        if (data && data.length > 0) {
          setProducts((prev) =>
            prev.map((p) => (p.id === editingProduct.id ? (data[0] as Product) : p))
          );
        }
        setEditingProduct(null);
        alert('¡Producto guardado exitosamente!');
      }
    } catch (err: any) {
      setEditError(err?.message || 'Error guardando cambios');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCopyEmails = () => {
    const emailList = profiles.map((p) => p.email).filter(Boolean).join(', ');
    navigator.clipboard.writeText(emailList);
    setCopiedEmails(true);
    setTimeout(() => setCopiedEmails(false), 2500);
  };

  // FILTRADO POR FECHA PARA MÉTRICAS (HOY, SEMANA, MES, TOTAL)
  const isOrderInDateRange = (orderDateStr: string, filter: DateFilter) => {
    if (filter === 'all') return true;
    const orderDate = new Date(orderDateStr);
    const now = new Date();

    if (filter === 'today') {
      return (
        orderDate.getFullYear() === now.getFullYear() &&
        orderDate.getMonth() === now.getMonth() &&
        orderDate.getDate() === now.getDate()
      );
    }

    if (filter === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return orderDate >= oneWeekAgo;
    }

    if (filter === 'month') {
      return (
        orderDate.getFullYear() === now.getFullYear() &&
        orderDate.getMonth() === now.getMonth()
      );
    }

    return true;
  };

  const filteredOrders = orders.filter((o) => isOrderInDateRange(o.created_at, dateFilter));
  const completedOrders = filteredOrders.filter((o) => o.status === 'completado');
  const pendingOrders = filteredOrders.filter((o) => o.status === 'pendiente');
  const totalRevenue = completedOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
  const totalUnitsSold = completedOrders.reduce((acc, o) => {
    if (!Array.isArray(o.items)) return acc;
    return acc + o.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }, 0);
  const lowStockProducts = products.filter((p) => Number(p.stock) <= 2);

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#060814] flex items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#060814] flex items-center justify-center p-4">
        <div className="bg-[#0d122b] border border-purple-500/40 rounded-3xl max-w-md w-full p-8 shadow-2xl relative">
          <div className="text-center mb-6">
            <span className="text-3xl block mb-2">🔐</span>
            <h2 className="text-xl font-bold text-white">Acceso Administrativo</h2>
            <p className="text-xs text-slate-400 mt-1">Omniverse Store • Exclusivo para el propietario</p>
          </div>

          {loginError && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-300 text-xs p-3 rounded-xl mb-4 font-semibold">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs" autoComplete="off">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Correo Electrónico</label>
              <input
                type="email"
                required
                autoComplete="off"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="w-full bg-[#141a38] border border-purple-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-400 text-sm"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Contraseña</label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#141a38] border border-purple-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-400 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-purple-900/40 text-sm active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isLoggingIn ? 'Verificando...' : 'Entrar al Panel'}
            </button>
          </form>

          <div className="text-center mt-6">
            <Link href="/" className="text-xs text-purple-400 hover:underline">
              ← Volver a la Tienda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060814] text-slate-100 flex flex-col font-sans">
      <header className="sticky top-0 z-30 bg-[#0d122b]/90 backdrop-blur-md border-b border-purple-500/20 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">⚙️</span>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-white leading-tight">Panel de Administración</h1>
            <p className="text-[10px] sm:text-[11px] text-purple-300">Sesión Administrativa Activa</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={fetchData}
            className="text-xs bg-[#141a38] hover:bg-[#1f2652] text-slate-200 border border-purple-500/30 px-2.5 sm:px-3 py-1.5 rounded-lg transition cursor-pointer"
          >
            🔄 Actualizar
          </button>
          <Link
            href="/"
            className="text-xs bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 px-2.5 sm:px-3 py-1.5 rounded-lg transition"
          >
            🏪 Ver Tienda
          </Link>
          <button
            onClick={handleLogout}
            className="text-xs bg-rose-900/40 hover:bg-rose-900/70 text-rose-200 border border-rose-700/40 px-2.5 sm:px-3 py-1.5 rounded-lg transition cursor-pointer"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* PESTAÑAS */}
      <div className="bg-[#0b0e24] border-b border-purple-500/20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto py-2.5 scrollbar-none">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            📊 Resumen & Métricas
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`relative px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
              activeTab === 'orders'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            📦 Pedidos
            {orders.filter((o) => o.status === 'pendiente').length > 0 && (
              <span className="ml-2 bg-amber-500 text-black font-black text-[10px] px-1.5 py-0.2 rounded-full">
                {orders.filter((o) => o.status === 'pendiente').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`relative px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
              activeTab === 'inventory'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            🏷️ Inventario & Stock
            {lowStockProducts.length > 0 && (
              <span className="ml-2 bg-rose-500 text-white font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                {lowStockProducts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
              activeTab === 'customers'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            👥 Clientes ({profiles.length})
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 flex-1">
        {loading ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm">Cargando datos...</p>
          </div>
        ) : (
          <>
            {/* ALERTA STOCK CRÍTICO */}
            {lowStockProducts.length > 0 && (
              <div className="mb-6 bg-rose-950/40 border border-rose-500/50 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center gap-2 mb-2 text-rose-300 font-bold text-xs sm:text-sm">
                  <span>⚠️</span>
                  <span>ATENCIÓN: PRODUCTOS CON STOCK CRÍTICO (&le; 2 UNIDADES)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {lowStockProducts.map((p) => (
                    <div
                      key={p.id}
                      className="bg-[#121638] border border-rose-500/30 rounded-xl p-3 flex justify-between items-center"
                    >
                      <div>
                        <p className="text-xs font-bold text-white line-clamp-1">{p.title}</p>
                        <p className="text-[11px] text-slate-400">${Number(p.price).toLocaleString('es-CO')} COP</p>
                      </div>
                      <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                        p.stock === 0 ? 'bg-red-600 text-white' : 'bg-amber-500 text-black'
                      }`}>
                        {p.stock === 0 ? 'AGOTADO' : `${p.stock} restantes`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB DASHBOARD CON FILTROS TEMPORALES */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                
                {/* SELECTOR DE FILTRO DE FECHAS */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#0d122b] p-3.5 sm:p-4 rounded-2xl border border-purple-500/30">
                  <div>
                    <h3 className="text-sm font-bold text-white">Filtrar Métricas y Rendimiento</h3>
                    <p className="text-xs text-slate-400">Selecciona el periodo que deseas analizar:</p>
                  </div>

                  <div className="flex gap-1.5 bg-[#141a38] p-1 rounded-xl border border-purple-500/30">
                    <button
                      onClick={() => setDateFilter('today')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        dateFilter === 'today' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Hoy
                    </button>
                    <button
                      onClick={() => setDateFilter('week')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        dateFilter === 'week' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Esta Semana
                    </button>
                    <button
                      onClick={() => setDateFilter('month')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        dateFilter === 'month' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Este Mes
                    </button>
                    <button
                      onClick={() => setDateFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        dateFilter === 'all' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Histórico Total
                    </button>
                  </div>
                </div>

                {/* TARJETAS DE MÉTRICAS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#0d122b] border border-purple-500/30 rounded-2xl p-5 shadow-lg">
                    <p className="text-xs text-slate-400 font-semibold mb-1">Total Recaudado (Ventas)</p>
                    <p className="text-2xl font-black text-emerald-400">${totalRevenue.toLocaleString('es-CO')} COP</p>
                    <p className="text-[11px] text-slate-500 mt-2">De {completedOrders.length} pedido(s) completado(s)</p>
                  </div>

                  <div className="bg-[#0d122b] border border-purple-500/30 rounded-2xl p-5 shadow-lg">
                    <p className="text-xs text-slate-400 font-semibold mb-1">Pedidos Pendientes</p>
                    <p className="text-2xl font-black text-amber-400">{pendingOrders.length}</p>
                    <p className="text-[11px] text-slate-500 mt-2">En este periodo</p>
                  </div>

                  <div className="bg-[#0d122b] border border-purple-500/30 rounded-2xl p-5 shadow-lg">
                    <p className="text-xs text-slate-400 font-semibold mb-1">Unidades Despachadas</p>
                    <p className="text-2xl font-black text-purple-300">{totalUnitsSold}</p>
                    <p className="text-[11px] text-slate-500 mt-2">Artículos vendidos en este periodo</p>
                  </div>

                  <div className="bg-[#0d122b] border border-purple-500/30 rounded-2xl p-5 shadow-lg">
                    <p className="text-xs text-slate-400 font-semibold mb-1">Clientes Registrados</p>
                    <p className="text-2xl font-black text-blue-400">{profiles.length}</p>
                    <p className="text-[11px] text-slate-500 mt-2">Con consentimiento Habeas Data</p>
                  </div>
                </div>

                {/* HISTORIAL RÁPIDO */}
                <div className="bg-[#0d122b] border border-purple-500/25 rounded-2xl p-4 sm:p-6 shadow-xl">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center justify-between">
                    <span>Pedidos en el Periodo Seleccionado</span>
                    <button onClick={() => setActiveTab('orders')} className="text-xs text-purple-400 hover:text-purple-300 underline cursor-pointer">
                      Ver todos en Pedidos
                    </button>
                  </h3>
                  {filteredOrders.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6">No hay pedidos registrados en este rango de tiempo.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="text-slate-400 border-b border-purple-500/20">
                          <tr>
                            <th className="pb-3 font-semibold">Fecha</th>
                            <th className="pb-3 font-semibold">Cliente</th>
                            <th className="pb-3 font-semibold">Teléfono / Ciudad</th>
                            <th className="pb-3 font-semibold">Total</th>
                            <th className="pb-3 font-semibold">Entrega</th>
                            <th className="pb-3 font-semibold">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-500/10 text-slate-300">
                          {filteredOrders.slice(0, 6).map((o) => (
                            <tr key={o.id} className="hover:bg-white/5">
                              <td className="py-3 text-slate-400">{new Date(o.created_at).toLocaleDateString('es-CO')}</td>
                              <td className="py-3 font-medium text-white">{o.customer_name}</td>
                              <td className="py-3">{o.customer_phone} • {o.customer_city}</td>
                              <td className="py-3 font-bold text-purple-300">${Number(o.total).toLocaleString('es-CO')}</td>
                              <td className="py-3 capitalize">{o.delivery_type === 'domicilio' ? 'Domicilio' : 'Recogida'}</td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  o.status === 'completado'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : o.status === 'cancelado'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                }`}>
                                  {o.status.toUpperCase()}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB PEDIDOS DETALLADO */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-bold text-white">Historial Completo de Pedidos</h3>
                  <span className="text-xs text-slate-400">{orders.length} pedido(s) totales</span>
                </div>

                {orders.length === 0 ? (
                  <div className="bg-[#0d122b] rounded-2xl p-10 text-center text-slate-500 border border-purple-500/20">
                    No se han registrado pedidos aún.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-[#0d122b] border border-purple-500/25 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col lg:flex-row justify-between gap-4 items-start lg:items-center"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-base font-bold text-white">{order.customer_name}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              order.status === 'completado'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : order.status === 'cancelado'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}>
                              {order.status.toUpperCase()}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {new Date(order.created_at).toLocaleString('es-CO')}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300">
                            📱 <strong>Tel:</strong> {order.customer_phone} • 🏙️ <strong>Ciudad:</strong> {order.customer_city}
                            {order.customer_address && ` • 📍 ${order.customer_address} (${order.customer_neighborhood || 'Sin barrio'})`}
                          </p>

                          <p className="text-xs text-slate-400">
                            💳 <strong>Pago:</strong> {order.payment_method === 'transferencia' ? 'Transferencia (Nequi/Bancolombia)' : 'Efectivo contra entrega'}
                            {' • '}🚚 <strong>Entrega:</strong> {order.delivery_type === 'domicilio' ? `Envío a domicilio ($${(order.delivery_cost || 15000).toLocaleString('es-CO')})` : 'Pasa a Recoger (Gratis)'}
                            {order.notes && ` • 📝 ${order.notes}`}
                          </p>

                          <div className="pt-2 text-xs text-purple-200">
                            <strong>Artículos:</strong>{' '}
                            {Array.isArray(order.items) &&
                              order.items.map((it, idx) => (
                                <span key={idx} className="inline-block bg-[#141a38] px-2 py-0.5 rounded-md mr-1.5 border border-purple-500/20 text-[11px]">
                                  {it.title} (x{it.quantity})
                                </span>
                              ))}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-3 w-full lg:w-auto border-t lg:border-t-0 pt-3 lg:pt-0 border-purple-500/20">
                          <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-300">
                            ${Number(order.total).toLocaleString('es-CO')} COP
                          </span>

                          {order.status === 'pendiente' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApproveOrderAndDeductStock(order)}
                                disabled={updatingId === order.id}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                              >
                                {updatingId === order.id ? 'Actualizando stock...' : '✓ Aprobar & Descontar Stock'}
                              </button>
                              <button
                                onClick={() => handleCancelOrder(order.id)}
                                disabled={updatingId === order.id}
                                className="bg-rose-900/60 hover:bg-rose-800 text-rose-200 font-semibold text-xs px-3 py-2 rounded-xl transition border border-rose-700/50 cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB INVENTARIO */}
            {activeTab === 'inventory' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">Control de Stock, Precios y Catálogo</h3>
                    <p className="text-xs text-slate-400">{products.length} producto(s) en inventario</p>
                  </div>
                  
                  <button
                    onClick={() => { setShowAddModal(true); setCreateError(null); }}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-lg shadow-purple-900/40 flex items-center gap-2 active:scale-95 cursor-pointer"
                  >
                    <span>➕</span>
                    <span>Agregar Nuevo Producto</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((prod) => (
                    <div
                      key={prod.id}
                      className="bg-[#0d122b] border border-purple-500/25 rounded-2xl p-5 shadow-lg flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <img
                            src={prod.image_url || (prod.images && prod.images[0]) || '/logo.png'}
                            alt={prod.title}
                            className="w-14 h-14 object-contain rounded-xl bg-slate-900 p-1 border border-purple-500/30"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                                {prod.category || 'General'}
                              </span>
                              {prod.featured && (
                                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                                  ⭐ En Banner
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-white truncate mt-1">{prod.title}</h4>
                            <p className="text-xs text-slate-400">
                              {prod.images ? `${prod.images.length} fotos` : '1 foto'}
                            </p>
                          </div>
                        </div>

                        <p className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-300 mb-3">
                          ${Number(prod.price).toLocaleString('es-CO')} COP
                        </p>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-purple-500/20">
                        {/* Control de Stock */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-300">Stock:</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateStock(prod.id, prod.stock - 1)}
                              className="w-7 h-7 bg-[#141a38] hover:bg-purple-600 rounded-lg text-xs font-bold text-white flex items-center justify-center border border-purple-500/30 cursor-pointer"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              value={prod.stock}
                              onChange={(e) => handleUpdateStock(prod.id, parseInt(e.target.value) || 0)}
                              className="w-14 bg-[#141a38] border border-purple-500/40 rounded-lg py-1 text-center text-xs font-bold text-white focus:outline-none"
                            />
                            <button
                              onClick={() => handleUpdateStock(prod.id, prod.stock + 1)}
                              className="w-7 h-7 bg-[#141a38] hover:bg-purple-600 rounded-lg text-xs font-bold text-white flex items-center justify-center border border-purple-500/30 cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Botón rápido Banner */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-300">Promocionar en Banner:</span>
                          <button
                            type="button"
                            onClick={() => handleToggleProductFeatured(prod.id, Boolean(prod.featured))}
                            className={`px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                              prod.featured
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {prod.featured ? '⭐ Sí (Destacado)' : '✕ No'}
                          </button>
                        </div>

                        {/* Acciones */}
                        <div className="flex items-center justify-between pt-1 gap-2">
                          <button
                            onClick={() => startEditProduct(prod)}
                            className="bg-blue-600/30 hover:bg-blue-600/60 text-blue-200 border border-blue-500/40 px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                          >
                            <span>✏️</span>
                            <span>Editar</span>
                          </button>

                          <button
                            onClick={() => handleToggleProductActive(prod.id, prod.active !== false)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                              prod.active !== false
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {prod.active !== false ? '✓ Activo' : '✕ Oculto'}
                          </button>

                          <button
                            onClick={() => handleDeleteProduct(prod.id, prod.title)}
                            className="text-xs text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-900/50 border border-red-500/30 px-3 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer"
                            title="Eliminar producto"
                          >
                            <span>🗑️</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CLIENTES */}
            {activeTab === 'customers' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">Base de Clientes Registrados</h3>
                    <p className="text-xs text-slate-400">Usuarios con consentimiento Habeas Data (Ley 1581 de 2012).</p>
                  </div>
                  <button
                    onClick={handleCopyEmails}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <span>📋</span>
                    <span>{copiedEmails ? '¡Correos copiados!' : 'Copiar todos los correos'}</span>
                  </button>
                </div>

                <div className="bg-[#0d122b] border border-purple-500/25 rounded-2xl overflow-hidden shadow-xl">
                  {profiles.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      Aún no hay clientes registrados en la base de datos.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="text-slate-400 bg-[#090c1f] border-b border-purple-500/20">
                          <tr>
                            <th className="py-3 px-4 font-semibold">Nombre Completo</th>
                            <th className="py-3 px-4 font-semibold">Correo Electrónico</th>
                            <th className="py-3 px-4 font-semibold">Teléfono / WhatsApp</th>
                            <th className="py-3 px-4 font-semibold">Habeas Data</th>
                            <th className="py-3 px-4 font-semibold">Fecha Registro</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-500/10 text-slate-300">
                          {profiles.map((prof) => (
                            <tr key={prof.id} className="hover:bg-white/5">
                              <td className="py-3 px-4 font-bold text-white">{prof.full_name}</td>
                              <td className="py-3 px-4 text-purple-300 font-medium">{prof.email}</td>
                              <td className="py-3 px-4">{prof.phone || 'No registrado'}</td>
                              <td className="py-3 px-4">
                                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  ✓ Autorizado
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-500">
                                {new Date(prof.created_at).toLocaleDateString('es-CO')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* MODAL EDITAR PRODUCTO */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0d122b] border border-purple-500/40 rounded-3xl max-w-2xl w-full p-6 sm:p-8 relative shadow-2xl my-8 max-h-[92vh] flex flex-col">
            <button
              onClick={() => setEditingProduct(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white text-lg cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">✏️</span>
              <h3 className="text-lg font-bold text-white">Editar Producto y Galería</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Modifica precios, descripciones y acomoda el orden de las fotos.
            </p>

            {editError && (
              <div className="bg-red-500/20 border border-red-500/40 text-red-300 text-xs p-3 rounded-xl mb-4 font-semibold">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEditProduct} className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Título del Producto *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-[#141a38] border border-purple-500/30 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-400 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Categoría</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-[#141a38] border border-purple-500/30 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-purple-400 text-xs cursor-pointer"
                  >
                    <option value="Tecnología">Tecnología</option>
                    <option value="Motos">Motos</option>
                    <option value="Hogar">Hogar</option>
                    <option value="Accesorios">Accesorios</option>
                    <option value="Iluminación">Iluminación</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Precio Actual (COP) *</label>
                  <input
                    type="number"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-[#141a38] border border-purple-500/30 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-purple-400 text-xs font-bold text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Stock de Unidades *</label>
                  <input
                    type="number"
                    required
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-[#141a38] border border-purple-500/30 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-purple-400 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="bg-[#141a38] border border-purple-500/30 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-xs">⭐ Promocionar en Banner Rotativo de la Tienda</p>
                  <p className="text-[11px] text-slate-400">El producto aparecerá como una diapositiva destacada principal.</p>
                </div>
                <input
                  type="checkbox"
                  checked={editFeatured}
                  onChange={(e) => setEditFeatured(e.target.checked)}
                  className="w-5 h-5 rounded border-purple-500 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Descripción Breve (Catálogo)</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-[#141a38] border border-purple-500/30 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-purple-400 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Descripción Detallada (Ventana modal)</label>
                <textarea
                  rows={4}
                  value={editFullDescription}
                  onChange={(e) => setEditFullDescription(e.target.value)}
                  className="w-full bg-[#141a38] border border-purple-500/30 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-purple-400 text-xs"
                />
              </div>

              <div className="bg-[#141a38] border border-purple-500/30 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <label className="block text-white font-bold text-xs">
                      🖼️ Organizador de Galería e Imagen de Portada
                    </label>
                    <p className="text-[11px] text-slate-400">
                      La <strong>Foto #1</strong> es la portada. Usa ◀ y ▶ para reordenar.
                    </p>
                  </div>
                  <span className="text-xs text-purple-300 font-semibold">{editImages.length} fotos</span>
                </div>

                {editImages.length === 0 ? (
                  <p className="text-xs text-amber-300 py-3">Este producto no tiene fotos cargadas actualmente.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-3">
                    {editImages.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        className={`relative rounded-xl overflow-hidden border-2 p-1 bg-[#0b0e24] flex flex-col items-center ${
                          idx === 0 ? 'border-emerald-400 shadow-md shadow-emerald-500/20' : 'border-purple-500/30'
                        }`}
                      >
                        <span className={`absolute top-2 left-2 text-[10px] font-black px-1.5 py-0.5 rounded-md z-10 ${
                          idx === 0 ? 'bg-emerald-500 text-black' : 'bg-black/70 text-white'
                        }`}>
                          {idx === 0 ? '★ Portada' : `#${idx + 1}`}
                        </span>

                        <div className="w-full h-24 rounded-lg overflow-hidden bg-slate-900 mb-2 mt-4 p-1 flex items-center justify-center">
                          <img src={imgUrl} alt={`Foto ${idx}`} className="w-full h-full object-contain" />
                        </div>

                        <div className="flex items-center justify-between w-full px-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveImageLeft(idx)}
                            className="w-6 h-6 bg-[#1f2652] hover:bg-purple-600 disabled:opacity-30 rounded text-[11px] font-bold text-white flex items-center justify-center cursor-pointer"
                            title="Mover antes"
                          >
                            ◀
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => removeImageAt(idx)}
                            className="text-red-400 hover:text-red-300 text-xs p-1 cursor-pointer"
                            title="Quitar foto"
                          >
                            ✕
                          </button>

                          <button
                            type="button"
                            disabled={idx === editImages.length - 1}
                            onClick={() => moveImageRight(idx)}
                            className="w-6 h-6 bg-[#1f2652] hover:bg-purple-600 disabled:opacity-30 rounded text-[11px] font-bold text-white flex items-center justify-center cursor-pointer"
                            title="Mover después"
                          >
                            ▶
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-purple-500/20">
                  <label className="block text-slate-300 font-semibold mb-1">
                    ➕ Añadir más fotos al producto
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files) {
                        setEditNewFiles(Array.from(e.target.files));
                      }
                    }}
                    className="w-full text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-600/30 file:text-purple-200 hover:file:bg-purple-600/50 cursor-pointer bg-[#0b0e24] p-2 rounded-xl border border-purple-500/30"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-purple-900/40 text-sm active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isUpdating ? 'Guardando cambios...' : 'Guardar Cambios del Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR PRODUCTO */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0d122b] border border-purple-500/40 rounded-3xl max-w-xl w-full p-6 sm:p-8 relative shadow-2xl my-8 max-h-[90vh] flex flex-col">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white text-lg cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📦</span>
              <h3 className="text-lg font-bold text-white">Agregar Nuevo Producto</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Completa los datos del producto y sube sus fotos para publicarlo.
            </p>

            {createError && (
              <div className="bg-red-500/20 border border-red-500/40 text-red-300 text-xs p-3 rounded-xl mb-4 font-semibold">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Título del Producto *</label>
                <input
                  type="text"
                  required
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="Ej. Intercomunicador Casco Bluetooth Pro"
                  className="w-full bg-[#141a38] border border-purple-500/30 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-400 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Categoría</label>
                  <select
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value)}
                    className="w-full bg-[#141a38] border border-purple-500/30 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-purple-400 text-xs cursor-pointer"
                  >
                    <option value="Tecnología">Tecnología</option>
                    <option value="Motos">Motos</option>
                    <option value="Hogar">Hogar</option>
                    <option value="Accesorios">Accesorios</option>
                    <option value="Iluminación">Iluminación</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Precio (COP) *</label>
                  <input
                    type="number"
                    required
                    value={createPrice}
                    onChange={(e) => setCreatePrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Ej. 165000"
                    className="w-full bg-[#141a38] border border-purple-500/30 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-purple-400 text-xs font-bold text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Stock Inicial *</label>
                  <input
                    type="number"
                    required
                    value={createStock}
                    onChange={(e) => setCreateStock(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Ej. 10"
                    className="w-full bg-[#141a38] border border-purple-500/30 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-purple-400 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="bg-[#141a38] border border-purple-500/30 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-xs">⭐ Promocionar en Banner Rotativo</p>
                  <p className="text-[11px] text-slate-400">Mostrar este producto en el carrusel de inicio.</p>
                </div>
                <input
                  type="checkbox"
                  checked={createFeatured}
                  onChange={(e) => setCreateFeatured(e.target.checked)}
                  className="w-5 h-5 rounded border-purple-500 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Descripción Breve (Catálogo)</label>
                <textarea
                  rows={2}
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="Resumen de 1 o 2 líneas..."
                  className="w-full bg-[#141a38] border border-purple-500/30 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-purple-400 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Descripción Detallada (Ventana modal)</label>
                <textarea
                  rows={4}
                  value={createFullDescription}
                  onChange={(e) => setCreateFullDescription(e.target.value)}
                  placeholder="Especificaciones completas..."
                  className="w-full bg-[#141a38] border border-purple-500/30 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-purple-400 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Fotos del Producto (hasta 4 imágenes)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files) {
                      setCreateFiles(Array.from(e.target.files).slice(0, 4));
                    }
                  }}
                  className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-600/30 file:text-purple-200 hover:file:bg-purple-600/50 cursor-pointer bg-[#141a38] p-2 rounded-xl border border-purple-500/30"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-purple-900/40 text-sm active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isCreating ? 'Guardando y publicando...' : 'Guardar y Publicar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}