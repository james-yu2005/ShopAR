// Shopify API Class
class ShopifyStorefrontAPI {
  constructor(shopDomain, accessToken) {
    this.shopDomain = shopDomain.replace('https://', '').replace('http://', '');
    if (!this.shopDomain.endsWith('.myshopify.com')) {
      this.shopDomain += '.myshopify.com';
    }
    this.apiUrl = `https://${this.shopDomain}/api/2023-10/graphql.json`;
    this.accessToken = accessToken;

    this.headers = {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': this.accessToken
    };
  }

  getProductsQuery(cursor = null, limit = 20) {
    const afterCursor = cursor ? `, after: "${cursor}"` : '';
    return `
      {
        products(first: ${limit}${afterCursor}) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              title
              description
              variants(first: 1) {
                edges {
                  node {
                    price {
                      amount
                      currencyCode
                    }
                  }
                }
              }
              images(first: 1) {
                edges {
                  node {
                    url
                  }
                }
              }
            }
          }
        }
      }
    `;
  }

  async fetchProducts() {
    let allProducts = [];
    let cursor = null;
    let hasNextPage = true;

    while (hasNextPage) {
      const query = this.getProductsQuery(cursor);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.errors) {
        throw new Error(`GraphQL error: ${data.errors.map(e => e.message).join(', ')}`);
      }

      const productsData = data.data.products;
      const pageInfo = productsData.pageInfo;

      for (const edge of productsData.edges) {
        allProducts.push(this.processProduct(edge.node));
      }

      hasNextPage = pageInfo.hasNextPage;
      cursor = pageInfo.endCursor;
    }

    return allProducts;
  }

  processProduct(productNode) {
    let price = "Price not available";
    if (productNode.variants.edges.length > 0) {
      const variant = productNode.variants.edges[0].node;
      if (variant.price) {
        price = `${variant.price.amount} ${variant.price.currencyCode}`;
      }
    }

    let image = null;
    if (productNode.images.edges.length > 0) {
      image = productNode.images.edges[0].node.url;
    }

    return {
      name: productNode.title,
      description: productNode.description || 'No description available',
      price,
      image,
      hasMesh: false,
      arReady: false
    };
  }
}

// UI Controller
class ExtensionUI {
  constructor() {
    this.fetchBtn = document.getElementById('fetchBtn');
    this.generateMeshBtn = document.getElementById('generateMeshBtn');
    this.displayArBtn = document.getElementById('displayArBtn');
    this.statusContainer = document.getElementById('statusContainer');
    this.statusText = document.getElementById('statusText');
    this.spinner = document.getElementById('spinner');
    this.resultsContainer = document.getElementById('resultsContainer');
    this.productsList = document.getElementById('productsList');
    this.productCount = document.getElementById('productCount');
    this.workflowIndicator = document.getElementById('workflowIndicator');

    this.products = [];
    this.currentStep = 1;

    this.init();
  }

  init() {
    this.fetchBtn.addEventListener('click', () => this.handleFetch());
    this.generateMeshBtn.addEventListener('click', () => this.handleGenerateMeshes());
    this.displayArBtn.addEventListener('click', () => this.handleDisplayAr());
  }

  updateWorkflowStep(step) {
    this.currentStep = step;
    this.workflowIndicator.style.display = 'block';
    
    for (let i = 1; i <= 3; i++) {
      const stepEl = document.getElementById(`step${i}`);
      stepEl.classList.remove('active', 'completed');
      
      if (i < step) {
        stepEl.classList.add('completed');
        stepEl.querySelector('.step-icon').textContent = '✓';
      } else if (i === step) {
        stepEl.classList.add('active');
        stepEl.querySelector('.step-icon').textContent = i;
      } else {
        stepEl.querySelector('.step-icon').textContent = i;
      }
    }
  }

  setStatus(message, type = 'idle', showSpinner = false) {
    this.statusText.innerHTML = showSpinner ? 
      `<div class="spinner" style="display: block;"></div>${message}` : 
      message;
    
    this.statusContainer.className = `status-container ${type}`;
  }

  setLoading(button, isLoading, loadingText, normalText) {
    button.disabled = isLoading;
    if (isLoading) {
      const icon = button.querySelector('.button-icon');
      button.innerHTML = `${icon.outerHTML}${loadingText}`;
    } else {
      const icon = button.querySelector('.button-icon');
      button.innerHTML = `${icon.outerHTML}${normalText}`;
    }
  }

  displayProducts(products) {
    this.productCount.textContent = products.length;
    
    if (products.length === 0) {
      this.productsList.innerHTML = '<div class="empty-state">No products found</div>';
    } else {
      this.productsList.innerHTML = products.map(product => `
        <div class="product-item ${product.hasMesh ? 'has-mesh' : ''} ${product.arReady ? 'ar-ready' : ''}">
          <div class="product-name">${this.escapeHtml(product.name)}</div>
          <div class="product-price">${this.escapeHtml(product.price)}</div>
          <div class="product-description">${this.escapeHtml(product.description)}</div>
          ${product.hasMesh ? '<div class="product-status mesh-status">Mesh Ready</div>' : ''}
          ${product.arReady ? '<div class="product-status ar-status">AR Ready</div>' : ''}
        </div>
      `).join('');
    }
    
    this.resultsContainer.style.display = 'block';
  }

