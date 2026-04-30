import {AfterViewInit, Component, ElementRef, EventEmitter, inject, OnInit, Output, ViewChild} from '@angular/core';
import {NgForOf, NgIf, NgStyle} from "@angular/common";
import {GlobalService} from '../service/global.service';
import {NzFlexModule} from 'ng-zorro-antd/flex';
import {Session} from '../model/Session';
import {Firestore} from '@angular/fire/firestore';
import {NgxVideoPlayerModule} from '@poseclop/ngx-video-player';
import videojs from "video.js";
import 'videojs-playlist';
import {Video} from '../model/Video';
import {Source, Src} from '../model/Source';
import {NzModalComponent, NzModalModule} from 'ng-zorro-antd/modal';
import {NzRadioComponent, NzRadioGroupComponent} from 'ng-zorro-antd/radio';
import {FormsModule} from '@angular/forms';
import {AuthService} from '../service/auth.service';
import {debounceTime, fromEvent, merge, Subject, Subscription} from 'rxjs';
import {NzButtonModule} from 'ng-zorro-antd/button';
import {NzIconModule} from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-stream',
  standalone: true,
  imports: [
    NgIf, NzFlexModule, NgxVideoPlayerModule, NgForOf, NgStyle, NzModalComponent,
    NzModalModule, NzRadioGroupComponent, NzRadioComponent, FormsModule,
    NzButtonModule, NzIconModule
  ],
  templateUrl: './stream.component.html',
  styleUrl: './stream.component.css'
})
export class StreamComponent implements AfterViewInit {
  firestore = inject(Firestore);
  @Output() back = new EventEmitter<void>();
  @Output() completed = new EventEmitter<void>();
  id = '';
  @ViewChild('videoPlayer') videoPlayer!: ElementRef;
  player: any;
  playlist: any = [];
  sources: Source[] = [];
  index: number = 0;
  isVisible = false;
  difficultySelection = 'easiest';
  session = new Session();
  lastTime = 0; // Son oynatılan zaman
  subscriptions: Subscription = new Subscription(); // RxJS subscription'ları yönetmek için
  timeUpdateSubject = new Subject<number>(); // Manuel RxJS event yöneticisi
  isFinishVisible = false;

  constructor(
    private globalService: GlobalService,
    private authService: AuthService,
  ) {
    this.session = this.globalService.stateSubject.getValue();
    console.log(this.session);
    this.setSources(this.session.videos ?? []);
    this.difficultySelection = this.session.difficulty ?? '1';
  }

  setSources(videoList: Video[]) {
    this.sources = videoList.map((item) => {
      const source: Source = new Source();
      source.poster = item.imagelink;
      const src = new Src();
      src.src = item.videolink ?? '';
      src.type = 'video/mp4';
      source.sources = [src];
      source.video = item;
      return source;
    });
  }

  ngAfterViewInit() {
    this.player = videojs(this.videoPlayer.nativeElement, {
      controls: true,
      autoplay: false,
      preload: 'metadata',
      responsive: true
    });
    this.player.playlist(this.sources);
    this.player.playlist.autoadvance(0);
    this.playlist = this.player.playlist();
    this.player.on('ended', () => {
      const ind1 = this.player.playlist.currentItem();
      setTimeout(() => {
        const ind2 = this.player.playlist.currentItem();
        this.index = ind2;
        if (ind1 == ind2) {
          setTimeout(() => {
            this.isVisible = true;
          }, 1000);
        }
      }, 100);
    });

    this.player.on('timeupdate', () => {
      const currentTime = Math.floor(this.player.currentTime());
      setTimeout(() => {
        this.lastTime = currentTime;
      }, 1000);
    });

    // **Debounce ile zaman güncelleme (1 saniyede bir çalışacak)**
    this.subscriptions.add(
      this.timeUpdateSubject.pipe(debounceTime(1000)).subscribe((currentTime) => {
        this.lastTime = currentTime;
      })
    );

    // **Seek olaylarını dinle ve engelle**
    this.player.on('seeking', () => this.handleSeek());
    this.player.on('seeked', () => this.handleSeek());
  }

  handleSeek() {
    setTimeout(() => {
      if (Math.abs(this.player.currentTime() - this.lastTime) > 0.5) {
        this.player.currentTime(this.lastTime);
      }
    }, 50);
  }

  getCategory(cat: string): string {
    switch (cat) {
      case 'warmUp':
        return 'Isınma';
      case 'coolDown':
        return 'Soğuma';
      default:
        return 'Egzersiz';
    }
  }

  async handleOk() {
    // anket modalını kapat
    this.isVisible = false;

    try {
      await this.authService.updateSessionByQuery(this.session, this.difficultySelection);

      await new Promise<void>((resolve, reject) => {
        this.authService.updateUserAuth(this.difficultySelection).subscribe({
          next: () => resolve(),
          error: (e) => reject(e),
        });
      });

      // ✅ anket kaydı başarılıysa 2. modalı aç
      this.isFinishVisible = true;

    } catch (e) {
      console.error(e);
      // istersen burada hata mesajı / notification gösterebilirsin
      this.isVisible = true; // anket modalını geri açmak istersen
    }
  }

  startNewExercise() {
    this.isFinishVisible = false;
    try {
      this.player?.pause();
    } catch {
    }
    this.completed.emit();
  }

  onBack() {
    try {
      this.player?.pause();
    } catch {
    }
    this.back.emit();
  }

  closeFinishModal() {
    this.isFinishVisible = false;
  }
}
