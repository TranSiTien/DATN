import numpy as np
import math

class CrawlBatch:
    def __init__(self, limit: int, offset: int, page_indices: list[int]):
        self.limit = limit
        self.offset = offset
        self.page_indices = page_indices
        

def get_crawl_batches(total_available: int, desired_items: int, batch_size: int = 20) -> list[CrawlBatch]:
    if total_available < desired_items:
        desired_items = total_available
        
    # random total of desired items from 0 to total_available
    random_indices = np.random.choice(total_available, desired_items, replace=False)
    random_indices.sort()
    random_indices = list(random_indices)
    
    batches = []
    available_batches = math.ceil(total_available / batch_size)
    
    last_index = 0
    for i in range(available_batches):
        offset = i * batch_size
        limit = batch_size
        page_indices = []
        if i == available_batches - 1:
            page_indices = random_indices[last_index:]
        else:
            while last_index < len(random_indices) and random_indices[last_index] < offset + batch_size:
                page_indices.append(random_indices[last_index])
                last_index += 1
                
        if len(page_indices) <= 0:
            continue
        
        for j in range(len(page_indices)):
            page_indices[j] -= offset
        
        batch = CrawlBatch(limit, offset, page_indices)
        batches.append(batch)
        
    return batches
        
        
    