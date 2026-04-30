import {Routes} from '@angular/router';
import {RegisterComponent} from './register/register.component';
import {ListComponent} from './list/list.component';
import {HomeComponent} from './home/home.component';
import {authGuard} from './guard/auth.guard';
import {registerGuard} from './guard/register.guard';
import {StreamComponent} from './stream/stream.component';
import {CalendarScreenComponent} from './calendar-screen/calendar-screen.component';
import {HistoryComponent} from './history/history.component';
import {ContactComponent} from './contact/contact.component';

export const routes: Routes = [
  {path: 'register', component: RegisterComponent, canActivate: [registerGuard],},
  {path: '', component: HomeComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: ListComponent},
      { path: 'stream', component: StreamComponent},
      { path: 'calendar', component: CalendarScreenComponent},
      { path: 'history', component: HistoryComponent},
      { path: 'contact', component: ContactComponent},
    ]},
];
