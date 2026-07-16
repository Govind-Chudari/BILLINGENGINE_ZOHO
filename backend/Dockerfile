# Use official Python slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install dependencies first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all backend code
COPY . .

# Expose Flask port
EXPOSE 5000

# Run Flask
CMD ["python", "app.py"]