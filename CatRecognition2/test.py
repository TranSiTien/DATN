import torch
import torch.nn.functional as F

n_class = 5
n_query = 3
n_support = 3
z =2
inp = torch.arange(0, n_class * n_query * n_class).view(n_class, n_query * n_class).float()
# print(inp)
# print(inp.shape)

log = F.log_softmax(inp, dim=1).view(n_class, n_query, -1)
print(log)
# print(log.shape)

_, y_hat = log.max(2)
print(y_hat)
print(y_hat.shape)