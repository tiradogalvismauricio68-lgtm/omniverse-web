'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase } from './lib/supabase';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  image_url: string;
  category?: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cartCount, setCartCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const { data, error } = await supabase.from('products').select('*');
        if (error) {
          console.error('Error al cargar productos:', error.message);
        } else if (data) {
          setProducts(data);
        }
      } catch (err) {
        console.error('Excepción al consultar Supabase:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  const addToCart = () => {
    setCartCount((prev) => prev + 1);
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const categories = [
    { name: 'Todas', icon: '✨' },
    { name: 'Tecnología', icon: '🎧' },
    { name: 'Hogar', icon: '🏠' },
    { name: 'Accesorios', icon: '⌚' },
    { name: 'Iluminación', icon: '💡' },
  ];

  // Filtro dinámico por buscador y categoría
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'Todas' ||
      (product.category && product.category.toLowerCase() === selectedCategory.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col font-sans selection:bg-purple-600 selection:text-white">
      
      {/* 1. BARRA SUPERIOR PRINCIPAL */}
      <header className="sticky top-0 z-50 bg-[#0a0d1d]/90 backdrop-blur-md border-b border-purple-900/30 px-4 py-3 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo Oficial */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setSelectedCategory('Todas'); setSearchTerm(''); }}>
            <Image
              src="/logo.png"
              alt="Omniverse Store Logo"
              width={220}
              height={55}
              priority
              className="h-10 md:h-12 w-auto object-contain hover:opacity-95 transition-opacity"
            />
          </div>

          {/* Buscador Central */}
          <div className="flex-1 max-w-xl mx-2 hidden sm:block">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar productos, marcas o categorías..."
                className="w-full bg-[#12162b] border border-purple-500/30 rounded-full py-2.5 pl-5 pr-12 text-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all shadow-inner"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-purple-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Mi Cuenta */}
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-1.5 text-xs md:text-sm text-gray-300 hover:text-white px-3 py-2 rounded-xl hover:bg-white/5 transition-colors"
            >
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="hidden md:inline font-medium">Mi cuenta</span>
            </button>

            {/* Favoritos */}
            <button className="relative flex items-center gap-1.5 text-xs md:text-sm text-gray-300 hover:text-white px-3 py-2 rounded-xl hover:bg-white/5 transition-colors">
              <svg className="w-5 h-5 text-pink-400" fill={favorites.length > 0 ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="hidden md:inline font-medium">Favoritos</span>
              {favorites.length > 0 && (
                <span className="bg-pink-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {favorites.length}
                </span>
              )}
            </button>

            {/* Carrito */}
            <button className="relative flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs md:text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-lg shadow-purple-900/40 active:scale-95">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="hidden md:inline">Carrito</span>
              <span className="bg-white text-purple-900 font-bold text-xs px-2 py-0.5 rounded-full shadow-sm">
                {cartCount}
              </span>
            </button>
          </div>

        </div>

        {/* Buscador para Móviles */}
        <div className="mt-2 sm:hidden">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar productos..."
            className="w-full bg-[#12162b] border border-purple-500/30 rounded-xl py-2 px-4 text-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:border-purple-400"
          />
        </div>
      </header>

      {/* 2. CONTENIDO PRINCIPAL */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        
        {/* Banner Hero & Beneficios */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          
          {/* Banner Central Promocional */}
          <div className="lg:col-span-3 bg-gradient-to-r from-[#141838] via-[#1c1a44] to-[#251842] rounded-3xl p-6 sm:p-10 border border-purple-800/30 relative overflow-hidden flex flex-col justify-center shadow-2xl">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>
            <span className="inline-block bg-purple-500/20 text-purple-300 text-xs font-semibold px-3 py-1 rounded-full w-max mb-3 border border-purple-500/30">
              🚀 Envíos rápidos y seguros a todo el país
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight mb-3">
              Descubre lo último en <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-300 to-pink-400">tecnología y novedades</span>
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-xl mb-6">
              Productos garantizados con la mejor relación calidad-precio. Explora nuestro catálogo y recibe directo en tu puerta.
            </p>
            <div>
              <a
                href="#catalogo"
                className="inline-block bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white font-semibold px-6 py-2.5 rounded-xl transition shadow-lg shadow-purple-900/50 active:scale-95"
              >
                Ver Catálogo
              </a>
            </div>
          </div>

          {/* Insignias de Confianza */}
          <div className="flex flex-col gap-3 justify-between">
            <div className="bg-[#0f142b]/80 border border-purple-900/30 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-xl">
                🚚
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Envíos a todo el país</h4>
                <p className="text-xs text-slate-400">Rápidos y con seguimiento</p>
              </div>
            </div>

            <div className="bg-[#0f142b]/80 border border-purple-900/30 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-xl">
                🛡️
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Compra Segura</h4>
                <p className="text-xs text-slate-400">Tus datos y compras protegidas</p>
              </div>
            </div>

            <div className="bg-[#0f142b]/80 border border-purple-900/30 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center text-xl">
                💬
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Atención Directa</h4>
                <p className="text-xs text-slate-400">Soporte por WhatsApp</p>
              </div>
            </div>
          </div>
        </div>

        {/* Estructura: Categorías a la izquierda + Productos al centro */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8" id="catalogo">
          
          {/* Sidebar de Categorías */}
          <aside className="lg:col-span-1">
            <div className="bg-[#0e1329]/80 border border-purple-900/30 rounded-2xl p-4 sticky top-24">
              <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span>📁</span> Categorías
              </h3>
              <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
                {categories.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left whitespace-nowrap ${
                      selectedCategory === cat.name
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Grilla de Productos */}
          <main className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                Catálogo de Productos
                <span className="text-xs bg-purple-900/60 text-purple-300 px-2 py-0.5 rounded-full border border-purple-700/40">
                  {filteredProducts.length} disponibles
                </span>
              </h2>
            </div>

            {loading ? (
              <div className="text-center py-24 text-slate-400 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                <p>Cargando productos de Supabase...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20 bg-[#0f142b]/40 rounded-2xl border border-purple-900/20 text-slate-400">
                <p className="text-base font-semibold mb-1">No se encontraron productos</p>
                <p className="text-xs">Prueba con otro término en el buscador o selecciona otra categoría.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProducts.map((product) => {
                  const isFav = favorites.includes(product.id);
                  return (
                    <div
                      key={product.id}
                      className="bg-[#0f142b]/90 rounded-2xl overflow-hidden border border-purple-900/30 flex flex-col hover:border-purple-500/60 transition-all duration-300 shadow-xl group hover:-translate-y-1"
                    >
                      {/* Imagen con botón de favorito */}
                      <div className="h-52 w-full bg-[#181d38] relative overflow-hidden">
                        <img
                          src={product.image_url || 'https://via.placeholder.com/400'}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <button
                          onClick={() => toggleFavorite(product.id)}
                          className="absolute top-3 right-3 p-2 bg-[#070913]/70 backdrop-blur-md rounded-full text-slate-300 hover:text-pink-400 transition"
                          title="Favorito"
                        >
                          <svg className="w-5 h-5" fill={isFav ? '#f43f5e' : 'none'} stroke={isFav ? '#f43f5e' : 'currentColor'} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </button>
                      </div>

                      {/* Info del Producto */}
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="text-base font-bold text-white mb-1 group-hover:text-purple-300 transition-colors line-clamp-1">
                            {product.title}
                          </h3>
                          <p className="text-slate-400 text-xs mb-4 line-clamp-2 leading-relaxed">
                            {product.description}
                          </p>
                        </div>
                        <div>
                          <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-300 mb-4">
                            ${Number(product.price).toLocaleString('es-CO')}
                          </div>
                          <button
                            onClick={addToCart}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium py-2.5 px-4 rounded-xl transition duration-200 shadow-lg shadow-purple-900/30 active:scale-95 flex items-center justify-center gap-2 text-sm"
                          >
                            <span>Añadir al Carrito</span>
                            <span>🛒</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* 3. BOTÓN FLOTANTE DE WHATSAPP */}
      <a
        href="https://wa.me/573000000000?text=Hola,%20deseo%20m%C3%A1s%20informaci%C3%B3n%20sobre%20un%20producto"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#20ba59] text-white p-3.5 rounded-full shadow-2xl transition-transform hover:scale-110 flex items-center justify-center"
        title="Chatear por WhatsApp"
      >
        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
        </svg>
      </a>

      {/* 4. MODAL SIMPLE DE CUENTA */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1329] border border-purple-500/40 rounded-2xl max-w-sm w-full p-6 relative shadow-2xl">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>
            <h3 className="text-xl font-bold text-white mb-2">Mi Cuenta</h3>
            <p className="text-xs text-slate-400 mb-6">Inicia sesión o regístrate para gestionar tus pedidos.</p>
            
            <div className="space-y-3">
              <input
                type="email"
                placeholder="Correo electrónico"
                className="w-full bg-[#181d38] border border-purple-500/30 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-400"
              />
              <input
                type="password"
                placeholder="Contraseña"
                className="w-full bg-[#181d38] border border-purple-500/30 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-400"
              />
              <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-2.5 rounded-xl text-sm transition active:scale-95 shadow-md">
                Ingresar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. PIE DE PÁGINA */}
      <footer className="border-t border-purple-900/30 bg-[#05070e] py-8 text-center text-xs text-slate-500">
        <p className="mb-2">© 2026 Omniverse Store. Todos los derechos reservados.</p>
        <p className="text-slate-600">Desarrollado con Next.js, Supabase y Vercel</p>
      </footer>

    </div>
  );
}