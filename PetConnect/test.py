import argparse
import re
import os
from urllib.parse import urlparse, parse_qs
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound, VideoUnavailable
import yt_dlp

def extract_video_id(url):
    if "youtube.com" in url or "youtu.be" in url:
        parsed = urlparse(url)
        if parsed.hostname == 'youtu.be':
            return parsed.path[1:]
        if parsed.hostname in ('www.youtube.com', 'youtube.com'):
            qs = parse_qs(parsed.query)
            return qs.get('v', [None])[0]
    return url

def sanitize_filename(name):
    return re.sub(r'[\\/*?:"<>|]', "_", name)

def get_video_title(video_id, cookies_path=None):
    url = f"https://www.youtube.com/watch?v={video_id}"
    ydl_opts = {
        'quiet': True,
        'skip_download': True,
        'forcejson': True,
    }
    if cookies_path:
        ydl_opts['cookiefile'] = cookies_path

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return info.get('title', video_id)
    except Exception as e:
        print(f"Warning: Could not fetch video title: {e}")
        return video_id

def download_transcript(video_id, cookies_path=None, output_folder="."):
    try:
        transcript_data = YouTubeTranscriptApi.get_transcript(video_id, cookies=cookies_path)
    except TranscriptsDisabled:
        print(f"Skipped (transcripts disabled): {video_id}")
        return
    except NoTranscriptFound:
        print(f"Skipped (no transcript): {video_id}")
        return
    except VideoUnavailable:
        print(f"Skipped (unavailable): {video_id}")
        return
    except Exception as e:
        print(f"Error fetching transcript for {video_id}: {e}")
        return

    full_text = "\n".join(item['text'] for item in transcript_data)

    title = sanitize_filename(get_video_title(video_id, cookies_path))
    out_filename = os.path.join(output_folder, f"{title}.txt")

    try:
        with open(out_filename, 'w', encoding='utf-8') as f:
            f.write(full_text)
        print(f"Saved: {out_filename}")
    except Exception as e:
        print(f"Error writing file for {video_id}: {e}")

def get_playlist_name(playlist_url, cookies_path=None):
    ydl_opts = {
        'quiet': True,
        'extract_flat': True,
        'skip_download': True,
    }
    if cookies_path:
        ydl_opts['cookiefile'] = cookies_path

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(playlist_url, download=False)
            return sanitize_filename(info.get('title', 'playlist'))
    except Exception as e:
        print(f"Error fetching playlist name: {e}")
        return "playlist"

def get_videos_from_playlist(playlist_url, cookies_path=None):
    ydl_opts = {
        'quiet': True,
        'extract_flat': True,
        'skip_download': True,
    }
    if cookies_path:
        ydl_opts['cookiefile'] = cookies_path

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(playlist_url, download=False)
            return [entry['id'] for entry in info.get('entries', []) if 'id' in entry]
    except Exception as e:
        print(f"Error fetching playlist: {e}")
        return []

def main():
    parser = argparse.ArgumentParser(description="Download YouTube transcript(s) from video or playlist.")
    parser.add_argument('url', help="YouTube video or playlist URL")
    parser.add_argument('--cookies', help="Path to YouTube cookies.txt for auth", default=None)
    parser.add_argument('--out', help="Output folder to save transcripts", default=None)
    args = parser.parse_args()

    # Default to current directory if no --out specified
    if args.out:
        output_folder = args.out
    else:
        output_folder = "transcripts"

    if "playlist" in args.url:
        print("Processing playlist...")
        playlist_name = get_playlist_name(args.url, args.cookies)
        playlist_folder = os.path.join(output_folder, playlist_name)
        os.makedirs(playlist_folder, exist_ok=True)

        video_ids = get_videos_from_playlist(args.url, args.cookies)
        print(f"Found {len(video_ids)} videos in playlist.")
        for vid in video_ids:
            download_transcript(vid, cookies_path=args.cookies, output_folder=playlist_folder)
    else:
        video_id = extract_video_id(args.url)
        download_transcript(video_id, cookies_path=args.cookies, output_folder=output_folder)

if __name__ == "__main__":
    main()
