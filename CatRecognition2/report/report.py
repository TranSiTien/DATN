import os
import pandas as pd
import matplotlib
# Thiết lập backend 'Agg' cho matplotlib để chạy không cần display
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np

# Đường dẫn đến thư mục chứa logs của các mô hình
base_path = "report/training_logs"

# Tìm tất cả các thư mục mô hình
model_folders = [f for f in os.listdir(base_path) if os.path.isdir(os.path.join(base_path, f))]

# Dictionary để lưu trữ dữ liệu từ tất cả các mô hình
models_data = {}

# Đọc dữ liệu từ các file logs.csv
for model_folder in model_folders:
    log_file = os.path.join(base_path, model_folder, "logs.csv")
    if os.path.exists(log_file):
        try:
            df = pd.read_csv(log_file)
            models_data[model_folder] = df
            print(f"Đã đọc dữ liệu từ {log_file}")
        except Exception as e:
            print(f"Lỗi khi đọc {log_file}: {e}")

# Tạo thư mục để lưu các biểu đồ
output_dir = "report/analysis_results"
os.makedirs(output_dir, exist_ok=True)

# Thiết lập style cho biểu đồ
plt.style.use('seaborn-v0_8-whitegrid')
sns.set_palette("Set2")

# 1. So sánh  trên tập test của các mô hình
plt.figure(figsize=(12, 8))
for model_name, df in models_data.items():
    plt.plot(df['epoch'], df['test_accuracy'], marker='o', linewidth=2, label=model_name)

plt.title('So sánh accuracy trên tập test của các mô hình', fontsize=16)
plt.xlabel('Epoch', fontsize=14)
plt.ylabel('accuracy', fontsize=14)
plt.legend(fontsize=12)
plt.grid(True)
plt.tight_layout()
plt.savefig(os.path.join(output_dir, 'test_accuracy_comparison.png'), dpi=300)
plt.close()  # Đóng figure để giải phóng bộ nhớ

# 2. So sánh loss trên tập test của các mô hình
plt.figure(figsize=(12, 8))
for model_name, df in models_data.items():
    plt.plot(df['epoch'], df['test_loss'], marker='o', linewidth=2, label=model_name)

plt.title('So sánh loss trên tập test của các mô hình', fontsize=16)
plt.xlabel('Epoch', fontsize=14)
plt.ylabel('Loss', fontsize=14)
plt.legend(fontsize=12)
plt.grid(True)
plt.tight_layout()
plt.savefig(os.path.join(output_dir, 'test_loss_comparison.png'), dpi=300)
plt.close()  # Đóng figure

# 3. Tạo bảng thống kê hiệu suất tốt nhất của mỗi mô hình
performance_stats = []
for model_name, df in models_data.items():
    best_epoch_acc = df['test_accuracy'].idxmax()
    best_test_acc = df['test_accuracy'].max()
    best_epoch_loss = df['test_loss'].idxmin()
    best_test_loss = df['test_loss'].min()
    
    performance_stats.append({
        'Model': model_name,
        'Best Test Accuracy': best_test_acc,
        'Epoch of Best Accuracy': best_epoch_acc,
        'Best Test Loss': best_test_loss,
        'Epoch of Best Loss': best_epoch_loss,
        'Final Test Accuracy': df['test_accuracy'].iloc[-1],
        'Final Test Loss': df['test_loss'].iloc[-1]
    })

stats_df = pd.DataFrame(performance_stats)
stats_df = stats_df.sort_values('Best Test Accuracy', ascending=False)
stats_df.to_csv(os.path.join(output_dir, 'model_performance_summary.csv'), index=False)

# 4. Tạo biểu đồ so sánh accuracy tốt nhất của các mô hình
plt.figure(figsize=(12, 8))
bars = plt.bar(stats_df['Model'], stats_df['Best Test Accuracy'], color=sns.color_palette("Set2", len(stats_df)))
plt.title('accuracy tốt nhất của các mô hình', fontsize=16)
plt.xlabel('Mô hình', fontsize=14)
plt.ylabel('accuracy tốt nhất', fontsize=14)
plt.xticks(rotation=45, ha='right')
plt.grid(axis='y')

