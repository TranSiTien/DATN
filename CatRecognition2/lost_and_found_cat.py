from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Path, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import torch
import os
import io
import json
import argparse
from PIL import Image
from datetime import datetime
from typing import List, Optional
import numpy as np
from pinecone import Pinecone, ServerlessSpec
from constants import *
from model import model_registry
from dataset import transforms_registry
from collections import Counter

# Define DIMENSION globally or retrieve it dynamically
DIMENSION = 512  # Assuming this is the dimension used when creating the index

app = FastAPI(
    title="Cat Recognition API",
    description="""
    An AI-powered API for matching lost and found cats using computer vision.
    
    ## Features
    - Upload images of lost cats to find matches with found cats
    - Upload images of found cats to find matches with lost cats
    - Search for similar cats using vector IDs
    - Real-time cat matching using deep learning
    
    ## How it works
    The system uses a deep learning model to extract visual features from cat images
    and stores them in a vector database (Pinecone) for efficient similarity search.
    """,
    version="1.0.0",
    contact={
        "name": "Cat Recognition Team",
    },
    license_info={
        "name": "MIT",
    }
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
model = None
transform = None
device = None
pc = None
index = None

def init_pinecone():
    global pc, index
    pc = Pinecone(api_key="pcsk_52ou8p_DiNB1eNfgKZeMnUv2r4Tumpyc496z6YNMoD3T8enAjYcJfHt5NdBH2pe8vpv3NM")
    INDEX_NAME = "pet-connect2"

    try:
        index = pc.Index(INDEX_NAME)
        print(f"Successfully connected to existing index '{INDEX_NAME}'")
    except Exception as e:
        if "not found" in str(e).lower():
            print(f"Creating new index '{INDEX_NAME}'...")
            pc.create_index(
                name=INDEX_NAME,
                dimension=DIMENSION,
                metric="euclidean",
                spec=ServerlessSpec(
                    cloud="aws",
                    region="us-east-1"
                )
            )
            index = pc.Index(INDEX_NAME)
        else:
            raise e

@app.on_event("startup")
async def startup_event():
    global model, transform, device
    print("Initializing model and Pinecone...")
    
    # Use the same log folder as eval_similarity notebook
    log_folder = 'logs/2025-04-20_09-31-33'  # This is the reference log folder
    print(f"Loading model from {log_folder}")
    
    # Load args from the log folder 
    args = argparse.Namespace()
    args_path = os.path.join(log_folder, LOGS_ARGS_FILE_NAME)
    with open(args_path, 'r') as f:
        args.__dict__ = json.load(f)
    
    # Set device before model creation
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    # Initialize model
    model = model_registry[args.model]().to(device)
    
    # Load model weights
    model_path = os.path.join(log_folder, LOGS_MODEL_FILE_NAME)
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.eval()
    
    # Initialize transform
    input_size = getattr(args, 'input_size', 224)  # Get input_size from args with default 224
    transform = transforms_registry['test'](input_size)
    
    # Initialize Pinecone
    init_pinecone()
    print("Initialization complete!")

def process_image(image_bytes):
    """Process a single image and return its embedding"""
    try:
        image = Image.open(io.BytesIO(image_bytes))
        if image.mode != "RGB":
            image = image.convert("RGB")
        tensor = transform(image).unsqueeze(0).to(device)
        
        with torch.no_grad():
            embedding = model(tensor)
        return embedding.cpu().numpy()[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing image: {str(e)}")

@app.post("/upload/lost-cat",
    summary="Upload Lost Cat Images",
    description="""
    Upload one or more images for a specific lost cat identified by `cat_id`.
    The system extracts visual features and stores them for later matching.
    """,
    response_description="Returns a success message confirming processing.",
    responses={
        200: {
            "description": "Successfully processed images",
            "content": {
                "application/json": {
                    "example": {
                        "message": "Successfully processed 2 images for cat ID lost-cat-123"
                    }
                }
            }
        },
        400: {
            "description": "No images provided or invalid input"
        },
        500: {
            "description": "Internal server error during processing"
        }
    }
)
async def upload_lost_cat(
    images: List[UploadFile] = File(..., description="One or more images of the lost cat"),
    cat_id: str = Form(..., description="Unique identifier for the lost cat")
):
    """
    Upload images for a lost cat. Stores embeddings in the 'lost-cats' namespace.
    """
    if not images:
        raise HTTPException(status_code=400, detail="No images provided")

    processed_count = 0
    vectors_to_upsert = []

    for i, img in enumerate(images):
        try:
            contents = await img.read()
            embedding = process_image(contents)

            # Generate a unique vector ID for this image associated with the cat_id
            vector_id = f"{cat_id}-{i}-{img.filename}"

            vectors_to_upsert.append({
                "id": vector_id,
                "values": embedding.tolist(),
                "metadata": {
                    "type": "lost",
                    "cat_id": cat_id,
                    "filename": img.filename,
                    "timestamp": datetime.now().isoformat()
                }
            })
            processed_count += 1

        except HTTPException as http_exc:
            raise http_exc
        except Exception as e:
            print(f"Error processing image {img.filename} for cat {cat_id}: {str(e)}")

    if not vectors_to_upsert:
         raise HTTPException(status_code=500, detail=f"Failed to process any images for cat ID {cat_id}")

    try:
        index.upsert(vectors=vectors_to_upsert, namespace="lost-cats")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error upserting vectors to Pinecone for cat ID {cat_id}: {str(e)}")

    return JSONResponse(content={"message": f"Successfully processed {processed_count} images for cat ID {cat_id}"})

@app.post("/upload/found-cat",
    summary="Upload Found Cat Images",
    description="""
    Upload one or more images for a specific found cat identified by `cat_id`.
    The system extracts visual features and stores them for later matching.
    """,
    response_description="Returns a success message confirming processing.",
    responses={
        200: {
            "description": "Successfully processed images",
            "content": {
                "application/json": {
                    "example": {
                        "message": "Successfully processed 1 image for cat ID found-cat-456"
                    }
                }
            }
        },
        400: {
            "description": "No images provided or invalid input"
        },
        500: {
            "description": "Internal server error during processing"
        }
    }
)
async def upload_found_cat(
    images: List[UploadFile] = File(..., description="One or more images of the found cat"),
    cat_id: str = Form(..., description="Unique identifier for the found cat")
):
    """
    Upload images for a found cat. Stores embeddings in the 'found-cats' namespace.
    """
    if not images:
        raise HTTPException(status_code=400, detail="No images provided")

    processed_count = 0
    vectors_to_upsert = []

    for i, img in enumerate(images):
        try:
            contents = await img.read()
            embedding = process_image(contents)

            # Generate a unique vector ID
            vector_id = f"{cat_id}-{i}-{img.filename}"

            vectors_to_upsert.append({
                "id": vector_id,
                "values": embedding.tolist(),
                "metadata": {
                    "type": "found",
                    "cat_id": cat_id,
                    "filename": img.filename,
                    "timestamp": datetime.now().isoformat()
                }
            })
            processed_count += 1

        except HTTPException as http_exc:
            raise http_exc
        except Exception as e:
            print(f"Error processing image {img.filename} for cat {cat_id}: {str(e)}")

    if not vectors_to_upsert:
         raise HTTPException(status_code=500, detail=f"Failed to process any images for cat ID {cat_id}")

    try:
        index.upsert(vectors=vectors_to_upsert, namespace="found-cats")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error upserting vectors to Pinecone for cat ID {cat_id}: {str(e)}")

    return JSONResponse(content={"message": f"Successfully processed {processed_count} images for cat ID {cat_id}"})

@app.post("/search/similar-cats-by-image",
    summary="Search for Similar Cats by Image Upload",
    description="Upload an image of a cat and search for the most similar cats in the specified namespace ('lost-cats' or 'found-cats'). Optionally filter results to include only specific target cat IDs. Returns the top unique cat IDs based on similarity.",
    response_description="Returns a list of the most similar unique cat IDs and their best similarity scores.",
    responses={
        200: {
            "description": "List of similar cat IDs found",
            "content": {
                "application/json": {
                    "example": {
                        "matches": [
                            {"cat_id": "cat-123", "best_score": 0.85},
                            {"cat_id": "cat-456", "best_score": 0.78},
                        ]
                    }
                }
            }
        },
        400: {
            "description": "Invalid input (e.g., no image, invalid namespace)"
        },
        500: {
            "description": "Internal server error during processing or search"
        }
    }
)
async def search_similar_cats_by_image(
    image: UploadFile = File(..., description="Image of the cat to search for"),
    namespace: str = Query(..., description="The namespace to search for matches within ('lost-cats' or 'found-cats')"),
    top_k: int = Query(5, description="Number of unique similar cat IDs to return", ge=1, le=20),
    candidates_k: int = Query(40, description="Number of initial candidate vectors to retrieve for analysis", ge=10, le=100),
    target_cat_ids: Optional[List[str]] = Query(None, description="Optional list of specific cat IDs to compare against. If provided, only these IDs will be considered in the results.")
):
    """
    Processes an uploaded image, queries Pinecone for similar image vectors,
    optionally filters by target_cat_ids, aggregates results by cat_id,
    and returns the top unique cat IDs based on frequency and proximity.
    """
    if namespace not in ["lost-cats", "found-cats"]:
        raise HTTPException(status_code=400, detail="Invalid namespace. Must be 'lost-cats' or 'found-cats'.")

    try:
        # Process the uploaded image
        contents = await image.read()
        query_embedding = process_image(contents)
        
        # Apply filter directly in the Pinecone query if target_cat_ids is provided
        filter_query = None
        if target_cat_ids:
            filter_query = {"cat_id": {"$in": target_cat_ids}}
            
        # Query Pinecone with the filter applied at index level if available
        query_response = index.query(
            namespace=namespace,
            vector=query_embedding.tolist(),
            top_k=candidates_k,
            include_metadata=True,
            filter=filter_query
        )

        if not query_response.matches:
            return JSONResponse(content={"matches": []})

        # Use dictionary for O(1) lookup instead of list operations
        cat_id_scores = {}
        cat_id_occurrences = {}

        # Process all matches in a single pass
        for match in query_response.matches:
            if not match.metadata or 'cat_id' not in match.metadata:
                continue
                
            cat_id = match.metadata['cat_id']
            score = float(match.score)
            
            # Update best score (lower is better for Euclidean distance)
            if cat_id not in cat_id_scores or score < cat_id_scores[cat_id]:
                cat_id_scores[cat_id] = score
                
            # Count occurrences
            cat_id_occurrences[cat_id] = cat_id_occurrences.get(cat_id, 0) + 1

        if not cat_id_scores:
            return JSONResponse(content={"matches": []})

        # Create a composite score considering both distance and frequency
        composite_scores = []
        for cat_id, score in cat_id_scores.items():
            # Normalize frequency to have a value between 0 and 1
            freq = cat_id_occurrences[cat_id] / candidates_k
            # Combine score and frequency (lower scores are better)
            composite_scores.append((cat_id, score, freq))
            
        # Sort results by score first (primary) and frequency second (secondary, in reverse)
        composite_scores.sort(key=lambda x: (x[1], -x[2]))
        
        # Take top_k results
        final_matches = [{"cat_id": cat_id, "best_score": score} 
                         for cat_id, score, _ in composite_scores[:1000]]

        return JSONResponse(content={"matches": final_matches})

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        print(f"Error during image similarity search for file {image.filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An error occurred during the search: {str(e)}")

@app.post("/search/similar-cats-by-cat-id",
    summary="Search for Similar Cats by Cat ID",
    description="""
    Search for similar cats based on all images associated with a given `cat_id`.
    Provide the `cat_id` and the `source_namespace` where its images are stored ('lost-cats' or 'found-cats').
    The search will be performed in the *opposite* namespace.
    Returns the top unique cat IDs found in the target namespace based on aggregated similarity.
    """,
    response_description="Returns a list of the most similar unique cat IDs and their best similarity scores.",
    responses={
        200: {
            "description": "List of similar cat IDs found",
            "content": {
                "application/json": {
                    "example": {
                        "matches": [
                            {"cat_id": "found-cat-789", "best_score": 0.82},
                            {"cat_id": "found-cat-101", "best_score": 0.75},
                        ]
                    }
                }
            }
        },
        400: {
            "description": "Invalid input (e.g., invalid cat_id, invalid namespace)"
        },
        404: {
            "description": "Cat ID not found in the source namespace"
        },
        500: {
            "description": "Internal server error during processing or search"
        }
    }
)
async def search_similar_cats_by_cat_id(
    cat_id: str = Query(..., description="The unique identifier of the cat to search with"),
    source_namespace: str = Query(..., description="The namespace where the source cat's images are stored ('lost-cats' or 'found-cats')"),
    top_k: int = Query(5, description="Number of unique similar cat IDs to return", ge=1, le=20),
    candidates_k: int = Query(40, description="Number of initial candidate vectors to retrieve per source image", ge=10, le=100)
):
    """
    Fetches all vectors for a given cat_id from the source_namespace,
    queries the opposite namespace for similar vectors using each source vector,
    aggregates results by target cat_id, and returns the top unique target cat IDs
    based on the best match score found across all queries.
    """
    if source_namespace not in ["lost-cats", "found-cats"]:
        raise HTTPException(status_code=400, detail="Invalid source_namespace. Must be 'lost-cats' or 'found-cats'.")

    target_namespace = "found-cats" if source_namespace == "lost-cats" else "lost-cats"

    try:
        # Fetch all vectors for the given cat_id from the source namespace
        fetch_response = index.query(
            namespace=source_namespace,
            vector=[0.0] * DIMENSION,  # Dummy vector
            filter={"cat_id": {"$eq": cat_id}},
            top_k=1000,  # Increased from 100 to potentially fetch all relevant vectors
            include_values=True,
            include_metadata=True
        )

        print(f"Pinecone query for source vectors returned {len(fetch_response.matches)} matches before filtering.")
        if fetch_response.matches:
            print(f"First few matches metadata (up to 5): {[m.metadata for m in fetch_response.matches[:1000]]}")

        # Filter safely, checking for metadata existence first
        source_vectors = []
        for match in fetch_response.matches:
            if match.metadata and match.metadata.get('cat_id') == cat_id:
                source_vectors.append(match.values)

        if not source_vectors:
            raise HTTPException(status_code=404, detail=f"No vectors found for cat_id '{cat_id}' in namespace '{source_namespace}'.")

        print(f"Found {len(source_vectors)} vectors for cat_id '{cat_id}'. Querying target namespace '{target_namespace}'...")

        # 2. Query the target namespace with each source vector and aggregate results
        all_matches = []
        for source_vector in source_vectors:
            query_response = index.query(
                namespace=target_namespace,
                vector=source_vector,
                top_k=candidates_k,
                include_metadata=True
            )
            all_matches.extend(query_response.matches)

        if not all_matches:
            return JSONResponse(content={"matches": []})

        target_cat_id_scores = {}

        for match in all_matches:
            if match.metadata and 'cat_id' in match.metadata:
                target_cat_id = match.metadata['cat_id']
                score = float(match.score)

                if target_cat_id not in target_cat_id_scores or score < target_cat_id_scores[target_cat_id]:
                    target_cat_id_scores[target_cat_id] = score

        if not target_cat_id_scores:
            return JSONResponse(content={"matches": []})

        sorted_matches = sorted(target_cat_id_scores.items(), key=lambda item: item[1])

        final_matches = []
        for cat_id_match, best_score in sorted_matches[:1000]:
            final_matches.append({
                "cat_id": cat_id_match,
                "best_score": best_score
            })

        return JSONResponse(content={"matches": final_matches})

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        print(f"Error during cat ID similarity search for cat_id {cat_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An error occurred during the search: {str(e)}")

@app.get("/status",
    summary="Get API Status",
    description="Get the current status of the API, model, and database connection",
    response_description="Returns the current system status",
    responses={
        200: {
            "description": "Current system status",
            "content": {
                "application/json": {
                    "example": {
                        "status": "running",
                        "model_loaded": True,
                        "device": "cuda",
                        "pinecone_connected": True
                    }
                }
            }
        }
    }
)
async def get_status():
    return {
        "status": "running",
        "model_loaded": model is not None,
        "device": str(device),
        "pinecone_connected": index is not None
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)