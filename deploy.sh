#!/bin/bash

# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3-pip python3-venv git nginx

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Setup systemd service
sudo cp interview-eval.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable interview-eval
sudo systemctl restart interview-eval

# Setup Nginx (Reverse Proxy)
sudo cp nginx_app.conf /etc/nginx/sites-available/default
sudo systemctl restart nginx
