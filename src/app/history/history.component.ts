import { Component, OnInit } from '@angular/core';
import {AsyncPipe, JsonPipe, NgForOf, NgIf} from '@angular/common';

import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzFlexDirective } from 'ng-zorro-antd/flex';
import { NzSpinComponent } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';

import { collection, collectionData, Firestore, orderBy, query, Timestamp, where } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { Session } from '../model/Session';
import { AuthService } from '../service/auth.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    NzCollapseModule,
    NzBadgeModule,
    NzTagModule,
    NzEmptyModule,
    NzSpinComponent,
    NzFlexDirective,
    NgForOf,
    NgIf,
    AsyncPipe,
    JsonPipe,
  ],
  templateUrl: './history.component.html',
  styleUrl: './history.component.css'
})
export class HistoryComponent implements OnInit {
  loading = true;
  sessions$: Observable<Session[]> = of([]);

  constructor(
      private authService: AuthService,
      private firestore: Firestore
  ) {}

  ngOnInit(): void {
    this.getSessionData();
  }

  getSessionData() {
    this.loading = true;

    const userId = this.authService.getUserId();
    if (!userId) {
      this.sessions$ = of([]);
      this.loading = false;
      return;
    }

    const itemCollection = collection(this.firestore, 'session');
    const firestoreQuery = query(
        itemCollection,
        where('user', '==', userId),
        orderBy('createDate', 'desc')
    );

    this.sessions$ = (collectionData(firestoreQuery, { idField: 'id' }) as Observable<Session[]>).pipe(
        tap((item) => { this.loading = false;
        }),
        catchError((err) => {
          console.error('history query error:', err);
          this.loading = false;
          return of([] as Session[]);
        })
    );
  }

  getFormattedDate(timestamp: Timestamp | undefined): string {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date
        .getDate()
        .toString()
        .padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
  }

  getDifficultyText(dif: string): string {
    switch (dif) {
      case '1': return 'Çok Kolay';
      case '2': return 'Kolay';
      case '3': return 'Normal';
      case '4': return 'Zor';
      case '5': return 'Çok Zor';
      default: return '-';
    }
  }
}
