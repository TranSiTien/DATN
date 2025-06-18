import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.checkpoint import checkpoint, checkpoint_sequential
from constants import *
from torchvision.models import MobileNet_V3_Small_Weights, mobilenet_v3_small

model_registry: dict[str, nn.Module] = {}

def register_model(name):
    def decorator(cls):
        model_registry[name] = cls
        return cls
    return decorator


@register_model('ModelA')
class ModelA(nn.Module):    
    def __init__(self):
        super(ModelA, self).__init__() # 3x84x84
        input_dim = 3
        hidden_dim = 64
        output_dim = 64
        self.encoder = nn.Sequential(
            self._conv_block(input_dim, hidden_dim), # 64x42x42
            self._conv_block(hidden_dim, hidden_dim), # 64x21x21
            self._conv_block(hidden_dim, hidden_dim), # 64x10x10
            self._conv_block(hidden_dim, output_dim), # 64x5x5
            nn.Flatten()
        )
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.encoder(x)
    
    def _conv_block(self, in_channels: int, out_channels: int) -> nn.Module:
        return nn.Sequential(
            nn.Conv2d(in_channels, out_channels, 3, padding=1),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(),
            nn.MaxPool2d(2)
        )       

@register_model('ModelB')
class ModelB(nn.Module):
    def __init__(self):
        super(ModelB, self).__init__() # 3x84x84
        input_dim = 3
        hidden_dim = 64
        output_dim = 64
        self.encoder = nn.Sequential(
            self._conv_block(input_dim, hidden_dim), # 64x42x42
            self._conv_block(hidden_dim, hidden_dim), # 64x21x21
            self._conv_block(hidden_dim, hidden_dim), # 64x10x10
            self._conv_block(hidden_dim, hidden_dim), # 64x5x5
            self._conv_block(output_dim, output_dim), # 64x2x2
            nn.Flatten(),
        )
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.encoder(x)
    
    def _conv_block(self, in_channels: int, out_channels: int) -> nn.Module:
        return nn.Sequential(
            nn.Conv2d(in_channels, out_channels, 3, padding=1),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(),
            nn.MaxPool2d(2)
        )
        
@register_model('ModelC')
class ModelC(nn.Module):
    def __init__(self):
        super(ModelC, self).__init__() # 3x84x84
        self.encoder = nn.Sequential(
            self._conv_block(3, 64), 
            self._conv_block(64, 128),
            self._conv_block(128, 256),
            self._conv_block(256, 512),
            nn.Flatten(),
        )
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.encoder(x)
    
    def _conv_block(self, in_channels: int, out_channels: int) -> nn.Module:
        return nn.Sequential(
            nn.Conv2d(in_channels, out_channels, 3, padding=1),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(),
            nn.MaxPool2d(2)
        )
        
@register_model('ModelD')
class ModelD(nn.Module):
    def __init__(self):
        super(ModelD, self).__init__()  # 3x84x84
        self.encoder = nn.Sequential(
            self._conv_block(3, 64),
            self._conv_block(64, 128),
            self._conv_block(128, 256),
            self._conv_block(256, 512),
            self._conv_block(512, 512),
            nn.Flatten(),
        )
        self.flatten = nn.Flatten()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Use checkpointing for blocks to save memory
        x = self.encoder(x)
        x = self.flatten(x)  # Flatten does not require checkpointing
        return x

    def _conv_block(self, in_channels: int, out_channels: int) -> nn.Module:
        return nn.Sequential(
            nn.Conv2d(in_channels, out_channels, 3, padding=1),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(),
            nn.MaxPool2d(2)
        )
 
@register_model('MobileNetV3Small_Freezed')
class MobileNetV3SmallFreezed(nn.Module):
    def __init__(self):
        super(MobileNetV3SmallFreezed, self).__init__()
        self.encoder = mobilenet_v3_small(weights=MobileNet_V3_Small_Weights.IMAGENET1K_V1)
        # freeze the weights
        for param in self.encoder.parameters():
            param.requires_grad = False
        
        classifier_before = self.encoder.classifier
        self.encoder.classifier = nn.Sequential(
            nn.Linear(classifier_before[0].in_features, 1024),
            nn.ReLU(),
            nn.Linear(1024, 512)
        )
        
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.encoder(x)

@register_model('MobileNetV3Small_Freezed2')
class MobileNetV3SmallFreezed2(nn.Module):
    def __init__(self):
        super(MobileNetV3SmallFreezed2, self).__init__()
        self.encoder = mobilenet_v3_small(weights=MobileNet_V3_Small_Weights.IMAGENET1K_V1)
        # freeze the weights
        for param in self.encoder.parameters():
            param.requires_grad = False
        
        classifier_before = self.encoder.classifier
        self.encoder.classifier = nn.Sequential(
            nn.Linear(classifier_before[0].in_features, 1024),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(1024, 512)
        )
        
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.encoder(x)

@register_model('MobileNetV3Small_NotFreezed')
class MobileNetV3SmallNotFreezed(nn.Module):
    def __init__(self):
        super(MobileNetV3SmallNotFreezed, self).__init__()
        self.encoder = mobilenet_v3_small(weights=MobileNet_V3_Small_Weights.IMAGENET1K_V1)
        
        classifier_before = self.encoder.classifier
        self.encoder.classifier = nn.Sequential(
            nn.Linear(classifier_before[0].in_features, 1024),
            nn.ReLU(),
            nn.Linear(1024, 512)
        )
        
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.encoder(x)


margin = 1.0
triplet_loss = nn.TripletMarginLoss(margin=margin, p=2)

def forward_data(data, model, device):
    """
    data: [batch_size, 3, num_channels, height, width]
    """
    data = data.to(device)
    # flatten the data to [batch_size * 3, num_channels, height, width]
    data = data.view(-1, *data.size()[2:])
    
    output = model(data) # [batch_size * 3, output_dim]
    
    anchor_indices = torch.arange(0, data.size(0), 3).to(device)
    positive_indices = torch.arange(1, data.size(0), 3).to(device)
    negative_indices = torch.arange(2, data.size(0), 3).to(device)
    
    anchor = output[anchor_indices]
    positive = output[positive_indices]
    negative = output[negative_indices]
    
    loss = triplet_loss(anchor, positive, negative)
    
    # calculate the accuracyW
    distance_positive = F.pairwise_distance(anchor, positive)
    distance_negative = F.pairwise_distance(anchor, negative)
    
    # the accuracy is the number of correct positive distances less than the negative distances
    accuracy = torch.mean((distance_positive < distance_negative).float())
    
    return loss, accuracy
    