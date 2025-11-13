#!/bin/bash
# Run script to ensure correct Python environment

# Check if virtual environment is activated
if [ -z "$VIRTUAL_ENV" ]; then
    echo "⚠️  Virtual environment not activated!"
    echo "Activating venv..."
    source venv/bin/activate
fi

# Run uvicorn using the venv's Python
echo "Starting server with Python: $(python --version)"
python -m uvicorn main:app --reload
