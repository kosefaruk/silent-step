import {Video} from './Video';
import {Timestamp} from '@angular/fire/firestore';

export class Session {
  createDate: any;
  endDate: any;
  equipment: boolean | undefined;
  id: string | undefined;
  user: string | undefined;
  videos: Video[] | undefined;
  lastWatchedDate: any;
  difficulty: string | undefined;
  isCompleted: boolean | undefined;
  cancelled: boolean | undefined;
  selectedEndDifficulty: string | undefined;
}
