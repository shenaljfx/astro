"""Generate speech with Kokoro and write a WAV file. Config path passed as argv[1]."""
import json
import sys

def main() -> None:
    if len(sys.argv) < 2:
        print("KOKORO_ERROR: config path required", file=sys.stderr)
        sys.exit(1)

    with open(sys.argv[1], encoding="utf-8-sig") as f:
        cfg = json.load(f)

    text = cfg["text"]
    voice = cfg["voice"]
    wav_path = cfg["wav"]
    speed = float(cfg.get("speed", 1.0))

    try:
        from kokoro import KPipeline
        import numpy as np
        import soundfile as sf

        pipe = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")
        chunks = []
        for _, _, audio in pipe(text, voice=voice, speed=speed):
            chunks.append(audio)

        if not chunks:
            raise RuntimeError("Kokoro produced no audio")

        full_audio = np.concatenate(chunks)
        sf.write(wav_path, full_audio, 24000)
        duration = len(full_audio) / 24000
        print(json.dumps({"ok": True, "duration": duration, "samples": len(full_audio)}))
    except Exception as e:
        print(f"KOKORO_ERROR: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
