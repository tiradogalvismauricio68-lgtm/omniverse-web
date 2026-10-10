'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase } from './lib/supabase';

interface Product {
  id: string;
  title: string;
  description: string;
  full_description?: string;
  price: number;
  stock: number;
  image_url: string;
  images?: string[];
  category?: string;
  active?: boolean;
  featured?: boolean;
}

interface CartItem extends Product {
  quantity: number;
}

interface BannerSlide {
  id: string;
  type: 'image' | 'product' | 'social';
  src?: string;
  alt?: string;
  product?: Product;
  badge?: string;
  title?: string;
  price?: number;
  description?: string;
  image?: string;
  btnText?: string;
  link?: string;
  gradient?: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [favorites, setFavorites] = useState<string[]>([]);
  
  // Mi Cuenta
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAcceptedTerms, setRegAcceptedTerms] = useState(false);
  const [authMsg, setAuthMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  // Carrusel y WhatsApp
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [showWhatsappBubble, setShowWhatsappBubble] = useState<boolean>(true);

  // Checkout
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [deliveryType, setDeliveryType] = useState<'domicilio' | 'recogida'>('domicilio');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerNeighborhood, setCustomerNeighborhood] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'transferencia' | 'efectivo'>('transferencia');
  const [notes, setNotes] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);

  const defaultWhatsappMessage = encodeURIComponent(
    "Hola Omniverse Store, vi su catálogo web y me gustaría recibir asesoría para hacer un pedido. ¿Qué promociones tienen disponibles?"
  );
  const whatsappUrl = `https://api.whatsapp.com/send?phone=573057785317&text=${defaultWhatsappMessage}`;
  const instagramUrl = "https://www.instagram.com/omniverse_store01?exln=bHVjODYzbWRwNG0y&utm_source=qr";
  const facebookUrl = "https://facebook.com";

  useEffect(() => {
    async function fetchProducts() {
      try {
        const { data, error } = await supabase.from('products').select('*');
        if (error) console.error('Error cargando productos:', error.message);

        if (data && data.length > 0) {
          const enriched = data.map((item: any) => {
            const isAudifonos = item.title?.toLowerCase().includes('audífonos') || item.title?.toLowerCase().includes('audifonos');
            return {
              ...item,
              images: item.images && item.images.length > 0
                ? item.images
                : isAudifonos
                ? ['/audifonosgamer1.png', '/audifonosgamer2.png', '/audifonosgamer3.png']
                : [item.image_url || '/logo.png'],
              full_description: item.full_description || item.description,
            };
          });
          setProducts(enriched);
        } else {
          setProducts([]);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const featuredProducts = products.filter((p) => Boolean(p.featured) && p.active !== false);

  const bannerSlides: BannerSlide[] = [
    {
      id: 'main-banner',
      type: 'image',
      src: '/bener001.png',
      alt: 'Omniverse Store Oficial'
    },
    ...featuredProducts.map((fp) => ({
      id: `prod-${fp.id}`,
      type: 'product' as const,
      product: fp,
      badge: '⭐ PRODUCTO DESTACADO',
      title: fp.title,
      price: fp.price,
      description: fp.description,
      image: (fp.images && fp.images[0]) || fp.image_url || '/logo.png',
      gradient: 'from-[#120a2e] via-[#1f114d] to-[#0c0f2b]'
    })),
    {
      id: 'promo-instagram',
      type: 'social',
      badge: '📸 COMUNIDAD OFICIAL',
      title: '¡Síguenos en Instagram!',
      description: 'Conoce nuevos lanzamientos, sorteos exclusivos y unboxings de productos en @omniverse_store01.',
      btnText: 'Ir a Instagram',
      link: instagramUrl,
      gradient: 'from-[#3a0b22] via-[#24135e] to-[#0c0f2b]'
    },
    {
      id: 'promo-facebook',
      type: 'social',
      badge: '👍 REDES SOCIALES',
      title: 'Únete a nuestra página de Facebook',
      description: 'Entérate de promociones de temporada, reseñas de clientes y novedades en tecnología y accesorios.',
      btnText: 'Seguir en Facebook',
      link: facebookUrl,
      gradient: 'from-[#0b1c3a] via-[#161f52] to-[#200d3d]'
    }
  ];

  useEffect(() => {
    if (bannerSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % bannerSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [bannerSlides.length]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            if (newQty > item.stock) return item;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const cartTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const categories = [
    { name: 'Todas', icon: '🗳️' },
    { name: 'Tecnología', icon: '🎧' },
    { name: 'Motos', icon: '🏍️' },
    { name: 'Hogar', icon: '🏠' },
    { name: 'Accesorios', icon: '🛍️' },
    { name: 'Iluminación', icon: '💡' },
  ];

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'Todas' ||
      (product.category && product.category.toLowerCase() === selectedCategory.toLowerCase());
    const isActive = product.active !== false;
    return matchesSearch && matchesCategory && isActive;
  });

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || isSubmittingOrder) return;

    setIsSubmittingOrder(true);
    const itemsPayload = cart.map((c) => ({
      id: c.id,
      title: c.title,
      price: c.price,
      quantity: c.quantity,
    }));

    try {
      await supabase.from('orders').insert([
        {
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_city: customerCity,
          delivery_type: deliveryType,
          customer_address: deliveryType === 'domicilio' ? customerAddress : '',
          customer_neighborhood: deliveryType === 'domicilio' ? customerNeighborhood : '',
          payment_method: paymentMethod,
          notes: notes,
          items: itemsPayload,
          total: cartTotal,
          status: 'pendiente',
        },
      ]);
    } catch (err) {
      console.error('Error al registrar pedido:', err);
    }

    const itemsText = cart
      .map(
        (item, index) =>
          `${index + 1}. *${item.title}* x${item.quantity} - $${(item.price * item.quantity).toLocaleString('es-CO')}`
      )
      .join('\n');

    let msg = `*NUEVO PEDIDO - OMNIVERSE STORE*\n\n`;
    msg += `*Cliente:* ${customerName}\n`;
    msg += `*Teléfono:* ${customerPhone}\n`;
    msg += `*Ciudad:* ${customerCity}\n`;
    msg += `*Tipo de Entrega:* ${deliveryType === 'domicilio' ? 'Envío a Domicilio' : 'Pasa a Recoger'}\n`;

    if (deliveryType === 'domicilio') {
      msg += `*Dirección:* ${customerAddress}\n`;
      if (customerNeighborhood) msg += `*Barrio:* ${customerNeighborhood}\n`;
    }

    msg += `*Método de Pago:* ${paymentMethod === 'transferencia' ? 'Transferencia (Nequi / Bancolombia)' : 'Efectivo contra entrega'}\n`;
    if (notes) msg += `*Notas:* ${notes}\n`;

    msg += `\n*PRODUCTOS:*\n${itemsText}\n\n`;
    msg += `*TOTAL A PAGAR:* $${cartTotal.toLocaleString('es-CO')} COP\n\n`;
    msg += `Hola, confirmo los datos de mi pedido para coordinar el pago y despacho.`;

    const finalUrl = `https://api.whatsapp.com/send?phone=573057785317&text=${encodeURIComponent(msg)}`;
    window.open(finalUrl, '_blank');

    setIsSubmittingOrder(false);
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regAcceptedTerms) {
      setAuthMsg({ type: 'error', text: 'Debes aceptar los Términos y la Política de Tratamiento de Datos Personales.' });
      return;
    }

    try {
      const { error } = await supabase.from('profiles').insert([
        {
          full_name: regName,
          email: regEmail.trim().toLowerCase(),
          phone: regPhone,
          accepted_terms: true,
          accepted_data_policy: true,
          accepted_marketing: true,
        },
      ]);

      if (error) {
        setAuthMsg({ type: 'error', text: `Error: ${error.message}` });
      } else {
        setAuthMsg({ type: 'ok', text: '¡Registro exitoso! Ya haces parte de la comunidad Omniverse Store.' });
        setTimeout(() => {
          setShowAuthModal(false);
          setAuthMsg(null);
          setRegName('');
          setRegEmail('');
          setRegPhone('');
          setRegAcceptedTerms(false);
        }, 2000);
      }
    } catch {
      setAuthMsg({ type: 'error', text: 'Hubo un error al procesar el registro.' });
    }
  };

  return (
    <div className="relative min-h-screen text-slate-100 flex flex-col font-sans selection:bg-purple-600 selection:text-white bg-[#060814]">
      
      {/* FONDO */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center opacity-65"
        style={{ backgroundImage: "url('/fondo.png')" }}
      />
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-[#060814]/75 via-transparent to-[#060814]/90" />

      <div className="relative z-10 flex flex-col min-h-screen">

        {/* 1. BARRA SUPERIOR */}
        <header className="sticky top-0 z-40 bg-[#070a1a]/85 backdrop-blur-md border-b border-purple-500/20 px-4 py-3 md:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            
            <div 
              className="flex items-center gap-2 cursor-pointer transition-transform hover:scale-105" 
              onClick={() => { setSelectedCategory('Todas'); setSearchTerm(''); }}
            >
              <Image
                src="/logo.png"
                alt="Omniverse Store Logo"
                width={200}
                height={50}
                priority
                className="h-8 md:h-10 w-auto object-contain"
              />
            </div>

            <div className="flex-1 max-w-xl mx-2 hidden sm:block">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar productos, marcas o categorías..."
                  className="w-full bg-[#0d122b]/80 border border-purple-500/30 rounded-full py-2 pl-5 pr-12 text-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all shadow-inner backdrop-blur-sm"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-purple-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={() => { setShowAuthModal(true); setAuthTab('login'); setAuthMsg(null); }}
                className="flex items-center gap-1.5 text-xs md:text-sm text-gray-300 hover:text-white px-3 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="hidden md:inline font-medium">Mi cuenta</span>
              </button>

              <button className="relative flex items-center gap-1.5 text-xs md:text-sm text-gray-300 hover:text-white px-3 py-2 rounded-xl hover:bg-white/5 transition-colors">
                <svg className="w-4 h-4 text-pink-400" fill={favorites.length > 0 ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="hidden md:inline font-medium">Favoritos</span>
                {favorites.length > 0 && (
                  <span className="bg-pink-600 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                    {favorites.length}
                  </span>
                )}
              </button>

              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs md:text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-lg shadow-purple-900/40 active:scale-95 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="hidden md:inline">Carrito</span>
                <span className="bg-white text-purple-900 font-bold text-xs px-2 py-0.5 rounded-full shadow-sm">
                  {cartItemCount}
                </span>
              </button>
            </div>

          </div>

          <div className="mt-2 sm:hidden">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar productos..."
              className="w-full bg-[#0d122b]/90 border border-purple-500/30 rounded-xl py-2 px-4 text-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:border-purple-400"
            />
          </div>
        </header>

        {/* 2. BANNER Y CANALES */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            
            <div className="lg:col-span-3 rounded-[32px] overflow-hidden border border-purple-500/40 shadow-[0_0_35px_rgba(147,51,234,0.35)] relative bg-[#0e0c24] h-[260px] sm:h-[300px] flex items-center group">
              <div 
                className="w-full h-full transition-transform duration-700 ease-in-out flex flex-col"
                style={{ transform: `translateY(-${currentSlide * 100}%)` }}
              >
                {bannerSlides.map((slide) => (
                  <div key={slide.id} className="w-full h-full shrink-0 relative flex items-center justify-center">
                    
                    {slide.type === 'image' && (
                      <Image
                        src={slide.src || '/bener001.png'}
                        alt={slide.alt || 'Banner'}
                        fill
                        priority
                        className="object-cover rounded-[32px]"
                      />
                    )}

                    {slide.type === 'product' && slide.product && (
                      <div className={`w-full h-full bg-gradient-to-r ${slide.gradient || 'from-[#120a2e] via-[#1f114d] to-[#0c0f2b]'} p-6 sm:p-10 flex items-center justify-between rounded-[32px] border border-purple-500/20 relative overflow-hidden`}>
                        <div className="flex-1 pr-4 z-10">
                          <span className="inline-block bg-amber-500/25 border border-amber-400/40 text-amber-200 text-[10px] sm:text-[11px] font-bold px-3 py-1 rounded-full mb-2 tracking-wide">
                            {slide.badge}
                          </span>
                          <h2 className="text-xl sm:text-3xl font-black text-white mb-1 line-clamp-1">
                            {slide.title}
                          </h2>
                          <div className="text-xl sm:text-2xl font-black text-emerald-400 mb-2">
                            ${Number(slide.price || 0).toLocaleString('es-CO')} COP
                          </div>
                          <p className="text-slate-300 text-xs sm:text-sm max-w-md mb-4 line-clamp-2">
                            {slide.description}
                          </p>
                          <button
                            onClick={() => {
                              if (slide.product) {
                                setSelectedProduct(slide.product);
                                setActiveImageIndex(0);
                              }
                            }}
                            className="inline-block bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white font-semibold text-xs sm:text-sm px-6 py-2.5 rounded-full transition shadow-lg shadow-purple-900/50 active:scale-95 cursor-pointer"
                          >
                            Ver Producto & Comprar 🛒
                          </button>
                        </div>
                        <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-2xl overflow-hidden border border-purple-500/30 bg-[#0d122b] shadow-xl shrink-0 hidden sm:block">
                          <img
                            src={slide.image || '/logo.png'}
                            alt={slide.title || 'Producto'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    )}

                    {slide.type === 'social' && (
                      <div className={`w-full h-full bg-gradient-to-r ${slide.gradient || 'from-[#0b1c3a] to-[#200d3d]'} p-8 sm:p-12 flex flex-col justify-center rounded-[32px] border border-purple-500/20 relative overflow-hidden`}>
                        <div className="absolute right-8 top-8 text-6xl opacity-20 pointer-events-none">✨</div>
                        <span className="inline-block bg-purple-500/25 border border-purple-400/40 text-purple-200 text-[11px] font-bold px-3 py-1 rounded-full w-max mb-3 tracking-wide">
                          {slide.badge}
                        </span>
                        <h2 className="text-2xl sm:text-4xl font-black text-white mb-2 leading-tight">
                          {slide.title}
                        </h2>
                        <p className="text-slate-300 text-xs sm:text-sm max-w-lg mb-6 leading-relaxed">
                          {slide.description}
                        </p>
                        <div>
                          <a
                            href={slide.link || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-semibold text-xs sm:text-sm px-6 py-2.5 rounded-full transition shadow-lg shadow-purple-900/50 active:scale-95"
                          >
                            {slide.btnText} ➜
                          </a>
                        </div>
                      </div>
                    )}

                  </div>
                ))}
              </div>

              {/* Controles del Carrusel */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20 opacity-80 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setCurrentSlide((prev) => (prev - 1 + bannerSlides.length) % bannerSlides.length)}
                  className="w-8 h-8 rounded-full bg-black/60 hover:bg-purple-600 border border-purple-500/40 text-white flex items-center justify-center text-xs backdrop-blur-md transition-all shadow-md active:scale-90 cursor-pointer"
                  title="Anterior"
                >
                  ▲
                </button>
                <button
                  onClick={() => setCurrentSlide((prev) => (prev + 1) % bannerSlides.length)}
                  className="w-8 h-8 rounded-full bg-black/60 hover:bg-purple-600 border border-purple-500/40 text-white flex items-center justify-center text-xs backdrop-blur-md transition-all shadow-md active:scale-90 cursor-pointer"
                  title="Siguiente"
                >
                  ▼
                </button>
              </div>

              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
                {bannerSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`transition-all rounded-full cursor-pointer ${
                      currentSlide === idx
                        ? 'w-2.5 h-6 bg-gradient-to-b from-blue-400 to-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]'
                        : 'w-2.5 h-2.5 bg-white/40 hover:bg-white/80'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* TARJETA DE CANALES OFICIALES */}
            <div className="flex flex-col gap-3 justify-between">
              <div className="bg-[#0d122b]/90 backdrop-blur-md border border-purple-500/30 rounded-2xl p-4 shadow-xl">
                <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider block mb-3 text-center">
                  🌟 SÍGUENOS EN REDES
                </span>
                
                <div className="flex flex-col gap-2.5">
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-gradient-to-r from-pink-600/30 via-purple-600/20 to-orange-500/10 hover:from-pink-600 hover:via-purple-600 hover:to-orange-500 border border-pink-500/40 text-white transition-all group shadow-md"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-sm shadow">
                        📷
                      </div>
                      <div>
                        <span className="text-xs font-bold block">Instagram</span>
                        <span className="text-[10px] text-slate-300">@omniverse_store01</span>
                      </div>
                    </div>
                    <span className="text-xs opacity-75 group-hover:translate-x-1 transition-transform">➜</span>
                  </a>

                  <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-gradient-to-r from-blue-700/30 to-blue-600/10 hover:from-blue-700 hover:to-blue-600 border border-blue-500/40 text-white transition-all group shadow-md"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-bold shadow">
                        f
                      </div>
                      <div>
                        <span className="text-xs font-bold block">Facebook</span>
                        <span className="text-[10px] text-slate-300">Omniverse Store</span>
                      </div>
                    </div>
                    <span className="text-xs opacity-75 group-hover:translate-x-1 transition-transform">➜</span>
                  </a>
                </div>
              </div>

              <div className="bg-[#0d122b]/85 backdrop-blur-md border border-purple-500/25 rounded-2xl p-3 flex items-center gap-3 shadow-lg">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-base">
                  🚚
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Envíos a todo el país</h4>
                  <p className="text-[10px] text-slate-400">Rápidos y con seguimiento</p>
                </div>
              </div>

              <div className="bg-[#0d122b]/85 backdrop-blur-md border border-purple-500/25 rounded-2xl p-3 flex items-center gap-3 shadow-lg">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-base">
                  🛡️
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Compra Segura</h4>
                  <p className="text-[10px] text-slate-400">Garantía en cada orden</p>
                </div>
              </div>
            </div>

          </div>

          {/* Categorías + Catálogo */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8" id="catalogo">
            <aside className="lg:col-span-1">
              <div className="bg-[#0d122b]/85 backdrop-blur-md border border-purple-500/25 rounded-2xl p-4 sticky top-24 shadow-xl">
                <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span>📁</span> CATEGORÍAS
                </h3>
                <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
                  {categories.map((cat) => (
                    <button
                      key={cat.name}
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left whitespace-nowrap cursor-pointer ${
                        selectedCategory === cat.name
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md shadow-purple-900/50'
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

            <main className="lg:col-span-3">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  Catálogo de Productos
                  <span className="text-xs bg-purple-900/60 text-purple-300 px-2.5 py-1 rounded-full border border-purple-600/40">
                    {filteredProducts.length} disponibles
                  </span>
                </h2>
              </div>

              {loading ? (
                <div className="text-center py-24 text-slate-400 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                  <p>Cargando catálogo...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-16 px-6 bg-[#0d122b]/75 backdrop-blur-md rounded-3xl border border-purple-500/30 text-slate-300 shadow-xl flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-3xl mb-4 shadow-inner">
                    🚀
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    ¡Próximamente en {selectedCategory !== 'Todas' ? selectedCategory : 'nuestra tienda'}!
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
                    Estamos preparando nuevos ingresos y productos exclusivos para esta sección.
                  </p>
                  <button
                    onClick={() => setSelectedCategory('Todas')}
                    className="bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Ver productos disponibles
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredProducts.map((product) => {
                    const isFav = favorites.includes(product.id);
                    const isOutOfStock = product.stock <= 0;
                    const isLowStock = product.stock > 0 && product.stock <= 2;

                    return (
                      <div
                        key={product.id}
                        className="bg-[#0d122b]/85 backdrop-blur-md rounded-2xl overflow-hidden border border-purple-500/25 flex flex-col hover:border-purple-400/60 transition-all duration-300 shadow-xl group hover:-translate-y-1"
                      >
                        <div 
                          className="h-56 w-full bg-[#141a38] relative overflow-hidden cursor-pointer"
                          onClick={() => {
                            setSelectedProduct(product);
                            setActiveImageIndex(0);
                          }}
                        >
                          <img
                            src={product.image_url || (product.images && product.images[0]) || 'https://via.placeholder.com/400'}
                            alt={product.title}
                            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${isOutOfStock ? 'grayscale opacity-60' : ''}`}
                          />

                          {isLowStock && (
                            <span className="absolute bottom-3 left-3 bg-amber-500/90 text-black text-[10px] font-black px-2.5 py-1 rounded-full shadow-md">
                              🔥 ¡Solo quedan {product.stock}!
                            </span>
                          )}
                          {isOutOfStock && (
                            <span className="absolute bottom-3 left-3 bg-red-600/90 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md">
                              ❌ Agotado
                            </span>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(product.id);
                            }}
                            className="absolute top-3 right-3 p-2 bg-[#060814]/70 backdrop-blur-md rounded-full text-slate-300 hover:text-pink-400 transition cursor-pointer"
                            title="Favorito"
                          >
                            <svg className="w-4 h-4" fill={isFav ? '#f43f5e' : 'none'} stroke={isFav ? '#f43f5e' : 'currentColor'} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                          </button>
                        </div>

                        <div className="p-5 flex-1 flex flex-col justify-between">
                          <div 
                            className="cursor-pointer"
                            onClick={() => {
                              setSelectedProduct(product);
                              setActiveImageIndex(0);
                            }}
                          >
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
                              onClick={() => addToCart(product)}
                              disabled={isOutOfStock}
                              className={`w-full font-medium py-2.5 px-4 rounded-xl transition duration-200 text-sm flex items-center justify-center gap-2 ${
                                isOutOfStock
                                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-purple-900/30 active:scale-95 cursor-pointer'
                              }`}
                            >
                              <span>{isOutOfStock ? 'Agotado' : 'Añadir al Carrito'}</span>
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

        {/* 3. MODAL DETALLE DE PRODUCTO */}
        {selectedProduct && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#0b0e24] border border-purple-500/40 rounded-3xl max-w-3xl w-full p-6 sm:p-8 relative shadow-2xl my-8">
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white text-xl p-1 cursor-pointer"
              >
                ✕
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start mt-2">
                <div>
                  <div className="h-64 sm:h-80 w-full bg-[#141a38] rounded-2xl overflow-hidden border border-purple-500/20 mb-3 shadow-lg">
                    <img
                      src={
                        selectedProduct.images && selectedProduct.images.length > 0
                          ? selectedProduct.images[activeImageIndex]
                          : selectedProduct.image_url
                      }
                      alt={selectedProduct.title}
                      className="w-full h-full object-cover transition-all duration-300"
                    />
                  </div>

                  {selectedProduct.images && selectedProduct.images.length > 1 && (
                    <div className="flex gap-2.5 justify-center">
                      {selectedProduct.images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveImageIndex(idx)}
                          className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                            activeImageIndex === idx
                              ? 'border-purple-400 scale-105 shadow-md shadow-purple-500/40'
                              : 'border-purple-900/40 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={img} alt={`Vista ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-purple-500/20 text-purple-300 text-xs px-2.5 py-0.5 rounded-full border border-purple-500/30">
                        {selectedProduct.category || 'Tecnología'}
                      </span>
                      {selectedProduct.stock <= 2 && selectedProduct.stock > 0 && (
                        <span className="bg-amber-500/20 text-amber-300 text-xs px-2 py-0.5 rounded-full border border-amber-500/30">
                          Quedan {selectedProduct.stock} uds
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 leading-snug">
                      {selectedProduct.title}
                    </h3>
                    <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-300 mb-4">
                      ${Number(selectedProduct.price).toLocaleString('es-CO')} COP
                    </div>
                    
                    <div className="text-slate-300 text-xs sm:text-sm space-y-3 whitespace-pre-line leading-relaxed max-h-56 overflow-y-auto pr-2 border-t border-b border-purple-500/20 py-3 mb-4">
                      {selectedProduct.full_description || selectedProduct.description}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      addToCart(selectedProduct);
                      setSelectedProduct(null);
                    }}
                    disabled={selectedProduct.stock <= 0}
                    className={`w-full font-bold py-3.5 rounded-xl transition duration-200 text-sm flex items-center justify-center gap-2 ${
                      selectedProduct.stock <= 0
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-xl shadow-purple-900/40 active:scale-95 cursor-pointer'
                    }`}
                  >
                    <span>{selectedProduct.stock <= 0 ? 'Producto Agotado' : 'Añadir al Carrito'}</span>
                    <span>🛒</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. DRAWER CARRITO */}
        {isCartOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div 
              className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
              onClick={() => setIsCartOpen(false)}
            />
            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <div className="w-screen max-w-md bg-[#0b0e24] border-l border-purple-500/30 p-6 flex flex-col justify-between shadow-2xl">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-purple-500/20">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>🛒</span> Tu Carrito ({cartItemCount})
                    </h2>
                    <button 
                      onClick={() => setIsCartOpen(false)}
                      className="text-slate-400 hover:text-white p-1 text-xl cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mt-4 space-y-4 max-h-[55vh] overflow-y-auto pr-1">
                    {cart.length === 0 ? (
                      <div className="text-center py-12 text-slate-400">
                        <p className="text-4xl mb-2">🛍️</p>
                        <p className="text-sm">Tu carrito está vacío</p>
                      </div>
                    ) : (
                      cart.map((item) => (
                        <div 
                          key={item.id} 
                          className="bg-[#121638] border border-purple-500/20 rounded-xl p-3 flex items-center gap-3"
                        >
                          <img 
                            src={item.image_url || (item.images && item.images[0]) || 'https://via.placeholder.com/100'} 
                            alt={item.title} 
                            className="w-14 h-14 object-cover rounded-lg bg-slate-800"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-semibold text-white truncate">{item.title}</h4>
                            <p className="text-xs text-purple-300 font-bold">
                              ${Number(item.price).toLocaleString('es-CO')}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <button 
                                onClick={() => updateQuantity(item.id, -1)}
                                className="w-6 h-6 bg-[#1a204d] hover:bg-purple-600 rounded text-xs font-bold text-white flex items-center justify-center cursor-pointer"
                              >
                                -
                              </button>
                              <span className="text-xs font-semibold">{item.quantity}</span>
                              <button 
                                onClick={() => updateQuantity(item.id, 1)}
                                className="w-6 h-6 bg-[#1a204d] hover:bg-purple-600 rounded text-xs font-bold text-white flex items-center justify-center cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-400 hover:text-red-300 p-1 text-sm cursor-pointer"
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {cart.length > 0 && (
                  <div className="pt-4 border-t border-purple-500/20">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm text-slate-300">Total a Pagar:</span>
                      <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-300">
                        ${cartTotal.toLocaleString('es-CO')} COP
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setIsCartOpen(false);
                        setIsCheckoutOpen(true);
                      }}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl transition duration-200 shadow-lg shadow-purple-900/40 text-sm active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Finalizar Pedido</span>
                      <span>➡️</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 5. CHECKOUT */}
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#0d122b] border border-purple-500/40 rounded-3xl max-w-lg w-full p-6 sm:p-8 relative shadow-2xl my-8">
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white text-lg cursor-pointer"
              >
                ✕
              </button>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">📋</span>
                <h3 className="text-xl font-bold text-white">Datos de tu Pedido</h3>
              </div>
              <p className="text-xs text-slate-400 mb-6">
                Completa tus datos para despachar tu compra y confirmar el pago por WhatsApp.
              </p>

              <form onSubmit={handleCheckoutSubmit} className="space-y-4 text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ej. Laura Gómez"
                      className="w-full bg-[#141a38] border border-purple-500/30 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Teléfono / Celular *</label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Ej. 300 123 4567"
                      className="w-full bg-[#141a38] border border-purple-500/30 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Ciudad / Municipio *</label>
                    <input
                      type="text"
                      required
                      value={customerCity}
                      onChange={(e) => setCustomerCity(e.target.value)}
                      placeholder="Ej. Bogotá, Medellín..."
                      className="w-full bg-[#141a38] border border-purple-500/30 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Tipo de Entrega</label>
                    <select
                      value={deliveryType}
                      onChange={(e) => setDeliveryType(e.target.value as 'domicilio' | 'recogida')}
                      className="w-full bg-[#141a38] border border-purple-500/30 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-400 cursor-pointer"
                    >
                      <option value="domicilio">🚚 Envío a Domicilio</option>
                      <option value="recogida">🏬 Pasa a Recoger</option>
                    </select>
                  </div>
                </div>

                {deliveryType === 'domicilio' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Dirección de Entrega *</label>
                      <input
                        type="text"
                        required
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        placeholder="Ej. Calle 123 # 45-67 Apto 201"
                        className="w-full bg-[#141a38] border border-purple-500/30 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-400"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Barrio</label>
                      <input
                        type="text"
                        value={customerNeighborhood}
                        onChange={(e) => setCustomerNeighborhood(e.target.value)}
                        placeholder="Ej. Chapinero, Poblado..."
                        className="w-full bg-[#141a38] border border-purple-500/30 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-400"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Método de Pago Preferido</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('transferencia')}
                      className={`p-2.5 rounded-xl border text-center transition font-medium cursor-pointer ${
                        paymentMethod === 'transferencia'
                          ? 'border-purple-500 bg-purple-600/30 text-white'
                          : 'border-purple-500/20 bg-[#141a38] text-slate-400'
                      }`}
                    >
                      📲 Transferencia (Nequi / Bancolombia)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('efectivo')}
                      className={`p-2.5 rounded-xl border text-center transition font-medium cursor-pointer ${
                        paymentMethod === 'efectivo'
                          ? 'border-purple-500 bg-purple-600/30 text-white'
                          : 'border-purple-500/20 bg-[#141a38] text-slate-400'
                      }`}
                    >
                      💵 Efectivo contra entrega
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Notas adicionales (opcional)</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Instrucciones del timbre, referencias..."
                    className="w-full bg-[#141a38] border border-purple-500/30 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-purple-400 text-xs"
                  />
                </div>

                <div className="bg-[#121638] rounded-xl p-3 flex justify-between items-center border border-purple-500/20">
                  <span className="text-slate-300">Total a pagar:</span>
                  <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-300">
                    ${cartTotal.toLocaleString('es-CO')} COP
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingOrder}
                  className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-bold py-3.5 rounded-xl transition duration-200 shadow-xl shadow-emerald-900/30 text-sm flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                  <span>{isSubmittingOrder ? 'Procesando...' : 'Confirmar Pedido por WhatsApp'}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 6. MODAL MI CUENTA / REGISTRO */}
        {showAuthModal && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0d122b] border border-purple-500/40 rounded-2xl max-w-md w-full p-6 relative shadow-2xl">
              <button
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>

              <div className="flex border-b border-purple-500/20 mb-5">
                <button
                  onClick={() => { setAuthTab('login'); setAuthMsg(null); }}
                  className={`flex-1 py-2 text-sm font-bold border-b-2 transition cursor-pointer ${
                    authTab === 'login' ? 'border-purple-400 text-white' : 'border-transparent text-slate-400'
                  }`}
                >
                  Iniciar Sesión
                </button>
                <button
                  onClick={() => { setAuthTab('register'); setAuthMsg(null); }}
                  className={`flex-1 py-2 text-sm font-bold border-b-2 transition cursor-pointer ${
                    authTab === 'register' ? 'border-purple-400 text-white' : 'border-transparent text-slate-400'
                  }`}
                >
                  Crear Cuenta
                </button>
              </div>

              {authMsg && (
                <div className={`p-3 rounded-xl mb-4 text-xs font-semibold ${
                  authMsg.type === 'ok' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'
                }`}>
                  {authMsg.text}
                </div>
              )}

              {authTab === 'login' ? (
                <form className="space-y-3">
                  <p className="text-xs text-slate-400 mb-2">Ingresa a tu cuenta para consultar tus pedidos.</p>
                  <input
                    type="email"
                    placeholder="Correo electrónico"
                    required
                    className="w-full bg-[#141a38] border border-purple-500/30 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-400"
                  />
                  <input
                    type="password"
                    placeholder="Contraseña"
                    required
                    className="w-full bg-[#141a38] border border-purple-500/30 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-400"
                  />
                  <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-2.5 rounded-xl text-sm transition active:scale-95 shadow-md cursor-pointer">
                    Ingresar
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
                  <p className="text-slate-400 mb-1">Regístrate para recibir descuentos exclusivos y novedades.</p>
                  
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Ej. Laura Gómez"
                      className="w-full bg-[#141a38] border border-purple-500/30 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Correo Electrónico *</label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="ejemplo@correo.com"
                      className="w-full bg-[#141a38] border border-purple-500/30 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Teléfono / WhatsApp *</label>
                    <input
                      type="tel"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="300 123 4567"
                      className="w-full bg-[#141a38] border border-purple-500/30 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  <div className="flex items-start gap-2 pt-2 border-t border-purple-500/20">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={regAcceptedTerms}
                      onChange={(e) => setRegAcceptedTerms(e.target.checked)}
                      className="mt-0.5 rounded border-purple-500 text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                    <label htmlFor="terms" className="text-[11px] text-slate-300 leading-tight">
                      Acepto los{' '}
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        className="text-purple-400 underline font-semibold cursor-pointer"
                      >
                        Términos y la Política de Tratamiento de Datos Personales
                      </button>{' '}
                      para recibir información comercial (Ley 1581 de 2012).
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-2.5 rounded-xl text-sm transition active:scale-95 shadow-md mt-2 cursor-pointer"
                  >
                    Registrarme
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* 7. MODAL DE TRATAMIENTO DE DATOS */}
        {showTermsModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#0b0e24] border border-purple-500/40 rounded-2xl max-w-lg w-full p-6 relative shadow-2xl max-h-[80vh] flex flex-col">
              <button
                onClick={() => setShowTermsModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
              <h3 className="text-base font-bold text-white mb-3">
                Política de Tratamiento de Datos Personales
              </h3>
              <div className="text-xs text-slate-300 space-y-2.5 overflow-y-auto pr-2 leading-relaxed flex-1">
                <p>
                  En cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013 de Colombia, <strong>Omniverse Store</strong> informa que los datos personales suministrados serán tratados de manera confidencial y segura.
                </p>
                <p>
                  <strong>Finalidad:</strong> Los datos se emplearán exclusivamente para:
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Gestionar el procesamiento, despacho y entrega de sus pedidos.</li>
                  <li>Atención al cliente y confirmación de pagos vía WhatsApp.</li>
                  <li>Envío de comunicaciones promocionales, descuentos y lanzamientos de catálogo.</li>
                </ul>
              </div>
              <button
                onClick={() => setShowTermsModal(false)}
                className="mt-4 bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Entendido y de acuerdo
              </button>
            </div>
          </div>
        )}

        {/* 8. BOTÓN FLOTANTE WHATSAPP */}
        <div className="fixed bottom-6 right-6 z-40 flex items-end gap-3 pointer-events-auto">
          {showWhatsappBubble && (
            <div className="hidden sm:flex items-center gap-2 bg-[#0d122b]/95 border border-emerald-500/40 px-3.5 py-2 rounded-2xl shadow-2xl backdrop-blur-md animate-bounce">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-xs font-semibold text-emerald-300">
                ¿Necesitas ayuda? ¡Escríbenos! 👋
              </span>
              <button
                onClick={() => setShowWhatsappBubble(false)}
                className="text-slate-400 hover:text-white text-xs ml-1 cursor-pointer"
                title="Cerrar"
              >
                ✕
              </button>
            </div>
          )}

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#25D366] hover:bg-[#20ba59] text-white p-3.5 rounded-full shadow-2xl transition-all hover:scale-110 flex items-center justify-center border-2 border-white/20 active:scale-95 relative"
            title="Chatear por WhatsApp"
          >
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full"></span>
            <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
          </a>
        </div>

        {/* 9. PIE DE PÁGINA */}
        <footer className="border-t border-purple-900/30 bg-[#060814]/90 py-8 text-center text-xs text-slate-500 mt-12">
          <div className="flex flex-wrap justify-center items-center gap-4 mb-3">
            <a 
              href={instagramUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-pink-400 transition"
            >
              Instagram: @omniverse_store01
            </a>
            <span>•</span>
            <a 
              href={facebookUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-blue-400 transition"
            >
              Facebook: Omniverse Store
            </a>
            <span>•</span>
            <a 
              href={whatsappUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-emerald-400 transition"
            >
              WhatsApp: +57 305 778 5317
            </a>
          </div>
          <p className="mb-2">© 2026 Omniverse Store. Todos los derechos reservados.</p>
          <p className="text-slate-600">Desarrollado con Next.js, Supabase y Vercel</p>
        </footer>

      </div>
    </div>
  );
}