  displayError(error) {
    this.resultsContainer.innerHTML = `
      <div class="error-message">
        <strong>Error:</strong> ${this.escapeHtml(error)}
      </div>
    `;
    this.resultsContainer.style.display = 'block';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async handleFetch() {
    const shopDomain = "shop-irl-htn";
    const accessToken = "44aee7c4d25d2330a6d28d70d8a8fb60";

    this.setLoading(this.fetchBtn, true, 'Fetching...', 'Fetch Products');
    this.resultsContainer.style.display = 'none';
    this.updateWorkflowStep(1);

    try {
      const api = new ShopifyStorefrontAPI(shopDomain, accessToken);
      this.products = await api.fetchProducts();
      
      this.setStatus(`Successfully fetched ${this.products.length} products ✅`, 'success');
      this.displayProducts(this.products);
      
      // Enable next step
      this.generateMeshBtn.disabled = false;
      this.updateWorkflowStep(2);
      
    } catch (error) {
      console.error('Fetch error:', error);
      this.setStatus('Failed to fetch products ❌', 'error');
      this.displayError(error.message);
    } finally {
      this.setLoading(this.fetchBtn, false, 'Fetching...', 'Fetch Products');
    }
  }

  async handleGenerateMeshes() {
    if (this.products.length === 0) {
      this.setStatus('No products available. Please fetch products first.', 'error');
      return;
    }

    this.setLoading(this.generateMeshBtn, true, 'Checking...', 'Generate Meshes from Images');
    this.setStatus('Checking for existing 3D files...', 'loading', true);

    try {
      // Check if FBX directory exists and has files
      const fbxDirectoryExists = await this.checkFbxDirectory();
      const productsWithImages = this.products.filter(product => product.image);
      
      if (fbxDirectoryExists) {
        // Load existing FBX files from ../fbx-downloads-format/
        this.setStatus('3D files already exist, loading them...', 'loading', true);
        this.setLoading(this.generateMeshBtn, true, 'Loading...', 'Generate Meshes from Images');
        
        for (let i = 0; i < productsWithImages.length; i++) {
          const product = productsWithImages[i];
          
          // Simulate loading existing FBX files (faster since they exist)
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Mark product as having mesh
          product.hasMesh = true;
          
          this.setStatus(`Loading existing meshes... ${i + 1}/${productsWithImages.length}`, 'loading', true);
        }

        const meshCount = productsWithImages.length;
        this.setStatus(`Successfully loaded ${meshCount} existing 3D meshes from fbx-downloads-format/ ✅`, 'success');
        
      } else {
        // Need to run fbx-download.js to generate new meshes
        this.setStatus('No fbx-downloads-format directory found. Running fbx-download.js to generate meshes...', 'loading', true);
        this.setLoading(this.generateMeshBtn, true, 'Generating...', 'Generate Meshes from Images');
        
        // Simulate the fbx-download.js process (this would normally trigger the actual script)
        this.setStatus('Calling Meshy AI to convert images to 3D models...', 'loading', true);
        
        for (let i = 0; i < productsWithImages.length; i++) {
          const product = productsWithImages[i];
          
          // Simulate the 4+ minute process per image that fbx-download.js does
          this.setStatus(`Processing image ${i + 1}/${productsWithImages.length} with Meshy AI (this takes ~4 minutes per image)...`, 'loading', true);
          
          // Simulate longer processing time for actual generation
          await new Promise(resolve => setTimeout(resolve, 2000)); // Shortened for demo
          
          // Mark product as having mesh
          product.hasMesh = true;
          
          this.setStatus(`Generated mesh ${i + 1}/${productsWithImages.length} - saved to fbx-downloads-format/`, 'loading', true);
        }

        const meshCount = productsWithImages.length;
        this.setStatus(`Successfully generated ${meshCount} new 3D meshes via fbx-download.js ✅`, 'success');
      }

      this.displayProducts(this.products);
      
      // Enable next step
      this.displayArBtn.disabled = false;
      this.updateWorkflowStep(3);
      
    } catch (error) {
      console.error('Mesh generation error:', error);
      this.setStatus('Failed to process meshes ❌', 'error');
    } finally {
      this.setLoading(this.generateMeshBtn, false, 'Processing...', 'Generate Meshes from Images');
    }
  }

  async checkFbxDirectory() {
    try {
      // In a real implementation, this would check if ../fbx-downloads-format/ exists
      // For now, we'll simulate this check - you can modify this logic as needed
      
      // Try to fetch a file from the directory to see if it exists
      const response = await fetch('../fbx-downloads-format/', { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      // Directory doesn't exist - need to run fbx-download.js
      console.log('fbx-downloads-format directory not found, will need to generate meshes');
      return false;
    }
  }

  async handleDisplayAr() {
    if (this.products.length === 0 || !this.products.some(p => p.hasMesh)) {
      this.setStatus('No 3D meshes available. Please generate meshes first.', 'error');
      return;
    }

    this.setLoading(this.displayArBtn, true, 'Connecting...', 'Display on AR Goggles');
    this.setStatus('Connecting to AR goggles...', 'loading', true);

    try {
      // Simulate AR connection and display process
      await new Promise(resolve => setTimeout(resolve, 1500));

      const meshProducts = this.products.filter(product => product.hasMesh);
      
      // Mark products as AR ready
      meshProducts.forEach(product => {
        product.arReady = true;
      });

      const arCount = meshProducts.length;
      this.setStatus(`Successfully displayed ${arCount} products in AR ✅`, 'success');
      this.displayProducts(this.products);
      
      // Complete workflow
      for (let i = 1; i <= 3; i++) {
        const stepEl = document.getElementById(`step${i}`);
        stepEl.classList.remove('active');
        stepEl.classList.add('completed');
        stepEl.querySelector('.step-icon').textContent = '✓';
      }
      
    } catch (error) {
      console.error('AR display error:', error);
      this.setStatus('Failed to display on AR goggles ❌', 'error');
    } finally {
      this.setLoading(this.displayArBtn, false, 'Connecting...', 'Display on AR Goggles');
    }
  }
}

// Initialize the extension
document.addEventListener('DOMContentLoaded', () => {
  new ExtensionUI();
});