from django.apps import AppConfig


class PaymentsConfig(AppConfig):
    name = 'payments'

    def ready(self) -> None:
        import payments.signals  # noqa: F401
