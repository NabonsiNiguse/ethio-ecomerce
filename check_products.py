from catalog.models import Product
from catalog.serializers import ProductSerializer

products = Product.objects.select_related('seller', 'category').prefetch_related('images').order_by('-created_at')
print("Total products:", products.count())
for p in products[:20]:
    d = ProductSerializer(p).data
    name = d['name']
    cat = d['category']['name'] if d['category'] else 'NO CAT'
    imgs = len(d['images'])
    price = d['price']
    print(f"  {name} | {cat} | {imgs} image(s) | ${price}")
