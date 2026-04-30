import {inject, Injectable} from '@angular/core';
import {catchError, EMPTY, from, map, mergeMap, Observable, switchMap} from 'rxjs';
import {
    collection, deleteDoc,
    doc,
    Firestore,
    getDocs,
    query,
    setDoc,
    Timestamp,
    updateDoc,
    where,
} from '@angular/fire/firestore';
import {GlobalService} from './global.service';
import {User} from '../model/User';
import {Video} from '../model/Video';
import {Session} from '../model/Session';
import {Router} from '@angular/router';
import {NzModalService} from "ng-zorro-antd/modal";

@Injectable({
    providedIn: 'root'
})
export class AuthService {

    firestore = inject(Firestore);
    UUID = 'UUID';

    constructor(
        private globalService: GlobalService,
        private router: Router,
        private modal: NzModalService,
    ) {
    }

    getUserAuth(): Observable<any> {
        const deviceInfo$ = from(this.globalService.getDeviceInfo());
        const result$ = deviceInfo$.pipe(
            switchMap(deviceInfo => {
                this.setUserId(deviceInfo.uuid ? deviceInfo.uuid : '');
                const itemCollection = collection(this.firestore, 'user');
                const firestoreQuery = query(itemCollection, where('uuid', '==', deviceInfo?.uuid));
                return from(getDocs(firestoreQuery)).pipe(
                    map(querySnapshot => querySnapshot.docs.map(doc => ({id: doc.id, ...doc.data()})))
                );
            })
        );
        return result$;
    }

    getUserId(): string | null {
        return localStorage.getItem(this.UUID);
    }

    setUserId(userId: string): void {
        localStorage.setItem(this.UUID, userId);
    }

    setSession(selectedEquipment: boolean, selectedEquipmentDetail: string): Observable<any> {
        return this.getUserAuth().pipe(
            mergeMap((items: User[]) => {
                const user = items[0];
                console.log(user);
                const age = user.age;
                const difficulty = user.difficulty;

                const videosCol = collection(this.firestore, 'videos');

                // 1) WarmUp: category=1 ve equipment=false sabit
                const warmupQuery = query(
                    videosCol,
                    where('ageStart', '<=', age),
                    where('ageEnd', '>=', age),
                    where('difficulty', '==', difficulty),
                    where('category', '==', "1"),
                    where('equipment', '==', false)
                );
                // 2) Other: category=2 ve equipment/equipmentDetail kullanıcı seçimine göre
                const otherQuery = query(
                    videosCol,
                    where('ageStart', '<=', age),
                    where('ageEnd', '>=', age),
                    where('difficulty', '==', difficulty),
                    where('category', '==', "2"),
                    where('equipment', '==', selectedEquipment),
                    where('equipmentDetail', '==', selectedEquipmentDetail)
                );

                const pickRandomUnique = (arr: any[], n: number) => {
                    const copy = [...arr];
                    // Fisher–Yates shuffle (partial)
                    for (let i = copy.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [copy[i], copy[j]] = [copy[j], copy[i]];
                    }
                    return copy.slice(0, Math.min(n, copy.length));
                };

                const docsToItems = (qs: any) => qs.docs.map((d: any) => ({id: d.id, ...d.data()}));

                // iki sorguyu paralel çek
                return from(Promise.all([getDocs(warmupQuery), getDocs(otherQuery)])).pipe(
                    mergeMap(async ([warmSnap, otherSnap]) => {
                        const warmups = docsToItems(warmSnap);
                        const others = docsToItems(otherSnap);

                        // ✅ video yoksa hata fırlat
                        if (warmups.length < 7 || others.length < 3) {
                            const msg =
                                `Seçmiş olduğunuz kategoride sizin kriterlerinize uygun yeterli egzersiz bulunmamaktadır. ` +
                                `Lütfen farklı kategori seçerek devam ediniz.`;
                            throw new Error(msg);
                        }

                        const selectedWarmups = pickRandomUnique(warmups, 7);
                        const selectedOthers = pickRandomUnique(others, 3);

                        const selectedVideos = [
                            selectedWarmups[0],
                            selectedWarmups[1],
                            selectedWarmups[2],
                            selectedWarmups[3],
                            ...selectedOthers,
                            selectedWarmups[4],
                            selectedWarmups[5],
                            selectedWarmups[6],
                        ];

                        await this.cancelOtherIncompleteSessions(user.uuid);
                        await this.createSession(selectedVideos, selectedEquipment, user.uuid, difficulty);
                        return true;
                    }),

                    catchError((err) => {
                        this.modal.info({
                            nzTitle: 'Video Bulunamadı',
                            nzContent: err?.message || 'Uygun video bulunamadı. Lütfen tekrar deneyin.',
                            nzOkText: 'Tamam',
                            nzOnOk: () => window.location.reload(),
                            nzCentered: true
                        });

                        return EMPTY; // akışı bitir
                    })
                );

            })
        );
    }


