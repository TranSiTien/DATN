import os
import torch
import numpy as np
import torchvision.transforms as transforms
import transforms as T
from PIL import Image
from torch.utils.data import Dataset

class ClassPhotosIndex:
    def __init__(self, from_idx: int, to_idx: int):
        self.from_idx = from_idx
        self.to_idx = to_idx
        
class DatasetPhoto:
    def __init__(self, photo_path: str, label: str):
        self.photo_path = photo_path
        self.label = label
        
class ContrastiveDataset(Dataset):
    def __init__(self, photos_root_folder: str, selected_folders: list[str], transform):
        self.transform = transform
        self.photos: list[DatasetPhoto] = []
        self.class_indices: dict[str, ClassPhotosIndex] = {}
        self.total_photos = 0
        for class_name in selected_folders:
            class_folder = os.path.join(photos_root_folder, class_name)
            class_photos = os.listdir(class_folder)
            from_idx = self.total_photos
            for photo in class_photos:
                photo_path = os.path.join(class_folder, photo)
                self.photos.append(DatasetPhoto(photo_path, class_name))
                self.total_photos += 1
            to_idx = self.total_photos
            self.class_indices[class_name] = ClassPhotosIndex(from_idx, to_idx)
    
    def __len__(self):
        return self.total_photos
    
    """
    The return shape: [3, num_channels, height, width], the first image is the anchor, the second image is the similar image, the third image is the different image.
    """
    def __getitem__(self, idx):
        selected_photo = self.photos[idx]
        selected_class = selected_photo.label
        
        class_photos_count = self.class_indices[selected_class].to_idx - self.class_indices[selected_class].from_idx
        other_classes_photos_count = self.total_photos - class_photos_count
        
        similar_index = np.random.randint(self.class_indices[selected_class].from_idx, self.class_indices[selected_class].to_idx - 1)
        
        if similar_index == idx:
            similar_index = (similar_index + 1) % class_photos_count
            
        different_index = np.random.randint(0, other_classes_photos_count)
        if different_index >= self.class_indices[selected_class].from_idx:
            different_index += class_photos_count
            
        # load images
        loaded_photos = []
        for photo_idx in [idx, similar_index, different_index]:
            photo = self.photos[photo_idx]
            image = Image.open(photo.photo_path)
            if image.mode != "RGB":
                image = image.convert("RGB")
            
            image = self.transform(image).to('cpu')
            loaded_photos.append(image)
            
        # convert to tensors
        tensor = torch.stack(loaded_photos)
        return tensor
    
class PhotoLoadingDataset(Dataset):
    def __init__(self, photos_folder: str, selected_folders: list[str], transform):
        self.photos_folder = photos_folder
        self.transform = transform
        self.total_photos = 0
        self.photo_paths = []
        self.photo_labels = []
        for i, class_name in enumerate(selected_folders):
            class_folder = os.path.join(photos_folder, class_name)
            class_photos = os.listdir(class_folder)
            for photo in class_photos:
                photo_path = os.path.join(class_folder, photo)
                self.photo_paths.append(photo_path)
                self.photo_labels.append(class_name)
                self.total_photos += 1
            
        
    def __len__(self):
        return self.total_photos
    
    def __getitem__(self, idx):
        photo_path = self.photo_paths[idx]
        label = self.photo_labels[idx]
        image = Image.open(photo_path)
        
        if image.mode != "RGB":
            image = image.convert("RGB")
        
        image = self.transform(image).to('cpu')
        return image, label
            
transforms_registry = {}

def register_transform(name):
    def register_transform_fn(fn):
        transforms_registry[name] = fn
        return fn
    return register_transform_fn

@register_transform('train_1')
def get_train_transform_1(input_size):
    return transforms.Compose([
        T.RandomCrop(scale=(0.5, 1.0), ratio=(3./4., 4./3.)),
        T.PaddedSquareResize(input_size),
        transforms.RandomRotation(180),
        transforms.ColorJitter(brightness=0.3, contrast=0.5, saturation=0.2, hue=0),
        transforms.ToTensor()
    ])

@register_transform('test')
def get_test_transform(input_size):
    return transforms.Compose([
        T.PaddedSquareResize(input_size),
        transforms.ToTensor()
    ])