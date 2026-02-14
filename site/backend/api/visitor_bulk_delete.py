
@router.delete("/analytics/visitors/bulk-delete")
async def bulk_delete_visitors(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """
    Bulk delete visitor records (Director only)
    Accepts filters: period, date_from, date_to, country, city, device_type
    """
    user = require_auth(session_token)
    if not user or user["role"] != "director":
        return JSONResponse({"error": "Forbidden - Director only"}, status_code=403)
    
    try:
        data = await request.json()
        
        period = data.get('period')
        date_from = data.get('date_from')
        date_to = data.get('date_to')
        country = data.get('country')
        city = data.get('city')
        device_type = data.get('device_type')
        
        from db.visitor_tracking import bulk_delete_visitor_records
        
        # Calculate date range if period specified
        end_date = datetime.now()
        start_date = None
        
        if date_from and date_to:
            start_date = datetime.fromisoformat(date_from)
            end_date = datetime.fromisoformat(date_to).replace(hour=23, minute=59, second=59)
        elif period:
            if period == "day" or period == "1":
                start_date = end_date - timedelta(days=1)
            elif period == "3":
                start_date = end_date - timedelta(days=3)
            elif period == "week" or period == "7":
                start_date = end_date - timedelta(weeks=1)
            elif period == "14":
                start_date = end_date - timedelta(days=14)
            elif period == "month" or period == "30":
                start_date = end_date - timedelta(days=30)
            elif period == "90":
                start_date = end_date - timedelta(days=90)
        
        deleted_count = bulk_delete_visitor_records(
            start_date=start_date,
            end_date=end_date,
            country=country,
            city=city,
            device_type=device_type
        )
        
        log_info(f"🗑️ Director {user['username']} deleted {deleted_count} visitor records", "api")
        
        # Clear cache after deletion
        if cache.enabled:
            cache.delete_pattern("visitor_dashboard_*")
        _dashboard_cache.clear()
        
        return {
            "success": True,
            "deleted_count": deleted_count,
            "message": f"Deleted {deleted_count} visitor records"
        }
        
    except Exception as e:
        log_error(f"Error bulk deleting visitors: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)
