import os
from pinecone import Pinecone

# --- Configuration ---
PINECONE_API_KEY = "pcsk_6MhuxD_5nm5cJpQxGenWAKdQTKhzhjop8Y2tUt141bmp8gyvGKXxJgzPwbvv1Bar43AQgt" # Replace with your key or set env var
INDEX_NAME = "pet-finder" # Replace with your index name if different
NAMESPACES_TO_CLEAR = ["lost-cats", "found-cats"] # List of namespaces to clear

# --- Initialization ---
if PINECONE_API_KEY == "YOUR_API_KEY":
    print("Error: Pinecone API key not found. Please set the PINECONE_API_KEY environment variable or replace 'YOUR_API_KEY' in the script.")
    exit(1)

try:
    print("Initializing Pinecone connection...")
    pc = Pinecone(api_key=PINECONE_API_KEY)
    
    print("Listing indexes...")
    # Fetch the list of index names
    index_list_obj = pc.list_indexes()
    available_indexes = index_list_obj.names
    print(f"Available indexes: {available_indexes}")

    print(f"Checking if index '{INDEX_NAME}' exists...")
    # if INDEX_NAME not in available_indexes:
    #     print(f"Error: Index '{INDEX_NAME}' does not exist in the available list: {available_indexes}.")
    #     exit(1)
        
    print(f"Index '{INDEX_NAME}' found.")
    index = pc.Index(INDEX_NAME)
    print(f"Connected to index '{INDEX_NAME}'.")
    print("Fetching initial index stats...")
    stats = index.describe_index_stats()
    print(stats)

except Exception as e:
    print(f"Error connecting to Pinecone or index: {e}")
    # Add traceback for more detailed debugging
    import traceback
    traceback.print_exc()
    exit(1)

# --- Deletion Logic ---
def clear_namespaces(namespaces: list[str]):
    """Deletes all vectors within the specified namespaces."""
    if not namespaces:
        print("No namespaces specified to clear.")
        return

    print("\\n--- Starting Deletion ---")
    confirm = input(f"WARNING: This will permanently delete ALL data from the following namespaces in index '{INDEX_NAME}': {', '.join(namespaces)}. \\nAre you sure you want to proceed? (yes/no): ")

    if confirm.lower() != 'yes':
        print("Deletion cancelled.")
        return

    for namespace in namespaces:
        try:
            print(f"Attempting to delete all vectors in namespace: '{namespace}'...")
            index.delete(delete_all=True, namespace=namespace)
            print(f"Successfully cleared namespace: '{namespace}'.")
        except Exception as e:
            print(f"Error clearing namespace '{namespace}': {e}")

    print("\\n--- Deletion Complete ---")
    print("Verifying index stats after deletion:")
    try:
        print(index.describe_index_stats())
    except Exception as e:
        print(f"Error fetching index stats after deletion: {e}")

# --- Execution ---
if __name__ == "__main__":
    clear_namespaces(NAMESPACES_TO_CLEAR)