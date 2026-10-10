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
  total: number;
  status: 'pendiente' | 'completado' | 'cancelado';
}

interface Product {
  id: string;
  title: string;
  price: number;
  stock: number;
  active: boolean;
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

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'inventory' | 'customers'>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copiedEmails, setCopiedEmails] = useState<boolean>(false);

  // Verificar sesión existente
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

  // Login sin exponer correo por defecto
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

  const handleUpdateOrderStatus = async (orderId: string, newStatus: 'completado' | 'cancelado') => {
    setUpdatingId(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) {
        alert('Error al actualizar pedido: ' + error.message);
      } else {
        await fetchData();
      }
    } catch (err: any) {
      alert('Error: ' + err?.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleProductActive = async (productId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ active: !currentActive })
        .eq('id', productId);

      if (error) {
        alert('Error al modificar visibilidad: ' + error.message);
      } else {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, active: !currentActive } : p))
        );
      }
    } catch (err: any) {
      alert('Error: ' + err?.message);
    }
  };

  const handleUpdateStock = async (productId: string, newStock: number) => {
    if (newStock < 0) return;
    try {
      const { error } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', productId);

      if (error) {
        alert('Error al actualizar stock: ' + error.message);
      } else {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p))
        );
      }
    } catch (err: any) {
      alert('Error: ' + err?.message);
    }
  };

  const handleCopyEmails = () => {
    const emailList = profiles.map((p) => p.email).filter(Boolean).join(', ');
    navigator.clipboard.writeText(emailList);
    setCopiedEmails(true);
    setTimeout(() => setCopiedEmails(false), 2500);
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#060814] flex items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // LOGIN CON PLACEHOLDER NEUTRO Y AUTOCOMPLETE OFF
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

  // Cálculos de métricas
  const completedOrders = orders.filter((o) => o.status === 'completado');
  const pendingOrders = orders.filter((o) => o.status === 'pendiente');
  const totalRevenue = completedOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
  const totalUnitsSold = completedOrders.reduce((acc, o) => {
    if (!Array.isArray(o.items)) return acc;
    return acc + o.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }, 0);
  const lowStockProducts = products.filter((p) => Number(p.stock) <= 2);

  return (
    <div className="min-h-screen bg-[#060814] text-slate-100 flex flex-col font-sans">
      <header className="sticky top-0 z-30 bg-[#0d122b]/90 backdrop-blur-md border-b border-purple-500/20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">⚙️</span>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">Panel de Administración</h1>
            <p className="text-[11px] text-purple-300">Sesión Administrativa Activa</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="text-xs bg-[#141a38] hover:bg-[#1f2652] text-slate-200 border border-purple-500/30 px-3 py-1.5 rounded-lg transition"
          >
            🔄 Actualizar
          </button>
          <Link
            href="/"
            className="text-xs bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 px-3 py-1.5 rounded-lg transition"
          >
            🏪 Ver Tienda
          </Link>
          <button
            onClick={handleLogout}
            className="text-xs bg-rose-900/40 hover:bg-rose-900/70 text-rose-200 border border-rose-700/40 px-3 py-1.5 rounded-lg transition"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      <div className="bg-[#0b0e24] border-b border-purple-500/20 px-6">
        <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto py-2.5">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            📊 Resumen & Métricas
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`relative px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'orders'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            📦 Pedidos
            {pendingOrders.length > 0 && (
              <span className="ml-2 bg-amber-500 text-black font-black text-[10px] px-1.5 py-0.2 rounded-full">
                {pendingOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`relative px-4 py-2 rounded-xl text-xs font-semibold transition ${
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
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'customers'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            👥 Clientes ({profiles.length})
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto w-full p-6 flex-1">
        {loading ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm">Cargando datos...</p>
          </div>
        ) : (
          <>
            {lowStockProducts.length > 0 && (
              <div className="mb-6 bg-rose-950/40 border border-rose-500/50 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center gap-2 mb-2 text-rose-300 font-bold text-sm">
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
                        <p className="text-xs font-bold text-white">{p.title}</p>
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

            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#0d122b] border border-purple-500/30 rounded-2xl p-5 shadow-lg">
                    <p className="text-xs text-slate-400 font-semibold mb-1">Total Recaudado (Ventas)</p>
                    <p className="text-2xl font-black text-emerald-400">
                      ${totalRevenue.toLocaleString('es-CO')} COP
                    </p>
                    <p className="text-[11px] text-slate-500 mt-2">
                      De {completedOrders.length} pedido(s) completado(s)
                    </p>
                  </div>

                  <div className="bg-[#0d122b] border border-purple-500/30 rounded-2xl p-5 shadow-lg">
                    <p className="text-xs text-slate-400 font-semibold mb-1">Pedidos Pendientes</p>
                    <p className="text-2xl font-black text-amber-400">
                      {pendingOrders.length}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-2">Requieren verificación de pago</p>
                  </div>

                  <div className="bg-[#0d122b] border border-purple-500/30 rounded-2xl p-5 shadow-lg">
                    <p className="text-xs text-slate-400 font-semibold mb-1">Unidades Despachadas</p>
                    <p className="text-2xl font-black text-purple-300">
                      {totalUnitsSold}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-2">Artículos vendidos exitosamente</p>
                  </div>

                  <div className="bg-[#0d122b] border border-purple-500/30 rounded-2xl p-5 shadow-lg">
                    <p className="text-xs text-slate-400 font-semibold mb-1">Clientes Registrados</p>
                    <p className="text-2xl font-black text-blue-400">
                      {profiles.length}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-2">Con consentimiento Habeas Data</p>
                  </div>
                </div>

                <div className="bg-[#0d122b] border border-purple-500/25 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center justify-between">
                    <span>Últimos Pedidos Registrados</span>
                    <button onClick={() => setActiveTab('orders')} className="text-xs text-purple-400 hover:text-purple-300 underline">
                      Ver todos
                    </button>
                  </h3>
                  {orders.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6">Aún no hay pedidos en el sistema.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="text-slate-400 border-b border-purple-500/20">
                          <tr>
                            <th className="pb-3 font-semibold">Cliente</th>
                            <th className="pb-3 font-semibold">Teléfono / Ciudad</th>
                            <th className="pb-3 font-semibold">Total</th>
                            <th className="pb-3 font-semibold">Método</th>
                            <th className="pb-3 font-semibold">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-500/10 text-slate-300">
                          {orders.slice(0, 5).map((o) => (
                            <tr key={o.id} className="hover:bg-white/5">
                              <td className="py-3 font-medium text-white">{o.customer_name}</td>
                              <td className="py-3">{o.customer_phone} • {o.customer_city}</td>
                              <td className="py-3 font-bold text-purple-300">${Number(o.total).toLocaleString('es-CO')}</td>
                              <td className="py-3 capitalize">{o.payment_method}</td>
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

            {activeTab === 'orders' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white mb-2">Historial Completo de Pedidos</h3>
                {orders.length === 0 ? (
                  <div className="bg-[#0d122b] rounded-2xl p-10 text-center text-slate-500 border border-purple-500/20">
                    No se han recibido pedidos aún.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-[#0d122b] border border-purple-500/25 rounded-2xl p-5 shadow-lg flex flex-col lg:flex-row justify-between gap-4 items-start lg:items-center"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-3">
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
                            <span className="text-[11px] text-slate-500">
                              {new Date(order.created_at).toLocaleDateString('es-CO')}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300">
                            📱 <strong>Tel:</strong> {order.customer_phone} • 🏙️ <strong>Ciudad:</strong> {order.customer_city}
                            {order.customer_address && ` • 📍 ${order.customer_address} (${order.customer_neighborhood || 'Sin barrio'})`}
                          </p>

                          <p className="text-xs text-slate-400">
                            💳 <strong>Pago:</strong> {order.payment_method === 'transferencia' ? 'Transferencia (Nequi/Bancolombia)' : 'Efectivo contra entrega'}
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
                                onClick={() => handleUpdateOrderStatus(order.id, 'completado')}
                                disabled={updatingId === order.id}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-md active:scale-95 disabled:opacity-50"
                              >
                                {updatingId === order.id ? 'Procesando...' : '✓ Aprobar & Descontar Stock'}
                              </button>
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'cancelado')}
                                disabled={updatingId === order.id}
                                className="bg-rose-900/60 hover:bg-rose-800 text-rose-200 font-semibold text-xs px-3 py-2 rounded-xl transition border border-rose-700/50"
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

            {activeTab === 'inventory' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-bold text-white">Control de Stock y Visibilidad</h3>
                  <span className="text-xs text-slate-400">{products.length} producto(s) en inventario</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((prod) => (
                    <div
                      key={prod.id}
                      className="bg-[#0d122b] border border-purple-500/25 rounded-2xl p-5 shadow-lg flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <h4 className="text-sm font-bold text-white">{prod.title}</h4>
                          <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                            {prod.category || 'General'}
                          </span>
                        </div>
                        <p className="text-base font-black text-purple-300 mb-4">
                          ${Number(prod.price).toLocaleString('es-CO')} COP
                        </p>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-purple-500/20">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-300">Unidades en Stock:</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateStock(prod.id, prod.stock - 1)}
                              className="w-7 h-7 bg-[#141a38] hover:bg-purple-600 rounded-lg text-xs font-bold text-white flex items-center justify-center border border-purple-500/30"
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
                              className="w-7 h-7 bg-[#141a38] hover:bg-purple-600 rounded-lg text-xs font-bold text-white flex items-center justify-center border border-purple-500/30"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-300">Visible en Tienda:</span>
                          <button
                            onClick={() => handleToggleProductActive(prod.id, prod.active !== false)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                              prod.active !== false
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {prod.active !== false ? '✓ Habilitado' : '✕ Oculto'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'customers' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">Base de Clientes Registrados</h3>
                    <p className="text-xs text-slate-400">
                      Usuarios con consentimiento Habeas Data (Ley 1581 de 2012).
                    </p>
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
    </div>
  );
}