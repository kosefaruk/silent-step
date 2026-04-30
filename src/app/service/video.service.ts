import { Injectable } from '@angular/core';
import {AuthBootstrapService} from "./auth-bootstrap.service";

@Injectable({ providedIn: 'root' })
export class VideoService {
  private readonly workerBase = 'https://snowy-limit-a414.4010930160.workers.dev';

  constructor(private authBoot: AuthBootstrapService) {}

  async getSignedVideoUrl(r2Key: string): Promise<string> {
    return this.getSignedUrl(`/api/video-url`, r2Key);
  }

  async getSignedImageUrl(r2Key: string): Promise<string> {
    return this.getSignedUrl(`/api/image-url`, r2Key);
  }

  private async getSignedUrl(path: string, r2Key: string): Promise<string> {
    const token = await this.authBoot.getIdToken();
    const res = await fetch(
        `${this.workerBase}${path}?key=${encodeURIComponent(r2Key)}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) throw new Error(`Signed URL failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return data.url;
  }
}

