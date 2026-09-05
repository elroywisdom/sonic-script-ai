declare module 'mp4box' {
  export interface MP4AudioTrack {
    id: number;
    name: string;
    type: string;
    codec: string;
    audio: {
      sample_rate: number;
      channel_count: number;
      sample_size: number;
    };
    duration: number;
    timescale: number;
  }

  export interface MP4Info {
    duration: number;
    timescale: number;
    audioTracks: MP4AudioTrack[];
    tracks: Array<{
      id: number;
      type: string;
    }>;
  }

  export interface MP4Sample {
    track_id: number;
    number: number;
    timescale: number;
    description: unknown;
    is_sync: boolean;
    data: Uint8Array;
    duration: number;
    cts: number;
    dts: number;
    size: number;
  }

  export interface MP4File {
    onReady?: (info: MP4Info) => void;
    onError?: (e: string) => void;
    onSamples?: (id: number, user: unknown, samples: MP4Sample[]) => void;
    appendBuffer(buffer: ArrayBuffer & { fileStart?: number }): number;
    start(): void;
    stop(): void;
    flush(): void;
    setExtractionOptions(id: number, user?: unknown, options?: { nbSamples?: number }): void;
  }

  export function createFile(): MP4File;
}
