import {ComponentFixture, TestBed} from '@angular/core/testing';

import {CalendarScreenComponent} from './calendar-screen.component';

describe('CalendarScreenComponent', () => {
  let component: CalendarScreenComponent;
  let fixture: ComponentFixture<CalendarScreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarScreenComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
