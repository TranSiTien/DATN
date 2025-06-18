import tkinter as tk
import logging
from tkinter import simpledialog
from typing import Callable
from enum import Enum
from data_transfer import DataTransfer, BoundingBox
from PIL import Image, ImageTk

from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

logging.basicConfig(level=logging.DEBUG, format="%(name)s - %(levelname)s - Line: %(lineno)d - %(message)s")
class Rect:
    def __init__(self, x1:int, y1:int, x2:int, y2:int):
        self.x1 = x1
        self.y1 = y1
        self.x2 = x2
        self.y2 = y2
        
    def __str__(self):
        return f"Rect: ({self.x1}, {self.y1}) ({self.x2}, {self.y2})"
    
    def __repr__(self):
        return self.__str__()
    
class Point:
    def __init__(self, x:int, y:int):
        self.x = x
        self.y = y
        
    def __str__(self):
        return f"Point: ({self.x}, {self.y})"
    
    def __repr__(self):
        return self.__str__()

class Box:
    def __init__(self, id:int, rect:Rect):
        self.id = id
        self.rect = rect
        
    def __str__(self):
        return f"Box {self.id}: {self.rect}"
    
    def __repr__(self):
        return self.__str__()
    
class BoxCorner(Enum):
    TOP_LEFT = 1
    TOP_RIGHT = 2
    BOTTOM_LEFT = 3
    BOTTOM_RIGHT = 4

class CanvasContext(ABC):
    @abstractmethod
    def get_boxes(self)->list[Box]:
        pass
    
    @abstractmethod
    def add_box(self, rect:Rect) -> Box:
        pass
    
    @abstractmethod
    def get_box(self, box_id:int) -> Box | None:
        pass
    
    @abstractmethod
    def select_box(self, box_id:int) -> None:
        pass
    
    @abstractmethod
    def deselect_box(self) -> None:
        pass
    
    @abstractmethod
    def move_box(self, box_id:int, point:Point) -> Box:
        pass
    
    @abstractmethod
    def resize_box(self, box_id:int, rect:Rect) -> Box:
        pass
    
class MouseContext(ABC):  
    @abstractmethod
    def on_mouse_drag(self, point:Point):
        pass
    
    @abstractmethod
    def on_mouse_release(self, point:Point):
        pass
    
class CreateBoxContext(MouseContext):
    def __init__(self, canvas_ctx:CanvasContext, x:int, y:int):
        self.canvas_ctx : CanvasContext = canvas_ctx
        self.box: Box = self.canvas_ctx.add_box(Rect(x, y, x, y))
        
    def on_mouse_drag(self, point:Point):
        self.canvas_ctx.resize_box(self.box.id, Rect(self.box.rect.x1, self.box.rect.y1, point.x, point.y))
            
    def on_mouse_release(self, point:Point):
        pass

    
class MoveBoxContext(MouseContext):
    def __init__(self, box_id:int, context:CanvasContext, point:Point):
        context.select_box(box_id)
        self.box_id = box_id
        self.canvas_ctx = context
        self.last_point = point
        
    def on_mouse_drag(self, point:Point):
        self.canvas_ctx.move_box(self.box_id, Point(point.x - self.last_point.x, point.y - self.last_point.y))
        self.last_point = point
            
    def on_mouse_release(self, point:Point):
        pass
    
class MoveBoxCornerContext(MouseContext):
    def __init__(self, box_id:int, context:CanvasContext, 
                 get_rect:Callable[[Point], Rect]):
        context.select_box(box_id)
        self.box_id = box_id
        self.canvas_ctx = context
        self.get_rect = get_rect
        
    def on_mouse_drag(self, point:Point):
        rect = self.get_rect(point)
        self.canvas_ctx.resize_box(self.box_id, rect)
        
    def on_mouse_release(self, point:Point):
        pass
    