# Thêm giá trị lên các cột
for bar in bars:
    height = bar.get_height()
    plt.text(bar.get_x() + bar.get_width()/2., height + 0.005,
             f'{height:.4f}', ha='center', va='bottom', fontsize=10)

plt.tight_layout()
plt.savefig(os.path.join(output_dir, 'best_accuracy_comparison.png'), dpi=300)
plt.close()  # Đóng figure

# 5. Tạo biểu đồ so sánh quá trình huấn luyện của mỗi mô hình
for model_name, df in models_data.items():
    plt.figure(figsize=(12, 8))
    
    plt.subplot(2, 1, 1)
    plt.plot(df['epoch'], df['train_accuracy'], marker='o', linewidth=2, label='Train')
    plt.plot(df['epoch'], df['test_accuracy'], marker='o', linewidth=2, label='Test')
    plt.title(f'Accuracy - {model_name}', fontsize=16)
    plt.xlabel('Epoch', fontsize=14)
    plt.ylabel('Accuracy', fontsize=14)
    plt.legend(fontsize=12)
    plt.grid(True)
    
    plt.subplot(2, 1, 2)
    plt.plot(df['epoch'], df['train_loss'], marker='o', linewidth=2, label='Train')
    plt.plot(df['epoch'], df['test_loss'], marker='o', linewidth=2, label='Test')
    plt.title(f'Loss - {model_name}', fontsize=16)
    plt.xlabel('Epoch', fontsize=14)
    plt.ylabel('Loss', fontsize=14)
    plt.legend(fontsize=12)
    plt.grid(True)
    
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, f'{model_name}_training_process.png'), dpi=300)
    plt.close()  # Đóng figure

# 6. Tạo file markdown tóm tắt kết quả
with open(os.path.join(output_dir, 'training_results_summary.md'), 'w', encoding='utf-8') as f:
    f.write('# Tóm tắt kết quả huấn luyện các mô hình\n\n')
    
    f.write('## Bảng so sánh hiệu suất tốt nhất\n\n')
    markdown_table = stats_df.to_markdown(index=False) if hasattr(stats_df, 'to_markdown') else stats_df.to_string(index=False)
    f.write(markdown_table)
    
    f.write('\n\n## Phân tích kết quả\n\n')
    
    # Tìm mô hình tốt nhất
    best_model = stats_df.iloc[0]['Model']
    best_accuracy = stats_df.iloc[0]['Best Test Accuracy']
    
    f.write(f'- Mô hình có accuracy cao nhất là **{best_model}** với accuracy **{best_accuracy:.4f}**.\n')
    
    # Tính trung bình và độ lệch chuẩn của accuracy
    mean_acc = stats_df['Best Test Accuracy'].mean()
    std_acc = stats_df['Best Test Accuracy'].std()
    
    f.write(f'- accuracy trung bình của các mô hình: **{mean_acc:.4f} ± {std_acc:.4f}**.\n')
    
    # Thêm nhận xét về thời gian hội tụ
    f.write(f'- Thời gian hội tụ trung bình (epoch): **{stats_df["Epoch of Best Accuracy"].mean():.1f}**.\n\n')
    
    f.write('## Biểu đồ\n\n')
    f.write('![So sánh accuracy](./test_accuracy_comparison.png)\n\n')
    f.write('![So sánh loss](./test_loss_comparison.png)\n\n')
    f.write('![accuracy tốt nhất](./best_accuracy_comparison.png)\n\n')

