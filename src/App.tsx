import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Utensils, 
  ChefHat, 
  Bike, 
  User, 
  Plus, 
  ShoppingCart, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  LogOut,
  ChevronRight,
  MapPin,
  CreditCard,
  Trash2,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Order, Courier, ViewType, OrderItem } from './types';

// --- Components ---

const Navbar = ({ currentView, setView }: { currentView: ViewType, setView: (v: ViewType) => void }) => {
  const views: { id: ViewType; label: string; icon: any }[] = [
    { id: 'admin', label: 'Admin', icon: LayoutDashboard },
    { id: 'cashier', label: 'Caixa', icon: Utensils },
    { id: 'kitchen', label: 'Cozinha', icon: ChefHat },
    { id: 'delivery', label: 'Delivery', icon: Bike },
    { id: 'client', label: 'Cliente', icon: User },
  ];

  return (
    <nav className="bg-zinc-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-lg">
      <div className="flex items-center gap-2">
        <div className="bg-red-600 p-2 rounded-lg">
          <Utensils className="w-6 h-6" />
        </div>
        <span className="font-bold text-xl tracking-tight">PIZZARIA MASTER</span>
      </div>
      <div className="flex gap-1 bg-zinc-800 p-1 rounded-xl">
        {views.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              currentView === v.id 
                ? 'bg-red-600 text-white shadow-md' 
                : 'text-zinc-400 hover:bg-zinc-700 hover:text-white'
            }`}
          >
            <v.icon className="w-4 h-4" />
            <span className="hidden md:inline text-sm font-medium">{v.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

// --- Views ---

const AdminView = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetch('/api/products').then(res => res.json()).then(setProducts);
    fetch('/api/orders').then(res => res.json()).then(setOrders);
  }, []);

  const totalRevenue = orders.reduce((acc, o) => acc + (o.status === 'completed' ? o.total_price : 0), 0);

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
          <p className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Vendas Totais</p>
          <p className="text-3xl font-bold mt-1">R$ {totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
          <p className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Pedidos Hoje</p>
          <p className="text-3xl font-bold mt-1">{orders.length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
          <p className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Produtos Ativos</p>
          <p className="text-3xl font-bold mt-1">{products.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
        <div className="p-6 border-bottom border-zinc-100 flex justify-between items-center">
          <h2 className="text-xl font-bold">Produtos</h2>
          <button className="bg-zinc-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
            <Plus className="w-4 h-4" /> Adicionar Produto
          </button>
        </div>
        <table className="w-full text-left">
          <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4">Categoria</th>
              <th className="px-6 py-4">Preço</th>
              <th className="px-6 py-4">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-zinc-50 transition-colors">
                <td className="px-6 py-4 font-medium">{p.name}</td>
                <td className="px-6 py-4 text-zinc-500">{p.category_name}</td>
                <td className="px-6 py-4 font-mono">R$ {p.price.toFixed(2)}</td>
                <td className="px-6 py-4">
                  <button className="text-zinc-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CashierView = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<(Product & { quantity: number })[]>([]);
  const [orderType, setOrderType] = useState<'table' | 'counter' | 'delivery'>('counter');
  const [tableNumber, setTableNumber] = useState('');

  useEffect(() => {
    fetch('/api/products').then(res => res.json()).then(setProducts);
  }, []);

  const addToCart = (p: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === p.id);
      if (existing) {
        return prev.map(item => item.id === p.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...p, quantity: 1 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const finalizeOrder = async () => {
    if (cart.length === 0) return;
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: orderType,
        table_number: tableNumber ? parseInt(tableNumber) : null,
        items: cart,
        total_price: total,
        payment_method: 'cash'
      })
    });
    if (res.ok) {
      setCart([]);
      setTableNumber('');
      alert('Pedido realizado com sucesso!');
    }
  };

  return (
    <div className="flex h-[calc(100vh-72px)] overflow-hidden">
      <div className="flex-1 p-6 overflow-y-auto bg-zinc-50">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map(p => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 text-left hover:border-red-500 hover:shadow-md transition-all group"
            >
              <div className="aspect-square bg-zinc-100 rounded-xl mb-3 flex items-center justify-center text-zinc-400">
                <Utensils className="w-8 h-8" />
              </div>
              <p className="font-bold text-zinc-900 group-hover:text-red-600 transition-colors">{p.name}</p>
              <p className="text-zinc-500 text-xs mt-1 line-clamp-2">{p.description}</p>
              <p className="text-lg font-mono font-bold mt-2">R$ {p.price.toFixed(2)}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="w-96 bg-white border-l border-zinc-200 flex flex-col shadow-2xl">
        <div className="p-6 border-b border-zinc-100">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" /> Carrinho
          </h2>
          <div className="mt-4 flex gap-2">
            {(['counter', 'table', 'delivery'] as const).map(t => (
              <button
                key={t}
                onClick={() => setOrderType(t)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  orderType === t ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500'
                }`}
              >
                {t === 'counter' ? 'Balcão' : t === 'table' ? 'Mesa' : 'Delivery'}
              </button>
            ))}
          </div>
          {orderType === 'table' && (
            <input
              type="number"
              placeholder="Número da Mesa"
              value={tableNumber}
              onChange={e => setTableNumber(e.target.value)}
              className="w-full mt-3 p-2 border border-zinc-200 rounded-lg text-sm"
            />
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.map(item => (
            <div key={item.id} className="flex justify-between items-center group">
              <div>
                <p className="font-bold text-sm">{item.quantity}x {item.name}</p>
                <p className="text-zinc-500 text-xs">R$ {(item.price * item.quantity).toFixed(2)}</p>
              </div>
              <button onClick={() => removeFromCart(item.id)} className="text-zinc-300 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="text-center py-12 text-zinc-400">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Seu carrinho está vazio</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-zinc-50 border-t border-zinc-200">
          <div className="flex justify-between items-center mb-4">
            <span className="text-zinc-500 font-medium">Total</span>
            <span className="text-2xl font-bold">R$ {total.toFixed(2)}</span>
          </div>
          <button
            disabled={cart.length === 0}
            onClick={finalizeOrder}
            className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-200"
          >
            Finalizar Pedido
          </button>
        </div>
      </div>
    </div>
  );
};

const KitchenView = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [audio] = useState(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));

  const fetchOrders = useCallback(() => {
    fetch('/api/orders').then(res => res.json()).then(data => {
      const activeOrders = data.filter((o: Order) => ['received', 'preparing'].includes(o.status));
      setOrders(activeOrders);
    });
  }, []);

  useEffect(() => {
    fetchOrders();
    const ws = new WebSocket(`ws://${window.location.host}`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'NEW_ORDER') {
        fetchOrders();
        audio.play().catch(() => {});
      }
    };
    return () => ws.close();
  }, [fetchOrders, audio]);

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchOrders();
  };

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <AnimatePresence>
        {orders.map(order => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`bg-white rounded-2xl shadow-md border-t-4 overflow-hidden ${
              order.status === 'received' ? 'border-red-500' : 'border-amber-500'
            }`}
          >
            <div className="p-4 bg-zinc-50 border-b border-zinc-100 flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase">Pedido #{order.id}</p>
                <p className="font-bold text-sm">
                  {order.type === 'table' ? `Mesa ${order.table_number}` : order.type === 'counter' ? 'Balcão' : 'Delivery'}
                </p>
              </div>
              <div className="flex items-center gap-1 text-zinc-400">
                <Clock className="w-3 h-3" />
                <span className="text-[10px] font-mono">
                  {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <KitchenItems orderId={order.id} />
            </div>
            <div className="p-4 bg-zinc-50 border-t border-zinc-100">
              {order.status === 'received' ? (
                <button
                  onClick={() => updateStatus(order.id, 'preparing')}
                  className="w-full bg-amber-500 text-white py-2 rounded-lg font-bold text-sm hover:bg-amber-600 transition-colors"
                >
                  Iniciar Preparo
                </button>
              ) : (
                <button
                  onClick={() => updateStatus(order.id, 'ready')}
                  className="w-full bg-green-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-green-700 transition-colors"
                >
                  Marcar como Pronto
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {orders.length === 0 && (
        <div className="col-span-full flex flex-col items-center justify-center py-24 text-zinc-400">
          <ChefHat className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-xl font-medium">Cozinha limpa! Nenhum pedido pendente.</p>
        </div>
      )}
    </div>
  );
};

const KitchenItems = ({ orderId }: { orderId: number }) => {
  const [items, setItems] = useState<OrderItem[]>([]);
  useEffect(() => {
    fetch(`/api/orders/${orderId}`).then(res => res.json()).then(data => setItems(data.items));
  }, [orderId]);

  return (
    <ul className="space-y-2">
      {items.map(item => (
        <li key={item.id} className="flex justify-between items-start">
          <div>
            <span className="font-bold text-sm mr-2">{item.quantity}x</span>
            <span className="text-sm text-zinc-800">{item.product_name}</span>
            {item.notes && <p className="text-[10px] text-red-500 italic mt-0.5">{item.notes}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
};

const DeliveryView = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);

  const fetchData = useCallback(() => {
    fetch('/api/orders').then(res => res.json()).then(data => {
      const deliveryOrders = data.filter((o: Order) => o.type === 'delivery' && ['ready', 'delivering'].includes(o.status));
      setOrders(deliveryOrders);
    });
    fetch('/api/couriers').then(res => res.json()).then(setCouriers);
  }, []);

  useEffect(() => {
    fetchData();
    const ws = new WebSocket(`ws://${window.location.host}`);
    ws.onmessage = () => fetchData();
    return () => ws.close();
  }, [fetchData]);

  const assignCourier = async (orderId: number, courierId: number) => {
    await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'delivering', courier_id: courierId })
    });
    fetchData();
  };

  const completeDelivery = async (orderId: number) => {
    await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' })
    });
    fetchData();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Bike className="w-6 h-6 text-red-600" /> Painel de Entregas
      </h2>
      <div className="grid gap-4">
        {orders.map(order => (
          <div key={order.id} className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Pedido #{order.id}</span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                  order.status === 'ready' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {order.status === 'ready' ? 'Pronto para Coleta' : 'Em Rota'}
                </span>
              </div>
              <p className="font-bold text-lg flex items-center gap-2">
                <MapPin className="w-4 h-4 text-zinc-400" /> {order.address || 'Endereço não informado'}
              </p>
              <p className="text-zinc-500 text-sm">Total: R$ {order.total_price.toFixed(2)} • Pagamento: {order.payment_method}</p>
            </div>

            <div className="flex items-center gap-3">
              {order.status === 'ready' ? (
                <select 
                  onChange={(e) => assignCourier(order.id, parseInt(e.target.value))}
                  className="bg-zinc-100 border-none rounded-lg px-4 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-red-500"
                  defaultValue=""
                >
                  <option value="" disabled>Vincular Entregador</option>
                  {couriers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-zinc-400 uppercase font-bold">Entregador</p>
                    <p className="font-bold text-sm">{order.courier_name}</p>
                  </div>
                  <button
                    onClick={() => completeDelivery(order.id)}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-green-700 transition-colors"
                  >
                    Confirmar Entrega
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {orders.length === 0 && (
          <div className="text-center py-24 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
            <Bike className="w-16 h-16 mx-auto mb-4 text-zinc-200" />
            <p className="text-zinc-400 font-medium">Nenhuma entrega pendente no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ClientView = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<(Product & { quantity: number })[]>([]);
  const [address, setAddress] = useState('');
  const [isOrdering, setIsOrdering] = useState(false);

  useEffect(() => {
    fetch('/api/products').then(res => res.json()).then(setProducts);
  }, []);

  const addToCart = (p: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === p.id);
      if (existing) {
        return prev.map(item => item.id === p.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...p, quantity: 1 }];
    });
  };

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const placeOrder = async () => {
    if (!address) return alert('Por favor, informe seu endereço');
    setIsOrdering(true);
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'delivery',
        items: cart,
        total_price: total,
        address,
        payment_method: 'Cartão (Online)'
      })
    });
    if (res.ok) {
      setCart([]);
      setAddress('');
      alert('Pedido enviado! Acompanhe o status na nossa tela.');
    }
    setIsOrdering(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      <div className="relative h-64 bg-zinc-900 overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=2070&auto=format&fit=crop" 
          className="w-full h-full object-cover opacity-60"
          alt="Pizza Hero"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black tracking-tighter mb-2"
          >
            A MELHOR PIZZA DA CIDADE
          </motion.h1>
          <p className="text-zinc-300 max-w-md">Ingredientes selecionados e massa artesanal fermentada por 48h.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 -mt-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-8 rounded-3xl shadow-xl shadow-zinc-200/50">
              <h2 className="text-2xl font-black mb-6 flex items-center gap-2">
                <Utensils className="w-6 h-6 text-red-600" /> Nosso Cardápio
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {products.map(p => (
                  <div key={p.id} className="flex gap-4 p-4 rounded-2xl border border-zinc-100 hover:border-red-200 transition-all group">
                    <div className="w-24 h-24 bg-zinc-100 rounded-xl flex-shrink-0 flex items-center justify-center text-zinc-300">
                      <Utensils className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg group-hover:text-red-600 transition-colors">{p.name}</h3>
                      <p className="text-zinc-500 text-xs line-clamp-2 mt-1">{p.description}</p>
                      <div className="flex justify-between items-center mt-3">
                        <span className="font-mono font-bold text-lg">R$ {p.price.toFixed(2)}</span>
                        <button 
                          onClick={() => addToCart(p)}
                          className="bg-zinc-900 text-white p-2 rounded-lg hover:bg-red-600 transition-all"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-xl shadow-zinc-200/50 sticky top-24">
              <h2 className="text-2xl font-black mb-6 flex items-center gap-2">
                <ShoppingCart className="w-6 h-6 text-red-600" /> Seu Pedido
              </h2>
              <div className="space-y-4 mb-8">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center">
                    <span className="text-sm font-medium">{item.quantity}x {item.name}</span>
                    <span className="text-sm font-mono font-bold">R$ {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                {cart.length === 0 && (
                  <p className="text-zinc-400 text-center py-8">Seu carrinho está vazio</p>
                )}
              </div>

              {cart.length > 0 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-zinc-400 tracking-widest">Endereço de Entrega</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input 
                        type="text" 
                        placeholder="Rua, número, bairro..."
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-zinc-100">
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-zinc-500 font-medium">Total</span>
                      <span className="text-3xl font-black">R$ {total.toFixed(2)}</span>
                    </div>
                    <button 
                      onClick={placeOrder}
                      disabled={isOrdering}
                      className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-red-700 transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2"
                    >
                      {isOrdering ? 'Processando...' : 'Finalizar Pedido'}
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [view, setView] = useState<ViewType>('client');

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
      <Navbar currentView={view} setView={setView} />
      <main>
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {view === 'admin' && <AdminView />}
            {view === 'cashier' && <CashierView />}
            {view === 'kitchen' && <KitchenView />}
            {view === 'delivery' && <DeliveryView />}
            {view === 'client' && <ClientView />}
          </motion.div>
        </AnimatePresence>
      </main>
      
      {/* Real-time Notification Toast (Conceptual) */}
      <div className="fixed bottom-6 right-6 z-50 pointer-events-none">
        {/* We could add a toast system here for status updates */}
      </div>
    </div>
  );
}
