from plugins.base import PluginBase


# 野鳥撮影者タイプ診断プラグイン
class ShindanPlugin(PluginBase):
    name = "shindan"
    display_name = "野鳥撮影者タイプ診断"
    version = "1.0"

    def get_url_patterns(self):
        from plugins.shindan.urls import urlpatterns
        return urlpatterns
