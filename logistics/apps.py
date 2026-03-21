from django.apps import AppConfig


class LogisticsConfig(AppConfig):
    name = 'logistics'

    def ready(self) -> None:
        import logistics.signals  # noqa: F401
