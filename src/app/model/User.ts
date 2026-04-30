import {DeviceInfo} from './DeviceInfo';
import {Timestamp} from '@angular/fire/firestore';

export interface User {
  nameSurname: string;
  uuid: string;
  difficulty: string;
  birthDate: Timestamp;
  createDate: Timestamp;
  deviceInfo: DeviceInfo;
  schoolNumber: number;
  age: number;
}
