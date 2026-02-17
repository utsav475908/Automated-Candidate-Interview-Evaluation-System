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

# Setup Nginx (SSL/HTTPS)
sudo mkdir -p /etc/nginx/ssl
if [ ! -f /etc/nginx/ssl/nginx.crt ]; then
    sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/nginx/ssl/nginx.key -out /etc/nginx/ssl/nginx.crt -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
fi

sudo cp nginx_app.conf /etc/nginx/sites-available/default
sudo systemctl restart nginx
