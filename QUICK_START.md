# 🚀 Quick Start Guide

Get your e-commerce platform running in 5 minutes!

## Prerequisites

- Python 3.10+ installed
- Node.js 18+ installed
- Git installed

## Step 1: Backend Setup (2 minutes)

```bash
# Navigate to project root
cd ecommerce

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate

# Install dependencies
pip install django djangorestframework django-cors-headers djangorestframework-simplejwt requests

# Run migrations
python manage.py migrate

# Create admin user (follow prompts)
python manage.py createsuperuser

# Populate with real products
python manage.py shell < populate_products.py

# Start backend server
python manage.py runserver
```

✅ Backend running at: http://localhost:8000

## Step 2: Frontend Setup (2 minutes)

Open a NEW terminal window:

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

✅ Frontend running at: http://localhost:3000

## Step 3: Test the Platform (1 minute)

1. **Visit**: http://localhost:3000
2. **Register**: Click "Sign in" → "Register" → Create account
3. **Browse**: Explore products on homepage
4. **Shop**: 
   - Click any product
   - Add to cart
   - View cart (badge in header)
5. **Checkout**:
   - Click "Checkout"
   - Fill shipping address
   - Click "Place Order & Pay"
   - Payment will be simulated (success)
6. **View Order**: Check dashboard for order history

## 🎉 You're Done!

Your complete e-commerce platform is running with:
- ✅ Beautiful UI with sidebar navigation
- ✅ Real product data (16+ products)
- ✅ Shopping cart functionality
- ✅ Complete checkout flow
- ✅ Chapa payment integration (simulation mode)
- ✅ Order management
- ✅ Dark mode support

## 🔧 Optional: Enable Real Chapa Payments

1. Sign up at: https://dashboard.chapa.co/
2. Get your test API key
3. Create `.env` file in project root:
   ```
   CHAPA_SECRET_KEY=CHASECK_TEST-your-key-here
   ```
4. Restart backend server

## 📱 Test Accounts

After running `populate_products.py`, you have:
- **Seller**: `shopx_seller` / `seller123`
- **Your Account**: Whatever you created with `createsuperuser`

## 🛠️ Troubleshooting

### Backend won't start
```bash
# Make sure you're in the right directory
cd ecommerce

# Check if virtual environment is activated
# You should see (.venv) in your terminal prompt

# Try running migrations again
python manage.py migrate
```

### Frontend won't start
```bash
# Make sure you're in frontend directory
cd frontend

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Port already in use
```bash
# Backend (change port)
python manage.py runserver 8001

# Frontend (change port)
npm run dev -- -p 3001
```

### Products not showing
```bash
# Run the populate script again
python manage.py shell < populate_products.py
```

## 📚 Next Steps

- Read [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed configuration
- Read [ECOMMERCE_FLOW.md](ECOMMERCE_FLOW.md) for complete user journey
- Read [README.md](README.md) for full documentation

## 🎯 Key URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Admin Panel**: http://localhost:8000/admin
- **API Docs**: http://localhost:8000/api/

## 💡 Tips

1. **Use the sidebar** for quick navigation
2. **Search bar** in header for finding products
3. **Cart badge** shows item count
4. **Dark mode toggle** in header
5. **User menu** (click your name) for logout

## 🎨 Customization

Want to customize? Check these files:
- **Colors**: `frontend/tailwind.config.ts`
- **Products**: `populate_products.py`
- **Logo**: `frontend/src/components/Navbar.tsx`
- **Categories**: `frontend/src/components/Sidebar.tsx`

Happy selling! 🛍️
