@echo off
REM This script automates launching all PetConnect services in production mode.

title PetConnect Production Services

echo.
echo --- Starting .NET WebServer in Production Mode ---
REM Change directory to the published .NET WebServer
cd /d "D:\DATN\PetConnect\WebServer\publish"
REM Launch the .NET application in a new command prompt window
start "PetConnect WebServer (Production)" cmd /k "dotnet PetConnect.dll"
echo .NET WebServer is starting in production mode... (check the new window)

echo.
echo --- Starting Next.js Frontend in Production Mode ---
REM Change directory to your Next.js application
cd /d "D:\DATN\lost-pet-finder"
REM Launch the Next.js app in production mode in a new command prompt window
start "Lost Pet Finder Frontend (Production)" cmd /k "npm run start"
echo Next.js Frontend is starting in production mode... (check the new window)

echo.
echo --- Starting Python AI Service in WSL ---
REM Launch WSL, navigate to the directory, activate the venv, and run the Python script
REM "--cd" ensures WSL starts in the correct directory
REM "bash -c" allows multiple commands to be chained
start "Cat Recognition Service (Production)" wsl.exe --cd "/mnt/d/DATN/CatRecognition2" bash -c "source venv/bin/activate && python lost_and_found_cat.py"
echo Python AI service is starting in WSL... (check the new WSL window)

echo.
echo All production services are launching in separate windows.
echo Please check each new window for their respective output and status.
echo.
echo === IMPORTANT NOTES ===
echo 1. Make sure you have built all services for production before running this script.
echo 2. The .NET WebServer should be published to D:\DATN\PetConnect\WebServer\publish
echo 3. The Next.js frontend should be built using 'npm run build'
echo 4. The Python service requires its virtual environment to be properly set up
echo.
echo Press any key to close this launcher window (services will continue running)...
pause
REM Exit this launcher script, but keep the other windows open
exit 