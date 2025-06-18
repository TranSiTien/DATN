@echo off
REM This script automates launching your .NET WebServer in development mode,
REM React frontend in development mode, and Python script in separate windows.

title Launching All PetConnect Dev Services

echo.
echo --- Starting .NET WebServer in Development Mode ---
REM Change directory to your .NET WebServer project
cd /d "D:\DATN\PetConnect\WebServer"
REM Launch the .NET application in a new command prompt window using 'dotnet run'
start "PetConnect WebServer (Dev)" cmd /k "dotnet run"
echo .NET WebServer is starting... (check the new window)

echo.
echo --- Starting React App in Development Mode (npm run dev) ---
REM Change directory to your React application
cd /d "D:\DATN\lost-pet-finder"
REM Launch the React app using 'npm run dev' in a new command prompt window
start "Lost Pet Finder React App (Dev)" cmd /k "npm run dev"
echo React App is starting... (check the new window)

echo.
echo --- Starting Python Script in WSL ---
REM Launch WSL, navigate to the directory, activate the venv, and run the Python script.
REM "--cd" ensures WSL starts in the correct directory.
REM "bash -c" allows multiple commands to be chained.
start "Cat Recognition Python (WSL)" wsl.exe --cd "/mnt/d/DATN/CatRecognition2" bash -c "source venv/bin/activate && python lost_and_found_cat.py"
echo Python script is starting in WSL... (check the new WSL window)

echo.
echo All development services are launching in separate windows.
echo Please check each new window for their respective output and status.
echo Once all services are running, you can close this launcher window.
echo.
pause
REM Exit this launcher script, but keep the other windows open
exit