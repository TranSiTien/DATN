#!/bin/bash

echo
echo "=== Launching All PetConnect Dev Services with PM2 ==="
echo "    (Restarting existing or creating new processes)"
echo

DOTNET_PATH="/root/DATN/PetConnect/WebServer"
REACT_PATH="/root/DATN/lost-pet-finder"
PYTHON_PATH="/root/DATN/CatRecognition2"

echo "--- Starting/Restarting .NET WebServer ---"
# cd into the directory first, then run the pm2 command
cd "$DOTNET_PATH"
pm2 restart "dotnet run" --name "petconnect_webserver"

echo "--- Starting/Restarting React App ---"
# cd into the directory first, then run the pm2 command
cd "$REACT_PATH"
pm2 restart "npm run dev" --name "petconnect_react_app"

echo "--- Starting/Restarting Python Script ---"
# cd into the directory first, then run the pm2 command
cd "$PYTHON_PATH"
pm2 restart "venv/bin/python lost_and_found_cat.py" --name "petconnect_cat_recognition"

echo
echo "All services are now running or have been restarted under PM2."
echo "Use the following PM2 commands to manage them:"
echo "   pm2 list             # Show running processes"
echo "   pm2 logs <name>      # View logs (e.g., pm2 logs petconnect_react_app)"
echo "   pm2 stop <name>      # Stop a process"
echo "   pm2 restart <name>   # Restart a process"
echo "   pm2 delete <name>    # Remove a process"
echo "   pm2 save             # Save the current process list"
echo