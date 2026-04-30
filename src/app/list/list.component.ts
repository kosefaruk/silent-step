import {Component, inject, OnInit} from '@angular/core';
import {catchError, EMPTY, map} from 'rxjs';
import {CommonModule, NgIf} from '@angular/common';
import {NzTableModule} from 'ng-zorro-antd/table';
import {NzListModule} from 'ng-zorro-antd/list';
import {GlobalService} from '../service/global.service';
import {Video} from '../model/Video';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {Firestore,} from '@angular/fire/firestore';
import {AuthService} from '../service/auth.service';
import {NzGridModule} from 'ng-zorro-antd/grid';
import {NzButtonComponent} from 'ng-zorro-antd/button';
import {NzFlexModule} from 'ng-zorro-antd/flex';
import {StreamComponent} from '../stream/stream.component';
import {Session} from '../model/Session';
import {NzCardComponent} from "ng-zorro-antd/card";
import {NzSpinComponent} from "ng-zorro-antd/spin";
import {NzIconDirective} from "ng-zorro-antd/icon";
import {faBacon, faBaseballBall, faDumbbell} from "@fortawesome/free-solid-svg-icons";
import {VideoService} from "../service/video.service";
import {AuthBootstrapService} from "../service/auth-bootstrap.service";
import {FirebaseFirestore} from '@capacitor-firebase/firestore';


@Component({
    selector: 'app-list',
    standalone: true,
    imports: [
        NzTableModule,
        NzListModule,
        FaIconComponent,
        NzGridModule,
        NzButtonComponent,
        NzFlexModule,
        NgIf,
        StreamComponent,
        CommonModule,
        NzCardComponent,
        NzSpinComponent,
        NzIconDirective,
    ],
    templateUrl: './list.component.html',
    styleUrl: './list.component.css'
})
export class ListComponent implements OnInit {
    firestore = inject(Firestore);
    userId: string | null = '';
    selectedEquipment = '';
    sessionStatus = '';
    selectedEquipmentDetail: string = '';
    load = false;
    loading = true;
    hasActiveSession = false;
    activeSessionId: string | null = null;

    faIconList = {
        faResistanceBand: faBacon,
        faDumbbell: faDumbbell,
        faBaseballBall: faBaseballBall,
    };

    constructor(
        private globalService: GlobalService,
        private authService: AuthService,
        private videoService: VideoService,
        private authBoot: AuthBootstrapService
    ) {
    }

    async ngOnInit() {
        await this.getSessionData();
    }

    async getSessionData() {
        this.load = false;
        if (!this.userId) {
            this.userId = this.authService.getUserId() || '';
        }
        if (!this.userId) {
            this.sessionStatus = 'equipment';
            this.loading = false;
            return;
        }
        try {
            const {snapshots} = await FirebaseFirestore.getCollection({
                reference: 'session',
                compositeFilter: {
                    type: 'and',
                    queryConstraints: [
                        {
                            type: 'where',
                            fieldPath: 'user',
                            opStr: '==',
                            value: this.userId,
                        },
                        {
                            type: 'where',
                            fieldPath: 'isCompleted',
                            opStr: '==',
                            value: false
                        },
                    ],
                }
            });
            const validSnapshots = (snapshots ?? []).filter(
                (s: any) => s?.data?.cancelled !== true
            );
            if (validSnapshots.length === 0) {
                this.hasActiveSession = false;
                this.activeSessionId = null;
                this.sessionStatus = 'equipment';
                this.loading = false;
                return;
            }
            const latest = validSnapshots.reduce((a: any, b: any) => {
                const aTime = a?.data?.createDate?.seconds ?? 0;
                const bTime = b?.data?.createDate?.seconds ?? 0;
                return bTime > aTime ? b : a;
            });
            const sessionId = latest.id;
            this.hasActiveSession = true;
            this.activeSessionId = sessionId;
            const {snapshot}: any = await FirebaseFirestore.getDocument({
                reference: `session/${sessionId}`,
            });
            const session: Session = {
                id: sessionId,
                ...snapshot.data
            } as Session;
            this.sessionStatus = 'session';
            this.globalService.updateStateSet(session);
            await this.getSources(session);

        } catch (error) {
            this.sessionStatus = 'equipment';
            this.loading = false;
        }
    }

    async getSources(session: Session) {
        if (!session.videos) {
            this.loading = false;
            return;
        }

        session.videos = await Promise.all(
            session.videos.map(async (item) => {
                const videoName = item.videoName || '';
                const imageName = this.toImageFileName(videoName); // 1.mp4 -> 1.jpeg

                const [videoUrl, imageUrl] = await Promise.all([
                    this.getVideoLink(videoName),
                    this.getImageLink(imageName),
                ]);

                item.videolink = videoUrl || '';
                (item as any).imagelink = imageUrl || '';

                return item;
            })
        );

        this.globalService.updateState(session);
        this.load = true;
        this.loading = false;
    }


    async getVideoLink(r2Key: string) {
        try {
            return await this.videoService.getSignedVideoUrl('videos/' + r2Key);
        } catch (e: any) {
            return null;
        }
    }

    private toImageFileName(name: string) {
        if (!name) return '';
        const lower = name.toLowerCase();

        // Zaten görsel uzantısı geldiyse dokunma
        if (lower.endsWith('.jpeg') || lower.endsWith('.jpg') || lower.endsWith('.png') || lower.endsWith('.webp')) {
            return name;
        }

        // 1.mp4 -> 1.jpeg
        return name.replace(/\.[^/.]+$/, '') + '.jpg';
    }

    async getImageLink(imageFileName: string) {
        try {
            return await this.videoService.getSignedImageUrl('images/' + imageFileName);
        } catch {
            return null;
        }
    }

    setEquipment(selection: boolean) {
        this.selectedEquipment = selection ? 'withEquipment' : 'withoutEquipment';
        if (selection) {
            this.sessionStatus = 'equipmentDetail';
        } else {
            this.loading = true;
            this.setSession('');
        }
    }

    setEquipmentDetail(selection: string) {
        this.selectedEquipmentDetail = selection;
        this.loading = true;
        this.setSession(selection);
    }

    setSession(equipmentDetail: string) {
        this.authService.setSession(this.selectedEquipment == 'withEquipment', equipmentDetail).pipe(
            map(item => {
                this.sessionStatus = '';
                this.getSessionData();
            }),
            catchError(() => {
                this.sessionStatus = 'equipmentDetail';
                this.selectedEquipmentDetail = '';
                this.loading = false;
                return EMPTY;
            }),
        ).subscribe();
    }

    goBackToEquipment() {
        if (this.loading) return;
        this.sessionStatus = 'equipment';
        this.selectedEquipmentDetail = '';
        this.selectedEquipment = '';
    }

    goBackFromStream() {
        this.sessionStatus = 'equipment';
        this.selectedEquipment = '';
        this.selectedEquipmentDetail = '';
    }

    resumeSession() {
        if (!this.hasActiveSession) return;
        this.sessionStatus = 'session';
    }

    onExerciseCompleted() {
        this.load = false;
        this.hasActiveSession = false;
        this.activeSessionId = null;
        this.selectedEquipment = '';
        this.selectedEquipmentDetail = '';
        this.sessionStatus = 'equipment';
    }
}