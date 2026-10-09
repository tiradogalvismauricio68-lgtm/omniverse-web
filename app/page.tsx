'use client';

import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  image_url: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cartCount, setCartCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const { data, error } = await supabase.from('products').select('*');
        
        console.log('Respuesta de Supabase - Data:', data);
        console.log('Respuesta de Supabase - Error:', error);

        if (error) {
          console.error('Detalle del error:', error.message, error.details, error.hint);
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

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Barra superior */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              Omniverse Store
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative cursor-pointer bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl border border-slate-700 transition">
              <span className="text-sm font-medium">🛒 Carrito</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-indigo-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Banner */}
      <section className="px-4 py-12 sm:py-16 text-center max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
          Descubre lo último en tecnología, hogar y más.
        </h1>
        <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto">
          Encuentra productos exclusivos con envíos seguros y la mejor calidad en un solo lugar.
        </p>
      </section>

      {/* Catálogo */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 w-full">
        <h2 className="text-xl sm:text-2xl font-bold mb-6 text-slate-200">
          Catálogo Destacado
        </h2>

        {loading ? (
          <div className="text-center py-20 text-slate-400">Cargando productos...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-slate-400">No hay productos disponibles por ahora.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {products.map((product) => (
              <div 
                key={product.id} 
                className="bg-slate-800/60 rounded-2xl overflow-hidden border border-slate-700/60 flex flex-col hover:border-slate-500 transition shadow-lg"
              >
                <div className="h-48 w-full bg-slate-700 relative overflow-hidden">
                  <img 
                    src={product.image_url || 'https://via.placeholder.com/400'} 
                    alt={product.title} 
                    className="w-full h-full object-cover hover:scale-105 transition duration-300"
                  />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{product.title}</h3>
                    <p className="text-slate-400 text-sm mb-4 line-clamp-2">{product.description}</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-indigo-400 mb-4">
                      ${Number(product.price).toLocaleString('es-CO')}
                    </div>
                    <button 
                      onClick={addToCart}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 px-4 rounded-xl transition duration-200 shadow-md shadow-indigo-600/20 active:scale-95"
                    >
                      Añadir al Carrito
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Pie de página */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 text-center text-sm text-slate-500">
        © 2026 Omniverse Store. Todos los derechos reservados.
      </footer>
    </div>
  );
}