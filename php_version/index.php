<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pizzaria Master POS - Versão PHP</title>
    <!-- Tailwind CSS para o visual -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Alpine.js para a lógica do frontend sem precisar de compilação -->
    <script defer src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <style>
        [x-cloak] { display: none !important; }
    </style>
</head>
<body class="bg-zinc-50 font-sans text-zinc-900" x-data="pizzariaApp()">
    
    <!-- Navbar -->
    <nav class="bg-zinc-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-lg">
        <div class="flex items-center gap-2">
            <div class="bg-red-600 p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
            </div>
            <span class="font-black text-xl tracking-tighter">PIZZARIA MASTER</span>
        </div>
        <div class="flex gap-1 bg-zinc-800 p-1 rounded-xl">
            <button @click="view = 'client'" :class="view == 'client' ? 'bg-red-600 text-white' : 'text-zinc-400'" class="px-4 py-2 rounded-lg text-sm font-bold transition-all">CLIENTE</button>
            <button @click="view = 'kitchen'" :class="view == 'kitchen' ? 'bg-red-600 text-white' : 'text-zinc-400'" class="px-4 py-2 rounded-lg text-sm font-bold transition-all">COZINHA</button>
            <button @click="view = 'admin'" :class="view == 'admin' ? 'bg-red-600 text-white' : 'text-zinc-400'" class="px-4 py-2 rounded-lg text-sm font-bold transition-all">ADMIN</button>
        </div>
    </nav>

    <!-- View: Cliente -->
    <div x-show="view == 'client'" x-cloak class="pb-24">
        <div class="relative h-48 bg-zinc-900 flex items-center justify-center text-white">
            <div class="text-center">
                <h1 class="text-4xl font-black tracking-tighter">FAÇA SEU PEDIDO</h1>
                <p class="text-zinc-400 text-sm">As melhores pizzas entregues na sua porta</p>
            </div>
        </div>

        <div class="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 space-y-6">
                <h2 class="text-2xl font-black flex items-center gap-2">Cardápio</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <template x-for="p in products" :key="p.id">
                        <div class="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 flex gap-4 hover:border-red-500 transition-all group">
                            <div class="w-20 h-20 bg-zinc-100 rounded-xl flex-shrink-0 flex items-center justify-center text-zinc-300">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
                            </div>
                            <div class="flex-1">
                                <p class="font-bold text-lg group-hover:text-red-600 transition-colors" x-text="p.name"></p>
                                <p class="text-zinc-500 text-xs line-clamp-1" x-text="p.description"></p>
                                <div class="flex justify-between items-center mt-2">
                                    <span class="font-black text-lg">R$ <span x-text="parseFloat(p.price).toFixed(2)"></span></span>
                                    <button @click="addToCart(p)" class="bg-zinc-900 text-white p-2 rounded-lg hover:bg-red-600 transition-all">+</button>
                                </div>
                            </div>
                        </div>
                    </template>
                </div>
            </div>

            <!-- Carrinho Lateral -->
            <div class="space-y-6">
                <div class="bg-white p-6 rounded-3xl shadow-xl border border-zinc-100 sticky top-24">
                    <h3 class="text-xl font-black mb-4 flex items-center gap-2">Seu Carrinho</h3>
                    <div class="space-y-3 mb-6">
                        <template x-for="item in cart" :key="item.id">
                            <div class="flex justify-between text-sm">
                                <span x-text="item.quantity + 'x ' + item.name"></span>
                                <span class="font-bold" x-text="'R$ ' + (item.price * item.quantity).toFixed(2)"></span>
                            </div>
                        </template>
                        <template x-if="cart.length == 0">
                            <p class="text-zinc-400 text-center py-4 text-sm">Vazio</p>
                        </template>
                    </div>
                    
                    <template x-if="cart.length > 0">
                        <div class="space-y-4 border-t pt-4">
                            <input type="text" x-model="address" placeholder="Endereço Completo" class="w-full p-3 bg-zinc-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500">
                            <div class="flex justify-between items-center">
                                <span class="text-zinc-500">Total</span>
                                <span class="text-2xl font-black">R$ <span x-text="cartTotal().toFixed(2)"></span></span>
                            </div>
                            <button @click="placeOrder()" class="w-full bg-red-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-red-700 transition-all shadow-lg shadow-red-100">FINALIZAR PEDIDO</button>
                        </div>
                    </template>
                </div>
            </div>
        </div>
    </div>

    <!-- View: Cozinha -->
    <div x-show="view == 'kitchen'" x-cloak class="p-6">
        <div class="flex justify-between items-center mb-8">
            <h2 class="text-3xl font-black">COZINHA</h2>
            <div class="flex items-center gap-2 text-zinc-400">
                <span class="animate-pulse w-2 h-2 bg-green-500 rounded-full"></span>
                <span class="text-xs font-bold uppercase tracking-widest">Tempo Real</span>
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <template x-for="o in orders.filter(ord => ord.status != 'completed' && ord.status != 'cancelled')" :key="o.id">
                <div class="bg-white rounded-2xl shadow-md border-t-4 overflow-hidden" :class="o.status == 'received' ? 'border-red-500' : 'border-amber-500'">
                    <div class="p-4 bg-zinc-50 border-b flex justify-between items-center">
                        <span class="font-black text-sm">PEDIDO #<span x-text="o.id"></span></span>
                        <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-200" x-text="o.status"></span>
                    </div>
                    <div class="p-4">
                        <p class="text-xs text-zinc-500 mb-2 font-medium" x-text="o.address"></p>
                        <div class="space-y-1 border-t pt-2">
                            <p class="text-xs font-bold text-zinc-400 uppercase">Itens do Pedido:</p>
                            <!-- Nota: Em uma versão PHP simples sem join complexo no front, mostramos o total -->
                            <p class="text-sm font-bold">Total: R$ <span x-text="parseFloat(o.total_price).toFixed(2)"></span></p>
                        </div>
                    </div>
                    <div class="p-4 bg-zinc-50 border-t flex gap-2">
                        <button x-show="o.status == 'received'" @click="updateStatus(o.id, 'preparing')" class="flex-1 bg-amber-500 text-white py-2 rounded-lg text-xs font-bold hover:bg-amber-600">PREPARAR</button>
                        <button x-show="o.status == 'preparing'" @click="updateStatus(o.id, 'ready')" class="flex-1 bg-green-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-green-700">PRONTO</button>
                        <button x-show="o.status == 'ready'" @click="updateStatus(o.id, 'completed')" class="flex-1 bg-zinc-900 text-white py-2 rounded-lg text-xs font-bold hover:bg-black">FINALIZAR</button>
                    </div>
                </div>
            </template>
        </div>
    </div>

    <!-- View: Admin -->
    <div x-show="view == 'admin'" x-cloak class="p-6 max-w-7xl mx-auto">
        <h2 class="text-3xl font-black mb-8">ADMINISTRAÇÃO</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-white p-6 rounded-2xl shadow-sm border">
                <p class="text-zinc-400 text-xs font-bold uppercase tracking-widest">Vendas Totais</p>
                <p class="text-3xl font-black mt-1">R$ <span x-text="orders.reduce((acc, o) => acc + (o.status == 'completed' ? parseFloat(o.total_price) : 0), 0).toFixed(2)"></span></p>
            </div>
            <div class="bg-white p-6 rounded-2xl shadow-sm border">
                <p class="text-zinc-400 text-xs font-bold uppercase tracking-widest">Pedidos Realizados</p>
                <p class="text-3xl font-black mt-1" x-text="orders.length"></p>
            </div>
            <div class="bg-white p-6 rounded-2xl shadow-sm border">
                <p class="text-zinc-400 text-xs font-bold uppercase tracking-widest">Produtos</p>
                <p class="text-3xl font-black mt-1" x-text="products.length"></p>
            </div>
        </div>

        <div class="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <table class="w-full text-left">
                <thead class="bg-zinc-50 text-[10px] font-black uppercase text-zinc-400 tracking-widest">
                    <tr>
                        <th class="px-6 py-4">ID</th>
                        <th class="px-6 py-4">Status</th>
                        <th class="px-6 py-4">Total</th>
                        <th class="px-6 py-4">Data</th>
                    </tr>
                </thead>
                <tbody class="divide-y text-sm">
                    <template x-for="o in orders" :key="o.id">
                        <tr>
                            <td class="px-6 py-4 font-bold">#<span x-text="o.id"></span></td>
                            <td class="px-6 py-4">
                                <span class="px-2 py-1 rounded-full text-[10px] font-black uppercase" :class="{
                                    'bg-red-100 text-red-700': o.status == 'received',
                                    'bg-amber-100 text-amber-700': o.status == 'preparing',
                                    'bg-green-100 text-green-700': o.status == 'completed'
                                }" x-text="o.status"></span>
                            </td>
                            <td class="px-6 py-4 font-mono font-bold">R$ <span x-text="parseFloat(o.total_price).toFixed(2)"></span></td>
                            <td class="px-6 py-4 text-zinc-500" x-text="new Date(o.created_at).toLocaleString()"></td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>
    </div>

    <script>
        function pizzariaApp() {
            return {
                view: 'client',
                products: [],
                orders: [],
                cart: [],
                address: '',
                init() {
                    this.fetchProducts();
                    this.fetchOrders();
                    // Atualização automática a cada 10 segundos
                    setInterval(() => this.fetchOrders(), 10000);
                },
                fetchProducts() {
                    fetch('api.php?action=products')
                        .then(r => r.json())
                        .then(d => this.products = d)
                        .catch(e => console.error('Erro ao buscar produtos:', e));
                },
                fetchOrders() {
                    fetch('api.php?action=orders')
                        .then(r => r.json())
                        .then(d => this.orders = d)
                        .catch(e => console.error('Erro ao buscar pedidos:', e));
                },
                addToCart(p) {
                    let item = this.cart.find(i => i.id == p.id);
                    if (item) {
                        item.quantity++;
                    } else {
                        this.cart.push({
                            id: p.id,
                            name: p.name,
                            price: parseFloat(p.price),
                            quantity: 1
                        });
                    }
                },
                cartTotal() {
                    return this.cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                },
                placeOrder() {
                    if (!this.address) return alert('Informe o endereço!');
                    
                    fetch('api.php?action=place_order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'delivery',
                            total_price: this.cartTotal(),
                            address: this.address,
                            payment_method: 'Dinheiro',
                            items: this.cart
                        })
                    })
                    .then(r => r.json())
                    .then(data => {
                        if (data.success) {
                            alert('Pedido #' + data.orderId + ' realizado com sucesso!');
                            this.cart = [];
                            this.address = '';
                            this.fetchOrders();
                        }
                    })
                    .catch(e => alert('Erro ao enviar pedido. Verifique a conexão.'));
                },
                updateStatus(id, status) {
                    fetch('api.php?action=update_status', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id, status })
                    })
                    .then(r => r.json())
                    .then(() => this.fetchOrders())
                    .catch(e => console.error('Erro ao atualizar status:', e));
                }
            }
        }
    </script>
</body>
</html>
