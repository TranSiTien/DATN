import os, argparse, torch, csv
import torch.nn.functional as F
import pandas as pd, transforms as T
import json
import datetime
from constants import *
from torchvision import transforms
from tqdm import tqdm
from torch.utils.data import DataLoader
from model import model_registry, forward_data
from dataset import ContrastiveDataset, transforms_registry

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

def get_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=str, default="ModelA")
    parser.add_argument("--transform", type=str, default="train_1")
    parser.add_argument("--input_size", type=int, default=224)
    parser.add_argument("--n_epochs", type=int, default=50)
    parser.add_argument("--n_workers", type=int, default=5)
    parser.add_argument("--batch_size", type=int, default=32)
    parser.add_argument("--log_folder", type=str, default=None)
    return parser.parse_args()

# Example Usage
if __name__ == "__main__":
    args = get_args()
    # if log_folder is not None, get args from the log_folder
    if args.log_folder is not None:
        log_folder = args.log_folder
        if os.path.exists(os.path.join(args.log_folder, LOGS_ARGS_FILE_NAME)):
            with open(os.path.join(args.log_folder, LOGS_ARGS_FILE_NAME), "r") as f:
                args.__dict__ = json.load(f)
        else:
            
            if not os.path.exists(log_folder):
                os.makedirs(log_folder)
            with open(os.path.join(log_folder, LOGS_ARGS_FILE_NAME), "w") as f:
                json.dump(args.__dict__, f)
    else:
        # create log folder based on current time, format: yyyyMMddHHmmss
        log_folder = os.path.join(os.getcwd(), LOGS_FOLDER, datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S"))
        os.makedirs(log_folder)
        with open(os.path.join(log_folder, LOGS_ARGS_FILE_NAME), "w") as f:
            json.dump(args.__dict__, f)
    print(f"Log folder: {log_folder}")
    photos_folder = os.path.join(os.getcwd(), FORMATTED_PHOTO_FOLDER)
    selected_folders_df = pd.read_csv(SELECTED_FOLDERS_FOR_MODEL)
    selected_train_folders = selected_folders_df[selected_folders_df["type"] == "train"]["folder"].astype(str).tolist()
    selected_test_folders = selected_folders_df[selected_folders_df["type"] == "test"]["folder"].astype(str).tolist()
    
    train_transform = transforms_registry[args.transform](args.input_size)

    test_transform = transforms_registry["test"](args.input_size)

    #create dataset
    train_dataset = ContrastiveDataset(FORMATTED_PHOTO_FOLDER, selected_train_folders, transform=train_transform)
    train_dataloader = DataLoader(train_dataset, batch_size=args.batch_size, num_workers=args.n_workers, shuffle=True)

    test_dataset = ContrastiveDataset(FORMATTED_PHOTO_FOLDER, selected_test_folders, transform=test_transform)
    test_dataloader = DataLoader(test_dataset, batch_size=args.batch_size, num_workers=args.n_workers, shuffle=True)

    # Initialize model and optimizer
    model = model_registry[args.model]().to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-4)
    
    # check if model files exist, if so, load them
    if os.path.exists(os.path.join(log_folder, LOGS_MODEL_FILE_NAME)):
        model.load_state_dict(torch.load(os.path.join(log_folder, LOGS_MODEL_FILE_NAME)))
        
    if os.path.exists(os.path.join(log_folder, LOGS_OPTIMIZER_FILE_NAME)):
        optimizer.load_state_dict(torch.load(os.path.join(log_folder, LOGS_OPTIMIZER_FILE_NAME)))
        
    if os.path.exists(os.path.join(log_folder, LOGS_FILE_NAME)):
        log_data = pd.read_csv(os.path.join(log_folder, LOGS_FILE_NAME))
        log_len = log_data.shape[0]
                    
        # log file headers: epoch, episode, loss, accuracy, if not only contains headers
        if log_len > 1:
            last_epoch = log_data["epoch"].iloc[-1]
            epoch = last_epoch + 1
        else:
            epoch = 0
    else:
        epoch = 0
        with open(os.path.join(log_folder, LOGS_FILE_NAME), "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["epoch", "train_loss", "train_accuracy", "test_loss", "test_accuracy"])
            writer.writeheader()
        
    torch.set_printoptions(sci_mode=False, precision=2)
    
    try:
        while epoch < args.n_epochs:
            model.train()
            train_losses = []
            train_accuracies = []
            for data in tqdm(train_dataloader, desc=f"Train, epoch {epoch}"):
                optimizer.zero_grad()
                
                loss_val, accuracy = forward_data(data, model, device)
                
                loss_val.backward()
                optimizer.step()
                
                train_losses.append(loss_val.item())
                train_accuracies.append(accuracy.item())   
            
            train_loss = sum(train_losses) / len(train_losses)
            train_accuracy = sum(train_accuracies) / len(train_accuracies)    
            
            model.eval()
            test_losses = []
            test_accuracies = []
            for data in tqdm(test_dataloader, desc=f"Eval, epoch {epoch}"):
                loss_val, accuracy = forward_data(data, model, device)
                
                test_losses.append(loss_val.item())
                test_accuracies.append(accuracy.item())      
            
            test_loss = sum(test_losses) / len(test_losses)
            test_accuracy = sum(test_accuracies) / len(test_accuracies)
                
            torch.save(model.state_dict(), os.path.join(log_folder, LOGS_MODEL_FILE_NAME))
            torch.save(optimizer.state_dict(), os.path.join(log_folder, LOGS_OPTIMIZER_FILE_NAME))
            with open(os.path.join(log_folder, LOGS_FILE_NAME), "a", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=["epoch", "train_loss", "train_accuracy", "test_loss", "test_accuracy"])
                writer.writerow({"epoch": epoch, "train_loss": train_loss, "train_accuracy": train_accuracy,
                                "test_loss": test_loss, "test_accuracy": test_accuracy})
            
            epoch += 1    
            
                
    except KeyboardInterrupt:
        print("Training interrupted")
        pass