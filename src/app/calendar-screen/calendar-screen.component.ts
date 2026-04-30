import {Component, inject} from '@angular/core';
import {NzCalendarModule} from 'ng-zorro-antd/calendar';
import {NzBadgeModule} from 'ng-zorro-antd/badge';
import {NgClass, NgForOf, NgIf} from '@angular/common';
import {collection, Firestore, getDocs, query, where} from '@angular/fire/firestore';
import {from, map} from 'rxjs';
import {AuthService} from '../service/auth.service';
import {NzFlexDirective} from 'ng-zorro-antd/flex';
import {Session} from '../model/Session';

interface ListDataMap {
  [year: number]: {
    [month: number]: {
      [day: number]: { type: string; content: string }[];
    };
  };
}

@Component({
  selector: 'app-calendar-screen',
  standalone: true,
  imports: [
    NzBadgeModule, NzCalendarModule, NgIf, NgForOf, NgClass, NzFlexDirective
  ],
  templateUrl: './calendar-screen.component.html',
  styleUrl: './calendar-screen.component.css'
})
export class CalendarScreenComponent {
  firestore = inject(Firestore);
  loading = true;
  currentDate = new Date(); // Varsayılan olarak bugünün tarihi
  listDataMap: ListDataMap = new class implements ListDataMap {
    [year: number]: { [p: number]: { [p: number]: { type: string; content: string }[] } };
  };

  constructor(
    private authService: AuthService,
  ) {
    this.getSessionData();
  }

  getSessionData() {
    const userId = this.authService.getUserId() ? this.authService.getUserId() : '';
    const itemCollection = collection(this.firestore, 'session');
    const firestoreQuery = query(itemCollection,
      where('user', '==', userId)
    );
    from(getDocs(firestoreQuery)).pipe(
      map(querySnapshot => querySnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}))),
      map((result: any) => {
        if (result.length === 0) {
          this.loading = false;
          return [];
        }
        this.loading = false;
        this.listDataMap = this.convertToDataMap(result)
        return result[0];
      })
    ).subscribe();
  }

  convertToDataMap(events: Session[]): ListDataMap {
    const listDataMap: ListDataMap = {};

    events.forEach(event => {
      const dateObj = event.createDate?.toDate() ?? new Date(); // Timestamp'ten Date objesi oluştur
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth() + 1; // JavaScript'te `getMonth()` 0 bazlıdır, +1 eklenmeli
      const day = dateObj.getDate();

      // Eğer yıl yoksa oluştur
      if (!listDataMap[year]) listDataMap[year] = {};
      // Eğer ay yoksa oluştur
      if (!listDataMap[year][month]) listDataMap[year][month] = {};
      // Eğer gün yoksa varsayılan değerlerle oluştur
      if (!listDataMap[year][month][day]) {
        listDataMap[year][month][day] = [
          {type: 'success', content: '0'},
          {type: 'error', content: '0'}
        ];
      }

      // Güncellenen success ve error sayısını artır
      if (event.isCompleted) {
        listDataMap[year][month][day][0].content = (
          Number(listDataMap[year][month][day][0].content) + 1
        ).toString();
      } else {
        listDataMap[year][month][day][1].content = (
          Number(listDataMap[year][month][day][1].content) + 1
        ).toString();
      }
    });
    return listDataMap;
  }
}
