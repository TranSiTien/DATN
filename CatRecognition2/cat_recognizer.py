import os
import torch
import torch.nn.functional as F
import numpy as np
from PIL import Image
from tqdm import tqdm
from constants import *
from model import model_registry
from dataset import transforms_registry

def load_model(log_folder):
    # Load args from the log folder
    args_path = os.path.join(log_folder, LOGS_ARGS_FILE_NAME)
    
    if not os.path.exists(args_path):
        print(f"Error: Args file not found in {log_folder}")
        return None, None
    
    with open(args_path, 'r') as f:
        import json
        args = json.load(f)
        
    # Create model
    model_name = args.get('model', 'ModelA')
    
    if model_name not in model_registry:
        print(f"Error: Model {model_name} not found in registry")
        return None, None
    
    print(f"Using model: {model_name}")
    model = model_registry[model_name]()
    
    # Load model weights
    model_path = os.path.join(log_folder, LOGS_MODEL_FILE_NAME)
    if not os.path.exists(model_path):
        print(f"Error: Model file not found in {log_folder}")
        return None, None
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.to(device)
    model.eval()
    
    return model, args, device

def process_image(image_path, transform, device):
    image = Image.open(image_path)
    if image.mode != "RGB":
        image = image.convert("RGB")
    return transform(image).unsqueeze(0).to(device)  # Add batch dimension

def calculate_similarity(embedding1, embedding2):
    # Compute cosine similarity
    cosine_sim = F.cosine_similarity(embedding1, embedding2).item()
    # Convert to percentage (0-100)
    percentage = (cosine_sim + 1) / 2 * 100
    return percentage

def main():
    print("=" * 50)
    print("Cat Recognition System")
    print("=" * 50)
    
    # Ask for log folder
    while True:
        logs_folder = input("\nEnter the path to the logs folder containing the trained model: ")
        if os.path.exists(logs_folder):
            break
        print(f"Error: Folder '{logs_folder}' not found. Please enter a valid path.")
    
    # Load model
    print(f"\nLoading model from {logs_folder}...")
    model, model_args, device = load_model(logs_folder)
    
    if model is None:
        print("Failed to load model. Exiting.")
        return
    
    input_size = model_args.get('input_size', 224)
    transform = transforms_registry['test'](input_size)
    
    # Ask for reference folder
    while True:
        ref_folder = input("\nEnter the path to the folder containing reference cat images: ")
        if os.path.exists(ref_folder):
            break
        print(f"Error: Folder '{ref_folder}' not found. Please enter a valid path.")
    
    # Get all image files from reference folder
    ref_images = []
    for root, _, files in os.walk(ref_folder):
        for file in files:
            if file.lower().endswith(('.png', '.jpg', '.jpeg')):
                ref_images.append(os.path.join(root, file))
    
    if not ref_images:
        print(f"Error: No images found in {ref_folder}")
        return
    
    print(f"\nFound {len(ref_images)} reference images.")
    
    # Process reference images
    print("\nProcessing reference images...")
    ref_embeddings = []
    
    for ref_image_path in tqdm(ref_images):
        try:
            ref_tensor = process_image(ref_image_path, transform, device)
            with torch.no_grad():
                ref_embedding = model(ref_tensor)
            ref_embeddings.append((ref_image_path, ref_embedding))
        except Exception as e:
            print(f"Error processing {ref_image_path}: {e}")
    
    print(f"Successfully processed {len(ref_embeddings)} reference images")
    
    # Set threshold
    threshold = 70.0
    threshold_input = input(f"\nEnter similarity threshold percentage (default: {threshold}): ")
    if threshold_input.strip():
        try:
            threshold = float(threshold_input)
        except ValueError:
            print(f"Invalid input. Using default threshold: {threshold}%")
    
    # Continuously process input images until user exits
    while True:
        # Ask for input image
        input_image = input("\nEnter the path to the input image to compare (or 'exit' to quit): ")
        
        if input_image.lower() in ('exit', 'quit', 'q'):
            break
        
        if not os.path.exists(input_image):
            print(f"Error: Image '{input_image}' not found.")
            continue
        
        try:
            # Process input image
            print(f"\nProcessing input image: {input_image}")
            input_tensor = process_image(input_image, transform, device)
            
            with torch.no_grad():
                input_embedding = model(input_tensor)
            
            # Calculate similarities
            similarity_scores = []
            for ref_path, ref_embedding in ref_embeddings:
                similarity = calculate_similarity(input_embedding, ref_embedding)
                similarity_scores.append((ref_path, similarity))
            
            # Sort by similarity (highest first)
            similarity_scores.sort(key=lambda x: x[1], reverse=True)
            
            # Calculate average similarity
            avg_similarity = np.mean([score for _, score in similarity_scores])
            
            # Print results
            print("\nResults:")
            print(f"Average similarity: {avg_similarity:.2f}%")
            
            # Check if over threshold
            if avg_similarity >= threshold:
                print(f"The input image appears to be similar to the cats in the reference folder ({avg_similarity:.2f}%)")
            else:
                print(f"The input image does not appear to be similar to the cats in the reference folder ({avg_similarity:.2f}%)")
            
            # Print top 5 most similar images
            print("\nTop 5 most similar reference images:")
            for i, (path, score) in enumerate(similarity_scores[:5], 1):
                print(f"{i}. {os.path.basename(path)}: {score:.2f}%")
        
        except Exception as e:
            print(f"Error processing image: {e}")
    
    print("\nThank you for using the Cat Recognition System!")

if __name__ == "__main__":
    main() 