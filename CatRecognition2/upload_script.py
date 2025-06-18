import os
import requests
import glob
import random
import csv
import time

# --- Configuration ---
API_BASE_URL = "http://localhost:8000" # Adjust if your API runs elsewhere
DATA_DIR = "/mnt/d/DATN/CatRecognition2/data/processed/formatted_photos"
CSV_FILE = "/mnt/d/DATN/CatRecognition2/data/processed/selected_folders_for_model.csv"
REPORT_FILE = "/mnt/d/DATN/CatRecognition2/distribution_report.txt"
OVERLAP_PERCENTAGE = 0.08 # Percentage of IDs to make appear in both lost and found
REQUEST_TIMEOUT = 60 # Timeout for API requests in seconds
# --- End Configuration ---

def get_cat_ids_from_csv(csv_filepath):
    """Reads cat IDs (folder names) from the specified CSV file."""
    cat_ids = set()
    try:
        with open(csv_filepath, mode='r', newline='') as infile:
            reader = csv.DictReader(infile)
            if 'folder' not in reader.fieldnames:
                print(f"Error: CSV file '{csv_filepath}' must contain a 'folder' column.")
                return None
            for row in reader:
                cat_ids.add(row['folder'])
        print(f"Read {len(cat_ids)} unique cat IDs from {csv_filepath}")
        return list(cat_ids)
    except FileNotFoundError:
        print(f"Error: CSV file not found at {csv_filepath}")
        return None
    except Exception as e:
        print(f"Error reading CSV file {csv_filepath}: {e}")
        return None

def find_images(cat_id_folder):
    """Finds image files (jpg, jpeg, png) in a given folder."""
    image_patterns = [os.path.join(cat_id_folder, ext) for ext in ['*.jpg', '*.jpeg', '*.png']]
    images = []
    for pattern in image_patterns:
        images.extend(glob.glob(pattern))
    return images

