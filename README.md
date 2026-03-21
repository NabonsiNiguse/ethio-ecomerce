# 🛍️ ShopX - Modern E-Commerce Platform

A complete, production-ready e-commerce marketplace with **Chapa payment integration** for the Ethiopian market. Built with Django REST Framework and Next.js.

![ShopX Platform](https://images.unsplash.com/photo-1557821552-17105176677c?w=1200&h=400&fit=crop)

## ✨ Features

### 🎨 Beautiful UI/UX
- **Sidebar Navigation** with category quick links
- **Enhanced Header** with search, cart badge, user menu
- **Dark Mode** support with theme toggle
- **Responsive Design** - mobile-first approach
- **Smooth Animations** using Framer Motion
- **Modern Components** with Tailwind CSS

### 🛒 Complete E-Commerce Flow
1. **Product Discovery**
   - Hero carousel with promotional slides
   - Featured products section
   - Category-based browsing
   - Search and filter functionality

2. **Product Details**
   - Image gallery with multiple views
   - Stock availability indicator
   - Quantity selector
   - Detailed descriptions

3. **Shopping Cart**
   - Real-time cart updates
   - Quantity management
   - Price calculations
   - Remove items

4. **Checkout Process**
   - Shipping address form
   - Order summary
   - Payment method selection
   - Progress indicator

5. **Payment Integration**
   - **Chapa Payment Gateway** (Ethiopian market)
   - Secure payment processing
   - Payment verification
   - Order status updates

6. **Order Management**
   - Order history
   - Status tracking
   - Shipping details
   - Order items breakdown

### 💳 Chapa Payment Integration

Integrated with [Chapa](https://chapa.co/) - Ethiopia's leading payment gateway supporting:
- Mobile Money (Telebirr, M-Pesa, etc.)
- Credit/Debit Cards
- Bank Transfers

**Features:**
- Secure payment initialization
- Real-time payment verification
- Webhook support for notifications
- Test mode for development
- Production-ready implementation

### 🔐 Security & Performance
- JWT authentication
- User-specific carts and orders
- Stock locking to prevent overselling
- Database transactions for data integrity
- CORS protection
- Rate limiting on API endpoints

### 📦 Real Product Data
Pre-populated with Amazon-style products:
- Electronics (iPhone, Samsung, MacBook, etc.)
- Fashion (Levi's, Nike, Ray-Ban)
- Home & Kitchen (Instant Pot, KitchenAid)
- Books (Bestsellers)
- Sports & Outdoors
- Beauty & Personal Care

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL (optional, uses SQLite by default)

### Backend Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd ecommerce

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install django djangorestframework django-cors-headers djangorestframework-simplejwt requests

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Populate with real products
python manage.py shell < populate_products.py

# Run development server
python manage.py runserver
```

Backend runs at: http://localhost:8000

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Run development server
npm run dev
```

Frontend runs at: http://localhost:3000

## 🔧 Configuration

### Chapa Payment Setup

1. **Sign up** at [Chapa Dashboard](https://dashboard.chapa.co/)
2. **Get your API key** from Settings → API Keys
3. **Add to environment**:

```bash
# .env file (backend root)
CHAPA_SECRET_KEY=CHASECK_TEST-your-test-key-here
```

4. **Test Mode**: Without a key, the system runs in simulation mode
5. **Production**: Use production key format: `CHASECK-xxxxxxxxxx`

### Environment Variables

**Backend (.env)**:
```env
SECRET_KEY=your-django-secret-key
DEBUG=True
CHAPA_SECRET_KEY=your-chapa-key
DATABASE_URL=postgresql://user:pass@localhost/dbname  # Optional
```

**Frontend (.env.local)**:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📚 API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login (returns JWT tokens)
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout

### Products
- `GET /api/products/` - List products (supports filters)
  - `?search=keyword` - Search by name
  - `?category=id` - Filter by category
  - `?price_min=100&price_max=500` - Price range
- `GET /api/products/{id}/` - Product details
- `POST /api/products/` - Create product (seller only)

### Cart
- `GET /api/cart/` - Get user's cart
- `POST /api/cart/add` - Add item to cart
  ```json
  {
    "product_id": 1,
    "quantity": 2
  }
  ```
- `DELETE /api/cart/remove` - Remove item
  ```json
  {
    "product_id": 1
  }
  ```

### Orders
- `POST /api/orders/checkout` - Create order with shipping
  ```json
  {
    "shipping_address": {
      "full_name": "John Doe",
      "phone": "+251911234567",
      "address_line1": "Bole Road",
      "address_line2": "Near Edna Mall",
      "city": "Addis Ababa",
      "state": "Addis Ababa",
      "postal_code": "1000",
      "country": "Ethiopia"
    }
  }
  ```
- `GET /api/orders/` - Order history

### Payments
- `POST /api/payments/initiate` - Initialize Chapa payment
  ```json
  {
    "order_id": 1
  }
  ```
- `POST /api/payments/verify` - Verify payment
  ```json
  {
    "transaction_id": "tx_abc123"
  }
  ```

## 🎯 User Journey

### 1. Browse Products
- Visit homepage with featured products
- Use sidebar to navigate categories
- Search for specific products
- Apply filters (category, price)

### 2. View Product Details
- Click on product card
- View image gallery
- Read description
- Check stock availability
- Select quantity
- Add to cart

### 3. Manage Cart
- View cart from header badge
- Update quantities
- Remove unwanted items
- See order summary
- Proceed to checkout

### 4. Checkout
- **Step 1**: Enter shipping address
  - Full name and phone
  - Complete address details
  - City, state, postal code
- **Step 2**: Review and pay
  - Verify shipping info
  - See order summary
  - Click "Place Order & Pay"

### 5. Payment
- Redirected to Chapa checkout
- Choose payment method:
  - Mobile Money
  - Credit/Debit Card
  - Bank Transfer
- Complete payment
- Automatic verification

### 6. Order Confirmation
- View order in dashboard
- Track order status
- See shipping details
- View order items

## 🏗️ Project Structure

```
ecommerce/
├── accounts/          # User authentication & profiles
├── catalog/           # Products, categories, images
├── purchases/         # Cart, orders, checkout
├── payments/          # Payment processing (Chapa)
├── logistics/         # Shipping & delivery
├── config/            # Django settings
├── frontend/          # Next.js application
│   ├── src/
│   │   ├── app/       # Pages (Next.js 13+ App Router)
│   │   ├── components/# Reusable components
│   │   ├── context/   # React context (Cart, Toast)
│   │   ├── lib/       # Utilities (axios, auth)
│   │   └── types/     # TypeScript types
│   └── public/        # Static assets
├── populate_products.py  # Product data seeder
├── SETUP_GUIDE.md     # Detailed setup instructions
└── README.md          # This file
```

## 🎨 Tech Stack

### Backend
- **Django 5.0** - Web framework
- **Django REST Framework** - API development
- **Simple JWT** - Authentication
- **PostgreSQL/SQLite** - Database
- **Requests** - HTTP client for Chapa API

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Axios** - HTTP client
- **React Hot Toast** - Notifications

## 📱 Screenshots

### Homepage
- Hero carousel with promotional slides
- Featured products grid
- Value propositions
- Category quick links

### Product Page
- Image gallery
- Product details
- Stock indicator
- Add to cart

### Cart
- Item list with quantities
- Order summary
- Checkout button

### Checkout
- Two-step process
- Shipping address form
- Payment method selection
- Order summary sidebar

### Dashboard
- Order history
- Order status tracking
- Shipping details

## 🔒 Security Best Practices

- JWT tokens with refresh mechanism
- Password hashing with Django's built-in system
- CORS configuration for frontend domain
- Rate limiting on authentication endpoints
- SQL injection protection (Django ORM)
- XSS protection (React escaping)
- CSRF protection on state-changing operations

## 🚢 Deployment

### Backend (Django)
```bash
# Install production dependencies
pip install gunicorn psycopg2-binary

# Collect static files
python manage.py collectstatic

# Run with Gunicorn
gunicorn config.wsgi:application --bind 0.0.0.0:8000
```

### Frontend (Next.js)
```bash
# Build for production
npm run build

# Start production server
npm start
```

### Environment Setup
- Set `DEBUG=False` in production
- Use PostgreSQL instead of SQLite
- Configure proper CORS origins
- Set up HTTPS
- Use production Chapa API key

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Chapa](https://chapa.co/) for payment gateway
- [Unsplash](https://unsplash.com/) for product images
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Framer Motion](https://www.framer.com/motion/) for animations

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Email: support@shopx.com
- Documentation: See SETUP_GUIDE.md

## 🎉 Ready to Launch!

Your complete e-commerce platform is ready with:
- ✅ Beautiful UI with sidebar and enhanced header
- ✅ Real product data (Amazon-style)
- ✅ Complete checkout flow with shipping
- ✅ Chapa payment integration
- ✅ Order tracking and management
- ✅ Mobile responsive design
- ✅ Dark mode support
- ✅ Production-ready code

Happy selling! 🛍️
"# ethio-ecomerce" 
