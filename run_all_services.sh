#!/bin/bash
# This script automates launching your .NET WebServer in development mode,
# React frontend in development mode, and Python script in separate terminal tabs/windows.

set -e  # Exit on any error

echo "========================================"
echo "    Launching All PetConnect Dev Services"
echo "========================================"
echo

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if required tools are installed
echo "--- Checking Prerequisites ---"
if ! command_exists dotnet; then
    echo "ERROR: .NET is not installed. Please install .NET SDK first."
    exit 1
fi

if ! command_exists npm; then
    echo "ERROR: Node.js/npm is not installed. Please install Node.js first."
    exit 1
fi

if ! command_exists python3; then
    echo "ERROR: Python3 is not installed. Please install Python3 first."
    exit 1
fi

echo "All prerequisites found!"
echo

# Check if gnome-terminal is available for separate windows
if command_exists gnome-terminal; then
    TERMINAL_CMD="gnome-terminal"
    TAB_ARG="--tab"
elif command_exists xterm; then
    TERMINAL_CMD="xterm"
    TAB_ARG=""
elif command_exists konsole; then
    TERMINAL_CMD="konsole"
    TAB_ARG="--new-tab"
else
    echo "No suitable terminal emulator found. Running services in background..."
    TERMINAL_CMD=""
fi

echo "--- Starting .NET WebServer in Development Mode ---"
# Change directory to your .NET WebServer project
cd /root/DATN/PetConnect/WebServer

if [ -n "$TERMINAL_CMD" ]; then
    # Launch the .NET application in a new terminal window/tab
    $TERMINAL_CMD --title="PetConnect WebServer (Dev)" $TAB_ARG -e bash -c "cd /root/DATN/PetConnect/WebServer && echo 'Starting .NET WebServer...' && dotnet run; exec bash" &
    echo ".NET WebServer is starting in new terminal window..."
else
    # Run in background if no terminal emulator available
    echo "Starting .NET WebServer in background..."
    nohup dotnet run > /tmp/dotnet-webserver.log 2>&1 &
    DOTNET_PID=$!
    echo ".NET WebServer started with PID: $DOTNET_PID (log: /tmp/dotnet-webserver.log)"
fi

sleep 2
echo

echo "--- Starting React App in Development Mode (npm run dev) ---"
# Change directory to your React application
cd /root/DATN/lost-pet-finder

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
fi

if [ -n "$TERMINAL_CMD" ]; then
    # Launch the React app in a new terminal window/tab
    $TERMINAL_CMD --title="Lost Pet Finder React App (Dev)" $TAB_ARG -e bash -c "cd /root/DATN/lost-pet-finder && echo 'Starting React App...' && npm run dev; exec bash" &
    echo "React App is starting in new terminal window..."
else
    # Run in background if no terminal emulator available
    echo "Starting React App in background..."
    nohup npm run dev > /tmp/react-app.log 2>&1 &
    REACT_PID=$!
    echo "React App started with PID: $REACT_PID (log: /tmp/react-app.log)"
fi

sleep 2
echo

echo "--- Starting Python Script ---"
# Navigate to the Python script directory
cd /root/DATN/CatRecognition2

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Install requirements if they exist
if [ -f "requirements.txt" ]; then
    echo "Installing Python dependencies..."
    source venv/bin/activate
    pip install -r requirements.txt
    deactivate
fi

if [ -n "$TERMINAL_CMD" ]; then
    # Launch the Python script in a new terminal window/tab
    $TERMINAL_CMD --title="Cat Recognition Python" $TAB_ARG -e bash -c "cd /root/DATN/CatRecognition2 && echo 'Starting Python service...' && source venv/bin/activate && python lost_and_found_cat.py; exec bash" &
    echo "Python script is starting in new terminal window..."
else
    # Run in background if no terminal emulator available
    echo "Starting Python script in background..."
    cd /root/DATN/CatRecognition2
    source venv/bin/activate
    nohup python lost_and_found_cat.py > /tmp/python-service.log 2>&1 &
    PYTHON_PID=$!
    echo "Python script started with PID: $PYTHON_PID (log: /tmp/python-service.log)"
    deactivate
fi

echo
echo "========================================"
echo "    All development services launched!"
echo "========================================"
echo

if [ -n "$TERMINAL_CMD" ]; then
    echo "All development services are launching in separate terminal windows/tabs."
    echo "Please check each new terminal for their respective output and status."
    echo
    echo "Services running:"
    echo "- .NET WebServer: Check terminal titled 'PetConnect WebServer (Dev)'"
    echo "- React Frontend: Check terminal titled 'Lost Pet Finder React App (Dev)'"
    echo "- Python Service: Check terminal titled 'Cat Recognition Python'"
else
    echo "All services are running in background. Process IDs:"
    [ ! -z "${DOTNET_PID}" ] && echo "- .NET WebServer PID: $DOTNET_PID (log: /tmp/dotnet-webserver.log)"
    [ ! -z "${REACT_PID}" ] && echo "- React App PID: $REACT_PID (log: /tmp/react-app.log)"
    [ ! -z "${PYTHON_PID}" ] && echo "- Python Service PID: $PYTHON_PID (log: /tmp/python-service.log)"
    echo
    echo "To stop services, use: kill <PID>"
    echo "To view logs, use: tail -f /tmp/<service>.log"
fi

echo
echo "=== DEVELOPMENT URLS (once services are ready) ==="
echo "- .NET WebServer: http://localhost:5000 or https://localhost:5001"
echo "- React Frontend: http://localhost:3000"
echo "- Python AI Service: Check respective terminal/log for status"
echo
echo "Press Ctrl+C to exit this script (services will continue running)"

# Keep script running to show any immediate errors
sleep 5

echo "Script completed. Services should now be running."
echo "Use 'ps aux | grep -E \"dotnet|npm|python\"' to check running processes."