def upload_images(cat_id, image_paths, upload_type):
    """Uploads images for a specific cat ID to the API."""
    if not image_paths:
        print(f"Warning: No images found for cat ID {cat_id}. Skipping upload.")
        return False

    endpoint = f"{API_BASE_URL}/upload/{upload_type}-cat"
    files_to_upload = []
    try:
        for img_path in image_paths:
            # Need to open files in binary mode for requests
            files_to_upload.append(('images', (os.path.basename(img_path), open(img_path, 'rb'), 'image/jpeg'))) # Adjust mime type if needed

        data = {'cat_id': cat_id}
        
        print(f"Uploading {len(files_to_upload)} images for cat ID {cat_id} as '{upload_type}'...")
        response = requests.post(endpoint, files=files_to_upload, data=data, timeout=REQUEST_TIMEOUT)

        # Close the opened files
        for _, file_tuple in files_to_upload:
            file_tuple[1].close()

        if response.status_code == 200:
            print(f"Successfully uploaded cat ID {cat_id} as '{upload_type}'. Response: {response.json()}")
            return True
        else:
            print(f"Error uploading cat ID {cat_id} as '{upload_type}'. Status: {response.status_code}, Response: {response.text}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"Network error uploading cat ID {cat_id} as '{upload_type}': {e}")
        # Ensure files are closed even on network error
        for _, file_tuple in files_to_upload:
            if not file_tuple[1].closed:
                file_tuple[1].close()
        return False
    except Exception as e:
        print(f"An unexpected error occurred during upload for cat ID {cat_id} as '{upload_type}': {e}")
        # Ensure files are closed on any error
        for _, file_tuple in files_to_upload:
             if not file_tuple[1].closed:
                file_tuple[1].close()
        return False


if __name__ == "__main__":
    cat_ids = get_cat_ids_from_csv(CSV_FILE)
    if cat_ids is None:
        exit(1)

    lost_ids = set()
    found_ids = set()
    failed_ids = set()
    initially_assigned = {} # Store initial assignment: {cat_id: 'lost'/'found'}

    print("\n--- Starting Initial Upload Pass ---")
    random.shuffle(cat_ids) # Process in random order

    for cat_id in cat_ids:
        cat_folder_path = os.path.join(DATA_DIR, cat_id)
        if not os.path.isdir(cat_folder_path):
            print(f"Warning: Folder not found for cat ID {cat_id} at {cat_folder_path}. Skipping.")
            failed_ids.add(cat_id)
            continue

        image_paths = find_images(cat_folder_path)
        if not image_paths:
             print(f"Warning: No images found in folder {cat_folder_path} for cat ID {cat_id}. Skipping.")
             failed_ids.add(cat_id)
             continue

        # Randomly assign initial type
        initial_type = random.choice(['lost', 'found'])
        initially_assigned[cat_id] = initial_type

        success = upload_images(cat_id, image_paths, initial_type)

        if success:
            if initial_type == 'lost':
                lost_ids.add(cat_id)
            else:
                found_ids.add(cat_id)
        else:
            failed_ids.add(cat_id)
        
        time.sleep(0.1) # Small delay between requests

    print("\n--- Initial Upload Pass Complete ---")
    print(f"Initially assigned {len(lost_ids)} as lost, {len(found_ids)} as found.")
    print(f"Failed to process {len(failed_ids)} IDs initially.")

    # --- Second Pass: Create Overlap ---
    print("\n--- Starting Overlap Upload Pass ---")
    both_ids = set()
    num_to_overlap = int(len(cat_ids) * OVERLAP_PERCENTAGE)
    
    # Select from lost to also upload as found
    lost_list = list(lost_ids)
    random.shuffle(lost_list)
    overlap_candidates_lost = lost_list[:num_to_overlap // 2] # Take half from lost

    for cat_id in overlap_candidates_lost:
        if cat_id in failed_ids: continue # Skip if initial upload failed
        
        cat_folder_path = os.path.join(DATA_DIR, cat_id)
        image_paths = find_images(cat_folder_path)
        
        print(f"Uploading overlapping ID {cat_id} (initially lost) as 'found'...")
        success = upload_images(cat_id, image_paths, 'found')
        if success:
            lost_ids.remove(cat_id)
            both_ids.add(cat_id)
        else:
            print(f"Failed to upload overlapping ID {cat_id} as 'found'.")
            # Keep it in lost_ids if overlap upload failed
        time.sleep(0.1)

    # Select from found to also upload as lost
    found_list = list(found_ids)
    random.shuffle(found_list)
    # Adjust count based on how many were successfully overlapped from lost
    remaining_overlap_count = num_to_overlap - len(both_ids) 
    overlap_candidates_found = found_list[:remaining_overlap_count]

    for cat_id in overlap_candidates_found:
        if cat_id in failed_ids: continue # Skip if initial upload failed

        cat_folder_path = os.path.join(DATA_DIR, cat_id)
        image_paths = find_images(cat_folder_path)

        print(f"Uploading overlapping ID {cat_id} (initially found) as 'lost'...")
        success = upload_images(cat_id, image_paths, 'lost')
        if success:
            found_ids.remove(cat_id)
            both_ids.add(cat_id)
        else:
            print(f"Failed to upload overlapping ID {cat_id} as 'lost'.")
            # Keep it in found_ids if overlap upload failed
        time.sleep(0.1)

    print("\n--- Overlap Upload Pass Complete ---")

    # --- Generate Report ---
    print(f"\n--- Generating Report: {REPORT_FILE} ---")
    final_lost_count = len(lost_ids)
    final_found_count = len(found_ids)
    final_both_count = len(both_ids)
    total_processed = final_lost_count + final_found_count + final_both_count

    try:
        with open(REPORT_FILE, 'w') as f:
            f.write("--- Cat Data Upload Distribution Report ---\n\n")
            f.write(f"Total Cat IDs from CSV: {len(cat_ids)}\n")
            f.write(f"Total Cat IDs Successfully Processed (at least once): {total_processed}\n")
            f.write(f"Total Cat IDs Failed Initial Upload: {len(failed_ids)}\n\n")
            f.write("Final Distribution:\n")
            f.write(f"- Only in 'lost-cats' namespace: {final_lost_count}\n")
            f.write(f"- Only in 'found-cats' namespace: {final_found_count}\n")
            f.write(f"- In BOTH 'lost-cats' and 'found-cats' namespaces: {final_both_count}\n\n")

            if failed_ids:
                f.write("IDs that failed initial processing:\n")
                for failed_id in sorted(list(failed_ids)):
                    f.write(f"- {failed_id}\n")
                f.write("\n")
                
            if both_ids:
                f.write("IDs present in BOTH namespaces:\n")
                for both_id in sorted(list(both_ids)):
                    f.write(f"- {both_id}\n")
            else:
                f.write("No IDs were configured to be in both namespaces.\n")

        print("Report generated successfully.")
    except Exception as e:
        print(f"Error writing report file {REPORT_FILE}: {e}")

    print("\n--- Script Finished ---")

