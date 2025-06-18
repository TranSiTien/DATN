import requests
import json

class Pet:
    def __init__(self, id, name):
        self.id = id
        self.name = name

def get_actives(limit: int = 8, offset: int = 0, pet_type_id = 2) -> list[Pet]:
    base_url = "https://api.yummypets.com/pets/actives"
    payload = {
        "limit": limit,
        "pet_type_id": pet_type_id,
        "offset": offset
    }
    response = requests.get(base_url, params=payload)
    
    if response.status_code != 200:
        raise Exception(f"Error: {response.status_code} with {response.url}")
    
    data = response.json()
    pets = []
    for item in data["collection"]:
        resource = item["resource"]
        pet = Pet(resource["id"], resource["pseudo"])
        pets.append(pet)
        
    return pets

class Photo:
    def __init__(self, url: str, id: int):
        self.url = url
        self.id = id

def get_photos(pet_id: int, limit: int = 20, offset: int = 0) -> list[Photo]:
    base_url = f"https://api.yummypets.com/pets/{pet_id}/photos"
    payload = {
        "limit": limit,
        "offset": offset
    }
    response = requests.get(base_url, params=payload)
    
    if response.status_code == 403:
        raise PetPhotoForbiddenException("You don't have permission to access this pet's photos")
    
    if response.status_code != 200:
        raise Exception(f"Error: {response.status_code} with {response.url}")
    
    data = response.json()
    photos = []
    for item in data["collection"]:
        resource = item["resource"]
        photo = Photo(resource["urls"]["medium"], resource["id"])
        photos.append(photo)
        
    return photos

def get_total_photos(pet_id) -> int:
    base_url = f"https://api.yummypets.com/pets/{pet_id}"
    response = requests.get(base_url)
    
    if response.status_code != 200:
        raise Exception(f"Error: {response.status_code} with {response.url}")
    
    data = response.json()
    return data["resource"]["statistics"]["photos"]

class PetPhotoForbiddenException(Exception):
    pass
        
    