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

# Setup Nginx (Simple proxy pass)
# (User might want to configure this manually for SSL/Domain, but basic proxy pass helps)
# For now, we'll just open port 8000 in security group instructions.