# 7. Tạo file HTML cho báo cáo
try:
    import markdown
    with open(os.path.join(output_dir, 'training_results_summary.md'), 'r', encoding='utf-8') as f:
        md_content = f.read()
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Báo cáo kết quả huấn luyện</title>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; max-width: 1000px; margin: 0 auto; padding: 20px; }}
            h1 {{ color: #2c3e50; }}
            h2 {{ color: #3498db; }}
            table {{ border-collapse: collapse; width: 100%; margin-bottom: 20px; }}
            th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
            th {{ background-color: #f2f2f2; }}
            tr:nth-child(even) {{ background-color: #f9f9f9; }}
            img {{ max-width: 100%; height: auto; margin: 20px 0; }}
        </style>
    </head>
    <body>
        {markdown.markdown(md_content, extensions=['tables'])}
    </body>
    </html>
    """
    
    with open(os.path.join(output_dir, 'training_results_summary.html'), 'w', encoding='utf-8') as f:
        f.write(html_content)
    print(f"Đã tạo báo cáo HTML")
except ImportError:
    print("Không thể tạo báo cáo HTML (cần cài đặt thư viện 'markdown')")

# 8. Tạo file LaTeX cho báo cáo
try:
    latex_content = """
\\section{Kết quả huấn luyện}

\\subsection{So sánh các mô hình}

Trong quá trình nghiên cứu, chúng tôi đã thử nghiệm với nhiều kiến trúc mô hình khác nhau. 
Bảng \\ref{tab:model_performance} trình bày kết quả so sánh hiệu suất của các mô hình.

\\begin{table}[h]
\\centering
\\caption{So sánh hiệu suất của các mô hình}
\\label{tab:model_performance}
\\begin{tabular}{|l|c|c|c|}
\\hline
\\textbf{Mô hình} & \\textbf{accuracy tốt nhất} & \\textbf{Epoch tốt nhất} & \\textbf{Loss tốt nhất} \\\\
\\hline
"""
    
    for _, row in stats_df.iterrows():
        latex_content += f"{row['Model']} & {row['Best Test Accuracy']:.4f} & {int(row['Epoch of Best Accuracy'])} & {row['Best Test Loss']:.4f} \\\\\n\\hline\n"
    
    latex_content += """
\\end{tabular}
\\end{table}

\\subsection{Phân tích kết quả}

"""
    
    best_model = stats_df.iloc[0]['Model']
    best_accuracy = stats_df.iloc[0]['Best Test Accuracy']
    mean_acc = stats_df['Best Test Accuracy'].mean()
    std_acc = stats_df['Best Test Accuracy'].std()
    
    latex_content += f"""
Từ kết quả thực nghiệm, chúng tôi nhận thấy:

\\begin{{itemize}}
  \\item Mô hình có accuracy cao nhất là \\textbf{{{best_model}}} với accuracy \\textbf{{{best_accuracy:.4f}}}.
  \\item accuracy trung bình của các mô hình: \\textbf{{{mean_acc:.4f} $\\pm$ {std_acc:.4f}}}.
  \\item Thời gian hội tụ trung bình (epoch): \\textbf{{{stats_df["Epoch of Best Accuracy"].mean():.1f}}}.
\\end{{itemize}}

\\subsection{{Biểu đồ so sánh}}

\\begin{{figure}}[h]
  \\centering
  \\includegraphics[width=0.8\\textwidth]{{analysis_results/test_accuracy_comparison.png}}
  \\caption{{So sánh accuracy trên tập test của các mô hình}}
  \\label{{fig:test_accuracy}}
\\end{{figure}}

\\begin{{figure}}[h]
  \\centering
  \\includegraphics[width=0.8\\textwidth]{{analysis_results/test_loss_comparison.png}}
  \\caption{{So sánh loss trên tập test của các mô hình}}
  \\label{{fig:test_loss}}
\\end{{figure}}

\\begin{{figure}}[h]
  \\centering
  \\includegraphics[width=0.8\\textwidth]{{analysis_results/best_accuracy_comparison.png}}
  \\caption{{So sánh accuracy tốt nhất của các mô hình}}
  \\label{{fig:best_accuracy}}
\\end{{figure}}
"""
    
    with open(os.path.join(output_dir, 'training_results_latex.tex'), 'w', encoding='utf-8') as f:
        f.write(latex_content)
    print(f"Đã tạo báo cáo LaTeX")
except Exception as e:
    print(f"Không thể tạo báo cáo LaTeX: {e}")

print(f"Đã tạo báo cáo phân tích trong thư mục {output_dir}")
