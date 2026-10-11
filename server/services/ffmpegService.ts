import { spawn, execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { VideoFormatSettings, AspectRatioOption, FormatMode } from '../../shared/types.js';

const execFileAsync = promisify(execFile);

export interface ProbeResult {
  duration: number;
  width: number;
  height: number;
  codec: string;
}

export class FFmpegService {
  /**
   * Probe video dimensions, duration and codec using ffprobe.
   */
  static async probeVideo(filePath: string): Promise<ProbeResult> {
    try {
      const { stdout } = await execFileAsync('ffprobe', [
        '-v',
        'error',
        '-select_streams',
        'v:0',
        '-show_entries',
        'stream=width,height,codec_name,duration',
        '-show_entries',
        'format=duration',
        '-of',
        'json',
        filePath,
      ]);

      const data = JSON.parse(stdout);
      const stream = data.streams?.[0] || {};
      const format = data.format || {};

      const width = Number(stream.width) || 1080;
      const height = Number(stream.height) || 1920;
      const codec = String(stream.codec_name || 'unknown');
      const duration = Number(stream.duration) || Number(format.duration) || 30;

      return {
        duration: Math.max(1, duration),
        width,
        height,
        codec,
      };
    } catch (err) {
      console.warn('[FFmpegService] ffprobe error, falling back to defaults:', err);
      return {
        duration: 30,
        width: 1080,
        height: 1920,
        codec: 'unknown',
      };
    }
  }

  /**
   * Convert any incoming video format (MP4, MOV, WebM, MKV, AVI, M4V, 3GP, FLV, WMV, MPEG, HEVC)
   * to web-standard H.264 video and AAC audio in an MP4 container.
   */
  static async transcodeToMp4(
    inputPath: string,
    outputPath: string,
    onProgress?: (percent: number, stage: string) => void
  ): Promise<{ outputPath: string; duration: number; width: number; height: number }> {
    const probe = await this.probeVideo(inputPath);
    const totalDuration = probe.duration;

    if (onProgress) onProgress(5, 'Initializing FFmpeg H.264 transcoder...');

    const args = [
      '-y',
      '-i',
      inputPath,
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '23',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-ar',
      '44100',
      '-movflags',
      '+faststart',
      outputPath,
    ];

    await this.runFFmpegProcess(args, totalDuration, onProgress, 'Transcoding video to MP4 (H.264/AAC)...');

    const resultProbe = await this.probeVideo(outputPath);
    return {
      outputPath,
      duration: resultProbe.duration,
      width: resultProbe.width,
      height: resultProbe.height,
    };
  }

  /**
   * Resolves target resolution width & height based on chosen Aspect Ratio.
   */
  static getTargetDimensions(
    aspectRatio: AspectRatioOption,
    origW: number,
    origH: number
  ): { targetW: number; targetH: number } {
    switch (aspectRatio) {
      case '9:16':
        return { targetW: 1080, targetH: 1920 };
      case '1:1':
        return { targetW: 1080, targetH: 1080 };
      case '4:5':
        return { targetW: 1080, targetH: 1350 };
      case '16:9':
        return { targetW: 1920, targetH: 1080 };
      case 'original':
      default:
        // Ensure even dimensions for h264 encoder
        return {
          targetW: origW % 2 === 0 ? origW : origW + 1,
          targetH: origH % 2 === 0 ? origH : origH + 1,
        };
    }
  }

  /**
   * Builds FFmpeg filter graph for Crop, Blurred Fit, or Solid Letterbox Fit.
   */
  static buildFilterComplex(
    mode: FormatMode,
    targetW: number,
    targetH: number,
    focusX: number = 50,
    focusY: number = 50,
    solidBgColor: string = '#000000'
  ): { filter: string; isComplex: boolean } {
    const cleanColor = solidBgColor.replace('#', '0x');

    if (mode === 'fit_blurred') {
      // Background: scale to cover & blur heavily. Foreground: scale to fit & center overlay
      const filter = `[0:v]scale=${targetW}:${targetH}:force_original_aspect_ratio=increase,crop=${targetW}:${targetH},boxblur=25:5[bg];[0:v]scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2`;
      return { filter, isComplex: true };
    }

    if (mode === 'fit_solid') {
      // Scale to fit within box and pad with solid color bars (letterbox/pillarbox)
      const filter = `scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2:color=${cleanColor}`;
      return { filter, isComplex: false };
    }

    // mode === 'crop'
    // Scale so both dimensions cover target, then crop based on focus coordinates (0-100%)
    // focusX = 50 (center), 0 (left), 100 (right)
    // focusY = 50 (center), 0 (top), 100 (bottom)
    const fx = Math.min(100, Math.max(0, focusX)) / 100;
    const fy = Math.min(100, Math.max(0, focusY)) / 100;

    const filter = `scale=${targetW}:${targetH}:force_original_aspect_ratio=increase,crop=${targetW}:${targetH}:'(in_w-${targetW})*${fx}':'(in_h-${targetH})*${fy}'`;
    return { filter, isComplex: false };
  }

  /**
   * Applies aspect ratio adjustment, crop/fit mode, and start/end trimming using FFmpeg.
   * Keeps original file untouched and exports to a new formatted file.
   */
  static async applyFormatAndTrim(params: {
    inputPath: string;
    outputPath: string;
    format: VideoFormatSettings;
    onProgress?: (percent: number, stage: string) => void;
  }): Promise<{ outputPath: string; duration: number; width: number; height: number }> {
    const { inputPath, outputPath, format, onProgress } = params;

    const probe = await this.probeVideo(inputPath);
    const { targetW, targetH } = this.getTargetDimensions(format.aspectRatio, probe.width, probe.height);

    const focusX = format.focusPoint?.x ?? 50;
    const focusY = format.focusPoint?.y ?? 50;
    const solidColor = format.solidBgColor || '#000000';

    const args: string[] = ['-y'];

    // Fast seek for trimming if start time > 0
    const startSec = Math.max(0, format.trimStartSec || 0);
    const endSec = format.trimEndSec && format.trimEndSec > startSec ? format.trimEndSec : probe.duration;
    const duration = Math.max(1, endSec - startSec);

    if (startSec > 0) {
      args.push('-ss', startSec.toFixed(3));
    }

    args.push('-i', inputPath);

    if (endSec < probe.duration) {
      args.push('-t', duration.toFixed(3));
    }

    if (format.aspectRatio === 'original') {
      // Just transcode / trim without aspect ratio filter
      args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-pix_fmt', 'yuv420p');
    } else {
      const { filter, isComplex } = this.buildFilterComplex(
        format.mode,
        targetW,
        targetH,
        focusX,
        focusY,
        solidColor
      );

      if (isComplex) {
        args.push('-filter_complex', filter);
      } else {
        args.push('-vf', filter);
      }

      args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-pix_fmt', 'yuv420p');
    }

    // Audio & streaming flags
    args.push('-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-movflags', '+faststart', outputPath);

    await this.runFFmpegProcess(
      args,
      duration,
      onProgress,
      `Applying ${format.aspectRatio} ${format.mode} format with FFmpeg...`
    );

    const resultProbe = await this.probeVideo(outputPath);
    return {
      outputPath,
      duration: resultProbe.duration,
      width: resultProbe.width,
      height: resultProbe.height,
    };
  }

  /**
   * Helper to spawn ffmpeg and stream progress percentage based on parsed time.
   */
  private static runFFmpegProcess(
    args: string[],
    totalDuration: number,
    onProgress?: (percent: number, stage: string) => void,
    stageName: string = 'Processing video...'
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`[FFmpegService] Spawning ffmpeg with args:`, args.join(' '));
      const child = spawn('ffmpeg', args);

      let lastPercent = 5;
      let stderrBuffer = '';

      child.stderr.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        stderrBuffer += text;

        // Parse time=HH:MM:SS.ms
        const timeMatch = text.match(/time=(\d+):(\d+):(\d+\.\d+)/);
        if (timeMatch && totalDuration > 0) {
          const hours = parseFloat(timeMatch[1]);
          const mins = parseFloat(timeMatch[2]);
          const secs = parseFloat(timeMatch[3]);
          const currentSecs = hours * 3600 + mins * 60 + secs;

          const pct = Math.min(98, Math.max(5, Math.round((currentSecs / totalDuration) * 90) + 5));
          if (pct > lastPercent) {
            lastPercent = pct;
            if (onProgress) {
              onProgress(pct, `${stageName} (${pct}%)`);
            }
          }
        }
      });

      child.on('close', (code) => {
        if (code === 0) {
          if (onProgress) onProgress(100, 'FFmpeg processing complete!');
          resolve();
        } else {
          console.error('[FFmpegService] FFmpeg failed with code:', code, stderrBuffer.slice(-1000));
          reject(new Error(`FFmpeg failed with exit code ${code}: ${stderrBuffer.slice(-300)}`));
        }
      });

      child.on('error', (err) => {
        reject(err);
      });
    });
  }
}
