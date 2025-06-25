#!/bin/bash
# This script builds and launches .NET WebServer and React frontend in production mode.

set -e  # Exit on any error

echo "========================================"
echo "    PetConnect Production Build & Deploy"
echo "========================================"
echo

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a service is running on a specific port
is_port_in_use() {
    local port=$1
    netstat -tuln 2>/dev/null | grep -q ":$port " || ss -tuln 2>/dev/null | grep -q ":$port "
}

# Function to find and kill processes by name and path
kill_service() {
    local service_name=$1
    
    echo "Checking for existing $service_name processes..."
    
    local pids=""
    if [ "$service_name" == "dotnet" ]; then
        pids=$(pgrep -f "dotnet.*WebServer\|dotnet.*PetConnect" 2>/dev/null || true)
    elif [ "$service_name" == "npm" ]; then
        pids=$(pgrep -f "npm.*start\|node.*server.js\|next.*start" 2>/dev/null || true)
    fi
    
    if [ ! -z "$pids" ]; then
        echo "Found existing $service_name processes: $pids"
        echo "Stopping existing $service_name processes..."
        for pid in $pids; do
            kill -TERM $pid 2>/dev/null || true
            sleep 1
            if kill -0 $pid 2>/dev/null; then
                kill -KILL $pid 2>/dev/null || true
            fi
        done
        echo "Existing $service_name processes stopped."
        sleep 2
    else
        echo "No existing $service_name processes found."
    fi
}

# Check for restart option
RESTART_MODE=false
BUILD_ONLY=false

if [ "$1" == "--restart" ] || [ "$1" == "-r" ]; then
    RESTART_MODE=true
    echo "RESTART MODE: Will stop existing services before building and starting"
    echo
elif [ "$1" == "--build-only" ] || [ "$1" == "-b" ]; then
    BUILD_ONLY=true
    echo "BUILD ONLY MODE: Will only build projects without running"
    echo
elif [ "$1" == "--stop" ] || [ "$1" == "-s" ]; then
    echo "--- Stopping All Production Services ---"
    kill_service "dotnet"
    kill_service "npm"
    echo "All services stopped."
    exit 0
fi

# Check if services are already running
echo "--- Checking Current Service Status ---"
DOTNET_RUNNING=false
REACT_RUNNING=false

if is_port_in_use 5049; then
    echo "⚠️  .NET WebServer appears to be running (port 5049 in use)"
    DOTNET_RUNNING=true
fi

if is_port_in_use 3000; then
    echo "⚠️  React App appears to be running (port 3000 in use)"
    REACT_RUNNING=true
fi

if [ "$DOTNET_RUNNING" == "false" ] && [ "$REACT_RUNNING" == "false" ]; then
    echo "✅ No services currently running"
else
    echo
    if [ "$RESTART_MODE" == "false" ] && [ "$BUILD_ONLY" == "false" ]; then
        echo "❓ Some services are already running. Choose an option:"
        echo "1) Stop existing and rebuild/restart all services"
        echo "2) Only build (don't run services)"
        echo "3) Exit without changes"
        read -p "Enter your choice (1-3): " choice
        
        case $choice in
            1)
                RESTART_MODE=true
                ;;
            2)
                BUILD_ONLY=true
                ;;
            3)
                echo "Exiting..."
                exit 0
                ;;
            *)
                echo "Invalid choice. Exiting..."
                exit 1
                ;;
        esac
    fi
fi

echo

# Stop existing services if in restart mode
if [ "$RESTART_MODE" == "true" ]; then
    echo "--- Stopping Existing Services ---"
    kill_service "dotnet"
    kill_service "npm"
    echo "All existing services stopped."
    echo
    
    DOTNET_RUNNING=false
    REACT_RUNNING=false
fi

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

echo "All prerequisites found!"
echo

# Build .NET WebServer
echo "========================================="
echo "--- Building .NET WebServer (Production) ---"
echo "========================================="
cd /root/DATN/PetConnect/WebServer

echo "Cleaning previous builds..."
dotnet clean --configuration Release

echo "Restoring NuGet packages..."
dotnet restore

echo "Building and publishing for production..."
dotnet publish -c Release -o ./publish --no-restore

if [ $? -eq 0 ]; then
    echo "✅ .NET WebServer build completed successfully!"
else
    echo "❌ .NET WebServer build failed!"
    exit 1
fi

echo

# Build React Frontend
echo "========================================="
echo "--- Building React Frontend (Production) ---"
echo "========================================="
cd /root/DATN/lost-pet-finder

