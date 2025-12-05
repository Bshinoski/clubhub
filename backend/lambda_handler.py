"""
AWS Lambda Handler for ClubHub API

This file wraps the FastAPI application with Mangum to make it
compatible with AWS Lambda + API Gateway.
"""

from mangum import Mangum
from app.main import app

# Create the Lambda handler
handler = Mangum(app, lifespan="off")

# For testing locally
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
