"""
Migration: Add role-based fields to plans table
Adds support for position-level and individual plans with visibility controls
"""
import sqlite3
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error


def add_role_based_plans_fields():
    """Add role-based fields to plans table"""
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        log_info("Adding role-based fields to plans table...", "migration")
        
        # Check if columns already exist
        c.execute("PRAGMA table_info(plans)")
        existing_columns = [col[1] for col in c.fetchall()]
        
        # Add position_id column
        if 'position_id' not in existing_columns:
            c.execute("ALTER TABLE plans ADD COLUMN position_id INTEGER")
            log_info("  ✅ Added position_id column", "migration")
        
        # Add user_id column
        if 'user_id' not in existing_columns:
            c.execute("ALTER TABLE plans ADD COLUMN user_id INTEGER")
            log_info("  ✅ Added user_id column", "migration")
        
        # Add visible_to_positions column (JSON array)
        if 'visible_to_positions' not in existing_columns:
            c.execute("ALTER TABLE plans ADD COLUMN visible_to_positions TEXT")
            log_info("  ✅ Added visible_to_positions column", "migration")
        
        # Add can_edit_positions column (JSON array)
        if 'can_edit_positions' not in existing_columns:
            c.execute("ALTER TABLE plans ADD COLUMN can_edit_positions TEXT")
            log_info("  ✅ Added can_edit_positions column", "migration")
        
        # Add is_position_plan flag
        if 'is_position_plan' not in existing_columns:
            c.execute("ALTER TABLE plans ADD COLUMN is_position_plan INTEGER DEFAULT 0")
            log_info("  ✅ Added is_position_plan column", "migration")
        
        # Add is_individual_plan flag
        if 'is_individual_plan' not in existing_columns:
            c.execute("ALTER TABLE plans ADD COLUMN is_individual_plan INTEGER DEFAULT 0")
            log_info("  ✅ Added is_individual_plan column", "migration")
        
        # Create indexes for performance
        try:
            c.execute("""
                CREATE INDEX IF NOT EXISTS idx_plans_position_id 
                ON plans(position_id, is_active)
            """)
            log_info("  ✅ Created index on position_id", "migration")
        except Exception as e:
            log_error(f"  ⚠️  Index idx_plans_position_id may already exist: {e}", "migration")
        
        try:
            c.execute("""
                CREATE INDEX IF NOT EXISTS idx_plans_user_id 
                ON plans(user_id, is_active)
            """)
            log_info("  ✅ Created index on user_id", "migration")
        except Exception as e:
            log_error(f"  ⚠️  Index idx_plans_user_id may already exist: {e}", "migration")
        
        conn.commit()
        conn.close()
        
        log_info("✅ Role-based plans fields added successfully", "migration")
        return {"success": True}
        
    except Exception as e:
        log_error(f"❌ Error adding role-based plans fields: {e}", "migration")
        import traceback
        log_error(traceback.format_exc(), "migration")
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    add_role_based_plans_fields()
