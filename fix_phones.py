import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
import config.settings as _s
_s.INSTALLED_APPS = [a for a in _s.INSTALLED_APPS if a != 'daphne']
import django; django.setup()
from accounts.models import User

b = User.objects.filter(email__iexact='pawloseniguse@gmail.com').first()
if b:
    b.phone_number = '0911000001'
    b.save(update_fields=['phone_number'])
    print(f'Buyer phone → 0911000001 (email: {b.email})')

s = User.objects.filter(email__iexact='bonsiniguse@gmail.com').first()
if s:
    s.phone_number = '0911000002'
    s.save(update_fields=['phone_number'])
    print(f'Seller phone → 0911000002 (email: {s.email})')

print('Done.')
