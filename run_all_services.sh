#!/bin/bash

echo
echo "=== Launching All PetConnect Dev Services with PM2 ==="
echo

DOTNET_PATH="/root/DATN/PetConnect/WebServer"
REACT_PATH="/root/DATN/lost-pet-finder"
PYTHON_PATH="/root/DATN/CatRecognition2"


echo "--- Starting .NET WebServer ---"
cd "/root/DATN/PetConnect/WebServer"
pm2 start "dotnet run"

echo "--- Starting React App ---"
cd "/root/DATN/lost-pet-finder"
pm2 start "npm run dev"

echo "--- Starting Python Script ---"
cd "/root/DATN/CatRecognition2"
pm2 start "venv/bin/python lost_and_found_cat.py"

echo
echo "All services are now running under PM2."
echo "Use the following PM2 commands to manage them:"
echo "  pm2 list             # Show running processes"
echo "  pm2 logs <name>      # View logs (e.g., pm2 logs react_app)"
echo "  pm2 stop <name>      # Stop a process"
echo "  pm2 restart <name>   # Restart a process"
echo "  pm2 delete <name>    # Remove a process"
echo "  pm2 save             # Save the current process list"
echo
