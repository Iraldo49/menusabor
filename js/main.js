  // Sistema de dados local
    const LocalStorageSDK = {
      init(callback) {
        this.callback = callback;
        this.loadData();
        return Promise.resolve({ isOk: true });
      },

      loadData() {
        const data = JSON.parse(localStorage.getItem('restaurant-data') || '[]');
        if (this.callback) {
          this.callback.onDataChanged(data);
        }
        return data;
      },

      saveData(data) {
        localStorage.setItem('restaurant-data', JSON.stringify(data));
        if (this.callback) {
          this.callback.onDataChanged(data);
        }
      },

      create(item) {
        const data = this.loadData();
        const newItem = {
          ...item,
          __backendId: Date.now().toString(),
          created_at: new Date().toISOString()
        };
        data.push(newItem);
        this.saveData(data);
        return Promise.resolve({ isOk: true, data: newItem });
      },

      update(updatedItem) {
        const data = this.loadData();
        const index = data.findIndex(item => item.__backendId === updatedItem.__backendId);
        if (index !== -1) {
          data[index] = { ...data[index], ...updatedItem };
          this.saveData(data);
          return Promise.resolve({ isOk: true });
        }
        return Promise.resolve({ isOk: false });
      },

      delete(itemToDelete) {
        const data = this.loadData();
        const filteredData = data.filter(item => item.__backendId !== itemToDelete.__backendId);
        this.saveData(filteredData);
        return Promise.resolve({ isOk: true });
      }
    };

    // Configuração padrão
    const defaultConfig = {
      restaurant_name: "Sabor da Esquina",
      whatsapp_number: "+258822937027",
      welcome_message: "Bem-vindo ao Sabor da Esquina!",
      primary_color: "#ea1d2c",
      secondary_color: "#22c55e"
    };

    // Estado global
    let cart = [];
    let products = [];
    let orders = [];
    let users = [];
    let editingProduct = null;
    let carouselInterval = null;
    let currentCarouselIndex = 0;
    let currentUser = null;
    let isLogin = true;
    let selectedPaymentMethod = null;
    let currentImageFile = null;

    // Handler de dados
    const dataHandler = {
      onDataChanged(data) {
        users = data.filter(item => item.type === 'user');
        products = data.filter(item => item.type === 'product');
        orders = data.filter(item => item.type === 'order');
        
        renderProducts();
        renderCarousel();
        if (currentUser && currentUser.role === 'admin') {
          renderAdminProducts();
          renderAdminOrders();
        }
      }
    };

    // Inicialização
    async function init() {
      const existingData = JSON.parse(localStorage.getItem('restaurant-data') || '[]');
      if (existingData.length === 0) {
        const initialProducts = [
          {
            type: 'product',
            product_name: 'Hambúrguer Clássico',
            category: 'burgers',
            description: 'Pão, carne, queijo e salada',
            price: 150.00,
            image_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiNGNUY1RjUiLz48dGV4dCB4PSIyMDAiIHk9IjE1MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjI0IiBmaWxsPSIjOTk5Ij7imqAgQnVyZ2VyIMKbPC90ZXh0Pjwvc3ZnPg==',
            promotion: false,
            available: true,
            __backendId: '1',
            created_at: new Date().toISOString()
          },
          {
            type: 'product',
            product_name: 'Pizza Margherita',
            category: 'pizzas',
            description: 'Molho, mussarela e manjericão',
            price: 350.00,
            image_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiNGNUY1RjUiLz48dGV4dCB4PSIyMDAiIHk9IjE1MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjI0IiBmaWxsPSIjOTk5Ij7imqAgUGl6emEgwps8L3RleHQ+PC9zdmc+',
            promotion: true,
            original_price: 400.00,
            available: true,
            __backendId: '2',
            created_at: new Date().toISOString()
          },
          {
            type: 'product',
            product_name: 'Coca-Cola',
            category: 'bebidas',
            description: 'Lata 350ml',
            price: 40.00,
            image_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiNGNUY1RjUiLz48dGV4dCB4PSIyMDAiIHk9IjE1MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjI0IiBmaWxsPSIjOTk5Ij7imqAgQmViaWRhIMKbPC90ZXh0Pjwvc3ZnPg==',
            promotion: false,
            available: true,
            __backendId: '3',
            created_at: new Date().toISOString()
          }
        ];
        localStorage.setItem('restaurant-data', JSON.stringify(initialProducts));
      }

      const result = await LocalStorageSDK.init(dataHandler);
      if (!result.isOk) {
        showToast('Erro ao inicializar sistema');
      }

      // Configurar eventos do formulário de produto
      setupProductForm();
    }

    // Configurar formulário de produto
    function setupProductForm() {
      const imageFileInput = document.getElementById('product-image-file');
      const imageUrlInput = document.getElementById('product-image-url');
      const imagePreview = document.getElementById('image-preview');
      const fileInputLabel = document.getElementById('file-input-label');

      imageFileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
          currentImageFile = file;
          fileInputLabel.textContent = file.name;
          
          const reader = new FileReader();
          reader.onload = function(e) {
            imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            imagePreview.style.display = 'flex';
          };
          reader.readAsDataURL(file);
          
          // Limpar URL quando arquivo é selecionado
          imageUrlInput.value = '';
        }
      });

      imageUrlInput.addEventListener('input', function(e) {
        if (e.target.value) {
          // Limpar arquivo quando URL é inserida
          imageFileInput.value = '';
          currentImageFile = null;
          fileInputLabel.textContent = '📷 Clique para selecionar uma imagem';
          imagePreview.innerHTML = `<img src="${e.target.value}" alt="Preview" onerror="this.style.display='none'">`;
          imagePreview.style.display = 'flex';
        }
      });
    }

    // Sistema de Login
    document.getElementById('login-btn').addEventListener('click', () => {
      document.getElementById('login-modal').classList.add('active');
    });

    document.getElementById('cancel-login').addEventListener('click', () => {
      document.getElementById('login-modal').classList.remove('active');
    });

    document.getElementById('login-switch').addEventListener('click', (e) => {
      e.preventDefault();
      isLogin = !isLogin;
      const nameGroup = document.getElementById('name-group');
      const nameInput = document.getElementById('login-name');
      
      if (isLogin) {
        document.getElementById('login-title').textContent = 'Entrar';
        nameGroup.style.display = 'none';
        nameInput.removeAttribute('required');
        document.getElementById('login-switch-text').textContent = 'Não tem conta?';
        document.getElementById('login-switch').textContent = 'Criar conta';
      } else {
        document.getElementById('login-title').textContent = 'Criar Conta';
        nameGroup.style.display = 'block';
        nameInput.setAttribute('required', 'required');
        document.getElementById('login-switch-text').textContent = 'Já tem conta?';
        document.getElementById('login-switch').textContent = 'Entrar';
      }
    });

    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;
      const name = document.getElementById('login-name').value;

      if (isLogin) {
        if (username === 'admin' && password === 'admin') {
          currentUser = { name: 'Administrador', username: 'admin', role: 'admin' };
          showToast('Bem-vindo, Administrador!');
          updateUI();
          document.getElementById('login-modal').classList.remove('active');
          document.getElementById('login-form').reset();
        } else {
          const user = users.find(u => u.phone === username && u.password === password);
          if (user) {
            currentUser = user;
            showToast(`Bem-vindo, ${user.name}!`);
            updateUI();
            document.getElementById('login-modal').classList.remove('active');
            document.getElementById('login-form').reset();
          } else {
            showToast('Usuário ou senha inválidos');
          }
        }
      } else {
        if (!username.startsWith('+258')) {
          showToast('Use um número de Moçambique (+258)');
          return;
        }

        if (users.find(u => u.phone === username)) {
          showToast('Número já cadastrado');
          return;
        }

        const result = await LocalStorageSDK.create({
          type: 'user',
          name,
          phone: username,
          password,
          role: 'customer'
        });

        if (result.isOk) {
          showToast('Conta criada com sucesso! Faça login.');
          isLogin = true;
          document.getElementById('login-title').textContent = 'Entrar';
          document.getElementById('name-group').style.display = 'none';
          document.getElementById('login-name').removeAttribute('required');
          document.getElementById('login-switch-text').textContent = 'Não tem conta?';
          document.getElementById('login-switch').textContent = 'Criar conta';
          document.getElementById('login-form').reset();
        } else {
          showToast('Erro ao criar conta');
        }
      }
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
      currentUser = null;
      cart = [];
      updateUI();
      showToast('Logout realizado com sucesso');
    });

    // Renderização de Produtos
    function renderProducts(category = 'all') {
      const grid = document.getElementById('products-grid');
      const empty = document.getElementById('empty-products');
      
      let filtered = products.filter(p => p.available);
      if (category !== 'all') {
        filtered = filtered.filter(p => p.category === category);
      }

      if (filtered.length === 0) {
        grid.style.display = 'none';
        empty.style.display = 'block';
        return;
      }

      grid.style.display = 'grid';
      empty.style.display = 'none';
      
      grid.innerHTML = filtered.map(product => {
        return `
        <div class="product-card">
          <div class="product-image">
            <img src="${product.image_url}" alt="${product.product_name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <span class="product-image-fallback" style="display: none;">📷</span>
            ${product.promotion ? '<span class="promotion-badge">PROMOÇÃO</span>' : ''}
          </div>
          <div class="product-info">
            <div class="product-name">${product.product_name}</div>
            <div class="product-description">${product.description}</div>
            <div class="product-price">
              <span class="current-price">${product.price.toFixed(2)} MT</span>
              ${product.promotion && product.original_price ? 
                `<span class="original-price">${product.original_price.toFixed(2)} MT</span>` : ''}
            </div>
            <button class="add-to-cart-btn" onclick="addToCart('${product.__backendId}')">
              Adicionar
            </button>
          </div>
        </div>
      `;
      }).join('');
    }

    // Categorias
    document.querySelectorAll('.category-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        renderProducts(chip.dataset.category);
      });
    });

    // Carousel
    function renderCarousel() {
      const promos = products.filter(p => p.promotion && p.available);
      const section = document.getElementById('carousel-section');
      const track = document.getElementById('carousel-track');
      const dots = document.getElementById('carousel-dots');

      if (promos.length === 0) {
        section.style.display = 'none';
        if (carouselInterval) clearInterval(carouselInterval);
        return;
      }

      section.style.display = 'block';
      
      track.innerHTML = promos.map((product) => {
        return `
        <div class="carousel-slide">
          <img src="${product.image_url}" alt="${product.product_name}" class="carousel-image" onerror="this.style.display='none'">
          <div class="carousel-content">
            <div class="carousel-item-title">${product.product_name}</div>
            <div class="carousel-item-description">${product.description}</div>
            <div class="carousel-item-price">${product.price.toFixed(2)} MT</div>
            ${product.original_price ? 
              `<div style="text-decoration: line-through; opacity: 0.7; font-size: 16px;">De ${product.original_price.toFixed(2)} MT</div>` : 
              ''
            }
          </div>
        </div>
      `;
      }).join('');

      dots.innerHTML = promos.map((_, i) => 
        `<span class="carousel-dot ${i === 0 ? 'active' : ''}" onclick="goToSlide(${i})"></span>`
      ).join('');

      if (carouselInterval) clearInterval(carouselInterval);
      if (promos.length > 1) {
        carouselInterval = setInterval(() => {
          nextSlide();
        }, 4000);
      }

      updateCarousel();
    }

    function updateCarousel() {
      const track = document.getElementById('carousel-track');
      const dots = document.querySelectorAll('.carousel-dot');
      
      if (track) {
        track.style.transform = `translateX(-${currentCarouselIndex * 100}%)`;
      }
      
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentCarouselIndex);
      });
    }

    function nextSlide() {
      const promos = products.filter(p => p.promotion && p.available);
      currentCarouselIndex = (currentCarouselIndex + 1) % promos.length;
      updateCarousel();
    }

    function prevSlide() {
      const promos = products.filter(p => p.promotion && p.available);
      currentCarouselIndex = (currentCarouselIndex - 1 + promos.length) % promos.length;
      updateCarousel();
    }

    window.goToSlide = (index) => {
      currentCarouselIndex = index;
      updateCarousel();
    };

    // Carrinho
    window.addToCart = (productId) => {
      if (!currentUser) {
        showToast('Faça login para adicionar ao carrinho');
        document.getElementById('login-modal').classList.add('active');
        return;
      }

      if (currentUser.role === 'admin') {
        showToast('Admins não podem fazer pedidos');
        return;
      }

      const product = products.find(p => p.__backendId === productId);
      const cartItem = cart.find(item => item.product.__backendId === productId);

      if (cartItem) {
        cartItem.quantity++;
      } else {
        cart.push({ product, quantity: 1 });
      }

      updateCart();
      showToast('Produto adicionado ao carrinho!');
    };

    function updateCart() {
      const cartItems = document.getElementById('cart-items');
      const badge = document.getElementById('cart-badge');
      const total = document.getElementById('cart-total');

      const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
      badge.textContent = itemCount;

      if (cart.length === 0) {
        cartItems.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🛒</div><p>Carrinho vazio</p></div>';
      } else {
        cartItems.innerHTML = cart.map((item, index) => {
          return `
          <div class="cart-item">
            <div style="width: 60px; height: 60px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: #f5f5f5; border-radius: 8px; overflow: hidden;">
              <img src="${item.product.image_url}" alt="${item.product.product_name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'">
            </div>
            <div class="cart-item-info">
              <div class="cart-item-name">${item.product.product_name}</div>
              <div class="cart-item-price">${item.product.price.toFixed(2)} MT</div>
              <div class="cart-item-quantity">
                <button class="qty-btn" onclick="updateQuantity(${index}, -1)">-</button>
                <span>${item.quantity}</span>
                <button class="qty-btn" onclick="updateQuantity(${index}, 1)">+</button>
              </div>
            </div>
          </div>
        `;
        }).join('');
      }

      const totalAmount = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      total.textContent = `${totalAmount.toFixed(2)} MT`;
    }

    window.updateQuantity = (index, delta) => {
      cart[index].quantity += delta;
      if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
      }
      updateCart();
    };

    document.getElementById('cart-icon').addEventListener('click', () => {
      document.getElementById('cart-panel').classList.add('active');
      if (currentUser) {
        document.getElementById('cart-customer-name').textContent = currentUser.name;
      }
    });

    document.getElementById('close-cart').addEventListener('click', () => {
      document.getElementById('cart-panel').classList.remove('active');
    });

    // Seleção de método de pagamento
    document.querySelectorAll('.payment-method-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.payment-method-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedPaymentMethod = btn.dataset.method;
      });
    });

    document.getElementById('checkout-btn').addEventListener('click', () => {
      if (cart.length === 0) {
        showToast('Carrinho vazio');
        return;
      }

      if (!selectedPaymentMethod) {
        showToast('Por favor, selecione o método de pagamento');
        return;
      }

      const name = currentUser.name;
      const phone = currentUser.phone || currentUser.username;

      const items = cart.map(item => 
        `${item.quantity}x ${item.product.product_name} - ${(item.product.price * item.quantity).toFixed(2)} MT`
      ).join('\n');
      const total = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      
      const message = `🍔 *Novo Pedido - Sabor da Esquina*\n\n*Cliente:* ${name}\n*Telefone:* ${phone}\n*Pagamento:* ${selectedPaymentMethod}\n\n*Itens:*\n${items}\n\n*Total:* ${total.toFixed(2)} MT`;
      
      window.open(`https://wa.me/258822937027?text=${encodeURIComponent(message)}`, '_blank');
      
      LocalStorageSDK.create({
        type: 'order',
        order_id: Date.now(),
        customer_name: name,
        customer_phone: phone,
        items: cart,
        total: total,
        payment_method: selectedPaymentMethod,
        status: 'pending'
      });

      cart = [];
      selectedPaymentMethod = null;
      document.querySelectorAll('.payment-method-btn').forEach(b => b.classList.remove('selected'));
      updateCart();
      document.getElementById('cart-panel').classList.remove('active');
      showToast('Pedido enviado para o WhatsApp!');
    });

    // Sistema Admin
    document.getElementById('add-product-btn').addEventListener('click', () => {
      editingProduct = null;
      document.getElementById('product-modal-title').textContent = 'Adicionar Produto';
      document.getElementById('product-form').reset();
      document.getElementById('image-preview').style.display = 'none';
      document.getElementById('file-input-label').textContent = '📷 Clique para selecionar uma imagem';
      currentImageFile = null;
      document.getElementById('product-modal').classList.add('active');
    });

    document.getElementById('cancel-product').addEventListener('click', () => {
      document.getElementById('product-modal').classList.remove('active');
    });

    document.getElementById('product-promotion').addEventListener('change', (e) => {
      document.getElementById('original-price-group').style.display = e.target.checked ? 'block' : 'none';
    });

    document.getElementById('product-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      let imageUrl = document.getElementById('product-image-url').value.trim();
      
      // Se há arquivo selecionado, converte para Data URL
      if (currentImageFile) {
        imageUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(currentImageFile);
        });
      }
      
      // Se não há imagem, usa uma padrão
      if (!imageUrl) {
        imageUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiNGNUY1RjUiLz48dGV4dCB4PSIyMDAiIHk9IjE1MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjI0IiBmaWxsPSIjOTk5Ij7imqAgUHJvZHV0byDimqA8L3RleHQ+PC9zdmc+';
      }

      const productData = {
        type: 'product',
        product_name: document.getElementById('product-name').value,
        category: document.getElementById('product-category').value,
        description: document.getElementById('product-description').value,
        price: parseFloat(document.getElementById('product-price').value),
        image_url: imageUrl,
        promotion: document.getElementById('product-promotion').checked,
        original_price: document.getElementById('product-promotion').checked ? 
          parseFloat(document.getElementById('product-original-price').value) : 0,
        available: true
      };

      let result;
      if (editingProduct) {
        result = await LocalStorageSDK.update({ ...editingProduct, ...productData });
      } else {
        result = await LocalStorageSDK.create(productData);
      }

      if (result.isOk) {
        showToast(editingProduct ? 'Produto atualizado!' : 'Produto adicionado!');
        document.getElementById('product-modal').classList.remove('active');
      } else {
        showToast('Erro ao salvar produto');
      }
    });

    function renderAdminProducts() {
      const list = document.getElementById('admin-products-list');
      
      if (products.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><p>Nenhum produto cadastrado</p></div>';
        return;
      }

      list.innerHTML = products.map((product) => {
        return `
        <div class="product-item">
          <div class="product-item-image">
            <img src="${product.image_url}" alt="${product.product_name}" onerror="this.style.display='none'">
          </div>
          <div class="product-item-details">
            <div style="font-weight: 700; margin-bottom: 4px;">${product.product_name}</div>
            <div style="color: #666; font-size: 14px;">${product.description}</div>
            <div style="margin-top: 8px;">
              <span style="color: #ea1d2c; font-weight: 700;">${product.price.toFixed(2)} MT</span>
              ${product.promotion ? '<span style="background: #22c55e; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 8px;">PROMOÇÃO</span>' : ''}
              ${!product.available ? '<span style="background: #ef4444; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 8px;">INDISPONÍVEL</span>' : ''}
            </div>
          </div>
          <div class="product-item-actions">
            <button class="icon-btn" onclick="editProduct('${product.__backendId}')" title="Editar">✏️</button>
            <button class="icon-btn" onclick="toggleProductAvailability('${product.__backendId}')" title="${product.available ? 'Desativar' : 'Ativar'}">
              ${product.available ? '👁️' : '🚫'}
            </button>
            <button class="icon-btn" onclick="deleteProduct('${product.__backendId}')" title="Excluir">🗑️</button>
          </div>
        </div>
      `;
      }).join('');
    }

    window.editProduct = (id) => {
      editingProduct = products.find(p => p.__backendId === id);
      document.getElementById('product-modal-title').textContent = 'Editar Produto';
      document.getElementById('product-name').value = editingProduct.product_name;
      document.getElementById('product-category').value = editingProduct.category;
      document.getElementById('product-description').value = editingProduct.description;
      document.getElementById('product-price').value = editingProduct.price;
      document.getElementById('product-image-url').value = editingProduct.image_url.startsWith('http') ? editingProduct.image_url : '';
      document.getElementById('product-promotion').checked = editingProduct.promotion;
      document.getElementById('product-original-price').value = editingProduct.original_price || '';
      document.getElementById('original-price-group').style.display = editingProduct.promotion ? 'block' : 'none';
      
      // Mostrar preview da imagem atual
      const imagePreview = document.getElementById('image-preview');
      if (editingProduct.image_url) {
        imagePreview.innerHTML = `<img src="${editingProduct.image_url}" alt="Preview">`;
        imagePreview.style.display = 'flex';
      }
      
      document.getElementById('product-modal').classList.add('active');
    };

    window.toggleProductAvailability = async (id) => {
      const product = products.find(p => p.__backendId === id);
      const result = await LocalStorageSDK.update({ ...product, available: !product.available });
      if (result.isOk) {
        showToast(product.available ? 'Produto desativado' : 'Produto ativado');
      }
    };

    window.deleteProduct = async (id) => {
      const product = products.find(p => p.__backendId === id);
      const result = await LocalStorageSDK.delete(product);
      if (result.isOk) {
        showToast('Produto excluído');
      }
    };

    function renderAdminOrders() {
      const list = document.getElementById('admin-orders-list');
      
      if (orders.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><p>Nenhum pedido registrado</p></div>';
        return;
      }

      list.innerHTML = orders.map(order => `
        <div class="product-item">
          <div style="flex: 1;">
            <div style="font-weight: 700; margin-bottom: 4px;">Pedido #${order.order_id}</div>
            <div style="color: #666; font-size: 14px;">${order.customer_name} - ${order.customer_phone}</div>
            <div style="margin-top: 8px; color: #ea1d2c; font-weight: 700;">${order.total.toFixed(2)} MT</div>
            <div style="margin-top: 4px; font-size: 12px; color: #999;">${new Date(order.created_at).toLocaleString('pt-PT')}</div>
          </div>
        </div>
      `).join('');
    }

    document.querySelectorAll('.admin-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.admin-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`admin-${tab.dataset.tab}`).classList.add('active');
      });
    });

    // Atualiza UI
    function updateUI() {
      const loginBtn = document.getElementById('login-btn');
      const logoutBtn = document.getElementById('logout-btn');
      const cartIcon = document.getElementById('cart-icon');
      const mainContent = document.getElementById('main-content');
      const adminPanel = document.getElementById('admin-panel');

      if (currentUser) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'block';

        if (currentUser.role === 'admin') {
          mainContent.style.display = 'none';
          adminPanel.style.display = 'block';
          cartIcon.style.display = 'none';
          renderAdminProducts();
          renderAdminOrders();
        } else {
          mainContent.style.display = 'block';
          adminPanel.style.display = 'none';
          cartIcon.style.display = 'block';
        }
      } else {
        loginBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        cartIcon.style.display = 'none';
        mainContent.style.display = 'block';
        adminPanel.style.display = 'none';
      }
    }

    function showToast(message) {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // Inicializar
    init();
  
  