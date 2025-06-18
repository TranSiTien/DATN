import os
import openai

# Set your OpenAI API key here
openai.api_key = "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"

def correct_grammar(text):
    """Corrects grammar using GPT-3.5 Turbo chat model."""
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",  # Use the available GPT chat model
            messages=[
                {"role": "system", "content": "You are a helpful assistant that corrects grammar."},
                {"role": "user", "content": text}
            ],
            max_tokens=1000,
            temperature=0.5
        )
        return response['choices'][0]['message']['content'].strip()
    except Exception as e:
        print(f"Error while correcting grammar: {e}")
        return text  # In case of an error, return the original text

def process_transcripts(input_folder, output_folder):
    """Reads each transcript file in the input folder and corrects grammar."""
    for filename in os.listdir(input_folder):
        file_path = os.path.join(input_folder, filename)
        
        if os.path.isfile(file_path) and filename.endswith(".txt"):
            with open(file_path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            print(f"Processing file: {filename}")
            
            # Correct grammar using GPT-3.5 Turbo model
            corrected_text = correct_grammar(content)
            
            # Save the corrected content to the output folder
            corrected_file_path = os.path.join(output_folder, f"corrected_{filename}")
            with open(corrected_file_path, 'w', encoding='utf-8') as corrected_file:
                corrected_file.write(corrected_text)
            
            print(f"Corrected transcript saved to: {corrected_file_path}")

def main():
    # Define the path to your playlist folder
    playlist_folder = "transcripts/Docker Essentials"
    
    # Create a new folder for grammar-corrected transcripts
    grammar_folder = os.path.join(os.path.dirname(playlist_folder), "grammar_playlist")
    os.makedirs(grammar_folder, exist_ok=True)
    
    # Process all transcript files in the playlist folder
    process_transcripts(playlist_folder, grammar_folder)

if __name__ == "__main__":
    main()
