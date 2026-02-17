#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "Starting build process..."

# Create necessary directories
echo "Creating function directory..."
mkdir -p functions/api

# Copy application files
echo "Copying files..."
cp main.py functions/api/api.py
cp file_parser.py functions/api/file_parser.py
cp credentials.txt functions/api/credentials.txt

# Copy static directory
# We copy 'static' into 'functions/api/' so it becomes 'functions/api/static'
cp -r static functions/api/

# Install dependencies
echo "Installing dependencies..."
pip install -t functions/api -r requirements-prod.txt

echo "Build complete."
