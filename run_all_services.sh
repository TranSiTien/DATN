#!/bin/bash

echo
echo "=== Launching All PetConnect Dev Services (Headless) ==="
echo

# --- Update these paths to match your real project structure on the server
DOTNET_PATH="/root/DATN/PetConnect/WebServer"
REACT_PATH="/root/DATN/lost-pet-finder"
PYTHON_PATH="/root/DATN/CatRecognition2"

# Start .NET WebServer
echo "--- Starting .NET WebServer ---"
tmux new-session -d -s dotnet_server "cd $DOTNET_PATH && dotnet run"

# Start React App
echo "--- Starting React App ---"
tmux new-session -d -s react_app "cd $REACT_PATH && npm run dev"

# Start Python Script
echo "--- Starting Python Script ---"
tmux new-session -d -s cat_recognition "cd $PYTHON_PATH && source venv/bin/activate && python lost_and_found_cat.py"

echo
echo "All services are now running in separate tmux sessions."
echo "Use the following commands to attach to a session:"
echo "  tmux attach -t dotnet_server"
echo "  tmux attach -t react_app"
echo "  tmux attach -t cat_recognition"
echo
echo "Press Ctrl+B then D to detach from any session."