class CornerRectProvider:
    def __init__(self, box:Box, corner:BoxCorner):
        self.box = box
        self.corner = corner
        self.x1_smaller = box.rect.x1 < box.rect.x2
        self.y1_smaller = box.rect.y1 < box.rect.y2
        
    def get_rect(self, point:Point) -> Rect:
        rect = self.box.rect
        x1, y1, x2, y2 = rect.x1, rect.y1, rect.x2, rect.y2
        if self.corner == BoxCorner.TOP_LEFT:
            x1 = point.x if self.x1_smaller else x1
            x2 = point.x if not self.x1_smaller else x2
            y1 = point.y if self.y1_smaller else y1
            y2 = point.y if not self.y1_smaller else y2
        elif self.corner == BoxCorner.TOP_RIGHT:
            x1 = point.x if not self.x1_smaller else x1
            x2 = point.x if self.x1_smaller else x2
            y1 = point.y if self.y1_smaller else y1
            y2 = point.y if not self.y1_smaller else y2
        elif self.corner == BoxCorner.BOTTOM_LEFT:
            x1 = point.x if self.x1_smaller else x1
            x2 = point.x if not self.x1_smaller else x2
            y1 = point.y if not self.y1_smaller else y1
            y2 = point.y if self.y1_smaller else y2
        elif self.corner == BoxCorner.BOTTOM_RIGHT:
            x1 = point.x if not self.x1_smaller else x1
            x2 = point.x if self.x1_smaller else x2
            y1 = point.y if not self.y1_smaller else y1
            y2 = point.y if self.y1_smaller else y2
            
        return Rect(x1, y1, x2, y2)

class CanvasImageInfo:
    def __init__(self, scale_x:float, scale_y:float, resized_width:int, resized_height:int):
        self.scale_x = scale_x
        self.scale_y = scale_y
        self.resized_width = resized_width
        self.resized_height = resized_height
        
    def __str__(self):
        return f"CanvasImageInfo: {self.scale_x}, {self.scale_y}"
    
    def __repr__(self):
        return self.__str__()

