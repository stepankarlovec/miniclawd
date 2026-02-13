#!/bin/bash

# MiniClawd Automated Installer for Raspberry Pi
# This script installs Node.js, dependencies, configures the agent,
# and sets up a systemd service for 24/7 background operation.

set -e # Exit on error

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}⚡ MiniClawd Installer ⚡${NC}"
echo "--------------------------------"

# 1. Check/Install Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js not found. Installing Node.js 18...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    NODE_VER=$(node -v)
    echo -e "${GREEN}Node.js is installed (${NODE_VER}).${NC}"
fi

# 2. Install Dependencies
echo -e "\n${BLUE}Installing dependencies...${NC}"
npm install

# 2.5. Optional Ollama Installation
echo -e "\n${BLUE}Checking for Ollama...${NC}"
if ! command -v ollama &> /dev/null; then
    echo -e "${YELLOW}Ollama is not installed.${NC}"
    read -p "Do you want to install Ollama (local AI models)? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Installing Ollama...${NC}"
        curl -fsSL https://ollama.ai/install.sh | sh
        
        echo -e "${GREEN}Ollama installed successfully!${NC}"
        echo -e "${BLUE}Starting Ollama service...${NC}"
        
        # Start Ollama in the background
        nohup ollama serve > /tmp/ollama.log 2>&1 &
        sleep 3
        
        echo -e "${BLUE}Pulling recommended model (llama3.2:1b)...${NC}"
        echo -e "${YELLOW}This may take a few minutes depending on your internet speed.${NC}"
        ollama pull llama3.2:1b
        
        echo -e "${GREEN}Ollama setup complete!${NC}"
    else
        echo -e "${YELLOW}Skipping Ollama installation.${NC}"
        echo -e "${YELLOW}You can use OpenAI instead during configuration.${NC}"
    fi
else
    echo -e "${GREEN}Ollama is already installed.${NC}"
    
    # Check if Ollama is running
    if curl -s http://127.0.0.1:11434 > /dev/null 2>&1; then
        echo -e "${GREEN}Ollama is running.${NC}"
    else
        echo -e "${YELLOW}Ollama is not running.${NC}"
        read -p "Start Ollama now? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            nohup ollama serve > /tmp/ollama.log 2>&1 &
            sleep 3
            echo -e "${GREEN}Ollama started.${NC}"
        fi
    fi
fi

# 3. Interactive Setup
echo -e "\n${BLUE}Running configuration wizard...${NC}"
npm run setup

# 4. Systemd Setup
echo -e "\n${BLUE}Setting up 24/7 Background Service (Systemd)...${NC}"
read -p "Do you want to enable MiniClawd to run automatically on boot? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    
    USERNAME=$(whoami)
    APP_DIR=$(pwd)
    SERVICE_FILE="miniclawd.service"

    echo "Generating service file for user '$USERNAME' in '$APP_DIR'..."

    # Generate Service File dynamically
    cat > $SERVICE_FILE <<EOF
[Unit]
Description=MiniClawd AI Agent
After=network.target

[Service]
Type=simple
User=$USERNAME
WorkingDirectory=$APP_DIR
ExecStart=$(which npm) start
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

    echo "Installing service..."
    sudo cp $SERVICE_FILE /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable miniclawd
    
    echo -e "${GREEN}Service enabled!${NC}"
    read -p "Start the service now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo systemctl start miniclawd
        echo -e "${GREEN}MiniClawd is running in the background!${NC}"
        echo "Check status with: sudo systemctl status miniclawd"
    fi
else
    echo "Skipping service setup."
fi

echo -e "\n${GREEN}Installation Complete!${NC}"
echo "Run 'npm start' to start manually,"
echo "or 'sudo systemctl start miniclawd' if you enabled the service."
