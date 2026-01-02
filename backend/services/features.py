"""
Сервис управления функционалом (Feature Flags)

Позволяет включать/выключать функции, задавать расписание и белые списки пользователей.
"""

import json
from datetime import datetime
from typing import Dict, List, Optional, Union
from db.connection import get_db_connection
from utils.logger import log_info, log_error

class FeatureService:
    def __init__(self):
        pass

    def get_features_config(self) -> Dict:
        """Получить конфигурацию всех фича-флагов"""
        conn = get_db_connection()
        c = conn.cursor()
        try:
            c.execute("SELECT feature_flags FROM salon_settings LIMIT 1")
            row = c.fetchone()
            if row and row[0]:
                try:
                    return json.loads(row[0])
                except json.JSONDecodeError:
                    return {}
            return {}
        except Exception as e:
            log_error(f"Error getting features config: {e}", "features")
            return {}
        finally:
            conn.close()

    def update_features_config(self, config: Dict) -> bool:
        """Обновить конфигурацию фича-флагов"""
        conn = get_db_connection()
        c = conn.cursor()
        try:
            # Validate structure if needed, or trust admin input
            c.execute("UPDATE salon_settings SET feature_flags = %s", (json.dumps(config, ensure_ascii=False),))
            conn.commit()
            log_info(f"Feature flags updated: {config.keys()}", "features")
            return True
        except Exception as e:
            log_error(f"Error updating features config: {e}", "features")
            return False
        finally:
            conn.close()

    def update_feature(self, feature_key: str, settings: Dict) -> bool:
        """Обновить настройки конкретной фичи"""
        current_config = self.get_features_config()
        current_config[feature_key] = settings
        return self.update_features_config(current_config)

    def is_feature_enabled(self, feature_key: str, user_id: Optional[Union[int, str]] = None) -> bool:
        """
        Проверить, включена ли фича для пользователя (учитывая даты и вайтлист)
        
        Args:
            feature_key: Ключ фичи (loyalty, referral, challenges)
            user_id: ID пользователя (или instagram_id для клиентов). 
                     Если вайтлист активен, а юзер не передан -> False.
        """
        config = self.get_features_config()
        feature = config.get(feature_key)
        
        # Если фичи нет в конфиге, считаем ее выключенной (или включенной по дефолту? Лучше выкл)
        if not feature:
            return False
            
        # 1. Global switch
        if not feature.get("enabled", False):
            return False
            
        # 2. Date scheduling
        now = datetime.now().date().isoformat()
        start_date = feature.get("start_date")
        end_date = feature.get("end_date")
        
        if start_date and start_date > now:
            return False
        if end_date and end_date < now:
            return False
            
        # 3. Whitelist
        whitelist = feature.get("whitelist", [])
        if whitelist and len(whitelist) > 0:
            if user_id is None:
                return False # Whitelist exists but user unknown -> Access Denied
            
            # Normalize to strings for comparison
            str_user_id = str(user_id)
            str_whitelist = [str(x) for x in whitelist]
            
            if str_user_id not in str_whitelist:
                return False
                
        return True
