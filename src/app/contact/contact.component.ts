import { Component } from '@angular/core';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css'
})
export class ContactComponent {
  email = 'ideateknikdestek@gmail.com';

  openEmail() {
    window.location.href = `mailto:${this.email}`;
  }
}
