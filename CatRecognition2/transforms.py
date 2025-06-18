import random, numpy as np, torch
from PIL import Image
from torchvision import transforms

class RandomCrop(torch.nn.Module):
    def __init__(self, scale=(0.08, 1.0), ratio=(3./4., 4. / 3.)):
        """
        Args:
            fraction (float): Fraction of the image size to crop. For example, 0.5 means 50% of the image size.
        """
        self.scale = scale
        self.ratio = np.array(ratio, dtype=np.float32)

    def __call__(self, image: Image.Image):
        width, height = np.array(image.size, dtype=np.int32)
        width_f, height_f = np.array(image.size, dtype=np.float32)
        new_scale = np.random.uniform(*self.scale)
        new_min_ratio = min(self.ratio[1], max(self.ratio[0], width_f * new_scale / height_f))
        new_max_ratio = max(self.ratio[0], min(self.ratio[1], width_f / (height_f * new_scale)))
        new_ratio = np.random.uniform(new_min_ratio, new_max_ratio)
        new_width = int(np.sqrt(new_scale * new_ratio) * width_f)
        new_height = int(np.sqrt(new_scale / new_ratio) * height_f)
        
        # ensure the new image size is smaller than the original image size
        new_width = min(new_width, width)
        new_height = min(new_height, height)
        
        # random crop and pad
        x1 = random.randint(0, width - new_width)
        y1 = random.randint(0, height - new_height)
        x2 = x1 + new_width
        y2 = y1 + new_height
        
        return image.crop((x1, y1, x2, y2))
    
class PaddedSquareResize(torch.nn.Module):
    def __init__(self, size: int, fill=0):
        self.size = np.int32(size)
        self.fill = fill

    def __call__(self, image: Image.Image):
        width, height = image.size
        width_f, height_f = np.array(image.size, dtype=np.float32)
        if width > height:
            new_width = self.size
            new_height = np.int32(height_f / width_f * self.size)
        else:
            new_height = self.size
            new_width = np.int32(width_f / height_f * self.size)
        
        image = image.resize((new_width, new_height), Image.Resampling.BICUBIC)
        new_image = Image.new(image.mode, (self.size, self.size), color=self.fill)
        new_image.paste(image, ((self.size - new_width) // 2, (self.size - new_height) // 2))
        return new_image