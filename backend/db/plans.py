"""
Database functions for managing role-based plans and goals
"""
import sqlite3
import json
from datetime import datetime
from typing import Optional, Dict, Any, List
from core.config import DATABASE_NAME
from utils.logger import log_error


def get_plan_for_user(user_id: int, metric_type: str, period_type: str = None) -> Optional[Dict[str, Any]]:
    """
    Get plan for specific user with priority: individual → role (position) → global
    
    Args:
        user_id: User ID
        metric_type: Type of metric (e.g., 'new_clients', 'bookings', 'revenue')
        period_type: Period type (optional)
    
    Returns:
        Plan dict or None
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        current_date = datetime.now().isoformat()
        
        # Get user's role
        c.execute("SELECT role FROM users WHERE id = ?", (user_id,))
        user_row = c.fetchone()
        if not user_row:
            conn.close()
            return None
        
        role_key = user_row[0]
        
        # Priority 1: Individual plan for this user
        query = """
            SELECT id, metric_type, target_value, period_type, 
                   start_date, end_date, created_by, created_at,
                   role_key, user_id, visible_to_positions, can_edit_positions,
                   is_position_plan, is_individual_plan
            FROM plans
            WHERE user_id = ? 
              AND metric_type = ?
              AND is_active = 1
              AND is_individual_plan = 1
              AND start_date <= ?
              AND end_date >= ?
        """
        params = [user_id, metric_type, current_date, current_date]
        
        if period_type:
            query += " AND period_type = ?"
            params.append(period_type)
        
        query += " ORDER BY created_at DESC LIMIT 1"
        
        c.execute(query, params)
        row = c.fetchone()
        
        # Priority 2: Role (Position) plan if no individual plan
        if not row and role_key:
            query = """
                SELECT id, metric_type, target_value, period_type, 
                       start_date, end_date, created_by, created_at,
                       role_key, user_id, visible_to_positions, can_edit_positions,
                       is_position_plan, is_individual_plan
                FROM plans
                WHERE role_key = ? 
                  AND metric_type = ?
                  AND is_active = 1
                  AND is_position_plan = 1
                  AND start_date <= ?
                  AND end_date >= ?
            """
            params = [role_key, metric_type, current_date, current_date]
            
            if period_type:
                query += " AND period_type = ?"
                params.append(period_type)
            
            query += " ORDER BY created_at DESC LIMIT 1"
            
            c.execute(query, params)
            row = c.fetchone()
        
        # Priority 3: Global plan if no role plan
        if not row:
            query = """
                SELECT id, metric_type, target_value, period_type, 
                       start_date, end_date, created_by, created_at,
                       role_key, user_id, visible_to_positions, can_edit_positions,
                       is_position_plan, is_individual_plan
                FROM plans
                WHERE role_key IS NULL
                  AND user_id IS NULL
                  AND metric_type = ?
                  AND is_active = 1
                  AND start_date <= ?
                  AND end_date >= ?
            """
            params = [metric_type, current_date, current_date]
            
            if period_type:
                query += " AND period_type = ?"
                params.append(period_type)
            
            query += " ORDER BY created_at DESC LIMIT 1"
            
            c.execute(query, params)
            row = c.fetchone()
        
        conn.close()
        
        if row:
            return {
                "id": row[0],
                "metric_type": row[1],
                "target_value": row[2],
                "period_type": row[3],
                "start_date": row[4],
                "end_date": row[5],
                "created_by": row[6],
                "created_at": row[7],
                "role_key": row[8],
                "user_id": row[9],
                "visible_to_positions": json.loads(row[10]) if row[10] else [],
                "can_edit_positions": json.loads(row[11]) if row[11] else [],
                "is_position_plan": bool(row[12]),
                "is_individual_plan": bool(row[13])
            }
        return None
        
    except Exception as e:
        log_error(f"Error getting plan for user: {e}", "plans")
        return None


def set_role_plan(role_key: str, metric_type: str, target_value: float, 
                     period_type: str, start_date: str, end_date: str,
                     visible_to_roles: List[str] = None,
                     can_edit_roles: List[str] = None,
                     created_by: int = None) -> Optional[int]:
    """Create plan for entire role (position)"""
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        # Deactivate existing role plans for this metric and period
        c.execute("""
            UPDATE plans 
            SET is_active = 0, updated_at = ?
            WHERE role_key = ? 
              AND metric_type = ?
              AND period_type = ?
              AND is_position_plan = 1
              AND is_active = 1
        """, (datetime.now().isoformat(), role_key, metric_type, period_type))
        
        # Create new role plan
        visible_json = json.dumps(visible_to_roles) if visible_to_roles else None
        can_edit_json = json.dumps(can_edit_roles) if can_edit_roles else None
        
        c.execute("""
            INSERT INTO plans (
                metric_type, target_value, period_type, 
                start_date, end_date, created_by,
                role_key, is_position_plan,
                visible_to_positions, can_edit_positions
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        """, (metric_type, target_value, period_type, start_date, end_date, 
              created_by, role_key, visible_json, can_edit_json))
        
        plan_id = c.lastrowid
        conn.commit()
        conn.close()
        
        return plan_id
        
    except Exception as e:
        log_error(f"Error setting role plan: {e}", "plans")
        return None


def set_individual_plan(user_id: int, metric_type: str, target_value: float,
                       period_type: str, start_date: str, end_date: str,
                       created_by: int = None) -> Optional[int]:
    """Create individual plan override for specific user"""
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        # Deactivate existing individual plans for this user, metric and period
        c.execute("""
            UPDATE plans 
            SET is_active = 0, updated_at = ?
            WHERE user_id = ? 
              AND metric_type = ?
              AND period_type = ?
              AND is_individual_plan = 1
              AND is_active = 1
        """, (datetime.now().isoformat(), user_id, metric_type, period_type))
        
        # Create new individual plan
        c.execute("""
            INSERT INTO plans (
                metric_type, target_value, period_type, 
                start_date, end_date, created_by,
                user_id, is_individual_plan
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        """, (metric_type, target_value, period_type, start_date, end_date, 
              created_by, user_id))
        
        plan_id = c.lastrowid
        conn.commit()
        conn.close()
        
        return plan_id
        
    except Exception as e:
        log_error(f"Error setting individual plan: {e}", "plans")
        return None


def get_visible_plans(user_id: int) -> List[Dict[str, Any]]:
    """Get all plans visible to user based on their role"""
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        # Get user's role
        c.execute("SELECT role FROM users WHERE id = ?", (user_id,))
        user_row = c.fetchone()
        if not user_row:
            conn.close()
            return []
        
        role_key = user_row[0]
        current_date = datetime.now().isoformat()
        
        # Get all active plans
        c.execute("""
            SELECT id, metric_type, target_value, period_type, 
                   start_date, end_date, created_by, created_at,
                   role_key, user_id, visible_to_positions, can_edit_positions,
                   is_position_plan, is_individual_plan
            FROM plans
            WHERE is_active = 1
              AND start_date <= ?
              AND end_date >= ?
            ORDER BY created_at DESC
        """, (current_date, current_date))
        
        rows = c.fetchall()
        conn.close()
        
        visible_plans = []
        for row in rows:
            visible_to = json.loads(row[10]) if row[10] else []
            
            # Check visibility
            is_visible = (
                not visible_to or  # No restrictions
                role_key in visible_to or  # User's role in list
                row[9] == user_id  # User's individual plan
            )
            
            if is_visible:
                visible_plans.append({
                    "id": row[0],
                    "metric_type": row[1],
                    "target_value": row[2],
                    "period_type": row[3],
                    "start_date": row[4],
                    "end_date": row[5],
                    "created_by": row[6],
                    "created_at": row[7],
                    "role_key": row[8],
                    "user_id": row[9],
                    "visible_to_positions": visible_to,
                    "can_edit_positions": json.loads(row[11]) if row[11] else [],
                    "is_position_plan": bool(row[12]),
                    "is_individual_plan": bool(row[13])
                })
        
        return visible_plans
        
    except Exception as e:
        log_error(f"Error getting visible plans: {e}", "plans")
        return []


def can_user_edit_plan(user_id: int, plan_id: int) -> bool:
    """Check if user can edit plan"""
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        # Get user's role
        c.execute("SELECT role FROM users WHERE id = ?", (user_id,))
        user_row = c.fetchone()
        if not user_row:
            conn.close()
            return False
        
        role_key = user_row[0]
        
        # Admins and directors can edit all plans
        if role_key in ['admin', 'director']:
            conn.close()
            return True
        
        # Get plan details
        c.execute("""
            SELECT user_id, role_key, can_edit_positions, created_by
            FROM plans
            WHERE id = ?
        """, (plan_id,))
        plan_row = c.fetchone()
        conn.close()
        
        if not plan_row:
            return False
        
        plan_user_id, plan_role_key, can_edit_json, created_by = plan_row
        
        # User can edit their own individual plan
        if plan_user_id == user_id:
            return True
        
        # Check if user's role can edit
        can_edit = json.loads(can_edit_json) if can_edit_json else []
        if role_key in can_edit:
            return True
        
        # User created the plan
        if created_by == user_id:
            return True
        
        return False
        
    except Exception as e:
        log_error(f"Error checking edit permission: {e}", "plans")
        return False


def get_plans_by_role(role_key: str, active_only: bool = True) -> List[Dict[str, Any]]:
    """Get all plans for a role"""
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        query = """
            SELECT id, metric_type, target_value, period_type, 
                   start_date, end_date, created_by, created_at,
                   role_key, user_id, visible_to_positions, can_edit_positions,
                   is_position_plan, is_individual_plan
            FROM plans
            WHERE role_key = ?
        """
        
        if active_only:
            query += " AND is_active = 1"
        
        query += " ORDER BY created_at DESC"
        
        c.execute(query, (role_key,))
        rows = c.fetchall()
        conn.close()
        
        plans = []
        for row in rows:
            plans.append({
                "id": row[0],
                "metric_type": row[1],
                "target_value": row[2],
                "period_type": row[3],
                "start_date": row[4],
                "end_date": row[5],
                "created_by": row[6],
                "created_at": row[7],
                "role_key": row[8],
                "user_id": row[9],
                "visible_to_positions": json.loads(row[10]) if row[10] else [],
                "can_edit_positions": json.loads(row[11]) if row[11] else [],
                "is_position_plan": bool(row[12]),
                "is_individual_plan": bool(row[13])
            })
        
        return plans
        
    except Exception as e:
        log_error(f"Error getting plans by role: {e}", "plans")
        return []


# Keep existing functions for backward compatibility
def get_plan(metric_type: str, period_type: str = None) -> Optional[Dict[str, Any]]:
    """Get active global plan for a specific metric (backward compatibility)"""
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        current_date = datetime.now().isoformat()
        
        query = """
            SELECT id, metric_type, target_value, period_type, 
                   start_date, end_date, created_by, created_at
            FROM plans
            WHERE metric_type = ? 
              AND role_key IS NULL
              AND user_id IS NULL
              AND is_active = 1
              AND start_date <= ?
              AND end_date >= ?
        """
        params = [metric_type, current_date, current_date]
        
        if period_type:
            query += " AND period_type = ?"
            params.append(period_type)
        
        query += " ORDER BY created_at DESC LIMIT 1"
        
        c.execute(query, params)
        row = c.fetchone()
        conn.close()
        
        if row:
            return {
                "id": row[0],
                "metric_type": row[1],
                "target_value": row[2],
                "period_type": row[3],
                "start_date": row[4],
                "end_date": row[5],
                "created_by": row[6],
                "created_at": row[7]
            }
        return None
        
    except Exception as e:
        log_error(f"Error getting plan: {e}", "plans")
        return None


def set_plan(metric_type: str, target_value: float, period_type: str, 
             start_date: str, end_date: str, created_by: int = None) -> Optional[int]:
    """Create or update a global plan (backward compatibility)"""
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        # Deactivate existing global plans for this metric and period
        c.execute("""
            UPDATE plans 
            SET is_active = 0, updated_at = ?
            WHERE metric_type = ? 
              AND period_type = ?
              AND role_key IS NULL
              AND user_id IS NULL
              AND is_active = 1
        """, (datetime.now().isoformat(), metric_type, period_type))
        
        # Create new plan
        c.execute("""
            INSERT INTO plans (metric_type, target_value, period_type, 
                             start_date, end_date, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (metric_type, target_value, period_type, start_date, end_date, created_by))
        
        plan_id = c.lastrowid
        conn.commit()
        conn.close()
        
        return plan_id
        
    except Exception as e:
        log_error(f"Error setting plan: {e}", "plans")
        return None


def get_plan_progress(metric_type: str, current_value: float) -> Optional[Dict[str, Any]]:
    """Calculate progress toward plan (backward compatibility)"""
    plan = get_plan(metric_type)
    
    if not plan:
        return None
    
    target = plan["target_value"]
    progress_percentage = (current_value / target * 100) if target > 0 else 0
    remaining = target - current_value
    
    if current_value >= target:
        status = "exceeded"
        message = f"План перевыполнен на {round(progress_percentage - 100, 1)}%"
    else:
        status = "in_progress"
        message = f"До плана не хватает {round(remaining, 1)}"
    
    return {
        "plan": plan,
        "current_value": current_value,
        "target_value": target,
        "progress_percentage": round(progress_percentage, 1),
        "remaining": round(remaining, 1),
        "status": status,
        "message": message
    }


def get_all_plans(active_only: bool = True) -> list:
    """Get all plans (backward compatibility)"""
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        if active_only:
            c.execute("""
                SELECT id, metric_type, target_value, period_type, 
                       start_date, end_date, created_by, created_at
                FROM plans
                WHERE is_active = 1
                ORDER BY metric_type, start_date DESC
            """)
        else:
            c.execute("""
                SELECT id, metric_type, target_value, period_type, 
                       start_date, end_date, created_by, created_at, is_active
                FROM plans
                ORDER BY metric_type, start_date DESC
            """)
        
        rows = c.fetchall()
        conn.close()
        
        plans = []
        for row in rows:
            plan = {
                "id": row[0],
                "metric_type": row[1],
                "target_value": row[2],
                "period_type": row[3],
                "start_date": row[4],
                "end_date": row[5],
                "created_by": row[6],
                "created_at": row[7]
            }
            if not active_only:
                plan["is_active"] = row[8]
            plans.append(plan)
        
        return plans
        
    except Exception as e:
        log_error(f"Error getting all plans: {e}", "plans")
        return []


def delete_plan(plan_id: int) -> bool:
    """Soft delete a plan by deactivating it (backward compatibility)"""
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        c.execute("""
            UPDATE plans 
            SET is_active = 0, updated_at = ?
            WHERE id = ?
        """, (datetime.now().isoformat(), plan_id))
        
        conn.commit()
        conn.close()
        return True
        
    except Exception as e:
        log_error(f"Error deleting plan: {e}", "plans")
        return False
