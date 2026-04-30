import { TestBed } from '@angular/core/testing';

import { AuthBootstrapService } from './auth-bootstrap.service';

describe('AuthBootstrapService', () => {
  let service: AuthBootstrapService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthBootstrapService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
