import {Component, OnInit} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {NgxSpinnerComponent} from 'ngx-spinner';
import {Capacitor} from '@capacitor/core';
import {StatusBar, Style} from '@capacitor/status-bar';
import {CommonModule} from '@angular/common';
import {NzButtonModule} from 'ng-zorro-antd/button';
import {NzIconModule} from 'ng-zorro-antd/icon';
import {AppGateStatus, AppSettingsService} from './service/app-settings.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NgxSpinnerComponent, CommonModule, NzButtonModule, NzIconModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  status: AppGateStatus = 'loading';

  constructor(public appSettings: AppSettingsService) {
    (async () => {
      if (Capacitor.getPlatform() === 'ios') {
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setBackgroundColor({ color: '#BFCAD1' }); // header rengi
        await StatusBar.setStyle({ style: Style.Light });
      }
    })();
  }

  ngOnInit(): void {
    this.appSettings.status$.subscribe(s => (this.status = s));
    this.appSettings.load();
  }

  openStore(): void {
    const platform = Capacitor.getPlatform();
    const s = this.appSettings.settings;
    const url = platform === 'ios' ? s?.storeUrlIos : s?.storeUrlAndroid;
    if (url) {
      window.open(url, '_system');
    }
  }
}
