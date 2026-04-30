import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {FirebaseFirestore} from '@capacitor-firebase/firestore';
import {environment} from '../../environments/environment';

export type AppGateStatus = 'loading' | 'ok' | 'disabled' | 'updateRequired';

export interface AppSettings {
    enabled: boolean;
    minVersion: string;
    disabledMessage?: string;
    updateMessage?: string;
    storeUrlIos?: string;
    storeUrlAndroid?: string;
}

@Injectable({providedIn: 'root'})
export class AppSettingsService {
    status$ = new BehaviorSubject<AppGateStatus>('loading');
    settings: AppSettings | null = null;

    async load(): Promise<void> {
        try {
            const {snapshot}: any = await FirebaseFirestore.getDocument({
                reference: 'settings/app',
            });
            const data = snapshot?.data ?? {};
            this.settings = {
                enabled: data.enabled !== false,
                minVersion: data.minVersion ?? '0.0.0',
                disabledMessage: data.disabledMessage,
                updateMessage: data.updateMessage,
                storeUrlIos: data.storeUrlIos,
                storeUrlAndroid: data.storeUrlAndroid,
            };

            if (!this.settings.enabled) {
                this.status$.next('disabled');
                return;
            }
            if (this.isVersionLower(environment.appVersion, this.settings.minVersion)) {
                this.status$.next('updateRequired');
                return;
            }
            this.status$.next('ok');
        } catch (e) {
            this.status$.next('ok');
        }
    }

    private isVersionLower(current: string, min: string): boolean {
        const c = current.split('.').map(n => parseInt(n, 10) || 0);
        const m = min.split('.').map(n => parseInt(n, 10) || 0);
        const len = Math.max(c.length, m.length);
        for (let i = 0; i < len; i++) {
            const a = c[i] ?? 0;
            const b = m[i] ?? 0;
            if (a < b) return true;
            if (a > b) return false;
        }
        return false;
    }
}