class BoundingBoxApp(CanvasContext):
    BOX_CORNER_SIZE = 4
    CANVAS_WIDTH = 800
    CANVAS_HEIGHT = 600
    
    def __init__(self, root, data_transfer:DataTransfer):
        self.root = root
        self.root.title("Bounding Box Annotation Tool")

        # Main Canvas
        self.canvas = tk.Canvas(root, bg="white", width=self.CANVAS_WIDTH, height=self.CANVAS_HEIGHT)
        self.canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        # Sidebar for controls
        self.sidebar = tk.Frame(root, bg="lightgray", width=200)
        self.sidebar.pack(side=tk.RIGHT, fill=tk.Y)

        # Buttons
        self.create_button = tk.Button(self.sidebar, text="Create Box", command=self.start_create_box)
        self.create_button.pack(pady=10)

        self.delete_button = tk.Button(self.sidebar, text="Delete Selected", command=self.delete_selected_box)
        self.delete_button.pack(pady=10)
        
        self.apply_button = tk.Button(self.sidebar, text="Apply", command=self.apply_bounding_box)
        self.apply_button.pack(pady=10)
        
        self.ignore_button = tk.Button(self.sidebar, text="Ignore", command=self.ignore_current_image)
        self.ignore_button.pack(pady=10)
        
        # key bindings
        self.root.bind("<Delete>", lambda event: self.delete_selected_box())
        self.root.bind("<Return>", lambda event: self.apply_bounding_box())
        self.root.bind("<Escape>", lambda event: self.ignore_current_image())

        # List of bounding boxes
        self.box_listbox = tk.Listbox(self.sidebar)
        self.box_listbox.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        self.box_listbox.bind('<<ListboxSelect>>', self.select_box_from_list)
        
        # container to show the current image info, multiple lines
        self.image_info = tk.Text(self.sidebar, height=10, width=20)
        self.image_info.pack(padx=10, pady=10)
        self.image_info.config(state=tk.DISABLED)
                

        # Variables
        self.boxes: list[Box] = []
        self.mouse_context: MouseContext | None = None
        self.selected_box: Box | None = None
        self.start_x = self.start_y = 0
        self.resizing = False
        self.create_box = False
        self.data_transfer = data_transfer
        self.current_image: CanvasImageInfo | None = None

        # Canvas events
        self.canvas.bind("<Button-1>", self.on_canvas_click)
        self.canvas.bind("<B1-Motion>", self.on_mouse_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_mouse_release)
        
        # initialize canvas image
        self.load_next_image()
        
    def start_create_box(self):
        self.selected_box = None
        self.create_box = True

    def on_canvas_click(self, event: tk.Event):
        self.deselect_box()
        if self.create_box:
            self.create_box = False
            self.mouse_context = CreateBoxContext(self, event.x, event.y)
        else:
            print("Selecting box")
            selected = self.get_box_from_coords(event.x, event.y)
            if type(selected) == Box:
                self.mouse_context = MoveBoxContext(selected.id, self, Point(event.x, event.y))
            elif type(selected) == tuple and type(selected[1]) == BoxCorner:
                box, corner = selected
                corner_rect_provider = CornerRectProvider(box, corner)
                self.mouse_context = MoveBoxCornerContext(box.id, self, corner_rect_provider.get_rect)

    def on_mouse_drag(self, event: tk.Event):
        if self.mouse_context:
            self.mouse_context.on_mouse_drag(Point(event.x, event.y))

    def on_mouse_release(self, event: tk.Event):
        if self.mouse_context:
            self.mouse_context.on_mouse_release(Point(event.x, event.y))
            self.mouse_context = None

    def select_box_from_list(self, event):
        selection = self.box_listbox.curselection()
        if selection:
            self.select_box(self.boxes[selection[0]])

    def get_box_from_coords(self, x, y) -> Box | tuple[Box, BoxCorner] | None:
        for box in self.boxes:
            x1, y1, x2, y2 = box.rect.x1, box.rect.y1, box.rect.x2, box.rect.y2
            x_left, x_right = min(x1, x2), max(x1, x2)
            y_top, y_bottom = min(y1, y2), max(y1, y2)
            # check if mouse is near the corners
            if x_left - self.BOX_CORNER_SIZE <= x <= x_left + self.BOX_CORNER_SIZE \
                and y_top - self.BOX_CORNER_SIZE <= y <= y_top + self.BOX_CORNER_SIZE:
                print("Selected top left corner")
                return box, BoxCorner.TOP_LEFT
            elif x_right - self.BOX_CORNER_SIZE <= x <= x_right + self.BOX_CORNER_SIZE \
                and y_top - self.BOX_CORNER_SIZE <= y <= y_top + self.BOX_CORNER_SIZE:
                print("Selected top right corner")
                return  box, BoxCorner.TOP_RIGHT
            elif x_left - self.BOX_CORNER_SIZE <= x <= x_left + self.BOX_CORNER_SIZE \
                and y_bottom - self.BOX_CORNER_SIZE <= y <= y_bottom + self.BOX_CORNER_SIZE:
                print("Selected bottom left corner")
                return box, BoxCorner.BOTTOM_LEFT
            elif x_right - self.BOX_CORNER_SIZE <= x <= x_right + self.BOX_CORNER_SIZE \
                and y_bottom - self.BOX_CORNER_SIZE <= y <= y_bottom + self.BOX_CORNER_SIZE:
                print("Selected bottom right corner")
                return box, BoxCorner.BOTTOM_RIGHT
            elif x_left <= x <= x_right and y_top <= y <= y_bottom:
                print("Selected box:", box)
                return box

    def highlight_box(self, box:Box):
        self.canvas.itemconfig(box.id, outline="red")

    def get_boxes(self)->list[Box]:
        return self.boxes
    
    def add_box(self, rect:Rect) -> Box:
        box_id = self.canvas.create_rectangle(rect.x1, rect.y1, rect.x2, rect.y2, outline="black")
        box = Box(box_id, rect)
        self.boxes.append(box)
        self.update_listbox()
        return box
    
    def get_box(self, box_id:int) -> Box | None:
        for box in self.boxes:
            if box.id == box_id:
                return box
    
    def select_box(self, box_id:int) -> None:
        self.selected_box = self.get_box(box_id)
        if self.selected_box:
            self.highlight_box(self.selected_box)
    
    def deselect_box(self) -> None:
        if self.selected_box:
            self.canvas.itemconfig(self.selected_box.id, outline="black")
            self.selected_box = None
    
    def move_box(self, box_id:int, point:Point) -> None:
        self.canvas.move(box_id, point.x, point.y)
        box = self.get_box(box_id)
        if box:
            box.rect.x1 += point.x
            box.rect.y1 += point.y
            box.rect.x2 += point.x
            box.rect.y2 += point.y
    
    def resize_box(self, box_id:int, rect:Rect) -> None:       
        self.canvas.coords(box_id, rect.x1, rect.y1, rect.x2, rect.y2)
        box = self.get_box(box_id)
        if box:
            box.rect = rect
    
    def update_listbox(self):
        self.box_listbox.delete(0, tk.END)
        for box in self.boxes:
            coords = (box.rect.x1, box.rect.y1, box.rect.x2, box.rect.y2)
            self.box_listbox.insert(tk.END, f"Box: {coords}")
            
    def delete_selected_box(self):
        if self.selected_box:
            self.canvas.delete(self.selected_box.id)
            self.boxes.remove(self.selected_box)
            self.update_listbox()
            self.selected_box = None
            
    def delete_all_boxes(self):
        for box in self.boxes:
            self.canvas.delete(box.id)
        self.boxes.clear()
        self.update_listbox()
            
    def apply_bounding_box(self):        
        if len(self.boxes) > 1:
            logger.error("Multiple boxes selected")
            return
        
        if not self.current_image:
            logger.error("No image loaded")
            return
        
        bound_box = self.boxes[0].rect if self.boxes else Rect(0,0, self.current_image.resized_width, self.current_image.resized_height)
        
        # get the bounding box coordinates
        x1, y1, x2, y2 = bound_box.x1, bound_box.y1, bound_box.x2, bound_box.y2
        
        # get the image size
        if not self.current_image:
            logger.error("No image loaded")
            return
        
        left = min(x1, x2)
        top = min(y1, y2)
        right = max(x1, x2)
        bottom = max(y1, y2)
        
        logger.debug(f"Bounding box: {left}, {top}, {right}, {bottom}")
        logger.debug(f"Image scale: {self.current_image}")
        
        left = int(left / self.current_image.scale_x)
        top = int(top / self.current_image.scale_y)
        right = int(right / self.current_image.scale_x)
        bottom = int(bottom / self.current_image.scale_y)
        
        x = left
        y = top
        width = right - left
        height = bottom - top
        
        logger.debug(f"Bounding box: {x}, {y}, {width}, {height}")
        self.data_transfer.apply_bounding_box(BoundingBox(x, y, width, height))
        self.load_next_image()
        
    def ignore_current_image(self):
        self.data_transfer.ignore_current_image()
        self.load_next_image()
            
    def load_next_image(self):
        next_image = self.data_transfer.load_next_image()
        if next_image:
            self.load_bg_image(next_image)
            self.start_create_box()
    
    def load_bg_image(self, image: Image.Image):
        self.delete_all_boxes()
        self.canvas.delete("all")
        
        tkinter_image = ImageTk.PhotoImage(image)
        # resize the image to fit the canvas, keeping the aspect ratio
        width, height = image.size
        width = width
        height = height
        canvas_width, canvas_height = self.CANVAS_WIDTH, self.CANVAS_HEIGHT
        aspect_ratio = width / height
        
        if width > height:
            resized_width = canvas_width
            resized_height = resized_width / aspect_ratio
        else:
            resized_height = canvas_height
            resized_width = resized_height * aspect_ratio
        image = image.resize((int(resized_width), int(resized_height)))
        tkinter_image = ImageTk.PhotoImage(image)
        #self.canvas.config(width=width, height=height)
        self.canvas.create_image(0, 0, image=tkinter_image, anchor=tk.NW)
        self.canvas.image = tkinter_image  # type: ignore
        
        logger.debug(f"Image size: {width}, {height}")
        self.current_image = CanvasImageInfo(resized_width / width, resized_height / height, int(resized_width), int(resized_height))
        logger.debug(f"Canvas image info: {self.current_image}")
            


    """  """

    """  def update_box_coordinates(self, x, y):
        self.selected_box["x2"] = x
        self.selected_box["y2"] = y
        self.canvas.coords(
            self.selected_box["id"],
            self.selected_box["x1"],
            self.selected_box["y1"],
            x, y
        )
    """
            
    

if __name__ == "__main__":
    root = tk.Tk()
    input_folder = "../data/processed/remove_irrevelant"
    output_folder = "../data/processed/formatted_photos"
    app = BoundingBoxApp(root, DataTransfer(input_folder, output_folder))
    root.mainloop()
