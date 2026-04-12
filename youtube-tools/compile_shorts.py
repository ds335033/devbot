#!/usr/bin/env python3
"""
YouTube Shorts → Long-Form Compilation Tool
=============================================
Downloads your existing Shorts and stitches them into
20-30 minute compilations for WATCH HOURS.

No guitar needed. Uses content you already have.

Usage:
  python compile_shorts.py --channel UCPNxlY1ts7j9VOOzKFel13Q
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from datetime import datetime

# Check for yt-dlp
def check_dependencies():
    """Check if required tools are installed."""
    try:
        subprocess.run(["yt-dlp", "--version"], capture_output=True, check=True)
        print("[OK] yt-dlp found")
    except (FileNotFoundError, subprocess.CalledProcessError):
        print("[!] Installing yt-dlp...")
        subprocess.run([sys.executable, "-m", "pip", "install", "yt-dlp"], check=True)

    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
        print("[OK] ffmpeg found")
    except FileNotFoundError:
        print("[!] ffmpeg not found - please install from https://ffmpeg.org/download.html")
        print("    Or: winget install ffmpeg")
        return False
    return True


def get_shorts_list(channel_id, max_videos=50):
    """Get list of Shorts from channel."""
    print(f"\nFetching Shorts from channel {channel_id}...")

    cmd = [
        "yt-dlp",
        f"https://www.youtube.com/channel/{channel_id}/shorts",
        "--flat-playlist",
        "--print", "%(id)s|%(title)s|%(duration)s",
        "--no-download",
        f"--playlist-end={max_videos}",
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)

    shorts = []
    for line in result.stdout.strip().split("\n"):
        if not line or "|" not in line:
            continue
        parts = line.split("|")
        if len(parts) >= 3:
            vid_id, title, duration = parts[0], parts[1], parts[2]
            try:
                dur = int(float(duration)) if duration != "NA" else 60
            except:
                dur = 60
            if dur <= 120:  # Only include actual Shorts (under 2 min)
                shorts.append({"id": vid_id, "title": title, "duration": dur})

    print(f"Found {len(shorts)} Shorts")
    return shorts


def download_shorts(shorts, output_dir):
    """Download Shorts videos."""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    downloaded = []
    for i, short in enumerate(shorts):
        output_file = output_dir / f"{i:03d}_{short['id']}.mp4"
        if output_file.exists():
            print(f"  [{i+1}/{len(shorts)}] Already downloaded: {short['title'][:40]}")
            downloaded.append(str(output_file))
            continue

        print(f"  [{i+1}/{len(shorts)}] Downloading: {short['title'][:40]}...")
        cmd = [
            "yt-dlp",
            f"https://www.youtube.com/watch?v={short['id']}",
            "-o", str(output_file),
            "-f", "bestvideo[height<=1080]+bestaudio/best[height<=1080]",
            "--merge-output-format", "mp4",
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)
        if output_file.exists():
            downloaded.append(str(output_file))
        else:
            # Try simpler format
            cmd[-3] = "best[height<=1080]"
            subprocess.run(cmd, capture_output=True, text=True)
            if output_file.exists():
                downloaded.append(str(output_file))

    return downloaded


def create_compilation(video_files, output_file, title="Guitar Compilation"):
    """Stitch videos into one long compilation using ffmpeg."""
    print(f"\nCreating compilation: {title}")

    # Create file list for ffmpeg
    filelist = Path(output_file).parent / "filelist.txt"
    with open(filelist, "w") as f:
        for vf in video_files:
            f.write(f"file '{vf}'\n")

    cmd = [
        "ffmpeg",
        "-f", "concat",
        "-safe", "0",
        "-i", str(filelist),
        "-c", "copy",
        "-y",
        str(output_file),
    ]

    print("Stitching videos together...")
    result = subprocess.run(cmd, capture_output=True, text=True)

    if Path(output_file).exists():
        size_mb = Path(output_file).stat().st_size / (1024 * 1024)
        print(f"Compilation created: {output_file} ({size_mb:.1f} MB)")
        return True
    else:
        print(f"Error creating compilation: {result.stderr[:200]}")
        return False


def generate_description(shorts, compilation_num):
    """Generate SEO-optimized description for the compilation."""

    title = f"Best Guitar Riffs & Licks Compilation #{compilation_num} - 30 Minutes of Amazing Guitar"

    description = f"""Best Guitar Riffs & Licks Compilation #{compilation_num} - 30 Minutes of Amazing Guitar Playing

