/**
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/NG-ZORRO/ng-zorro-antd/blob/master/LICENSE
 */
import { InjectionToken, Injector, afterNextRender, inject } from '@angular/core';
import { Observable } from 'rxjs';
/**
 * An injection token representing `afterNextRender` as an observable rather
 * than a callback-based API has been added. This might be necessary in code
 * where streams of data are already being used and we need to wait until
 * the change detection ends before performing any tasks.
 */
export const NZ_AFTER_NEXT_RENDER$ = new InjectionToken('nz-after-next-render', {
    providedIn: 'root',
    factory: () => {
        const injector = inject(Injector);
        return new Observable(subscriber => {
            const ref = afterNextRender(() => {
                subscriber.next();
                subscriber.complete();
            }, { injector });
            return () => ref.destroy();
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWZ0ZXItbmV4dC1yZW5kZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9jb21wb25lbnRzL2NvcmUvcmVuZGVyL2FmdGVyLW5leHQtcmVuZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7R0FHRztBQUVILE9BQU8sRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLGVBQWUsRUFBRSxNQUFNLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDbEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUVsQzs7Ozs7R0FLRztBQUNILE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLElBQUksY0FBYyxDQUFtQixzQkFBc0IsRUFBRTtJQUNoRyxVQUFVLEVBQUUsTUFBTTtJQUNsQixPQUFPLEVBQUUsR0FBRyxFQUFFO1FBQ1osTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRWxDLE9BQU8sSUFBSSxVQUFVLENBQU8sVUFBVSxDQUFDLEVBQUU7WUFDdkMsTUFBTSxHQUFHLEdBQUcsZUFBZSxDQUN6QixHQUFHLEVBQUU7Z0JBQ0gsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNsQixVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDeEIsQ0FBQyxFQUNELEVBQUUsUUFBUSxFQUFFLENBQ2IsQ0FBQztZQUVGLE9BQU8sR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzdCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9naXRodWIuY29tL05HLVpPUlJPL25nLXpvcnJvLWFudGQvYmxvYi9tYXN0ZXIvTElDRU5TRVxuICovXG5cbmltcG9ydCB7IEluamVjdGlvblRva2VuLCBJbmplY3RvciwgYWZ0ZXJOZXh0UmVuZGVyLCBpbmplY3QgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IE9ic2VydmFibGUgfSBmcm9tICdyeGpzJztcblxuLyoqXG4gKiBBbiBpbmplY3Rpb24gdG9rZW4gcmVwcmVzZW50aW5nIGBhZnRlck5leHRSZW5kZXJgIGFzIGFuIG9ic2VydmFibGUgcmF0aGVyXG4gKiB0aGFuIGEgY2FsbGJhY2stYmFzZWQgQVBJIGhhcyBiZWVuIGFkZGVkLiBUaGlzIG1pZ2h0IGJlIG5lY2Vzc2FyeSBpbiBjb2RlXG4gKiB3aGVyZSBzdHJlYW1zIG9mIGRhdGEgYXJlIGFscmVhZHkgYmVpbmcgdXNlZCBhbmQgd2UgbmVlZCB0byB3YWl0IHVudGlsXG4gKiB0aGUgY2hhbmdlIGRldGVjdGlvbiBlbmRzIGJlZm9yZSBwZXJmb3JtaW5nIGFueSB0YXNrcy5cbiAqL1xuZXhwb3J0IGNvbnN0IE5aX0FGVEVSX05FWFRfUkVOREVSJCA9IG5ldyBJbmplY3Rpb25Ub2tlbjxPYnNlcnZhYmxlPHZvaWQ+PignbnotYWZ0ZXItbmV4dC1yZW5kZXInLCB7XG4gIHByb3ZpZGVkSW46ICdyb290JyxcbiAgZmFjdG9yeTogKCkgPT4ge1xuICAgIGNvbnN0IGluamVjdG9yID0gaW5qZWN0KEluamVjdG9yKTtcblxuICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZTx2b2lkPihzdWJzY3JpYmVyID0+IHtcbiAgICAgIGNvbnN0IHJlZiA9IGFmdGVyTmV4dFJlbmRlcihcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgIHN1YnNjcmliZXIubmV4dCgpO1xuICAgICAgICAgIHN1YnNjcmliZXIuY29tcGxldGUoKTtcbiAgICAgICAgfSxcbiAgICAgICAgeyBpbmplY3RvciB9XG4gICAgICApO1xuXG4gICAgICByZXR1cm4gKCkgPT4gcmVmLmRlc3Ryb3koKTtcbiAgICB9KTtcbiAgfVxufSk7XG4iXX0=