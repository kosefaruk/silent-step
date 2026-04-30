import {Injectable} from '@angular/core';
import {Device} from '@capacitor/device';
import {DeviceInfo} from '../model/DeviceInfo';
import {BehaviorSubject, NotFoundError} from 'rxjs';
import {Session} from '../model/Session';

@Injectable({
  providedIn: 'root'
})
export class GlobalService {

  private STORAGE_KEY = 'appState';
  item = localStorage.getItem(this.STORAGE_KEY)
  private initialState: Session = this.item ? JSON.parse(this.item) : new Session();
  stateSubject = new BehaviorSubject<Session>(this.initialState);

  private STORAGE_KEY_SET = 'appStateSet';
  itemSet = localStorage.getItem(this.STORAGE_KEY_SET)
  private initialStateSet: Session = this.itemSet ? JSON.parse(this.itemSet) : new Session();
  stateSubjectSet = new BehaviorSubject<Session>(this.initialStateSet);

  constructor() {
  }


  async getDeviceInfo(): Promise<DeviceInfo> {
    try {
      return {
        model: (await Device.getInfo()).model,
        platform: (await Device.getInfo()).platform,
        operatingSystem: (await Device.getInfo()).operatingSystem,
        osVersion: (await Device.getInfo()).osVersion,
        manufacturer: (await Device.getInfo()).manufacturer,
        isVirtual: (await Device.getInfo()).isVirtual,
        uuid: (await Device.getId()).identifier
      };
    } catch (error) {
      throw NotFoundError;
    }
  }

  updateState(newState: Session): void {
    this.stateSubject.next(newState);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newState));
  }

  updateStateSet(newState: Session): void {
    this.stateSubjectSet.next(newState);
    localStorage.setItem(this.STORAGE_KEY_SET, JSON.stringify(newState));
  }

  calculateAge(birthDate: Date): number {
    const today = new Date(); // Bugünkü tarih
    let age = today.getFullYear() - birthDate.getFullYear(); // Yıl farkı
    const monthDiff = today.getMonth() - birthDate.getMonth(); // Ay farkı
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
}