🎸 Sit back and enjoy 30 minutes of incredible guitar riffs, licks, solos and techniques! Perfect for guitar lovers, aspiring players, and anyone who appreciates great music.

⏱️ TIMESTAMPS:
"""

    current_time = 0
    for i, short in enumerate(shorts):
        minutes = current_time // 60
        seconds = current_time % 60
        description += f"{minutes:02d}:{seconds:02d} - {short['title']}\n"
        current_time += short['duration']

    description += f"""
🎸 WANT TO LEARN GUITAR?
Check out these great guitars for beginners:
🔗 Best Beginner Acoustic: https://amzn.to/YOUR_LINK
🔗 Best Electric Guitar Starter Pack: https://amzn.to/YOUR_LINK
🔗 Guitar Strings I Use: https://amzn.to/YOUR_LINK
🔗 Best Guitar Tuner: https://amzn.to/YOUR_LINK
🔗 Guitar Picks Variety Pack: https://amzn.to/YOUR_LINK

📢 Subscribe for more guitar content!
🔔 Turn on notifications so you never miss a video!

#guitar #guitarriffs #guitarcompilation #learnguitar #guitarlessons #acousticguitar #electricguitar #guitarsolo #guitarplayer #guitarlicks

© Guitar Giveaway Channel {datetime.now().year}
"""

    tags = [
        "guitar compilation", "best guitar riffs", "guitar riffs compilation",
        "guitar licks", "guitar solo", "learn guitar", "guitar tutorial",
        "acoustic guitar", "electric guitar", "guitar player",
        "guitar music", "guitar cover", "fingerstyle guitar",
        "guitar giveaway", "guitar 2026", "relaxing guitar",
    ]

    return {
        "title": title,
        "description": description,
        "tags": tags,
    }


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Compile Shorts into long-form videos")
    parser.add_argument("--channel", default="UCPNxlY1ts7j9VOOzKFel13Q")
    parser.add_argument("--max-shorts", type=int, default=30)
    parser.add_argument("--output-dir", default=str(Path(__file__).parent / "compilations"))
    parser.add_argument("--shorts-per-compilation", type=int, default=20)
    args = parser.parse_args()

    if not check_dependencies():
        return

    # Get shorts
    shorts = get_shorts_list(args.channel, args.max_shorts)
    if not shorts:
        print("No shorts found!")
        return

    # Download
    output_dir = Path(args.output_dir) / "downloads"
    videos = download_shorts(shorts, output_dir)

    if not videos:
        print("No videos downloaded!")
        return

    # Create compilations
    comp_dir = Path(args.output_dir)
    comp_dir.mkdir(parents=True, exist_ok=True)

    chunk_size = args.shorts_per_compilation
    comp_num = 1

    for i in range(0, len(videos), chunk_size):
        chunk = videos[i:i + chunk_size]
        chunk_shorts = shorts[i:i + chunk_size]

        if len(chunk) < 5:  # Skip if too few videos
            continue

        output_file = comp_dir / f"guitar_compilation_{comp_num}.mp4"

        if create_compilation(chunk, output_file):
            # Generate metadata
            meta = generate_description(chunk_shorts, comp_num)
            meta_file = comp_dir / f"guitar_compilation_{comp_num}_metadata.json"
            with open(meta_file, "w") as f:
                json.dump(meta, f, indent=2)

            print(f"\n{'='*50}")
            print(f"COMPILATION #{comp_num} READY!")
            print(f"Video: {output_file}")
            print(f"Title: {meta['title']}")
            print(f"Metadata: {meta_file}")
            print(f"{'='*50}\n")

            comp_num += 1

    print(f"\nDone! Created {comp_num - 1} compilations.")
    print(f"Upload them to YouTube with the generated titles & descriptions.")
    print(f"Each 30-min compilation = ~500 watch hours per 1,000 views!")


if __name__ == "__main__":
    main()
