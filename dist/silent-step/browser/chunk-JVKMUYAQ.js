import {
  addDoc,
  and,
  clearIndexedDbPersistence,
  collection,
  collectionGroup,
  connectFirestoreEmulator,
  deleteDoc,
  disableNetwork,
  doc,
  enableNetwork,
  endAt,
  endBefore,
  getCountFromServer,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  limitToLast,
  onSnapshot,
  or,
  orderBy,
  query,
  setDoc,
  startAfter,
  startAt,
  updateDoc,
  where,
  writeBatch
} from "./chunk-Q7BXSHLS.js";
import {
  WebPlugin
} from "./chunk-T3Z2VA4D.js";
import {
  __async,
  __superGet
} from "./chunk-KTESVR3Q.js";

// node_modules/@capacitor-firebase/firestore/dist/esm/web.js
var FirebaseFirestoreWeb = class _FirebaseFirestoreWeb extends WebPlugin {
  constructor() {
    super(...arguments);
    this.unsubscribesMap = /* @__PURE__ */ new Map();
  }
  addDocument(options) {
    return __async(this, null, function* () {
      const firestore = getFirestore();
      const {
        reference,
        data
      } = options;
      const documentReference = yield addDoc(collection(firestore, reference), data);
      return {
        reference: {
          id: documentReference.id,
          path: documentReference.path
        }
      };
    });
  }
  setDocument(options) {
    return __async(this, null, function* () {
      const firestore = getFirestore();
      const {
        reference,
        data,
        merge
      } = options;
      yield setDoc(doc(firestore, reference), data, {
        merge
      });
    });
  }
  getDocument(options) {
    return __async(this, null, function* () {
      const firestore = getFirestore();
      const {
        reference
      } = options;
      const documentSnapshot = yield getDoc(doc(firestore, reference));
      const documentSnapshotData = documentSnapshot.data();
      return {
        snapshot: {
          id: documentSnapshot.id,
          path: documentSnapshot.ref.path,
          data: documentSnapshotData === void 0 ? null : documentSnapshotData,
          metadata: {
            hasPendingWrites: documentSnapshot.metadata.hasPendingWrites,
            fromCache: documentSnapshot.metadata.fromCache
          }
        }
      };
    });
  }
  updateDocument(options) {
    return __async(this, null, function* () {
      const firestore = getFirestore();
      const {
        reference,
        data
      } = options;
      yield updateDoc(doc(firestore, reference), data);
    });
  }
  deleteDocument(options) {
    return __async(this, null, function* () {
      const firestore = getFirestore();
      const {
        reference
      } = options;
      yield deleteDoc(doc(firestore, reference));
    });
  }
  writeBatch(options) {
    return __async(this, null, function* () {
      const firestore = getFirestore();
      const {
        operations
      } = options;
      const batch = writeBatch(firestore);
      for (const operation of operations) {
        const {
          type,
          reference,
          data,
          options: options2
        } = operation;
        const documentReference = doc(firestore, reference);
        switch (type) {
          case "set":
            batch.set(documentReference, data, options2 !== null && options2 !== void 0 ? options2 : {});
            break;
          case "update":
            batch.update(documentReference, data !== null && data !== void 0 ? data : {});
            break;
          case "delete":
            batch.delete(documentReference);
            break;
        }
      }
      yield batch.commit();
    });
  }
  getCollection(options) {
    return __async(this, null, function* () {
      const collectionQuery = yield this.buildCollectionQuery(options, "collection");
      const collectionSnapshot = yield getDocs(collectionQuery);
      return {
        snapshots: collectionSnapshot.docs.map((documentSnapshot) => ({
          id: documentSnapshot.id,
          path: documentSnapshot.ref.path,
          data: documentSnapshot.data(),
          metadata: {
            hasPendingWrites: documentSnapshot.metadata.hasPendingWrites,
            fromCache: documentSnapshot.metadata.fromCache
          }
        }))
      };
    });
  }
  getCollectionGroup(options) {
    return __async(this, null, function* () {
      const collectionQuery = yield this.buildCollectionQuery(options, "collectionGroup");
      const collectionSnapshot = yield getDocs(collectionQuery);
      return {
        snapshots: collectionSnapshot.docs.map((documentSnapshot) => ({
          id: documentSnapshot.id,
          path: documentSnapshot.ref.path,
          data: documentSnapshot.data(),
          metadata: {
            hasPendingWrites: documentSnapshot.metadata.hasPendingWrites,
            fromCache: documentSnapshot.metadata.fromCache
          }
        }))
      };
    });
  }
  getCountFromServer(options) {
    return __async(this, null, function* () {
      const firestore = getFirestore();
      const {
        reference
      } = options;
      const coll = collection(firestore, reference);
      const snapshot = yield getCountFromServer(coll);
      return {
        count: snapshot.data().count
      };
    });
  }
  clearPersistence() {
    return __async(this, null, function* () {
      const firestore = getFirestore();
      yield clearIndexedDbPersistence(firestore);
    });
  }
  enableNetwork() {
    return __async(this, null, function* () {
      const firestore = getFirestore();
      yield enableNetwork(firestore);
    });
  }
  disableNetwork() {
    return __async(this, null, function* () {
      const firestore = getFirestore();
      yield disableNetwork(firestore);
    });
  }
  useEmulator(options) {
    return __async(this, null, function* () {
      const firestore = getFirestore();
      const port = options.port || 8080;
      connectFirestoreEmulator(firestore, options.host, port);
    });
  }
  addDocumentSnapshotListener(options, callback) {
    return __async(this, null, function* () {
      const firestore = getFirestore();
      const unsubscribe = onSnapshot(doc(firestore, options.reference), {
        includeMetadataChanges: options.includeMetadataChanges,
        source: options.source
      }, (snapshot) => {
        const data = snapshot.data();
        const event = {
          snapshot: {
            id: snapshot.id,
            path: snapshot.ref.path,
            data: data === void 0 ? null : data,
            metadata: {
              hasPendingWrites: snapshot.metadata.hasPendingWrites,
              fromCache: snapshot.metadata.fromCache
            }
          }
        };
        callback(event, void 0);
      }, (error) => callback(null, error));
      const id = Date.now().toString();
      this.unsubscribesMap.set(id, unsubscribe);
      return id;
    });
  }
  addCollectionSnapshotListener(options, callback) {
    return __async(this, null, function* () {
      const collectionQuery = yield this.buildCollectionQuery(options, "collection");
      const unsubscribe = onSnapshot(collectionQuery, {
        includeMetadataChanges: options.includeMetadataChanges,
        source: options.source
      }, (snapshot) => {
        const event = {
          snapshots: snapshot.docs.map((documentSnapshot) => ({
            id: documentSnapshot.id,
            path: documentSnapshot.ref.path,
            data: documentSnapshot.data(),
            metadata: {
              hasPendingWrites: documentSnapshot.metadata.hasPendingWrites,
              fromCache: documentSnapshot.metadata.fromCache
            }
          }))
        };
        callback(event, void 0);
      }, (error) => callback(null, error));
      const id = Date.now().toString();
      this.unsubscribesMap.set(id, unsubscribe);
      return id;
    });
  }
  addCollectionGroupSnapshotListener(options, callback) {
    return __async(this, null, function* () {
      const collectionQuery = yield this.buildCollectionQuery(options, "collectionGroup");
      const unsubscribe = onSnapshot(collectionQuery, {
        includeMetadataChanges: options.includeMetadataChanges,
        source: options.source
      }, (snapshot) => {
        const event = {
          snapshots: snapshot.docs.map((documentSnapshot) => ({
            id: documentSnapshot.id,
            path: documentSnapshot.ref.path,
            data: documentSnapshot.data(),
            metadata: {
              hasPendingWrites: documentSnapshot.metadata.hasPendingWrites,
              fromCache: documentSnapshot.metadata.fromCache
            }
          }))
        };
        callback(event, void 0);
      }, (error) => callback(null, error));
      const id = Date.now().toString();
      this.unsubscribesMap.set(id, unsubscribe);
      return id;
    });
  }
  removeSnapshotListener(options) {
    return __async(this, null, function* () {
      const unsubscribe = this.unsubscribesMap.get(options.callbackId);
      if (!unsubscribe) {
        return;
      }
      unsubscribe();
      this.unsubscribesMap.delete(options.callbackId);
    });
  }
  removeAllListeners() {
    return __async(this, null, function* () {
      this.unsubscribesMap.forEach((unsubscribe) => unsubscribe());
      this.unsubscribesMap.clear();
      yield __superGet(_FirebaseFirestoreWeb.prototype, this, "removeAllListeners").call(this);
    });
  }
  buildCollectionQuery(options, type) {
    return __async(this, null, function* () {
      const firestore = getFirestore();
      let collectionQuery;
      if (options.compositeFilter) {
        const compositeFilter = this.buildFirebaseQueryCompositeFilterConstraint(options.compositeFilter);
        const queryConstraints = yield this.buildFirebaseQueryNonFilterConstraints(options.queryConstraints || []);
        collectionQuery = query(type === "collection" ? collection(firestore, options.reference) : collectionGroup(firestore, options.reference), compositeFilter, ...queryConstraints);
      } else {
        const queryConstraints = yield this.buildFirebaseQueryConstraints(options.queryConstraints || []);
        collectionQuery = query(type === "collection" ? collection(firestore, options.reference) : collectionGroup(firestore, options.reference), ...queryConstraints);
      }
      return collectionQuery;
    });
  }
  buildFirebaseQueryCompositeFilterConstraint(compositeFilter) {
    const queryConstraints = this.buildFirebaseQueryFilterConstraints(compositeFilter.queryConstraints);
    if (compositeFilter.type === "and") {
      return and(...queryConstraints);
    } else {
      return or(...queryConstraints);
    }
  }
  buildFirebaseQueryFilterConstraints(queryfilterConstraints) {
    const firebaseQueryFilterConstraints = [];
    for (const queryfilterConstraint of queryfilterConstraints) {
      const firebaseQueryFilterConstraint = this.buildFirebaseQueryFilterConstraint(queryfilterConstraint);
      firebaseQueryFilterConstraints.push(firebaseQueryFilterConstraint);
    }
    return firebaseQueryFilterConstraints;
  }
  buildFirebaseQueryFilterConstraint(queryFilterConstraints) {
    if (queryFilterConstraints.type === "where") {
      return this.buildFirebaseQueryFieldFilterConstraint(queryFilterConstraints);
    } else {
      return this.buildFirebaseQueryCompositeFilterConstraint(queryFilterConstraints);
    }
  }
  buildFirebaseQueryFieldFilterConstraint(queryfilterConstraints) {
    return where(queryfilterConstraints.fieldPath, queryfilterConstraints.opStr, queryfilterConstraints.value);
  }
  buildFirebaseQueryNonFilterConstraints(queryConstraints) {
    return __async(this, null, function* () {
      const firebaseQueryNonFilterConstraints = [];
      for (const queryConstraint of queryConstraints) {
        const firebaseQueryNonFilterConstraint = yield this.buildFirebaseQueryNonFilterConstraint(queryConstraint);
        firebaseQueryNonFilterConstraints.push(firebaseQueryNonFilterConstraint);
      }
      return firebaseQueryNonFilterConstraints;
    });
  }
  buildFirebaseQueryNonFilterConstraint(queryConstraints) {
    return __async(this, null, function* () {
      switch (queryConstraints.type) {
        case "orderBy":
          return orderBy(queryConstraints.fieldPath, queryConstraints.directionStr);
        case "limit":
          return limit(queryConstraints.limit);
        case "limitToLast":
          return limitToLast(queryConstraints.limit);
        case "startAt":
        case "startAfter":
        case "endAt":
        case "endBefore": {
          const firestore = getFirestore();
          const documentSnapshot = yield getDoc(doc(firestore, queryConstraints.reference));
          switch (queryConstraints.type) {
            case "startAt":
              return startAt(documentSnapshot);
            case "startAfter":
              return startAfter(documentSnapshot);
            case "endAt":
              return endAt(documentSnapshot);
            case "endBefore":
              return endBefore(documentSnapshot);
          }
        }
      }
    });
  }
  buildFirebaseQueryConstraints(queryConstraints) {
    return __async(this, null, function* () {
      const firebaseQueryConstraints = [];
      for (const queryConstraint of queryConstraints) {
        const firebaseQueryConstraint = yield this.buildFirebaseQueryConstraint(queryConstraint);
        firebaseQueryConstraints.push(firebaseQueryConstraint);
      }
      return firebaseQueryConstraints;
    });
  }
  buildFirebaseQueryConstraint(queryConstraint) {
    return __async(this, null, function* () {
      if (queryConstraint.type === "where") {
        return this.buildFirebaseQueryFieldFilterConstraint(queryConstraint);
      } else {
        return yield this.buildFirebaseQueryNonFilterConstraint(queryConstraint);
      }
    });
  }
};
export {
  FirebaseFirestoreWeb
};
//# sourceMappingURL=chunk-JVKMUYAQ.js.map
