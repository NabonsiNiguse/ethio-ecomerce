"""
Run: python manage.py shell < populate_products.py
Populates 10+ products per category (60+ total) with real Unsplash images.
"""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth import get_user_model
from catalog.models import Category, Product, ProductImage

User = get_user_model()

# ── Seller ──────────────────────────────────────────────────────────────────
seller, _ = User.objects.get_or_create(
    username="shopx_seller",
    defaults={
        "email": "seller@ethioecommerce.com",
        "phone_number": "0911000001",
        "role": "seller",
        "is_verified": True,
    },
)
if not seller.has_usable_password():
    seller.set_password("seller123")
    seller.save()

# ── Categories ───────────────────────────────────────────────────────────────
CATS = ["Electronics", "Fashion", "Home and Kitchen", "Books", "Sports", "Beauty"]
cat_map = {}
for name in CATS:
    c, _ = Category.objects.get_or_create(name=name)
    cat_map[name] = c

# ── Products data ─────────────────────────────────────────────────────────────
PRODUCTS = [
    # ── Electronics (12) ──────────────────────────────────────────────────────
    ("Samsung Galaxy S24 Ultra", "Electronics", 1299.99, 25,
     "6.8-inch Dynamic AMOLED, 200MP camera, S Pen included, 5000mAh battery.",
     "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600"),
    ("Apple iPhone 15 Pro", "Electronics", 1199.99, 30,
     "A17 Pro chip, titanium design, 48MP main camera, USB-C.",
     "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600"),
    ("Sony WH-1000XM5 Headphones", "Electronics", 349.99, 50,
     "Industry-leading noise cancellation, 30-hour battery, multipoint connection.",
     "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600"),
    ("MacBook Air M3", "Electronics", 1299.00, 20,
     "Apple M3 chip, 13.6-inch Liquid Retina, 18-hour battery, fanless design.",
     "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600"),
    ("Dell XPS 15 Laptop", "Electronics", 1599.99, 15,
     "Intel Core i9, 32GB RAM, 1TB SSD, OLED 3.5K display.",
     "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600"),
    ("iPad Pro 12.9-inch", "Electronics", 1099.00, 18,
     "M2 chip, Liquid Retina XDR display, Apple Pencil 2 support.",
     "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600"),
    ("Canon EOS R6 Mark II", "Electronics", 2499.00, 10,
     "24.2MP full-frame sensor, 40fps burst, 4K 60p video, IBIS.",
     "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600"),
    ("Samsung 65\" QLED 4K TV", "Electronics", 1199.00, 12,
     "Quantum HDR, 120Hz, Alexa built-in, Gaming Hub.",
     "https://images.unsplash.com/photo-1593359677879-a4bb92f829e1?w=600"),
    ("Apple Watch Series 9", "Electronics", 399.00, 40,
     "S9 chip, always-on Retina display, blood oxygen, ECG, crash detection.",
     "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600"),
    ("Bose SoundLink Max Speaker", "Electronics", 299.00, 35,
     "Portable Bluetooth speaker, 20-hour battery, IP67 waterproof.",
     "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600"),
    ("DJI Mini 4 Pro Drone", "Electronics", 759.00, 8,
     "4K/60fps, omnidirectional obstacle sensing, 34-min flight time.",
     "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=600"),
    ("Logitech MX Master 3S Mouse", "Electronics", 99.99, 60,
     "8K DPI, MagSpeed scroll, USB-C, works on any surface.",
     "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600"),

    # ── Fashion (12) ──────────────────────────────────────────────────────────
    ("Levi's 501 Original Jeans", "Fashion", 69.99, 80,
     "Classic straight fit, 100% cotton denim, iconic button fly.",
     "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600"),
    ("Nike Air Force 1 Sneakers", "Fashion", 110.00, 100,
     "Timeless low-top silhouette, leather upper, Air cushioning.",
     "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600"),
    ("Adidas Ultraboost 23", "Fashion", 189.99, 60,
     "Boost midsole, Primeknit+ upper, Continental rubber outsole.",
     "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600"),
    ("Zara Floral Midi Dress", "Fashion", 49.99, 45,
     "Flowy midi length, V-neck, adjustable straps, floral print.",
     "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600"),
    ("H&M Slim Fit Chinos", "Fashion", 34.99, 70,
     "Stretch cotton blend, slim fit, available in multiple colors.",
     "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600"),
    ("Ray-Ban Aviator Sunglasses", "Fashion", 154.00, 55,
     "Classic metal frame, polarized lenses, UV400 protection.",
     "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600"),
    ("Gucci GG Canvas Tote Bag", "Fashion", 890.00, 15,
     "Signature GG Supreme canvas, leather trim, zip closure.",
     "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600"),
    ("Uniqlo Ultra Light Down Jacket", "Fashion", 79.90, 50,
     "Packable puffer, 90% down fill, water-repellent finish.",
     "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600"),
    ("Rolex Submariner Watch", "Fashion", 9500.00, 5,
     "Oyster case, Cerachrom bezel, 300m water resistance.",
     "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600"),
    ("Converse Chuck Taylor All Star", "Fashion", 65.00, 90,
     "Canvas upper, rubber sole, iconic ankle patch.",
     "https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=600"),
    ("Tommy Hilfiger Polo Shirt", "Fashion", 59.99, 75,
     "Classic fit, 100% cotton piqué, embroidered logo.",
     "https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=600"),
    ("Leather Crossbody Bag", "Fashion", 129.00, 30,
     "Genuine leather, adjustable strap, multiple compartments.",
     "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600"),

    # ── Home and Kitchen (12) ─────────────────────────────────────────────────
    ("Instant Pot Duo 7-in-1", "Home and Kitchen", 89.99, 40,
     "Pressure cooker, slow cooker, rice cooker, steamer, sauté, yogurt maker.",
     "https://images.unsplash.com/photo-1585515320310-259814833e62?w=600"),
    ("Dyson V15 Detect Vacuum", "Home and Kitchen", 749.99, 20,
     "Laser dust detection, HEPA filtration, 60-min runtime.",
     "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600"),
    ("KitchenAid Stand Mixer", "Home and Kitchen", 449.99, 15,
     "5-quart bowl, 10 speeds, tilt-head design, 59 attachments compatible.",
     "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600"),
    ("Nespresso Vertuo Next Coffee", "Home and Kitchen", 179.00, 35,
     "Centrifusion technology, 5 cup sizes, 30-second heat-up.",
     "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600"),
    ("IKEA KALLAX Shelf Unit", "Home and Kitchen", 129.00, 25,
     "4x4 cube storage, white, 147x147cm, versatile configuration.",
     "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600"),
    ("Philips Hue Smart Bulb Starter", "Home and Kitchen", 79.99, 50,
     "16 million colors, voice control, app-controlled, 4-bulb kit.",
     "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=600"),
    ("Le Creuset Dutch Oven 5.5qt", "Home and Kitchen", 399.95, 18,
     "Enameled cast iron, oven-safe to 500°F, lifetime warranty.",
     "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600"),
    ("Roomba i7+ Robot Vacuum", "Home and Kitchen", 599.99, 12,
     "Auto-empty base, smart mapping, works with Alexa & Google.",
     "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600"),
    ("Bamboo Cutting Board Set", "Home and Kitchen", 34.99, 80,
     "3-piece set, juice groove, non-slip feet, eco-friendly.",
     "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600"),
    ("Weighted Blanket 15lbs", "Home and Kitchen", 59.99, 45,
     "Glass bead fill, breathable cotton, machine washable.",
     "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600"),
    ("Air Purifier HEPA H13", "Home and Kitchen", 149.99, 30,
     "Covers 1500 sq ft, removes 99.97% particles, whisper-quiet.",
     "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600"),
    ("Ceramic Non-Stick Pan Set", "Home and Kitchen", 89.99, 40,
     "3-piece set, PFOA-free ceramic coating, induction compatible.",
     "https://images.unsplash.com/photo-1584990347449-a2d4c2c044c9?w=600"),

    # ── Books (12) ────────────────────────────────────────────────────────────
    ("Atomic Habits – James Clear", "Books", 16.99, 200,
     "Proven framework for building good habits and breaking bad ones.",
     "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600"),
    ("The Alchemist – Paulo Coelho", "Books", 14.99, 150,
     "A magical story about following your dreams and listening to your heart.",
     "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600"),
    ("Sapiens – Yuval Noah Harari", "Books", 18.99, 120,
     "A brief history of humankind from the Stone Age to the 21st century.",
     "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600"),
    ("Deep Work – Cal Newport", "Books", 15.99, 90,
     "Rules for focused success in a distracted world.",
     "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600"),
    ("The Psychology of Money", "Books", 17.99, 110,
     "Timeless lessons on wealth, greed, and happiness by Morgan Housel.",
     "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600"),
    ("Clean Code – Robert Martin", "Books", 39.99, 60,
     "A handbook of agile software craftsmanship for developers.",
     "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=600"),
    ("Thinking, Fast and Slow", "Books", 16.99, 85,
     "Daniel Kahneman explores the two systems that drive the way we think.",
     "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600"),
    ("The Lean Startup – Eric Ries", "Books", 17.99, 75,
     "How today's entrepreneurs use continuous innovation to create businesses.",
     "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600"),
    ("Zero to One – Peter Thiel", "Books", 15.99, 95,
     "Notes on startups, or how to build the future.",
     "https://images.unsplash.com/photo-1589998059171-988d887df646?w=600"),
    ("The 48 Laws of Power", "Books", 19.99, 70,
     "Robert Greene's classic guide to power, strategy, and seduction.",
     "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=600"),
    ("Dune – Frank Herbert", "Books", 18.99, 130,
     "Epic science fiction saga set on the desert planet Arrakis.",
     "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=600"),
    ("Rich Dad Poor Dad", "Books", 14.99, 160,
     "What the rich teach their kids about money that the poor do not.",
     "https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=600"),

    # ── Sports (12) ───────────────────────────────────────────────────────────
    ("Peloton Bike+", "Sports", 2495.00, 8,
     "22-inch rotating HD touchscreen, auto-resistance, Apple GymKit.",
     "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600"),
    ("Bowflex SelectTech 552 Dumbbells", "Sports", 429.00, 15,
     "Adjusts from 5 to 52.5 lbs, replaces 15 sets of weights.",
     "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600"),
    ("Yoga Mat Premium 6mm", "Sports", 29.99, 100,
     "Non-slip surface, eco-friendly TPE, carrying strap included.",
     "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600"),
    ("Wilson Pro Staff Tennis Racket", "Sports", 229.00, 25,
     "16x19 string pattern, 97 sq in head, 11.4oz strung weight.",
     "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=600"),
    ("Adidas Predator Football Boots", "Sports", 149.99, 40,
     "Demonskin spines, Primeknit sock, firm ground outsole.",
     "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600"),
    ("Garmin Forerunner 265 GPS Watch", "Sports", 449.99, 20,
     "AMOLED display, training readiness, HRV status, 13-day battery.",
     "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600"),
    ("TRX Suspension Trainer", "Sports", 199.95, 30,
     "Full-body workout, adjustable, door anchor included, 350lb capacity.",
     "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600"),
    ("Speedo Fastskin Swimsuit", "Sports", 89.99, 35,
     "Compression fit, chlorine-resistant, FINA approved.",
     "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600"),
    ("Callaway Strata Golf Set", "Sports", 299.99, 12,
     "12-piece complete set, driver, irons, putter, stand bag.",
     "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=600"),
    ("Resistance Bands Set (5 levels)", "Sports", 24.99, 120,
     "Latex-free, 10–50 lbs resistance, door anchor, handles included.",
     "https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=600"),
    ("Hydro Flask 32oz Water Bottle", "Sports", 44.95, 80,
     "TempShield insulation, 18/8 stainless steel, BPA-free.",
     "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600"),
    ("Jump Rope Speed Cable", "Sports", 19.99, 90,
     "Ball-bearing handles, adjustable length, 360° rotation.",
     "https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=600"),

    # ── Beauty (12) ───────────────────────────────────────────────────────────
    ("Dyson Airwrap Multi-Styler", "Beauty", 599.99, 20,
     "Curl, wave, smooth and dry with no extreme heat.",
     "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=600"),
    ("La Mer Moisturizing Cream 60ml", "Beauty", 345.00, 25,
     "Miracle Broth, sea kelp, reduces redness and irritation.",
     "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600"),
    ("Charlotte Tilbury Pillow Talk Lipstick", "Beauty", 34.00, 60,
     "Iconic nude-pink shade, matte velvet formula, long-lasting.",
     "https://images.unsplash.com/photo-1586495777744-4e6232bf2f9a?w=600"),
    ("The Ordinary Niacinamide 10%", "Beauty", 6.90, 200,
     "Reduces blemishes, balances sebum, minimizes pores.",
     "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600"),
    ("Fenty Beauty Pro Filt'r Foundation", "Beauty", 38.00, 80,
     "40 shades, soft-matte finish, 24-hour wear, oil-free.",
     "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600"),
    ("Olaplex No.3 Hair Perfector", "Beauty", 28.00, 90,
     "Reduces breakage, strengthens hair bonds, weekly treatment.",
     "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=600"),
    ("Tatcha The Water Cream", "Beauty", 68.00, 40,
     "Oil-free, anti-aging moisturizer with Japanese botanicals.",
     "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600"),
    ("Urban Decay Naked Palette", "Beauty", 54.00, 55,
     "12 neutral eyeshadows, matte to shimmer, double-ended brush.",
     "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=600"),
    ("Cetaphil Gentle Skin Cleanser", "Beauty", 12.99, 150,
     "Soap-free, fragrance-free, dermatologist recommended.",
     "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600"),
    ("Neutrogena Hydro Boost Gel", "Beauty", 19.99, 120,
     "Hyaluronic acid, oil-free, non-comedogenic, fragrance-free.",
     "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600"),
    ("MAC Ruby Woo Lipstick", "Beauty", 21.00, 70,
     "Iconic retro matte, vivid blue-red, long-wearing formula.",
     "https://images.unsplash.com/photo-1586495777744-4e6232bf2f9a?w=600"),
    ("Bioderma Micellar Water 500ml", "Beauty", 14.99, 100,
     "Gentle makeup remover, no-rinse formula, sensitive skin safe.",
     "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600"),
]

# ── Insert products ───────────────────────────────────────────────────────────
created = 0
skipped = 0
for name, cat_name, price, stock, desc, img_url in PRODUCTS:
    if Product.objects.filter(name=name).exists():
        skipped += 1
        continue
    p = Product.objects.create(
        seller=seller,
        category=cat_map[cat_name],
        name=name,
        description=desc,
        price=price,
        stock=stock,
    )
    ProductImage.objects.create(product=p, image_url=img_url, sort_order=0)
    created += 1

print(f"\n✅ Done! Created {created} products, skipped {skipped} existing.")
print(f"📦 Total products in DB: {Product.objects.count()}")
for cat in CATS:
    count = Product.objects.filter(category__name=cat).count()
    print(f"   {cat}: {count} products")
