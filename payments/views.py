from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from purchases.models import Order
from .chapa_service import chapa_service
from .models import Payment
from .serializers import InitiatePaymentSerializer, PaymentResponseSerializer, VerifyPaymentSerializer


class InitiatePaymentAPIView(APIView):
    """
    POST /api/payments/initiate
    Creates a Payment record and returns a Chapa checkout_url to redirect the user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        payload = InitiatePaymentSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        order_id = payload.validated_data["order_id"]

        order = get_object_or_404(Order, pk=order_id, user=request.user)

        with transaction.atomic():
            # Idempotent — return existing pending/paid payment
            existing = Payment.objects.select_for_update().filter(order=order).first()
            if existing and existing.status in (Payment.Status.pending, Payment.Status.paid):
                checkout_url = None
                if existing.status == Payment.Status.pending:
                    checkout_url = f"https://checkout.chapa.co/checkout/payment/{existing.transaction_id}"
                return Response(
                    {
                        "message": "Payment already initiated",
                        "transaction_id": existing.transaction_id,
                        "checkout_url": checkout_url,
                        "payment": PaymentResponseSerializer(existing).data,
                    },
                    status=status.HTTP_200_OK,
                )

            if order.status != Order.Status.pending:
                return Response({"detail": "Order is not payable."}, status=status.HTTP_400_BAD_REQUEST)

            tx_ref = chapa_service.generate_tx_ref()

            # Build user name parts
            user = request.user
            name_parts = (user.get_full_name() or user.username).split(" ", 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else first_name

            frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
            callback_url = f"http://localhost:8000/api/payments/webhook"
            return_url = f"{frontend_url}/checkout/success?tx_ref={tx_ref}"

            result = chapa_service.initialize_payment(
                amount=order.total_price,
                email=user.email or f"{user.username}@ethioecommerce.com",
                first_name=first_name,
                last_name=last_name,
                tx_ref=tx_ref,
                callback_url=f"http://localhost:8000/api/payments/webhook",
                return_url=return_url,
                phone_number=getattr(user, "phone_number", None),
                customization={
                    "title": "Ethio eCommerce",
                    "description": f"Order #{order.id} payment",
                    "logo": "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=100",
                },
            )

            payment = Payment.objects.create(
                user=request.user,
                order=order,
                amount=order.total_price.quantize(Decimal("0.01")),
                status=Payment.Status.pending,
                transaction_id=tx_ref,
            )

        checkout_url = (
            result.get("data", {}).get("checkout_url")
            or f"https://checkout.chapa.co/checkout/payment/{tx_ref}"
        )

        return Response(
            {
                "message": "Payment initiated",
                "transaction_id": tx_ref,
                "checkout_url": checkout_url,
                "payment": PaymentResponseSerializer(payment).data,
            },
            status=status.HTTP_201_CREATED,
        )


class VerifyPaymentAPIView(APIView):
    """
    POST /api/payments/verify
    Verifies payment with Chapa and marks order as paid.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        payload = VerifyPaymentSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        tx_ref = payload.validated_data["transaction_id"]

        with transaction.atomic():
            payment = (
                Payment.objects.select_for_update()
                .select_related("order")
                .filter(transaction_id=tx_ref, user=request.user)
                .first()
            )
            if not payment:
                return Response({"detail": "Payment not found."}, status=status.HTTP_404_NOT_FOUND)

            order = payment.order

            # Already paid — idempotent
            if payment.status == Payment.Status.paid:
                return Response(
                    {
                        "message": "Payment already verified",
                        "payment": PaymentResponseSerializer(payment).data,
                        "order_status": order.status,
                    },
                    status=status.HTTP_200_OK,
                )

            # Verify with Chapa
            result = chapa_service.verify_payment(tx_ref)
            chapa_status = result.get("data", {}).get("status", "")

            if result.get("status") != "success" or chapa_status not in ("success", "COMPLETE"):
                payment.status = Payment.Status.failed
                payment.save(update_fields=["status"])
                return Response(
                    {
                        "message": "Payment failed or pending",
                        "chapa_status": chapa_status,
                        "payment": PaymentResponseSerializer(payment).data,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            payment.status = Payment.Status.paid
            payment.save(update_fields=["status"])
            order.status = Order.Status.paid
            order.save(update_fields=["status"])

        return Response(
            {
                "message": "Payment verified successfully",
                "payment": PaymentResponseSerializer(payment).data,
                "order_status": order.status,
            },
            status=status.HTTP_200_OK,
        )


class ChapaWebhookAPIView(APIView):
    """
    POST /api/payments/webhook
    Chapa calls this after payment. Verifies and marks order paid.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        tx_ref = request.data.get("tx_ref") or request.data.get("trx_ref")
        if not tx_ref:
            return Response({"detail": "tx_ref missing"}, status=status.HTTP_400_BAD_REQUEST)

        result = chapa_service.verify_payment(tx_ref)
        chapa_status = result.get("data", {}).get("status", "")

        with transaction.atomic():
            payment = (
                Payment.objects.select_for_update()
                .select_related("order")
                .filter(transaction_id=tx_ref)
                .first()
            )
            if not payment:
                return Response({"detail": "Payment not found"}, status=status.HTTP_404_NOT_FOUND)

            if payment.status == Payment.Status.paid:
                return Response({"message": "Already processed"}, status=status.HTTP_200_OK)

            if chapa_status in ("success", "COMPLETE"):
                payment.status = Payment.Status.paid
                payment.save(update_fields=["status"])
                payment.order.status = Order.Status.paid
                payment.order.save(update_fields=["status"])

        return Response({"message": "Webhook processed"}, status=status.HTTP_200_OK)
