import {AfterViewInit, Component, CUSTOM_ELEMENTS_SCHEMA} from '@angular/core';
import {NzAvatarComponent} from "ng-zorro-antd/avatar";
import {NzFlexDirective} from "ng-zorro-antd/flex";
import {
  NzPageHeaderAvatarDirective,
  NzPageHeaderComponent,
  NzPageHeaderContentDirective, NzPageHeaderExtraDirective,
  NzPageHeaderTitleDirective
} from "ng-zorro-antd/page-header";
import {NzRowDirective} from "ng-zorro-antd/grid";
import {NavigationEnd, Router, RouterLink, RouterOutlet} from "@angular/router";
import {BehaviorSubject, filter, tap} from 'rxjs';
import {NgxSpinnerComponent} from 'ngx-spinner';
import {CommonModule} from '@angular/common';
import {NzIconModule} from 'ng-zorro-antd/icon';
import {NzButtonModule} from 'ng-zorro-antd/button';
import {NzMenuDirective} from 'ng-zorro-antd/menu';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import {AuthService} from '../service/auth.service';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    NzAvatarComponent,
    NzFlexDirective,
    NzPageHeaderAvatarDirective,
    NzPageHeaderComponent,
    NzPageHeaderContentDirective,
    NzPageHeaderTitleDirective,
    NzRowDirective,
    RouterOutlet,
    NgxSpinnerComponent,
    CommonModule,
    NzIconModule,
    NzButtonModule,
    RouterLink,
    NzMenuDirective,
    NzDropDownModule,
    NzPageHeaderExtraDirective
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HomeComponent implements AfterViewInit {

  url = new BehaviorSubject<string>('');
  url$ = this.url.asObservable();

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.url.next(event.urlAfterRedirects);
      });
  }

  ngAfterViewInit(): void {
    this.url$.pipe(
      tap((data: any) => {
        if (
          data == '/stream' ||
          data == '/calendar' ||
          data == '/history'
        ) {
          const header: any = document.getElementsByClassName('ant-page-header-back');
          if (header) {
            header[0].style.display = 'block';
          }
        } else {
          const header: any = document.getElementsByClassName('ant-page-header-back');
          if (header) {
            header[0].style.display = 'none';
          }
        }
      })
    ).subscribe();
  }
}