    async createSession(videoList: Video[], equipment: boolean, userId: string, difficulty: string): Promise<any> {
        const sessionRef = doc(collection(this.firestore, 'session')); // Firestore'da yeni bir doküman oluştur
        const docId = sessionRef.id; // Otomatik oluşturulan docId'yi al

        const session: Session = new Session();
        session.id = docId; // Otomatik oluşturulan Firestore docId'yi session.id olarak kullan
        session.createDate = Timestamp.now();
        session.endDate = new Date().setHours(23, 59, 0, 0);
        session.equipment = equipment;
        session.videos = videoList;
        session.user = userId;
        session.difficulty = difficulty;
        session.isCompleted = false;
        session.cancelled = false;
        session.selectedEndDifficulty = '';
        session.lastWatchedDate = Timestamp.fromDate(new Date('1980-01-01T00:00:00Z'));
        await setDoc(sessionRef, {...session}); // Firestore'a veriyi kaydet
    }

    async updateSessionByQuery(session: Session, selectedDifficulty: string): Promise<void> {
        const sessionRef = doc(this.firestore, 'session', session.id ?? '');
        await updateDoc(sessionRef, {
            isCompleted: true,
            selectedEndDifficulty: selectedDifficulty
        });
        if (session.user) {
            await this.cancelOtherIncompleteSessions(session.user, session.id);
        }
    }

    async cancelOtherIncompleteSessions(userId: string, exceptSessionId?: string): Promise<void> {
        const sessionCol = collection(this.firestore, 'session');
        const q = query(
            sessionCol,
            where('user', '==', userId),
            where('isCompleted', '==', false)
        );
        const snap = await getDocs(q);
        await Promise.all(
            snap.docs
                .filter(d => d.id !== exceptSessionId)
                .map(d =>
                    updateDoc(doc(this.firestore, 'session', d.id), {
                        cancelled: true
                    })
                )
        );
    }

    updateUserAuth(difficulty: string): Observable<any> {
        return this.getUserAuth().pipe(
            switchMap(users => {
                if (users.length > 0) {
                    const userDoc = users[0]; // İlk kullanıcıyı al
                    const userRef = doc(this.firestore, 'user', userDoc.id);
                    const updateData = {difficulty: this.getDifficulty(userDoc.difficulty, this.getChangeFactor(difficulty))};
                    return from(updateDoc(userRef, updateData)).pipe(
                        map(() => ({id: userDoc.id, ...updateData, updated: true}))
                    );
                } else {
                    return from([null]); // Eğer kullanıcı bulunmazsa `null` döndür
                }
            })
        );
    }

    getDifficulty(userDifficulty: string, changeFactor: number): string {
        switch (userDifficulty) {
            case '1':
                if (changeFactor == -1 || changeFactor == 0)
                    return '1';
                else
                    return '2';
            case '2':
                if (changeFactor == -1)
                    return '1';
                else if (changeFactor == 0)
                    return '2';
                else
                    return '3';
            case '3':
                if (changeFactor == -1)
                    return '2';
                else if (changeFactor == 0)
                    return '3';
                else
                    return '4';
            case '4':
                if (changeFactor == -1)
                    return '3';
                else if (changeFactor == 0)
                    return '4';
                else
                    return '5';
            case '5':
                if (changeFactor == -1)
                    return '4';
                else
                    return '5';
            default:
                return userDifficulty;
        }
    }

    getChangeFactor(selectedDifficulty: string): number {
        if (selectedDifficulty == '1' || selectedDifficulty == '2') {
            return 1;
        } else if (selectedDifficulty == '4' || selectedDifficulty == '5') {
            return -1;
        } else
            return 0;
    }

    deleteUserAuth(): Observable<any> {
        return this.getUserAuth().pipe(
            switchMap(users => {
                if (users.length > 0) {
                    const userDoc = users[0];
                    const userId = userDoc.id;
                    const userRef = doc(this.firestore, 'user', userId);

                    const sessionQuery = query(
                        collection(this.firestore, 'session'),
                        where('user', '==', userId)
                    );

                    return from(getDocs(sessionQuery)).pipe(
                        switchMap((querySnapshot) => {
                            const deletePromises = querySnapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
                            return from(Promise.all(deletePromises));
                        }),
                        switchMap(() => from(deleteDoc(userRef))),
                        map(() => {
                            this.router.navigate(['/register']); // Kullanıcı silindikten sonra yönlendirme
                            return {
                                id: userId,
                                deleted: true,
                                sessionsDeleted: true,
                                redirected: true
                            };
                        })
                    );
                } else {
                    return from([null]);
                }
            })
        );
    }

}
