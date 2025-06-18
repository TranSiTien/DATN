import os
import logging  
import csv
from queue import Queue 
from PIL import Image

logger = logging.getLogger(__name__)

IGNORED_IMAGES_FILE = "ignored_files.csv"

class ImageFile:
    def __init__(self, folder, file):
        self.folder = folder
        self.file = file

    def __str__(self):
        return f"{self.folder}/{self.file}"

    def __eq__(self, other):
        return self.folder == other.folder and self.file == other.file

    def __hash__(self):
        return hash(str(self))
    
class BoundingBox:
    def __init__(self, x, y, width, height):
        self.x = x
        self.y = y
        self.width = width
        self.height = height

    def __str__(self):
        return f"{self.x}, {self.y}, {self.width}, {self.height}"

    def __eq__(self, other):
        return self.x == other.x and self.y == other.y and self.width == other.width and self.height == other.height

    def __hash__(self):
        return hash(str(self))

class DataTransfer:
    def __init__(self, input_folder, output_folder):
        # create output folder if it does not exist
        if not os.path.exists(output_folder):
            os.makedirs(output_folder)
        
        # create ignored files file if it does not exist
        self.ignored_images_file = os.path.join(output_folder, IGNORED_IMAGES_FILE)
        if not os.path.exists(self.ignored_images_file):
            with open(self.ignored_images_file, "w") as f:
                f.write("folder,file\n")
                
        # read ignored files and add to set
        self.ignored_images: set[ImageFile] = set()
        with open(self.ignored_images_file, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                self.ignored_images.add(ImageFile(row["folder"], row["file"]))
                
        logger.info(f"Ignored files: {len(self.ignored_images)}")
            
        # get all folders in output_folder
        input_folders = [f for f in os.listdir(input_folder) if os.path.isdir(os.path.join(input_folder, f))]
        output_folders = [f for f in os.listdir(output_folder) if os.path.isdir(os.path.join(output_folder, f))]

        existing_files: set[ImageFile] = set()
        for folder in output_folders:
            for file in os.listdir(os.path.join(output_folder, folder)):
                existing_files.add(ImageFile(folder, file))

        logger.info(f"Existing files: {len(existing_files)}")

        not_processed_files: Queue[ImageFile] = Queue()
        for folder in input_folders:
            for file in os.listdir(os.path.join(input_folder, folder)):
                image_file = ImageFile(folder, file)
                if image_file not in existing_files and image_file not in self.ignored_images:
                    image_file = ImageFile(folder, file)
                    if image_file not in existing_files:
                        not_processed_files.put(image_file)

        logger.info(f"Not processed files: {not_processed_files.qsize()}")
        self.not_processed_files = not_processed_files
        self.current_image: ImageFile | None = None
        self.input_folder = input_folder
        self.output_folder = output_folder
            

    def load_next_image(self)-> Image.Image | None:
        if self.not_processed_files.empty():
            self.current_image = None
            return None

        image_file = self.not_processed_files.get()
        self.current_image = image_file
        image = Image.open(os.path.join(self.input_folder, image_file.folder, image_file.file))
        return image
    
    def ignore_current_image(self):
        if self.current_image is None:
            return
        
        with open(self.ignored_images_file, "a", newline='') as f:
            writer = csv.DictWriter(f, fieldnames=["folder", "file"])
            writer.writerow({"folder": self.current_image.folder, "file": self.current_image.file})
            
        self.ignored_images.add(self.current_image)
    
    def apply_bounding_box(self, bounding_box: BoundingBox):
        if self.current_image is None:
            return
            
        image = Image.open(os.path.join(self.input_folder, self.current_image.folder, self.current_image.file))
        left = bounding_box.x
        top = bounding_box.y
        right = bounding_box.x + bounding_box.width
        bottom = bounding_box.y + bounding_box.height
        # check if bounding box is within image, if not, log warning and modify bounding box to fit within image
        if left < 0:
            logger.warning(f"Bounding box x is less than 0: {left}")
            left = 0
            
        if top < 0:
            logger.warning(f"Bounding box y is less than 0: {top}")
            top = 0
            
        if right > image.width:
            logger.warning(f"Bounding box right is greater than image width: {right}")
            right = image.width
            
        if bottom > image.height:
            logger.warning(f"Bounding box bottom is greater than image height: {bottom}")
            bottom = image.height
            
        cropped_image = image.crop((bounding_box.x, bounding_box.y, bounding_box.x + bounding_box.width, bounding_box.y + bounding_box.height))
        
        # create output folder if it does not exist
        output_image_folder = os.path.join(self.output_folder, self.current_image.folder)
        if not os.path.exists(output_image_folder):
            os.makedirs(output_image_folder)
            
        # if not RGB, convert to RGB
        if cropped_image.mode != "RGB":
            cropped_image = cropped_image.convert("RGB")
            
        cropped_image.save(os.path.join(self.output_folder, self.current_image.folder, self.current_image.file), "JPEG")