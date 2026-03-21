# ShopX E-Commerce Setup Guide

Complete setup guide for the production-ready e-commerce platform with Chapa payment integration.

## 🚀 Quick Start

### 1. Backend Setup (Django)

```bash
# Install dependencies
pip install django djangorestframework django-cors-headers requests

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Populate with real product data
python manage.py shell < populate_products.py

# Run server
python manage.py runserver
```

### 2. Frontend Setup (Next.js)

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Visit: http://localhost:3000

## 📦 Complete User Journey

### Step 1: Discovery & Selection
- **Home Page** (`/`): Hero carousel, featured products, value props
- **Products Page** (`/products`): Browse all products with filters
  - Search by name
  - Filter by category
  - Filter by price range
- **Sidebar Navigation**: Quick access to categories

### Step 2: Product Details
- **Product Page** (`/products/[id]`): 
  - Image gallery with multiple views
  - Product description
  - Stock availability
  - Quantity selector
  - Add to cart button

### Step 3: Shopping Cart
- **Cart Page** (`/cart`):
  - View all cart items
  - Update quantities
  - Remove items
  - See order summary
  - Proceed to checkout

### Step 4: Checkout Process
- **Checkout Page** (`/checkout`):
  - **Step 1: Shipping Address**
    - Full name, phone
    - Address details
    - City, state, postal code
    - Country (default: Ethiopia)
  - **Step 2: Payment**
    - Review shipping address
    - Chapa payment integration
    - Place order button

### Step 5: Payment Processing
- **Chapa Integration**:
  - Initialize payment
  - Redirect to Chapa checkout
  - Verify payment status
  - Update order status

### Step 6: Order Confirmation
- **Dashboard** (`/dashboard`):
  - View order history
  - Track order status
  - See order details with shipping info

## 💳 Chapa Payment Integration

### Setup Chapa (Production)

1. **Sign up**: https://dashboard.chapa.co/
2. **Get API Key**: Dashboard → Settings → API Keys
3. **Add to Django settings**:

```python
# config/settings.py
CHAPA_SECRET_KEY = "CHASECK_TEST-xxxxxxxxxxxxxxxxxx"  # Test key
# CHAPA_SECRET_KEY = "CHASECK-xxxxxxxxxxxxxxxxxx"  # Production key
```

4. **Configure webhook URL** (for payment notifications):
```
https://yourdomain.com/api/payments/webhook
```

### Test Mode
The system works in simulation mode without Chapa credentials. To enable real Chapa:
- Add `CHAPA_SECRET_KEY` to settings
- The system automatically switches to production mode

### Payment Flow
1. User clicks "Place Order & Pay"
2. Backend creates order with shipping address
3. Backend calls Chapa API to initialize payment
4. User redirected to Chapa checkout page
5. User completes payment (mobile money, card, etc.)
6. Chapa sends webhook notification
7. Backend verifies payment
8. Order status updated to "paid"

## 🎨 UI Features

### Beautiful Design
- **Sidebar Navigation**: Fixed left sidebar with categories
- **Enhanced Header**: 
  - Search bar
  - Cart with item count badge
  - User menu with dropdown
  - Theme toggle (dark/light mode)
- **Responsive Layout**: Mobile-first design
- **Smooth Animations**: Framer Motion transitions
- **Modern Components**: Tailwind CSS styling

### Real Product Data
Products include:
- **Electronics**: iPhone 15 Pro, Samsung Galaxy S24, MacBook Pro, Sony Headphones
- **Fashion**: Levi's Jeans, Nike Sneakers, Ray-Ban Sunglasses
- **Home & Kitchen**: Instant Pot, Ninja Blender, KitchenAid Mixer
- **Books**: Atomic Habits, Psychology of Money
- **Sports**: Yoga Mat, Adjustable Dumbbells
- **Beauty**: Dyson Hair Dryer, CeraVe Moisturizer

All products have:
- Real images from Unsplash
- Detailed descriptions
- Competitive pricing
- Stock management

## 🔐 Security Features

- **Authentication**: JWT tokens
- **Authorization**: User-specific carts and orders
- **Stock Locking**: Prevents overselling
- **Transaction Safety**: Database transactions for checkout
- **Payment Verification**: Server-side verification
- **CORS Protection**: Configured for frontend domain

## 📱 Mobile Responsive

- Sidebar collapses on mobile
- Touch-friendly buttons
- Optimized images
- Responsive grid layouts
- Mobile-first navigation

## 🛠️ API Endpoints

### Products
- `GET /api/products/` - List products (with filters)
- `GET /api/products/{id}/` - Product details
- `POST /api/products/` - Create product (seller only)

### Cart
- `GET /api/cart/` - Get cart
- `POST /api/cart/add` - Add to cart
- `DELETE /api/cart/remove` - Remove from cart

### Orders
- `POST /api/orders/checkout` - Create order with shipping
- `GET /api/orders/` - Order history

### Payments
- `POST /api/payments/initiate` - Initialize Chapa payment
- `POST /api/payments/verify` - Verify payment status
- `POST /api/payments/webhook` - Chapa webhook (future)

## 🎯 Next Steps

1. **Run migrations**: `python manage.py migrate`
2. **Populate products**: `python manage.py shell < populate_products.py`
3. **Start backend**: `python manage.py runserver`
4. **Start frontend**: `cd frontend && npm run dev`
5. **Create account**: Register at http://localhost:3000/auth/register
6. **Shop**: Browse products, add to cart, checkout!

## 📊 Order Status Flow

```
pending → paid → shipped → delivered
         ↓
      cancelled
```

- **pending**: Order created, awaiting payment
- **paid**: Payment verified by Chapa
- **shipped**: Order dispatched (manual update)
- **delivered**: Order received (manual update)
- **cancelled**: Order cancelled

## 🌍 Ethiopian Market Features

- **Currency**: Prices in USD (convert to ETB as needed)
- **Payment**: Chapa (supports Ethiopian mobile money, cards)
- **Shipping**: Ethiopian addresses supported
- **Language**: English (add Amharic translation as needed)

## 🎉 You're Ready!

Your complete e-commerce platform is ready with:
✅ Beautiful UI with sidebar and enhanced header
✅ Real product data (Amazon-style)
✅ Complete checkout flow
✅ Chapa payment integration
✅ Shipping address management
✅ Order tracking
✅ Mobile responsive design
✅ Dark mode support

Happy selling! 🛍️
