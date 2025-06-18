import os
import torch
import torch.nn.functional as F
import argparse
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
        raise FileNotFoundError(f"Args file not found in {log_folder}")
    
    with open(args_path, 'r') as f:
        import json
        args = json.load(f)
        
    # Create model
    model_name = args.get('model', 'ModelA')
    
    if model_name not in model_registry:
        raise ValueError(f"Model {model_name} not found in registry")
    
    model = model_registry[model_name]()
    
    # Load model weights
    model_path = os.path.join(log_folder, LOGS_MODEL_FILE_NAME)
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found in {log_folder}")
    
    model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))
    model.eval()
    
    return model, args

def process_image(image_path, transform):
    image = Image.open(image_path)
    if image.mode != "RGB":
        image = image.convert("RGB")
    return transform(image).unsqueeze(0)  # Add batch dimension

def calculate_similarity(embedding1, embedding2):
    # Compute cosine similarity
    cosine_sim = F.cosine_similarity(embedding1, embedding2).item()
    # Convert to percentage (0-100)
    percentage = (cosine_sim + 1) / 2 * 100
    return percentage

def main():
    parser = argparse.ArgumentParser(description='Compare cat image similarity')
    parser.add_argument('--ref_folder', type=str, required=True, 
                        help='Folder containing reference cat images')
    parser.add_argument('--input_image', type=str, required=True,
                        help='Path to the input image to compare')
    parser.add_argument('--logs_folder', type=str, required=True,
                        help='Path to the logs folder containing the trained model')
    parser.add_argument('--threshold', type=float, default=70.0,
                        help='Similarity threshold percentage (default: 70.0)')
    
    args = parser.parse_args()
    
    # Load the model and its configuration
    print(f"Loading model from {args.logs_folder}...")
    model, model_args = load_model(args.logs_folder)
    input_size = model_args.get('input_size', 224)
    
    # Get the test transform
    transform = transforms_registry['test'](input_size)
    
    # Process the input image
    print(f"Processing input image: {args.input_image}")
    input_tensor = process_image(args.input_image, transform)
    input_embedding = model(input_tensor).detach().numpy()[0]
    # print(len(input_embedding))
    # Process all reference images
    print(f"Processing reference images from {args.ref_folder}")
    similarity_scores = []
    
    # Get all image files (with common extensions)
    ref_images = []
    for root, _, files in os.walk(args.ref_folder):
        for file in files:
            if file.lower().endswith(('.png', '.jpg', '.jpeg')):
                ref_images.append(os.path.join(root, file))
    
    if not ref_images:
        print(f"No images found in {args.ref_folder}")
        return
    
    # prototypes : np.float32 = []

    # for i, label in enumerate(labels):
    #     # print(i, label)
    #     class_embeddings = embeddings[labels == label]
    #     # print(class_embeddings)
    #     class_prototype = np.mean(class_embeddings, axis=0)
    #     # print(class_prototype)
    #     prototypes[label] = class_prototype
    # print(len(prototypes[416655]))
    ref_embeddings = []
    # Process each reference image
    for ref_image_path in tqdm(ref_images):
        ref_tensor = process_image(ref_image_path, transform)
        ref_embedding = model(ref_tensor)
        ref_embeddings.append(ref_embedding.detach().numpy()[0])
        
    class_prototype = np.mean(ref_embeddings, axis=0)
    
    dist = np.linalg.norm(class_prototype - input_embedding)
    print(dist)
    
    #         # Calculate similarity
    #         similarity = calculate_similarity(input_embedding, ref_embedding)
    #         similarity_scores.append((ref_image_path, similarity))
    #     except Exception as e:
    #         print(f"Error processing {ref_image_path}: {e}")
    
    # # Sort by similarity (highest first)
    # similarity_scores.sort(key=lambda x: x[1], reverse=True)
    
    # # Calculate average similarity
    # avg_similarity = np.mean([score for _, score in similarity_scores])
    
    # # Print results
    # print("\nResults:")
    # print(f"Average similarity: {avg_similarity:.2f}%")
    
    # # Check if over threshold
    # if avg_similarity >= args.threshold:
    #     print(f"The input image appears to be the same cat as in the reference folder (similarity: {avg_similarity:.2f}%)")
    # else:
    #     print(f"The input image appears to be a different cat (similarity: {avg_similarity:.2f}%)")
    
    # # Print top 5 most similar images
    # print("\nTop 5 most similar reference images:")
    # for i, (path, score) in enumerate(similarity_scores[:5], 1):
    #     print(f"{i}. {os.path.basename(path)}: {score:.2f}%")

if __name__ == "__main__":
    main() 