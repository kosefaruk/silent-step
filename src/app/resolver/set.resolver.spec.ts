import {TestBed} from '@angular/core/testing';
import {ResolveFn} from '@angular/router';

import {setResolver} from './set.resolver';

describe('setResolver', () => {
  const executeResolver: ResolveFn<boolean> = (...resolverParameters) =>
      TestBed.runInInjectionContext(() => setResolver(...resolverParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
