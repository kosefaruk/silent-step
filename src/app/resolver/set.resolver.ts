import {ResolveFn} from '@angular/router';
import {inject} from '@angular/core';
import {collection, Firestore, getDocs, query, where} from '@angular/fire/firestore';
import {AuthService} from '../service/auth.service';
import {from, Observable} from 'rxjs';
import {map} from 'rxjs/operators';

export const setResolver: ResolveFn<Observable<any>> = (route, state) => {
  const firestore = inject(Firestore);
  const authService = inject(AuthService);

  const userId = authService.getUserId();
  const itemCollection = collection(firestore, 'set');
  const firestoreQuery = query(itemCollection, where('user', '==', userId));

  return from(getDocs(firestoreQuery)).pipe(
    map(querySnapshot =>
      querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    )
  );
};

