import {Injectable} from '@angular/core';
import {
    getAuth,
    setPersistence,
    browserLocalPersistence,
    signInAnonymously,
    onAuthStateChanged,
    User
} from 'firebase/auth';
import {initializeApp} from "@angular/fire/app";
import {environment} from "../../environments/environment";
import {Capacitor} from "@capacitor/core";
import {initializeAuth} from "@angular/fire/auth";
import {indexedDBLocalPersistence} from 'firebase/auth';

@Injectable({providedIn: 'root'})
export class AuthBootstrapService {
    private auth: any;


    setAuth() {
        const platform = Capacitor.getPlatform();
        if (platform === 'ios') {
            const firebaseApp = initializeApp(environment.firebase);
            initializeAuth(firebaseApp, {
                persistence: indexedDBLocalPersistence
            });
            this.auth = getAuth(firebaseApp);
        } else {
            this.auth = getAuth();
        }
    }

    async ensureSignedIn(): Promise<User> {
        this.setAuth();
        await setPersistence(this.auth, browserLocalPersistence);

        // zaten oturum varsa
        if (this.auth.currentUser) return this.auth.currentUser;

        // oturum yoksa anon login
        await signInAnonymously(this.auth);

        // currentUser set edilene kadar bekle
        return await new Promise<User>((resolve, reject) => {
            const unsub = onAuthStateChanged(this.auth, (u) => {
                if (u) {
                    unsub();
                    resolve(u);
                }
            });
            setTimeout(() => {
                unsub();
                reject(new Error('Auth timeout'));
            }, 8000);
        });
    }

    async getIdToken(): Promise<string> {
        const user = await this.ensureSignedIn();
        return await user.getIdToken();
    }

    get uid(): string | null {
        return this.auth.currentUser?.uid ?? null;
    }
}
