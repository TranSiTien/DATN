#!/bin/bash

echo
echo "=== Launching All PetConnect Dev Services with PM2 ==="
echo "    (Starting new processes or restarting existing ones)"
echo

DOTNET_PATH="/root/DATN/PetConnect/WebServer"
REACT_PATH="/root/DATN/lost-pet-finder"
PYTHON_PATH="/root/DATN/CatRecognition2"

echo "--- Starting/Restarting .NET WebServer ---"
# Navigate to the directory first
cd "$DOTNET_PATH"
# Use 'bash -c' to execute the command as a shell command
pm2 start "dotnet run" --name "petconnect_webserver"

echo "--- Starting/Restarting React App ---"
# Navigate to the directory first
cd "$REACT_PATH"
# Use 'bash -c' to execute the command as a shell command
pm2 start "npm run dev" --name "petconnect_react_app"

echo "--- Starting/Restarting Python Script ---"
# Navigate to the directory first
cd "$PYTHON_PATH"
pm2 start "python lost_and_found_cat.py" --name "petconnect_cat_recognition"

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