echo "Installing/updating npm dependencies..."
npm ci --production=false

echo "Building React app for production..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ React Frontend build completed successfully!"
else
    echo "❌ React Frontend build failed!"
    exit 1
fi

echo

# If build-only mode, exit here
if [ "$BUILD_ONLY" == "true" ]; then
    echo "========================================="
    echo "    Build completed successfully!"
    echo "========================================="
    echo
    echo "Built artifacts:"
    echo "- .NET WebServer: /root/DATN/PetConnect/WebServer/publish/"
    echo "- React Frontend: /root/DATN/lost-pet-finder/.next/"
    echo
    echo "To run services, use: ./start-production.sh"
    exit 0
fi

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

echo "========================================="
echo "--- Starting Production Services ---"
echo "========================================="

# Start .NET WebServer in Production Mode
if [ "$DOTNET_RUNNING" == "false" ]; then
    echo "--- Starting .NET WebServer (Production) ---"
    cd /root/DATN/PetConnect/WebServer/publish

    if [ -n "$TERMINAL_CMD" ]; then
        $TERMINAL_CMD --title="PetConnect WebServer (Production)" $TAB_ARG -e bash -c "cd /root/DATN/PetConnect/WebServer/publish && echo 'Starting .NET WebServer in Production...' && dotnet PetConnect.dll; exec bash" &
        echo ".NET WebServer is starting in new terminal window..."
    else
        echo "Starting .NET WebServer in background..."
        nohup dotnet PetConnect.dll > /tmp/dotnet-production.log 2>&1 &
        DOTNET_PID=$!
        echo ".NET WebServer started with PID: $DOTNET_PID (log: /tmp/dotnet-production.log)"
    fi
    sleep 3
else
    echo "--- .NET WebServer already running, skipping ---"
fi

echo

# Start React App in Production Mode
if [ "$REACT_RUNNING" == "false" ]; then
    echo "--- Starting React Frontend (Production) ---"
    cd /root/DATN/lost-pet-finder

    if [ -n "$TERMINAL_CMD" ]; then
        $TERMINAL_CMD --title="Lost Pet Finder Frontend (Production)" $TAB_ARG -e bash -c "cd /root/DATN/lost-pet-finder && echo 'Starting React App in Production...' && npm start; exec bash" &
        echo "React Frontend is starting in new terminal window..."
    else
        echo "Starting React Frontend in background..."
        nohup npm start > /tmp/react-production.log 2>&1 &
        REACT_PID=$!
        echo "React Frontend started with PID: $REACT_PID (log: /tmp/react-production.log)"
    fi
    sleep 3
else
    echo "--- React Frontend already running, skipping ---"
fi

echo
echo "========================================="
echo "    Production Services Launched!"
echo "========================================="
echo

if [ -n "$TERMINAL_CMD" ]; then
    echo "Production services are running in separate terminal windows:"
    echo "- .NET WebServer: Terminal titled 'PetConnect WebServer (Production)'"
    echo "- React Frontend: Terminal titled 'Lost Pet Finder Frontend (Production)'"
else
    echo "Production services running in background:"
    [ ! -z "${DOTNET_PID}" ] && echo "- .NET WebServer PID: $DOTNET_PID (log: /tmp/dotnet-production.log)"
    [ ! -z "${REACT_PID}" ] && echo "- React Frontend PID: $REACT_PID (log: /tmp/react-production.log)"
    echo
    echo "Management commands:"
    echo "- Stop all: ./start-production.sh --stop"
    echo "- Restart all: ./start-production.sh --restart"
    echo "- Build only: ./start-production.sh --build-only"
    echo "- View logs: tail -f /tmp/*-production.log"
fi

echo
echo "=== PRODUCTION URLS ==="
echo "- Frontend: https://backhomepets.tech"
echo "- API: https://backhomepets.tech/api/"
echo "- Images: https://backhomepets.tech/uploads/"
echo "- API Documentation: https://backhomepets.tech:5049/swagger (if port 5049 is open)"
echo
echo "=== USAGE OPTIONS ==="
echo "- Normal run: ./start-production.sh"
echo "- Force restart: ./start-production.sh --restart"
echo "- Build only: ./start-production.sh --build-only"
echo "- Stop all services: ./start-production.sh --stop"
echo
echo "=== MONITORING ==="
echo "- Check processes: ps aux | grep -E \"dotnet|npm\""
echo "- Check ports: sudo ss -tlnp | grep -E \":3000|:5049\""
echo "- Check nginx: sudo systemctl status nginx"

echo
echo "Production deployment completed successfully! 🚀"