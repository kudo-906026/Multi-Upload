import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { AIAnalysisResult, ConfidenceLevel, DetectedEntity, VideoDetections } from '../../shared/types.js';
import { FFmpegService } from './ffmpegService.js';
import { YouTubeKeywordService } from './youtubeKeywordService.js';

interface UploadedGeminiFile {
  name: string; // e.g. "files/abc123"
  uri: string;
  mimeType: string;
  state: 'PROCESSING' | 'ACTIVE' | 'FAILED';
}

export class GeminiService {
  /**
   * Uploads real video file to Gemini Files API using resumable upload protocol
   * and polls until file state is ACTIVE.
   */
  private static async uploadVideoToFilesApi(filePath: string, apiKey: string): Promise<UploadedGeminiFile> {
    const stats = fs.statSync(filePath);
    const numBytes = stats.size;
    const displayName = path.basename(filePath);

    // Step 1: Start resumable upload session
    const uploadInitUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;
    const initRes = await axios.post(
      uploadInitUrl,
      { file: { display_name: displayName } },
      {
        headers: {
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': numBytes.toString(),
          'X-Goog-Upload-Header-Content-Type': 'video/mp4',
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const uploadUrl = initRes.headers['x-goog-upload-url'] || initRes.headers['location'];
    if (!uploadUrl) {
      throw new Error('Gemini Files API did not return an upload URL');
    }

    // Step 2: Stream video bytes to the upload URL
    const fileStream = fs.createReadStream(filePath);
    const uploadRes = await axios.post(uploadUrl, fileStream, {
      headers: {
        'Content-Length': numBytes.toString(),
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize',
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 180000,
    });

    const fileData = uploadRes.data?.file;
    if (!fileData || !fileData.name) {
      throw new Error('Invalid upload response from Gemini Files API');
    }

    // Step 3: Poll until file state is ACTIVE
    let fileState = fileData.state;
    const fileName = fileData.name;
    let pollCount = 0;
    const maxPolls = 35; // ~70 seconds max wait

    while (fileState === 'PROCESSING' && pollCount < maxPolls) {
      await new Promise((r) => setTimeout(r, 2000));
      pollCount++;
      const checkRes = await axios.get(
        `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`,
        { timeout: 15000 }
      );
      fileState = checkRes.data?.state;
      if (fileState === 'FAILED') {
        throw new Error(`Gemini video processing failed in state FAILED`);
      }
    }

    if (fileState !== 'ACTIVE') {
      throw new Error(`Gemini video file did not transition to ACTIVE (state: ${fileState})`);
    }

    return {
      name: fileName,
      uri: fileData.uri,
      mimeType: fileData.mimeType || 'video/mp4',
      state: 'ACTIVE',
    };
  }

  /**
   * Cleans up an uploaded file in Gemini Files API to avoid quota leakage.
   */
  private static async deleteGeminiFile(fileName: string, apiKey: string): Promise<void> {
    try {
      await axios.delete(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`, {
        timeout: 10000,
      });
      console.log(`[GeminiService] Cleaned up uploaded Gemini file: ${fileName}`);
    } catch (err: any) {
      console.warn(`[GeminiService] Notice deleting Gemini file ${fileName}:`, err?.message);
    }
  }

  /**
   * Analyzes video:
   * 1. Sends real video to Gemini with Gemini Files API (low media resolution, deleted afterwards).
   * 2. Falls back to 6 to 8 ffmpeg keyframes if Files API fails or file is too large.
   * 3. Queries YouTube live keywords for the topic (30 min cache, skipped quietly if key missing).
   * 4. Returns series, characters, editStyle, mood, onScreenText with confidence levels.
   */
  static async analyzeVideo(params: {
    videoId?: string;
    storagePath?: string;
    filename: string;
    titleHint?: string;
    descriptionHint?: string;
    tone?: string;
    confirmedTopic?: string;
    confirmedSeries?: string;
    confirmedCharacters?: string[];
    userId?: string;
  }): Promise<AIAnalysisResult> {
    const apiKey = config.geminiApiKey;

    const topicPrompt =
      params.confirmedTopic ||
      params.titleHint ||
      params.descriptionHint ||
      params.filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

    const selectedTone = params.tone || 'viral_hook';

    // Query live YouTube keywords for the topic (30 min cache, quiet fallback)
    let liveKeywordData = null;
    try {
      liveKeywordData = await YouTubeKeywordService.getLiveKeywordData(topicPrompt, params.userId);
    } catch (ytErr) {
      console.warn('[GeminiService] YouTube live keyword query note:', ytErr);
    }

    // Resolve local video file on disk
    let videoFilePath: string | null = null;
    const uploadDir = config.uploadDir || path.resolve(process.cwd(), 'uploads');

    if (params.storagePath && fs.existsSync(params.storagePath)) {
      videoFilePath = params.storagePath;
    } else if (params.filename && fs.existsSync(path.join(uploadDir, params.filename))) {
      videoFilePath = path.join(uploadDir, params.filename);
    } else if (params.videoId && fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      const match = files.find((f) => f.startsWith(params.videoId!));
      if (match) videoFilePath = path.join(uploadDir, match);
    }

    if (!videoFilePath && fs.existsSync(uploadDir) && params.filename) {
      const files = fs.readdirSync(uploadDir);
      const match = files.find((f) => f.includes(params.filename));
      if (match) videoFilePath = path.join(uploadDir, match);
    }

    const systemPrompt = `You are a world-class social media strategist and viral video algorithm optimization expert specializing in YouTube (Shorts & Long-form) and Instagram Reels.
You are given a real video (full video stream or 6-8 keyframe images) and optional creator context.

WATCH AND LISTEN TO THE VIDEO DIRECTLY TO DETECT THE REAL CONTENT.
DO NOT GUESS. If you are not confident, return "unsure".

1. Content & Entity Detection:
   - series: The franchise, anime, show, movie, or game name (e.g., "Jujutsu Kaisen", "Solo Leveling", "One Piece", "Marvel MCU", "Valorant"). If not recognized or uncertain, set value to "unsure" and confidence to "unsure".
   - characters: An array of recognized characters or people in the video (e.g., ["Gojo Satoru", "Ryomen Sukuna"]). If uncertain, set value to "unsure" and confidence to "unsure".
   - editStyle: The visual editing style (e.g., "4K HDR Phonk Velocity", "Cinematic Beat Sync", "Emotional Slowdown", "Tutorial / Voiceover Walkthrough"). If uncertain, set value to "unsure" and confidence to "unsure".
   - mood: The detected emotional mood / tone of the video (e.g., "Dark & Menacing", "High Energy & Hype", "Inspirational & Cinematic", "Humorous & Relaxed"). If uncertain, set value to "unsure" and confidence to "unsure".
   - onScreenText: Any key text, subtitles, or captions visible on screen in the video (e.g., ["Domain Expansion", "Wait for the end"]). If none or uncertain, set value to "unsure" and confidence to "unsure".

For each entity, specify "confidence": "high" | "medium" | "low" | "unsure".

2. Incorporate the detected series, characters, and style into:
   - YouTube Title: Under 100 characters, high CTR, incorporates the character/series name and '#Shorts'.
   - YouTube Description: Under 5000 characters, formatted with emojis, lore/context, music/edit credits, call to action, and hashtags.
   - YouTube Tags: High-relevance search tags under 500 characters total. Include confirmed character and series names.
   - YouTube Hashtags: Relevant hashtags including '#Shorts'.
   - Instagram Caption: Under 2200 characters, 3-second hook, spacing, call to action.
   - Instagram Hashtags: Exactly 5 high-converting, targeted niche & viral hashtags matching the detected character & series.

${liveKeywordData && liveKeywordData.topTags.length > 0 ? `Live YouTube Search Keywords to prioritize if relevant: ${liveKeywordData.topTags.slice(0, 15).join(', ')}` : ''}

Return strictly valid JSON with this exact schema (no markdown formatting, just JSON):
{
  "topic": "Clear summary of the video topic",
  "detectedTone": "Tone description",
  "recognizedCharacter": "Primary character name or unsure",
  "recognizedSeries": "Primary series name or unsure",
  "editStyle": "Edit style or unsure",
  "mood": "Detected mood or unsure",
  "detections": {
    "series": { "value": "Series name or unsure", "confidence": "high|medium|low|unsure" },
    "characters": [
      { "value": "Character name or unsure", "confidence": "high|medium|low|unsure" }
    ],
    "editStyle": { "value": "Edit style name or unsure", "confidence": "high|medium|low|unsure" },
    "mood": { "value": "Mood name or unsure", "confidence": "high|medium|low|unsure" },
    "onScreenText": [
      { "value": "Detected text or unsure", "confidence": "high|medium|low|unsure" }
    ]
  },
  "keyInsights": ["Insight 1", "Insight 2", "Insight 3"],
  "groundedTrends": [
    {
      "query": "search query used",
      "trendingKeywords": ["keyword1", "keyword2", "keyword3"],
      "contextNote": "Why this is trending right now"
    }
  ],
  "youtube": {
    "title": "Title with Character & Series #Shorts",
    "description": "Full formatted description with lore and hashtags",
    "tags": ["tag1", "tag2"],
    "hashtags": ["#Shorts", "#SeriesTag"],
    "categoryId": "1",
    "categoryName": "Film & Animation",
    "language": "en",
    "isShorts": true
  },
  "instagram": {
    "hookSentence": "First 3-second hook text",
    "caption": "Full Instagram Reels caption with line breaks",
    "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
    "recommendedAudio": "Trending Audio",
    "suggestedLocation": "Tokyo, Japan",
    "suggestedCollaborators": ["@account"]
  },
  "predictedGrowth": [
    { "day": 1, "label": "Day 1", "youtubeViews": 1800, "instagramViews": 3200, "searchInterest": 48 },
    { "day": 2, "label": "Day 2", "youtubeViews": 5600, "instagramViews": 8900, "searchInterest": 72 },
    { "day": 3, "label": "Day 3", "youtubeViews": 16400, "instagramViews": 21500, "searchInterest": 95 },
    { "day": 5, "label": "Day 5", "youtubeViews": 28100, "instagramViews": 32800, "searchInterest": 84 },
    { "day": 7, "label": "Day 7", "youtubeViews": 39400, "instagramViews": 41200, "searchInterest": 73 },
    { "day": 14, "label": "Day 14", "youtubeViews": 54800, "instagramViews": 52600, "searchInterest": 62 },
    { "day": 30, "label": "Day 30", "youtubeViews": 76500, "instagramViews": 64800, "searchInterest": 55 }
  ]
}`;

    const userPrompt = `Video context to analyze:
Filename: ${params.filename}
Optional User Topic Hint: ${topicPrompt}
Optional User Description Hint: ${params.descriptionHint || 'None'}
Preferred Tone: ${selectedTone}
Confirmed Series (if previously confirmed): ${params.confirmedSeries || 'None'}
Confirmed Characters (if previously confirmed): ${params.confirmedCharacters?.join(', ') || 'None'}

Watch the video visuals and audio carefully. Identify actual series, characters, edit style, mood, and on-screen text. If unsure about any entity, output "unsure". Generate the optimized JSON metadata.`;

    let geminiFileToDelete: string | null = null;
    let videoAnalysisMethod: 'gemini_files_api' | 'ffmpeg_keyframes' | 'fallback_template' = 'fallback_template';

    if (apiKey) {
      try {
        const parts: any[] = [{ text: systemPrompt }];

        // Check if video file exists on disk
        if (videoFilePath && fs.existsSync(videoFilePath)) {
          const stats = fs.statSync(videoFilePath);
          console.log(`[GeminiService] Found video at ${videoFilePath} (${(stats.size / (1024 * 1024)).toFixed(1)}MB)`);

          // 1. Try Gemini Files API if <= 200MB
          if (stats.size <= 200 * 1024 * 1024) {
            try {
              console.log('[GeminiService] Uploading video to Gemini Files API...');
              const uploaded = await this.uploadVideoToFilesApi(videoFilePath, apiKey);
              if (uploaded && uploaded.name && uploaded.uri) {
                geminiFileToDelete = uploaded.name;
                parts.push({
                  file_data: {
                    file_uri: uploaded.uri,
                    mime_type: uploaded.mimeType || 'video/mp4',
                  },
                });
                videoAnalysisMethod = 'gemini_files_api';
                console.log(`[GeminiService] Video active in Files API: ${uploaded.name}`);
              }
            } catch (filesErr: any) {
              console.warn('[GeminiService] Gemini Files API notice, falling back to keyframes:', filesErr?.message);
            }
          }

          // 2. Fall back to 6 to 8 keyframes extracted with FFmpeg if Files API did not attach video
          if (parts.length === 1) {
            try {
              console.log('[GeminiService] Extracting 6 to 8 keyframes with ffmpeg as inline images...');
              const keyframes = await FFmpegService.extractKeyframes(videoFilePath, 7);
              if (keyframes.length > 0) {
                keyframes.forEach((kf) => {
                  parts.push({
                    inline_data: {
                      mime_type: 'image/jpeg',
                      data: kf.base64,
                    },
                  });
                });
                videoAnalysisMethod = 'ffmpeg_keyframes';
                console.log(`[GeminiService] Attached ${keyframes.length} inline keyframe images to prompt`);
              }
            } catch (ffErr: any) {
              console.warn('[GeminiService] FFmpeg keyframe extraction notice:', ffErr?.message);
            }
          }
        }

        parts.push({ text: userPrompt });

        console.log(`[GeminiService] Calling Gemini API (method: ${videoAnalysisMethod}, parts: ${parts.length})...`);
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            contents: [
              {
                role: 'user',
                parts,
              },
            ],
            tools: [
              {
                google_search: {},
              },
            ],
            generationConfig: {
              mediaResolution: 'MEDIA_RESOLUTION_LOW',
              temperature: 0.7,
            },
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 75000,
          }
        );

        const candidates = response.data?.candidates;
        if (candidates && candidates.length > 0) {
          const text = candidates[0].content?.parts?.[0]?.text || '';
          const groundingMetadata = candidates[0].groundingMetadata;
          const searchQueries: string[] = groundingMetadata?.webSearchQueries || [];

          const cleanedText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

          let parsed: AIAnalysisResult | null = null;
          try {
            parsed = JSON.parse(cleanedText) as AIAnalysisResult;
          } catch (jsonErr) {
            const start = cleanedText.indexOf('{');
            const end = cleanedText.lastIndexOf('}');
            if (start !== -1 && end !== -1) {
              const substring = cleanedText.substring(start, end + 1);
              parsed = JSON.parse(substring) as AIAnalysisResult;
            }
          }

          if (parsed) {
            if (searchQueries.length > 0 && parsed.groundedTrends) {
              searchQueries.forEach((q, idx) => {
                if (parsed!.groundedTrends[idx]) {
                  parsed!.groundedTrends[idx].query = q;
                }
              });
            }

            // Ensure detections structure exists with confidence levels
            parsed.detections = this.sanitizeDetections(parsed.detections, parsed);
            parsed.liveKeywordData = liveKeywordData || undefined;
            parsed.analyzedAt = new Date().toISOString();
            parsed.isFallback = false;
            parsed.videoAnalysisMethod = videoAnalysisMethod;

            // Merge live YouTube keywords into tags if present
            if (liveKeywordData && liveKeywordData.topTags.length > 0) {
              const existingTags = new Set((parsed.youtube?.tags || []).map((t) => t.toLowerCase()));
              const tagsToAdd = liveKeywordData.topTags.filter((t) => !existingTags.has(t.toLowerCase())).slice(0, 5);
              if (parsed.youtube) {
                parsed.youtube.tags = [...(parsed.youtube.tags || []), ...tagsToAdd];
              }
            }

            return parsed;
          }
        }
      } catch (apiErr: any) {
        console.error('[GeminiService] Gemini API call error:', apiErr?.response?.data || apiErr.message);
      } finally {
        if (geminiFileToDelete) {
          await this.deleteGeminiFile(geminiFileToDelete, apiKey);
        }
      }
    }

    // High quality intelligent generator fallback if API key is not configured or network error occurs
    console.log('[GeminiService] Providing grounded simulated intelligence output (AI Offline / Fallback)');
    const fallbackResult = this.generateSimulatedAnalysis(topicPrompt, selectedTone);
    fallbackResult.liveKeywordData = liveKeywordData || undefined;
    fallbackResult.isFallback = true;
    fallbackResult.aiOfflineNotice = 'AI is currently offline or unreachable. Metadata generated using fallback template.';
    fallbackResult.videoAnalysisMethod = 'fallback_template';
    return fallbackResult;
  }

  /**
   * Validates and sanitizes the detections schema to guarantee valid ConfidenceLevel
   * and 'unsure' behavior.
   */
  private static sanitizeDetections(raw: any, parsedContext: any): VideoDetections {
    const validConf = (c: any): ConfidenceLevel => {
      if (c === 'high' || c === 'medium' || c === 'low' || c === 'unsure') return c;
      return 'unsure';
    };

    const seriesVal = raw?.series?.value || parsedContext?.recognizedSeries || 'unsure';
    const seriesConf = raw?.series?.confidence ? validConf(raw.series.confidence) : (seriesVal !== 'unsure' ? 'medium' : 'unsure');

    let charsList: DetectedEntity[] = [];
    if (Array.isArray(raw?.characters) && raw.characters.length > 0) {
      charsList = raw.characters.map((c: any) => ({
        value: typeof c === 'string' ? c : c?.value || 'unsure',
        confidence: validConf(typeof c === 'string' ? 'medium' : c?.confidence),
        confirmed: false,
      }));
    } else if (parsedContext?.recognizedCharacter) {
      charsList = [
        {
          value: parsedContext.recognizedCharacter,
          confidence: 'medium',
          confirmed: false,
        },
      ];
    } else {
      charsList = [{ value: 'unsure', confidence: 'unsure', confirmed: false }];
    }

    const editStyleVal = raw?.editStyle?.value || parsedContext?.editStyle || 'unsure';
    const editStyleConf = raw?.editStyle?.confidence ? validConf(raw.editStyle.confidence) : (editStyleVal !== 'unsure' ? 'medium' : 'unsure');

    const moodVal = raw?.mood?.value || parsedContext?.detectedTone || 'unsure';
    const moodConf = raw?.mood?.confidence ? validConf(raw.mood.confidence) : (moodVal !== 'unsure' ? 'medium' : 'unsure');

    let textList: DetectedEntity[] = [];
    if (Array.isArray(raw?.onScreenText) && raw.onScreenText.length > 0) {
      textList = raw.onScreenText.map((t: any) => ({
        value: typeof t === 'string' ? t : t?.value || 'unsure',
        confidence: validConf(typeof t === 'string' ? 'medium' : t?.confidence),
        confirmed: false,
      }));
    } else {
      textList = [{ value: 'unsure', confidence: 'unsure', confirmed: false }];
    }

    return {
      series: { value: seriesVal, confidence: seriesConf, confirmed: false },
      characters: charsList,
      editStyle: { value: editStyleVal, confidence: editStyleConf, confirmed: false },
      mood: { value: moodVal, confidence: moodConf, confirmed: false },
      onScreenText: textList,
    };
  }

  private static generateSimulatedAnalysis(topic: string, tone: string): AIAnalysisResult {
    const rawLower = topic.toLowerCase();
    const isAnime = /anime|gojo|satoru|jujutsu|zoro|luffy|sukuna|itadori|naruto|sasuke|demon slayer|tanjiro|amv|manga|eren|attack on titan/.test(rawLower);
    const isMarvel = /marvel|mcu|spiderman|spider-man|peter parker|iron man|tony stark|avengers|deadpool|wolverine|thor|captain america|loki/.test(rawLower);
    const isManhwa = /manhwa|solo leveling|sung jin[- ]?woo|jinwoo|shadow monarch|webtoon|orv|dokja|omniscient reader|tower of god|baam|tbate|arthur/.test(rawLower);
    const isGaming = /game|gaming|valorant|jett|reyna|cod|warzone|gta|clutch|headshot|fortnite|apex|elden ring/.test(rawLower);

    let character = 'Creator Character';
    let series = 'Featured Universe';
    let editStyle = '4K HDR Phonk Velocity';
    let mood = 'High Energy & Viral';
    let categoryId = '1';
    let categoryName = 'Film & Animation';
    let ytTitle = '';
    let ytDesc = '';
    let ytTags: string[] = [];
    let ytHashtags: string[] = [];
    let igCaption = '';
    let igHashtags: string[] = [];
    let igLocation = 'Tokyo, Japan';
    let igCollabs = ['@animespotlight'];

    if (isAnime) {
      character = rawLower.includes('zoro') ? 'Roronoa Zoro' : rawLower.includes('sukuna') ? 'Ryomen Sukuna' : 'Gojo Satoru';
      series = rawLower.includes('zoro') ? 'One Piece' : 'Jujutsu Kaisen';
      editStyle = '4K HDR Flow & Phonk Velocity';
      mood = 'Dark & Menacing';
      categoryId = '1';
      categoryName = 'Film & Animation';
      ytTitle = `${character} Being An Absolute Menace 🥶 | ${series} 4K Edit #Shorts`;
      ytDesc = `Witness ${character} unleashing pure dominance in this ${series} visual edit!\n\nCharacter: ${character}\nAnime: ${series}\nStyle: ${editStyle}\nSong: Trending Phonk (Slowed)\n\nEnjoying these edits? Subscribe & like for daily anime edits!`;
      ytTags = ['anime edit', character.toLowerCase(), series.toLowerCase(), 'amv', 'anime shorts', 'phonk anime edit', '4k anime', 'badass anime moments'];
      ytHashtags = ['#Shorts', `#${character.replace(/\s+/g, '')}`, `#${series.replace(/\s+/g, '')}`, '#AnimeEdit'];
      igCaption = `${character} is built different 🥶 Who could actually stand a chance against them in ${series}?\n\nSave this Reel for later & share with your anime squad! ⚔️`;
      igHashtags = ['#animeedit', '#animereels', '#jujutsukaisen', '#amvedits', '#reelsviral'];
      igLocation = 'Tokyo, Japan';
      igCollabs = ['@animespotlight'];
    } else if (isMarvel) {
      character = rawLower.includes('iron man') ? 'Tony Stark (Iron Man)' : rawLower.includes('deadpool') ? 'Deadpool & Wolverine' : 'Peter Parker (Spider-Man)';
      series = 'Marvel Cinematic Universe (MCU)';
      editStyle = 'Cinematic Rec.709 Beat Sync';
      mood = 'Heroic & Cinematic';
      categoryId = '24';
      categoryName = 'Entertainment';
      ytTitle = `${character} - Peak Marvel Cinematic Edit 🎬 [${editStyle}] #Shorts`;
      ytDesc = `The emotional and high-stakes journey of ${character} across the Marvel Cinematic Universe!\n\nCharacter: ${character}\nFranchise: ${series}\nGrade: 4K HDR Color Master\n\nLeave a comment with your favorite Marvel scene!`;
      ytTags = ['marvel edit', 'mcu', 'avengers edit', character.toLowerCase(), 'superhero edit', 'marvel shorts', '4k marvel'];
      ytHashtags = ['#Shorts', '#MarvelEdit', '#MCU', '#Superhero'];
      igCaption = `No one could have pulled this off like ${character} in ${series} 🐐\n\nMCU fans, where does this rank among your all-time top superhero moments?\n\nTag a Marvel fan who needs to rewatch this! 💥`;
      igHashtags = ['#marveledit', '#mcu', '#spidermanedit', '#marveltok', '#avengersedit'];
      igLocation = 'New York, NY';
      igCollabs = ['@marvelstudios'];
    } else if (isManhwa) {
      character = 'Sung Jin-woo (Shadow Monarch)';
      series = 'Solo Leveling';
      editStyle = 'Dark Orchestral Motion Webtoon Sync';
      mood = 'Overwhelming Aura & Hype';
      categoryId = '1';
      categoryName = 'Film & Animation';
      ytTitle = `${character} Arises! | ${series} Manhwa Motion Edit 👑 #Shorts`;
      ytDesc = `The unstoppable aura of ${character} from ${series}!\n\nProtagonist: ${character}\nWebtoon: ${series}\nMusic: Dark Phonk / Orchestral Trap\n\nSubscribe for more weekly manhwa & webtoon motion edits!`;
      ytTags = ['manhwa edit', 'solo leveling', 'sung jin woo', 'webtoon edit', 'manhwa recommendation', 'shadow monarch', 'action webtoon'];
      ytHashtags = ['#Shorts', '#SoloLeveling', '#ManhwaEdit', '#SungJinWoo'];
      igCaption = `The aura in this chapter was unmatched 🔥 ${character} just proved why he is the Shadow Monarch in ${series}.\n\nRate this manhwa from 1 to 10 below! 👇`;
      igHashtags = ['#manhwaedit', '#sololeveling', '#webtoonedit', '#manhwarecommendation', '#sungjinwoo'];
      igLocation = 'Seoul, South Korea';
      igCollabs = ['@webtoonofficial'];
    } else if (isGaming) {
      character = 'Jett';
      series = 'Valorant';
      editStyle = 'Velocity Sync & Clean Beat Transitions';
      mood = 'Fast-Paced & Clutch';
      categoryId = '20';
      categoryName = 'Gaming';
      ytTitle = `${character} UNREAL Clutch | ${series} 1v5 Velocity Edit 🎯 #Shorts`;
      ytDesc = `Insane velocity beat sync highlights featuring ${character} in ${series}!\n\nPlayer / Agent: ${character}\nGame: ${series}\nSong: Drift Phonk (Slowed + Reverb)\n\nSmash like if that flick was clean!`;
      ytTags = ['gaming edit', 'phonk edit', 'velocity edit', 'clutch montage', 'gametok', 'clean transitions', 'gaming shorts'];
      ytHashtags = ['#Shorts', '#GamingEdit', '#Valorant', '#Velocity'];
      igCaption = `Wait for the beat drop on this ${character} play 😮‍💨 | ${series}\n\nCould you hit this clutch under pressure?\n\nTag your duo who needs to see this! 🎯`;
      igHashtags = ['#gamingedit', '#phonkedit', '#gametok', '#velocityedit', '#clutch'];
      igLocation = 'Los Angeles, CA';
      igCollabs = ['@gamingspotlight'];
    } else {
      const sanitizedTopic = topic.length > 0 ? topic : 'Creative Viral Short';
      const cleanWord = sanitizedTopic.split(' ')[0] || 'Content';
      character = 'unsure';
      series = 'unsure';
      editStyle = 'Viral Cinematic Flow';
      mood = tone === 'viral_hook' ? 'High Energy & Viral' : 'Engaging & Authentic';
      ytTitle = `${sanitizedTopic} #Shorts`;
      ytDesc = `Everything you need to know about ${sanitizedTopic} in 60 seconds!\n\n👇 Drop your thoughts in the comments below\n🔔 Subscribe to the channel for daily updates & behind-the-scenes!\n\n#Shorts #${cleanWord} #Viral #Trending #Creator`;
      ytTags = [sanitizedTopic.toLowerCase(), `${cleanWord.toLowerCase()} tutorial`, 'shorts', 'viral shorts', 'trending now', 'youtube creators'];
      ytHashtags = ['#Shorts', `#${cleanWord}`, '#Trending', '#Viral'];
      igCaption = `Wait until the end... ✨ Here is the breakdown on ${sanitizedTopic}.\n\nSave this for later & share with a creator friend who needs to see this! 🚀\n.\nWhat do you think? Drop a comment below! 👇`;
      igHashtags = [`#${cleanWord.toLowerCase()}`, '#reels', '#explorepage', '#trendingreels', '#viralreels'];
      igLocation = 'New York, NY';
      igCollabs = ['@creators'];
    }

    const isRecognized = isAnime || isMarvel || isManhwa || isGaming;

    return {
      topic: topic || 'High Reach Short-Form Video',
      detectedTone: tone === 'viral_hook' ? 'High Energy & Viral' : 'Engaging & Authentic',
      recognizedCharacter: isRecognized ? character : undefined,
      recognizedSeries: isRecognized ? series : undefined,
      editStyle,
      mood,
      detections: {
        series: { value: isRecognized ? series : 'unsure', confidence: isRecognized ? 'medium' : 'unsure' },
        characters: [{ value: isRecognized ? character : 'unsure', confidence: isRecognized ? 'medium' : 'unsure' }],
        editStyle: { value: editStyle, confidence: 'medium' },
        mood: { value: mood, confidence: 'medium' },
        onScreenText: [{ value: 'unsure', confidence: 'unsure' }],
      },
      keyInsights: [
        `High engagement potential in visual storytelling and quick transitions`,
        `Audience retention peaks when the hook delivers within the first 2.5 seconds`,
        `Search volume for ${isRecognized ? `${character} and ${series}` : topic} is currently active on Shorts and Reels`,
      ],
      groundedTrends: [
        {
          query: `trending ${character.toLowerCase()} ${series.toLowerCase()} edit 2026`,
          trendingKeywords: [
            `#${character.replace(/\s+/g, '').toLowerCase()}`,
            `#${series.replace(/\s+/g, '').toLowerCase()}`,
            `#reelsviral`,
            `#youtubeshorts`,
          ],
          contextNote: `Algorithm favoring fast-paced 4K edits with synchronized phonk beat drops`,
        },
      ],
      youtube: {
        title: ytTitle,
        description: ytDesc,
        tags: ytTags,
        hashtags: ytHashtags,
        categoryId,
        categoryName,
        language: 'en',
        isShorts: true,
      },
      instagram: {
        hookSentence: `Stop scrolling! Did you already see this ${character !== 'unsure' ? character : 'scene'}? 👀`,
        caption: igCaption,
        hashtags: igHashtags,
        recommendedAudio: 'Trending Phonk Beat (Slowed + Reverb)',
        suggestedLocation: igLocation,
        suggestedCollaborators: igCollabs,
      },
      predictedGrowth: [
        { day: 1, label: 'Day 1', youtubeViews: 2400, instagramViews: 4100, searchInterest: 52 },
        { day: 2, label: 'Day 2', youtubeViews: 7800, instagramViews: 11500, searchInterest: 78 },
        { day: 3, label: 'Day 3', youtubeViews: 21500, instagramViews: 26800, searchInterest: 96 },
        { day: 5, label: 'Day 5', youtubeViews: 38200, instagramViews: 39400, searchInterest: 85 },
        { day: 7, label: 'Day 7', youtubeViews: 51600, instagramViews: 48900, searchInterest: 74 },
        { day: 14, label: 'Day 14', youtubeViews: 72400, instagramViews: 61200, searchInterest: 64 },
        { day: 30, label: 'Day 30', youtubeViews: 98500, instagramViews: 74600, searchInterest: 58 },
      ],
      analyzedAt: new Date().toISOString(),
      isFallback: true,
      aiOfflineNotice: 'AI is currently offline or unreachable. Metadata generated using fallback template.',
      videoAnalysisMethod: 'fallback_template',
    };
  }

  /**
   * Generates SEO-friendly YouTube tags and Instagram alt-text descriptions
   * automatically using Gemini with Google Search grounding.
   */
  static async generateSmartKeywords(params: {
    title?: string;
    description?: string;
    topic?: string;
    videoFilename?: string;
  }): Promise<{
    focusKeyword: string;
    youtubeTags: string[];
    instagramAltText: string;
    primaryKeywords: string[];
    seoStrategyTip?: string;
  }> {
    const rawContext =
      params.topic ||
      params.title ||
      params.description ||
      (params.videoFilename ? params.videoFilename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') : 'creative viral video');

    const focusKeyword = rawContext.slice(0, 80).trim();
    const apiKey = config.geminiApiKey;

    const systemPrompt = `You are a world-class YouTube SEO strategist and Instagram Accessibility & Search optimization expert.
Given video metadata context, generate:
1. SEO-friendly YouTube search tags: A list of 12-18 highly searchable tags, including broad keywords, niche keywords, and high-CTR long-tail phrases that match how real viewers search on YouTube. No '#' symbol in tags.
2. Instagram SEO Alt-Text Description: A rich, accessible 2-4 sentence description (approx 150-250 characters) describing the video visually for screen readers while naturally integrating primary and secondary keywords so the Instagram algorithm indexes the Reel for Explore and search ranking.
3. Primary Keywords: 4-6 high-impact single or two-word focus keywords.
4. SEO Strategy Tip: A one-sentence tip on how to optimize this video's click-through and search discovery.

Return strictly valid JSON with this exact schema (no markdown formatting, just JSON):
{
  "focusKeyword": "string",
  "youtubeTags": ["tag 1", "tag 2", "tag 3"],
  "instagramAltText": "string",
  "primaryKeywords": ["keyword 1", "keyword 2"],
  "seoStrategyTip": "string"
}`;

    const userPrompt = `Context:
Title: ${params.title || 'N/A'}
Description: ${params.description || 'N/A'}
Topic/Focus: ${focusKeyword}
Filename: ${params.videoFilename || 'N/A'}

Generate the optimized YouTube SEO tags and Instagram Alt-Text description.`;

    if (apiKey) {
      try {
        console.log('[GeminiService] Generating smart keywords via Gemini API...');
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            contents: [
              {
                role: 'user',
                parts: [{ text: systemPrompt }, { text: userPrompt }],
              },
            ],
            generationConfig: {
              temperature: 0.6,
            },
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000,
          }
        );

        const candidates = response.data?.candidates;
        if (candidates && candidates.length > 0) {
          const text = candidates[0].content?.parts?.[0]?.text || '';
          const cleanedText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
          try {
            const parsed = JSON.parse(cleanedText);
            return {
              focusKeyword: parsed.focusKeyword || focusKeyword,
              youtubeTags: Array.isArray(parsed.youtubeTags) ? parsed.youtubeTags : [],
              instagramAltText: parsed.instagramAltText || '',
              primaryKeywords: Array.isArray(parsed.primaryKeywords) ? parsed.primaryKeywords : [],
              seoStrategyTip: parsed.seoStrategyTip || 'Use your focus keyword in the first 25 words of your description.',
            };
          } catch (e) {
            console.warn('[GeminiService] Failed to parse smart keywords JSON from Gemini, using fallback parser');
          }
        }
      } catch (err: any) {
        console.error('[GeminiService] Error calling Gemini for smart keywords:', err?.response?.data || err.message);
      }
    }

    // Fallback generator
    const words = focusKeyword
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2);
    const mainWord = words[0] || 'viral';
    const secondWord = words[1] || 'video';

    return {
      focusKeyword,
      youtubeTags: [
        focusKeyword.toLowerCase(),
        `${mainWord} tutorial`,
        `${mainWord} guide`,
        `how to ${mainWord}`,
        `${mainWord} tips 2026`,
        `${mainWord} shorts`,
        `best ${mainWord} ${secondWord}`,
        'viral shorts',
        'trending video',
        'content creator tips',
        'youtube growth',
        `${secondWord} editing`,
        'must watch 2026',
      ],
      instagramAltText: `Short-form video showcase demonstrating ${focusKeyword}. Fast-paced visual transitions and high-resolution creative highlights designed for mobile creators and social media storytelling.`,
      primaryKeywords: [mainWord, secondWord, `${mainWord} ${secondWord}`, 'creative', 'trending'],
      seoStrategyTip: `Include "${mainWord}" in your YouTube title hook and within the first line of your Instagram caption for maximum reach.`,
    };
  }
}
